package file

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/ADI-2707/Tailwatch/agent/pkg/protocol"
)

type Tailer struct {
	paths       []string
	service     string
	host        string
	eventChan   chan protocol.LogEvent
	fileOffsets map[string]int64
	mu          sync.Mutex
}

func NewTailer(paths []string, service, host string, out chan protocol.LogEvent) *Tailer {
	return &Tailer{
		paths:       paths,
		service:     service,
		host:        host,
		eventChan:   out,
		fileOffsets: make(map[string]int64),
	}
}

func (t *Tailer) Start(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			t.scanAndTail()
		}
	}
}

func (t *Tailer) scanAndTail() {
	for _, pattern := range t.paths {
		matches, err := filepath.Glob(pattern)
		if err != nil {
			continue
		}

		for _, match := range matches {
			t.tailFile(match)
		}
	}
}

func (t *Tailer) tailFile(filePath string) {
	t.mu.Lock()
	offset := t.fileOffsets[filePath]
	t.mu.Unlock()

	info, err := os.Stat(filePath)
	if err != nil {
		return
	}

	if info.Size() < offset {
		offset = 0
	}

	if info.Size() == offset {
		return
	}

	file, err := os.Open(filePath)
	if err != nil {
		return
	}
	defer file.Close()

	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		return
	}

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if len(line) == 0 {
			continue
		}

		t.eventChan <- protocol.LogEvent{
			TS:      time.Now().UTC(),
			Level:   "info",
			Service: t.service,
			Host:    t.host,
			Source:  filePath,
			Message: line,
		}
	}

	newOffset, err := file.Seek(0, io.SeekCurrent)
	if err == nil {
		t.mu.Lock()
		t.fileOffsets[filePath] = newOffset
		t.mu.Unlock()
	}
}
