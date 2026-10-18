package docker

import (
	"bufio"
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/ADI-2707/Tailwatch/agent/pkg/protocol"
)

type ContainerInspect struct {
	ID     string `json:"Id"`
	Name   string `json:"Name"`
	Config struct {
		Image  string            `json:"Image"`
		Labels map[string]string `json:"Labels"`
	} `json:"Config"`
}

type ContainerSummary struct {
	ID     string            `json:"Id"`
	Names  []string          `json:"Names"`
	Image  string            `json:"Image"`
	Labels map[string]string `json:"Labels"`
	State  string            `json:"State"`
}

type Collector struct {
	socketPath string
	host       string
	client     *http.Client
	eventChan  chan protocol.LogEvent
}

func NewCollector(socketPath, host string, out chan protocol.LogEvent) *Collector {
	if socketPath == "" {
		socketPath = "/var/run/docker.sock"
	}

	transport := &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
		},
	}

	return &Collector{
		socketPath: socketPath,
		host:       host,
		client:     &http.Client{Transport: transport, Timeout: 0},
		eventChan:  out,
	}
}

func (c *Collector) Start(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	trackedContainers := make(map[string]context.CancelFunc)

	for {
		select {
		case <-ctx.Done():
			for _, cancel := range trackedContainers {
				cancel()
			}
			return
		case <-ticker.C:
			containers, err := c.listRunningContainers(ctx)
			if err != nil {
				continue
			}

			activeIDs := make(map[string]bool)
			for _, container := range containers {
				activeIDs[container.ID] = true
				if _, exists := trackedContainers[container.ID]; !exists {
					contCtx, cancel := context.WithCancel(ctx)
					trackedContainers[container.ID] = cancel
					go c.streamContainerLogs(contCtx, container)
				}
			}

			for id, cancel := range trackedContainers {
				if !activeIDs[id] {
					cancel()
					delete(trackedContainers, id)
				}
			}
		}
	}
}

func (c *Collector) listRunningContainers(ctx context.Context) ([]ContainerSummary, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "http://docker/containers/json", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var containers []ContainerSummary
	if err := json.NewDecoder(resp.Body).Decode(&containers); err != nil {
		return nil, err
	}
	return containers, nil
}

func (c *Collector) streamContainerLogs(ctx context.Context, container ContainerSummary) {
	containerName := "unknown"
	if len(container.Names) > 0 {
		containerName = strings.TrimPrefix(container.Names[0], "/")
	}

	serviceName := container.Labels["com.docker.compose.service"]
	if serviceName == "" {
		serviceName = containerName
	}

	url := fmt.Sprintf("http://docker/containers/%s/logs?stdout=1&stderr=1&follow=1&tail=10", container.ID)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return
	}
	defer resp.Body.Close()

	reader := bufio.NewReader(resp.Body)
	var header [8]byte

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		_, err := io.ReadFull(reader, header[:])
		if err != nil {
			return
		}

		size := binary.BigEndian.Uint32(header[4:8])
		payload := make([]byte, size)
		_, err = io.ReadFull(reader, payload)
		if err != nil {
			return
		}

		line := strings.TrimRight(string(payload), "\r\n")
		if len(line) == 0 {
			continue
		}

		streamType := "stdout"
		if header[0] == 2 {
			streamType = "stderr"
		}

		level := "info"
		if streamType == "stderr" {
			level = "error"
		}

		c.eventChan <- protocol.LogEvent{
			TS:      time.Now().UTC(),
			Level:   level,
			Service: serviceName,
			Host:    c.host,
			Source:  fmt.Sprintf("docker:%s", containerName),
			Message: line,
			Fields: map[string]interface{}{
				"container.id":    container.ID[:12],
				"container.name":  containerName,
				"container.image": container.Image,
				"stream":          streamType,
			},
		}
	}
}
