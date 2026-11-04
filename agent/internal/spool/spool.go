package spool

import (
	"encoding/binary"
	"fmt"
	"hash/crc32"
	"io"
	"os"
	"path/filepath"
	"sort"
	"sync"
)

type Record struct {
	Length   uint32
	Checksum uint32
	Payload  []byte
}

type Spool struct {
	dir         string
	maxSegment  int64
	currentFile *os.File
	currentSize int64
	segmentID   int64
	mu          sync.Mutex
}

func OpenSpool(dir string) (*Spool, error) {
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("creating spool dir: %w", err)
	}

	s := &Spool{
		dir:        dir,
		maxSegment: 16 * 1024 * 1024,
	}

	if err := s.rotateSegment(); err != nil {
		return nil, err
	}

	return s, nil
}

func (s *Spool) rotateSegment() error {
	if s.currentFile != nil {
		_ = s.currentFile.Sync()
		_ = s.currentFile.Close()
	}

	s.segmentID++
	fileName := filepath.Join(s.dir, fmt.Sprintf("segment-%08d.log", s.segmentID))
	f, err := os.OpenFile(fileName, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("creating new segment file: %w", err)
	}

	s.currentFile = f
	s.currentSize = 0
	return nil
}

func (s *Spool) RotateNow() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.rotateSegment()
}

func (s *Spool) Append(payload []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	dataLen := uint32(len(payload))
	checksum := crc32.ChecksumIEEE(payload)

	var header [8]byte
	binary.BigEndian.PutUint32(header[0:4], dataLen)
	binary.BigEndian.PutUint32(header[4:8], checksum)

	totalLen := int64(8 + len(payload))
	if s.currentSize+totalLen > s.maxSegment {
		if err := s.rotateSegment(); err != nil {
			return err
		}
	}

	if _, err := s.currentFile.Write(header[:]); err != nil {
		return err
	}
	if _, err := s.currentFile.Write(payload); err != nil {
		return err
	}

	s.currentSize += totalLen
	return s.currentFile.Sync()
}

func (s *Spool) ListOldSegments() ([]string, error) {
	s.mu.Lock()
	currentName := ""
	if s.currentFile != nil {
		currentName = filepath.Base(s.currentFile.Name())
	}
	s.mu.Unlock()

	files, err := os.ReadDir(s.dir)
	if err != nil {
		return nil, err
	}

	var segments []string
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		name := f.Name()
		if filepath.Ext(name) == ".log" && name != currentName {
			segments = append(segments, filepath.Join(s.dir, name))
		}
	}

	sort.Strings(segments)
	return segments, nil
}

func (s *Spool) RemoveSegment(filePath string) error {
	return os.Remove(filePath)
}

func ReadRecords(filePath string) ([][]byte, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var records [][]byte
	var header [8]byte

	for {
		_, err := io.ReadFull(f, header[:])
		if err == io.EOF || err == io.ErrUnexpectedEOF {
			break
		}
		if err != nil {
			return records, err
		}

		dataLen := binary.BigEndian.Uint32(header[0:4])
		expectedCrc := binary.BigEndian.Uint32(header[4:8])

		payload := make([]byte, dataLen)
		if _, err := io.ReadFull(f, payload); err != nil {
			break
		}

		actualCrc := crc32.ChecksumIEEE(payload)
		if actualCrc != expectedCrc {
			break
		}

		records = append(records, payload)
	}

	return records, nil
}
