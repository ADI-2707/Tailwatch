package file

import (
	"bufio"
	"context"
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
			t.scanAndRead(ctx)
		}
	}
}

func (t *Tailer) scanAndRead(ctx context.Context) {
	t.mu.Lock()
	defer t.mu.Unlock()

	for _, pattern := range t.paths {
		matches, err := filepath.Glob(pattern)
		if err != nil {
			continue
		}

		for _, filePath := range matches {
			t.readFile(ctx, filePath)
		}
	}
}

func (t *Tailer) readFile(ctx context.Context, filePath string) {
	f, err := os.Open(filePath)
	if err != nil {
		return
	}
	defer f.Close()

	stat, err := f.Stat()
	if err != nil {
		return
	}

	offset, exists := t.fileOffsets[filePath]
	if !exists {
		offset = stat.Size()
		t.fileOffsets[filePath] = offset
		return
	}

	if stat.Size() < offset {
		offset = 0
	}

	if _, err := f.Seek(offset, io.SeekStart); err != nil {
		return
	}

	reader := bufio.NewReader(f)
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		line, err := reader.ReadString('\n')
		if len(line) > 0 {
			cleanLine := line
			if len(cleanLine) > 0 && cleanLine[len(cleanLine)-1] == '\n' {
				cleanLine = cleanLine[:len(cleanLine)-1]
			}
			if len(cleanLine) > 0 && cleanLine[len(cleanLine)-1] == '\r' {
				cleanLine = cleanLine[:len(cleanLine)-1]
			}

			if len(cleanLine) > 0 {
				t.eventChan <- protocol.LogEvent{
					TS:      time.Now().UTC(),
					Level:   "info",
					Service: t.service,
					Host:    t.host,
					Source:  filePath,
					Message: cleanLine,
				}
			}
		}

		if err != nil {
			break
		}
	}

	newOffset, err := f.Seek(0, io.SeekCurrent)
	if err == nil {
		t.fileOffsets[filePath] = newOffset
	}
}
