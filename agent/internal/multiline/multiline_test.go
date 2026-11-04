package multiline

import (
	"strings"
	"testing"
	"time"
)

func TestMultilineJoinerIso8601(t *testing.T) {
	var flushed []string
	joiner, err := NewJoiner(JoinerConfig{
		StartPattern: "iso8601",
		MaxLines:     50,
		MaxBytes:     1024 * 1024,
		IdleTimeout:  50 * time.Millisecond,
	}, func(msg string) {
		flushed = append(flushed, msg)
	})

	if err != nil {
		t.Fatalf("unexpected error creating joiner: %v", err)
	}

	joiner.Push("2026-11-04T12:00:00Z ERROR Failed to calculate")
	joiner.Push("Traceback (most recent call last):")
	joiner.Push("  File \"app.py\", line 42, in <module>")
	joiner.Push("    res = 1 / 0")
	joiner.Push("ZeroDivisionError: division by zero")
	joiner.Push("2026-11-04T12:00:01Z INFO Service running normally")

	time.Sleep(100 * time.Millisecond)
	joiner.Flush()

	if len(flushed) < 2 {
		t.Fatalf("expected at least 2 flushed messages, got %d", len(flushed))
	}

	if !strings.Contains(flushed[0], "ZeroDivisionError") {
		t.Errorf("expected joined traceback in first message, got: %s", flushed[0])
	}
	if !strings.Contains(flushed[0], "Failed to calculate") {
		t.Errorf("expected header line in first message, got: %s", flushed[0])
	}
	if !strings.Contains(flushed[1], "Service running normally") {
		t.Errorf("expected next message to be separate, got: %s", flushed[1])
	}
}
