package multiline

import (
	"strings"
	"testing"
	"time"
)

func TestMultilineJoinerPythonTraceback(t *testing.T) {
	var flushed []string
	joiner, err := NewJoiner(JoinerConfig{
		StartPattern: "python-traceback",
		MaxLines:     50,
		MaxBytes:     1024 * 1024,
		IdleTimeout:  50 * time.Millisecond,
	}, func(msg string) {
		flushed = append(flushed, msg)
	})

	if err != nil {
		t.Fatalf("unexpected error creating joiner: %v", err)
	}

	joiner.Feed("Traceback (most recent call last):")
	joiner.Feed("  File \"app.py\", line 42, in <module>")
	joiner.Feed("    res = 1 / 0")
	joiner.Feed("ZeroDivisionError: division by zero")
	joiner.Feed("INFO: 127.0.0.1 - GET /health 200 OK")

	time.Sleep(100 * time.Millisecond)
	joiner.Flush()

	if len(flushed) < 2 {
		t.Fatalf("expected at least 2 flushed messages, got %d", len(flushed))
	}

	if !strings.Contains(flushed[0], "ZeroDivisionError") {
		t.Errorf("expected joined traceback in first message, got: %s", flushed[0])
	}
}

