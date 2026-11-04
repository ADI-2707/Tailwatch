package pipeline

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/ADI-2707/Tailwatch/agent/internal/config"
	"github.com/ADI-2707/Tailwatch/agent/internal/mask"
	"github.com/ADI-2707/Tailwatch/agent/internal/multiline"
	"github.com/ADI-2707/Tailwatch/agent/internal/sender"
	"github.com/ADI-2707/Tailwatch/agent/internal/source/docker"
	"github.com/ADI-2707/Tailwatch/agent/internal/source/file"
	"github.com/ADI-2707/Tailwatch/agent/internal/spool"
	"github.com/ADI-2707/Tailwatch/agent/pkg/protocol"
)

type Runner struct {
	cfg       *config.Config
	inChan    chan protocol.LogEvent
	masker    *mask.Masker
	spooler   *spool.Spool
	client    *sender.Client
	joiners   map[string]*multiline.Joiner
	joinersMu sync.Mutex
}

func NewRunner(cfg *config.Config) (*Runner, error) {
	masker, err := mask.NewMasker(nil)
	if err != nil {
		return nil, fmt.Errorf("initializing masker: %w", err)
	}

	spooler, err := spool.OpenSpool(cfg.Spool.Dir)
	if err != nil {
		return nil, fmt.Errorf("initializing spool: %w", err)
	}

	client := sender.NewClient(cfg.Server.URL, cfg.Server.APIKey, cfg.Server.Insecure)

	return &Runner{
		cfg:     cfg,
		inChan:  make(chan protocol.LogEvent, 2000),
		masker:  masker,
		spooler: spooler,
		client:  client,
		joiners: make(map[string]*multiline.Joiner),
	}, nil
}

func (r *Runner) Start(ctx context.Context) error {
	for _, src := range r.cfg.Sources {
		if src.Type == "file" {
			tailer := file.NewTailer(src.Paths, src.Service, r.cfg.Host.Name, r.inChan)
			go tailer.Start(ctx)
		}
	}

	dockerCollector := docker.NewCollector("/var/run/docker.sock", r.cfg.Host.Name, r.inChan)
	go dockerCollector.Start(ctx)

	go r.batchAndSendLoop(ctx)
	go r.replaySpoolLoop(ctx)

	<-ctx.Done()
	return nil
}

func generateUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return hex.EncodeToString(b)
}

func (r *Runner) batchAndSendLoop(ctx context.Context) {
	ticker := time.NewTicker(r.cfg.Batch.MaxAge)
	defer ticker.Stop()

	var currentBatch []protocol.LogEvent

	flush := func() {
		if len(currentBatch) == 0 {
			return
		}

		batchID := generateUUID()
		batch := protocol.IngestBatch{
			BatchID: batchID,
			Agent: protocol.AgentMetadata{
				Host:    r.cfg.Host.Name,
				Version: "1.0.0",
			},
			Events: currentBatch,
		}

		raw, err := json.Marshal(batch)
		if err == nil {
			_ = r.spooler.Append(raw)
		}

		err = r.client.SendBatch(ctx, batch)
		if err != nil {
			_ = r.spooler.RotateNow()
		}

		currentBatch = nil
	}

	for {
		select {
		case <-ctx.Done():
			flush()
			return

		case ev := <-r.inChan:
			ev.Message = r.masker.MaskText(ev.Message)
			ev.Fields = r.masker.MaskFields(ev.Fields)

			currentBatch = append(currentBatch, ev)
			if len(currentBatch) >= r.cfg.Batch.MaxEvents {
				flush()
			}

		case <-ticker.C:
			flush()
		}
	}
}

func (r *Runner) replaySpoolLoop(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			segments, err := r.spooler.ListOldSegments()
			if err != nil || len(segments) == 0 {
				continue
			}

			for _, segPath := range segments {
				records, err := spool.ReadRecords(segPath)
				if err != nil {
					_ = r.spooler.RemoveSegment(segPath)
					continue
				}

				allDelivered := true
				for _, rec := range records {
					var batch protocol.IngestBatch
					if err := json.Unmarshal(rec, &batch); err != nil {
						continue
					}

					if err := r.client.SendBatch(ctx, batch); err != nil {
						allDelivered = false
						break
					}
				}

				if allDelivered {
					_ = r.spooler.RemoveSegment(segPath)
				} else {
					break
				}
			}
		}
	}
}
