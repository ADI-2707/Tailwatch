# Tailwatch

Tailwatch is a self-hosted log aggregation, search, live-tailing, and alerting platform designed for lean engineering teams and modern containerized infrastructure. It deploys via a single Docker Compose specification, collects logs via a lightweight Go agent or direct HTTP endpoints, buffers through Valkey Streams, persists into a daily-partitioned PostgreSQL 18 engine via high-speed binary `COPY`, and delivers a Vercel-inspired web console.

---

## 1. System Architecture

```mermaid
graph TD
    subgraph Sources [Log Sources & Edge]
        DA[Go Agent / Docker Socket]
        FA[Go Agent / Inode File Tailer]
        CA[Custom HTTP Client / App / cURL]
    end

    subgraph Edge [Edge & Proxy]
        CD[Caddy 2 Reverse Proxy :80/:443]
    end

    subgraph Platform [Platform Core]
        UI[React 19 Web Console]
        API[FastAPI Ingestion & Search Engine]
        VK[(Valkey 8 Streams & Pub/Sub)]
        WR[Async Writer Daemon: Binary COPY]
        WK[Unified Worker: Alerter + Notifier + Maintenance]
        PG[(PostgreSQL 18 Daily Partitioned)]
    end

    DA -->|HTTP Batch| CD
    FA -->|HTTP Batch| CD
    CA -->|HTTP POST| CD

    CD -->|/| UI
    CD -->|/v1/*| API

    API -->|XADD Stream| VK
    API -->|PUBLISH Live Tail| VK
    VK -->|XREADGROUP Microbatch| WR
    WR -->|Binary COPY| PG
    API -->|TQL Parameterized Query| PG
    WK -->|Advisory Lock & Query| PG
    WK -->|Dispatch Webhooks| Sources
```

---

## 2. Ingestion and Query Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client as Log Producer (Agent / App)
    participant Caddy as Caddy Proxy (:80)
    participant API as FastAPI Ingestion
    participant Valkey as Valkey Stream & Pub/Sub
    participant Writer as Writer Consumer Daemon
    participant DB as PostgreSQL 18 Partitioned Engine
    actor Browser as Web Browser (Logs Explorer / Live Tail)

    Client->>Caddy: POST /v1/ingest (Bearer Token + JSON Batch)
    Caddy->>API: Reverse Proxy
    API->>API: Verify Token & Check Token-Bucket Limit (<10,000/s)
    API->>Valkey: XADD payload to tw:ingest:stream
    API->>Valkey: PUBLISH to tw:channel:tail (Live stream)
    Valkey-->>Browser: Push event to Live Tail terminal via SSE
    API-->>Client: 202 Accepted { "batch_id": "...", "count": 25 }

    loop Microbatch Ingest (every 250ms or 2,000 logs)
        Writer->>Valkey: XREADGROUP consumer batch
        Writer->>DB: Pre-create daily partition logs_pYYYYMMDD
        Writer->>DB: Check batch idempotency in ingest_batches
        Writer->>DB: Execute binary COPY logs FROM STDIN
        Writer->>Valkey: XACK stream message
    end

    Browser->>Caddy: GET /v1/logs?q=service:payment+level:error
    Caddy->>API: Reverse Proxy
    API->>API: Lex & Compile TQL to Parameterized SQL
    API->>DB: Execute Keyset Cursor Query with GIN Index
    DB-->>API: Filtered Log Records
    API-->>Browser: JSON Results with Histogram Sync
