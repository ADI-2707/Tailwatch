# Tailwatch Agent

A high-performance, single-binary log collection agent written in Go. Tailwatch Agent runs with a memory footprint under 15 MiB, tails container logs and raw log files, redacts sensitive secrets at the edge, aggregates multiline stack traces, and spools unacknowledged batches to disk in segments with CRC32C checksums during network partitions.

## Pipeline Architecture

```mermaid
graph TD
    subgraph Discovery [Log Collectors]
        DS[/var/run/docker.sock] -->|Container Stdout/Stderr| DCOL[Docker Collector]
        FL[/var/log/*.log] -->|Inode Follower| FCOL[File Tailer]
    end

    subgraph Processing [Edge Processing Pipeline]
        DCOL --> MJ[Multiline Joiner]
        FCOL --> MJ
        MJ -->|Aggregated Events| MSK[RE2 Secret Masker]
        MSK -->|Redacted Payloads| Q[In-Memory Ring Buffer]
    end

    subgraph Resilience [Storage & Transport]
        Q -->|Flush Trigger: 250 events or 1000ms| DSP[Batch Dispatcher]
        DSP -->|Normal Path: HTTP/2 POST| SVR[Tailwatch Ingestion Server]
        DSP -.->|On Network Failure| SPL[(16 MiB Segment Disk Spool)]
        SPL -.->|On Network Recovery| SVR
    end
```

## Features

- **Docker Socket Engine**: Automatically discovers running containers via `/var/run/docker.sock`, reads stdout/stderr streams, and enriches events with container metadata.
- **File System Tailer**: Follows rotating log files via inode tracking and file truncation detection.
- **Edge Secret Masking**: RE2-accelerated regular expression replacement masks private keys, JWT tokens, AWS credentials, and authorization headers before transmission.
- **Multiline Joiner**: Groups related stack trace lines and indented runtime exceptions into a single structured event.
- **Disk Spool (WAL)**: 16 MiB fixed segment spooling with CRC32C integrity validation ensures zero log loss across prolonged server downtime or network disconnects.
- **Batch Pipeline**: Ships compressed microbatches over HTTP/2 or HTTP/1.1 with jittered exponential backoff.

## Project Structure

```
agent/
├── cmd/
│   └── agent/
│       └── main.go               # CLI entrypoint (Cobra commands: run, check, version)
├── pkg/
│   ├── config/
│   │   └── config.go             # YAML parser, validation, and env interpolation
│   ├── discovery/
│   │   └── docker.go             # Docker engine socket stream reader
│   ├── tailer/
│   │   ├── file.go               # Inode-following file reader and rotation monitor
│   │   └── multiline.go          # Regex multiline stack trace grouping engine
│   ├── masking/
│   │   └── masker.go             # RE2 compiled secret redaction filters
│   ├── spool/
│   │   └── spool.go              # 16 MiB segment disk spooler with CRC32C checks
│   ├── pipeline/
│   │   └── runner.go             # Concurrent collector, worker, and flush loop
│   └── sender/
│       └── client.go             # HTTP batch client with jitter backoff
├── go.mod                        # Go module dependencies
├── go.sum                        # Cryptographic checksums
└── README.md                     # Agent technical guide
```

## Configuration

The agent reads configuration from `/etc/tailwatch/agent.yaml` or a path supplied via the `--config` flag. Environment variables formatted as `${VAR_NAME}` are expanded dynamically at load time.

```yaml
server:
  url: "${TAILWATCH_URL}"
  api_key: "${TAILWATCH_API_KEY}"
  batch_size: 250
  flush_interval_ms: 1000

host:
  name: "${HOST_NAME}"

spool:
  directory: "/var/lib/tailwatch/spool"
  max_size_mb: 512
  segment_size_mb: 16

masking:
  enabled: true
  rules:
    - name: "bearer-token"
      pattern: 'Bearer\s+[A-Za-z0-9\-_\.=]+'
      replacement: "Bearer [REDACTED]"
    - name: "api-key"
      pattern: '(?i)(api[_-]?key|secret)\s*[:=]\s*["'']?[A-Za-z0-9\-_\.]{16,}["'']?'
      replacement: "$1: [REDACTED]"

sources:
  - type: "docker"
    enabled: true
    socket_path: "/var/run/docker.sock"
    labels:
      environment: "production"
    exclude_containers:
      - "tailwatch-caddy-1"
      - "tailwatch-agent"

  - type: "file"
    enabled: true
    paths:
      - "/var/log/syslog"
      - "/var/log/nginx/*.log"
    service_name: "host-system"
    multiline:
      pattern: '^\d{4}-\d{2}-\d{2}'
      negate: true
```

## Running with Docker

Deploy the agent to collect logs across all containers on a host:

```bash
docker run -d \
  --name tailwatch-agent \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /var/log:/var/log:ro \
  -v /var/lib/tailwatch:/var/lib/tailwatch \
  -e TAILWATCH_URL="http://tailwatch.internal" \
  -e TAILWATCH_API_KEY="twk_live_prod_abc123" \
  ghcr.io/adi-2707/tailwatch-agent:latest
```

## Building from Source

### Requirements
- Go 1.22 or higher
- Make or standard Go toolchain

### Build Commands

```bash
cd agent
go build -ldflags="-s -w" -o bin/tailwatch-agent ./cmd/agent
```

Run the binary:
```bash
./bin/tailwatch-agent run --config ./agent.yaml
```

Check configuration validity without starting:
```bash
./bin/tailwatch-agent check --config ./agent.yaml
```
