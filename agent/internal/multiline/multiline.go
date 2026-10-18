package multiline

import (
	"regexp"
	"strings"
	"sync"
	"time"
)

type JoinerConfig struct {
	StartPattern string
	MaxLines     int
	MaxBytes     int
	IdleTimeout  time.Duration
}

type Joiner struct {
	pattern     *regexp.Regexp
	maxLines    int
	maxBytes    int
	idleTimeout time.Duration

	mu        sync.Mutex
	lines     []string
	byteCount int
	timer     *time.Timer
	flushCb   func(string)
}

var Presets = map[string]string{
	"python-traceback": `^(Traceback \(most recent call last\):|\w+Error:|\w+Exception:)`,
	"go-panic":         `^(panic: |goroutine \d+ \[)`,
	"java":             `^(\S+\.(Exception|Error):|\s+at\s+)`,
	"iso8601":          `^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}`,
}

func NewJoiner(cfg JoinerConfig, onFlush func(string)) (*Joiner, error) {
	var re *regexp.Regexp
	if cfg.StartPattern != "" {
		if presetPattern, ok := Presets[cfg.StartPattern]; ok {
			var err error
			re, err = regexp.Compile(presetPattern)
			if err != nil {
				return nil, err
			}
		} else {
			var err error
			re, err = regexp.Compile(cfg.StartPattern)
			if err != nil {
				return nil, err
			}
		}
	}

	maxLines := cfg.MaxLines
	if maxLines <= 0 {
		maxLines = 500
	}

	maxBytes := cfg.MaxBytes
	if maxBytes <= 0 {
		maxBytes = 64 * 1024
	}

	idleTimeout := cfg.IdleTimeout
	if idleTimeout <= 0 {
		idleTimeout = 500 * time.Millisecond
	}

	return &Joiner{
		pattern:     re,
		maxLines:    maxLines,
		maxBytes:    maxBytes,
		idleTimeout: idleTimeout,
		flushCb:     onFlush,
	}, nil
}

func (j *Joiner) Push(line string) {
	j.mu.Lock()
	defer j.mu.Unlock()

	isStart := false
	if j.pattern != nil {
		isStart = j.pattern.MatchString(line)
	} else {
		isStart = !strings.HasPrefix(line, " ") && !strings.HasPrefix(line, "\t")
	}

	if isStart && len(j.lines) > 0 {
		j.flushLocked()
	}

	lineLen := len(line)
	if j.byteCount+lineLen > j.maxBytes || len(j.lines) >= j.maxLines {
		j.flushLocked()
	}

	j.lines = append(j.lines, line)
	j.byteCount += lineLen

	if j.timer != nil {
		j.timer.Stop()
	}
	j.timer = time.AfterFunc(j.idleTimeout, func() {
		j.mu.Lock()
		defer j.mu.Unlock()
		j.flushLocked()
	})
}

func (j *Joiner) Flush() {
	j.mu.Lock()
	defer j.mu.Unlock()
	j.flushLocked()
}

func (j *Joiner) flushLocked() {
	if len(j.lines) == 0 {
		return
	}
	if j.timer != nil {
		j.timer.Stop()
		j.timer = nil
	}

	merged := strings.Join(j.lines, "\n")
	j.lines = j.lines[:0]
	j.byteCount = 0

	if j.flushCb != nil {
		j.flushCb(merged)
	}
}