```

---

## 3. Platform Modules

| Subsystem | Folder | Key Responsibilities |
| :--- | :--- | :--- |
| **Edge Agent** | [`agent/`](agent/README.md) | Single-binary Go collector (<15 MB RSS). Inode file tailing, Docker socket streaming, RE2 secret redaction, and 16 MiB segment WAL disk spooling with CRC32C. |
| **Backend Engine** | [`server/`](server/README.md) | FastAPI REST service, TQL parser & SQL compiler, Valkey binary `COPY` writer, advisory-lock alert evaluator, and partition lifecycle manager. |
| **Web Console** | [`web/`](web/README.md) | React 19 single-page console built with pure CSS Modules. Canvas density histogram scrubber, SSE live tail terminal, structured JSON inspection drawer, and setup wizard. |
| **Chaos Suite** | [`chaos/`](chaos/README.md) | Multi-tier microservices traffic generator, failure injection scenarios (payment outage, DB lock, brute force), and independent SQLite audit ledger verifying 100% zero-loss ingestion. |
| **Deployment** | [`deploy/`](deploy/README.md) | Caddy 2 reverse proxy with automatic HTTP/2, static distribution routing, and write-optimized PostgreSQL 18 configuration. |

---

## 4. Complete Project Structure

```
Tailwatch/
├── .github/
│   └── workflows/
│       └── ci.yaml               # Automated CI for Agent, Server, and Web
├── agent/                        # Go static collection agent
│   ├── cmd/tailwatch-agent/      # CLI entrypoints (run, version)
│   ├── internal/
│   │   ├── config/               # YAML parser with env expansion
│   │   ├── mask/                 # RE2 secret & PII masking engine
│   │   ├── multiline/            # Stack trace aggregator (ISO8601, tracebacks)
│   │   ├── pipeline/             # In-memory buffer & spool replay loop
│   │   ├── sender/               # HTTP client with jittered backoff
│   │   ├── source/               # Docker socket & inode file collectors
│   │   └── spool/                # 16 MiB segment disk spooler with CRC32C
│   ├── pkg/protocol/             # Shared Go wire schemas
│   ├── go.mod                    # Go module dependencies
│   ├── go.sum                    # Cryptographic checksums
│   └── README.md                 # Agent reference manual
│
├── server/                       # Core backend (API, Writer, Alerts, TQL)
│   ├── src/tailwatch/
│   │   ├── alerting/             # Advisory lock state evaluator & outbox notifier
│   │   ├── api/                  # FastAPI routes (ingest, search, tail, auth)
│   │   ├── core/                 # Argon2id security & configuration settings
│   │   ├── db/                   # PostgreSQL 18 schema, partitions & GIN indexes
│   │   ├── ingest/               # Pydantic wire validation models
│   │   ├── maintenance/          # Daily partition auto-creation and retention cleanup
│   │   ├── query/                # TQL lexer, tokenizer, and SQL compiler
│   │   ├── writer/               # Valkey consumer daemon & binary COPY worker
│   │   └── cli.py                # Command line router (api, writer, worker, seed)
│   ├── tests/                    # Unit test suite (compiler, rate limiter, security)
│   ├── pyproject.toml            # Python package specifications
│   ├── Dockerfile                # Production container definition
│   └── README.md                 # Server reference manual
│
├── web/                          # Vercel-style UI console (React, TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/Shell/     # Navigation bar, light/dark theme switcher
│   │   │   └── ui/               # Button, Input, LevelPill, StatusChip, Toast
│   │   │       ├── Histogram/    # Canvas density scrubber with mouse brush
│   │   │       ├── Drawer/       # Structured JSON inspector & context viewer
│   │   │       └── QueryBar/     # TQL search box and time range selector
│   │   ├── features/
│   │   │   ├── logs/             # LogsExplorer search table with drawer integration
│   │   │   ├── tail/             # LiveTail streaming terminal over SSE
│   │   │   ├── alerts/           # AlertsView rule manager and creation modal
│   │   │   ├── sources/          # SourcesView host heartbeat telemetry
│   │   │   ├── system/           # SystemView buffer memory & partition gauges
│   │   │   ├── auth/             # AuthView initial setup and login forms
│   │   │   └── onboarding/       # OnboardingWizard snippet integration helper
│   │   ├── styles/tokens.css     # CSS custom property design tokens (60-30-10)
│   │   └── App.tsx               # Root view coordinator & authentication gate
│   ├── package.json              # Web dependencies
│   ├── Dockerfile                # Production asset build image
│   └── README.md                 # Web console reference manual
│
├── chaos/                        # Chaos testing & verification harness
│   ├── generator.py              # Multi-tier microservices synthetic log emitter
│   ├── ledger.py                 # Independent SQLite audit ledger
│   ├── chaosctl.py               # Stress test CLI runner & verification checker
│   ├── Dockerfile                # Standalone simulation container
│   └── README.md                 # Chaos manual and test procedures
│
├── deploy/                       # Infrastructure configuration
│   ├── caddy/Caddyfile           # Reverse proxy routing and cache headers
│   ├── postgres/postgresql.conf  # PostgreSQL 18 high-throughput tuning
│   └── README.md                 # Deployment infrastructure guide
│
├── compose.yaml                  # Complete 6-container production compose stack
├── compose.chaos.yaml            # Chaos simulation profile overlay
├── .env.example                  # Environment configuration template
└── README.md                     # Root technical reference
```

---

## 5. Quick Start Guide

### Step 1: Clone and Launch
```bash
git clone https://github.com/ADI-2707/Tailwatch.git
cd Tailwatch
cp .env.example .env
docker compose up --build -d
```

### Step 2: Access Console & Seed Data
1. Open **`http://localhost`** in your browser.
2. Complete the initial setup wizard to register your administrator account.
3. Seed default project, API keys, and sample alert rules:
   ```bash
   docker compose exec api tailwatch seed
   ```

### Step 3: Ingest Logs via Direct HTTP
```bash
curl -X POST http://localhost/v1/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer twk_live_test_key_master" \
  -d '{
    "batch_id": "manual-batch-001",
    "events": [
      {
        "ts": "2026-11-04T12:00:00Z",
        "level": "error",
        "service": "billing-api",
        "message": "Payment gateway handshake timed out",
        "fields": {
          "customer_id": "cust_9921",
          "provider": "stripe",
          "latency_ms": 5200
        }
      }
    ]
  }'
```

### Step 4: Run Verified Chaos Simulation
```bash
# Run synthetic steady-state failure simulation for 10 seconds
python -m chaos.chaosctl run --scenario steady --rate 50 --duration 10

# Audit delivery completeness against Tailwatch search API
python -m chaos.chaosctl verify
```

---

## 6. Tailwatch Query Language (TQL)

| Expression | Target Filter |
| :--- | :--- |
| `timeout connecting` | Full-text substring search across all log messages |
| `"gateway timeout"` | Exact phrase matching |
| `service:shop-payment` | Service name filter |
| `level:error` | Severity exact match |
| `level:>=warn` | Severity comparison (`WARN`, `ERROR`, `FATAL`) |
| `fields.status_code=500` | Structured JSON field match |
| `fields.latency_ms:>1000` | Numeric comparison on structured field |
| `NOT service:shop-auth` | Logical negation filter |
| `service:web level:error timeout` | Conjunction (AND) across all terms |

---

## 7. Deployment Profiles

| Profile | Node Count | vCPU | RAM | Retention | Max Log Burst |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S** | 1 to 5 nodes | 2 | 4 GB | 14 days | 5,000 / sec |
| **M** | 5 to 20 nodes | 4 | 8 GB | 30 days | 15,000 / sec |
| **L** | 20 to 50 nodes | 8 | 16 GB | 90 days | 35,000 / sec |

---

## 8. License

Apache-2.0 License.
