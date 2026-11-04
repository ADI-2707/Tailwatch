package spool

import (
	"bytes"
	"os"
	"testing"
)

func TestSpoolAppendAndRead(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "spool-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	spooler, err := OpenSpool(tempDir)
	if err != nil {
		t.Fatalf("failed to open spool: %v", err)
	}

	payload1 := []byte(`{"event": "one"}`)
	payload2 := []byte(`{"event": "two"}`)

	if err := spooler.Append(payload1); err != nil {
		t.Fatalf("failed to append payload1: %v", err)
	}
	if err := spooler.Append(payload2); err != nil {
		t.Fatalf("failed to append payload2: %v", err)
	}

	currentFile := spooler.currentFile.Name()
	records, err := ReadRecords(currentFile)
	if err != nil {
		t.Fatalf("failed to read records: %v", err)
	}

	if len(records) != 2 {
		t.Fatalf("expected 2 records, got %d", len(records))
	}
	if !bytes.Equal(records[0], payload1) {
		t.Errorf("record 0 does not match payload1")
	}
	if !bytes.Equal(records[1], payload2) {
		t.Errorf("record 1 does not match payload2")
	}
}

func TestSpoolRotationAndListing(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "spool-rot-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	spooler, err := OpenSpool(tempDir)
	if err != nil {
		t.Fatalf("failed to open spool: %v", err)
	}

	if err := spooler.Append([]byte("data")); err != nil {
		t.Fatalf("failed append: %v", err)
	}
	if err := spooler.RotateNow(); err != nil {
		t.Fatalf("failed rotate: %v", err)
	}

	oldSegments, err := spooler.ListOldSegments()
	if err != nil {
		t.Fatalf("failed list old segments: %v", err)
	}
	if len(oldSegments) != 1 {
		t.Fatalf("expected 1 old segment, got %d", len(oldSegments))
	}

	if err := spooler.RemoveSegment(oldSegments[0]); err != nil {
		t.Fatalf("failed to remove segment: %v", err)
	}

	remaining, err := spooler.ListOldSegments()
	if err != nil {
		t.Fatalf("failed list after remove: %v", err)
	}
	if len(remaining) != 0 {
		t.Errorf("expected 0 remaining, got %d", len(remaining))
	}
}

