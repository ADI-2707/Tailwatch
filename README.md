# Tailwatch

Tailwatch is a self-hosted log aggregation, search, and alerting platform designed for lean engineering teams and modern infrastructure. It deploys via a single Docker Compose specification, collects logs via a lightweight Go agent or direct HTTP endpoints, buffers through Valkey Streams, persists into a daily-partitioned PostgreSQL 18 engine with binary ingest paths, and provides a Vercel-inspired web console.

## Architecture

```
+-------------------------------------------------------------+
| Sources (Docker, Files, Serverless, Next.js, HTTP API)      |
+-------------------------------------------------------------+
                              |
                              v
                      [ Caddy 2 Proxy ]
                     (Port 80 / Port 443)
                              |
              +---------------+---------------+
              |                               |
              v                               v
    [ Web Dashboard ]                  [ FastAPI Ingestion ]
    (React / TypeScript)               (Token Bucket, Auth)
                                              |
                                              v
                                      [ Valkey Stream ]
                                      (Buffer & Shedding)
                                              |
                                              v
                                      [ Async Writer ]
                                      (Microbatch binary COPY)
                                              |
                                              v
                                      [ PostgreSQL 18 ]
                                      (Daily Partitioning)
```

### Components

- **Edge Proxy (Caddy 2)**: Automated TLS certificate provisioning, HTTP/2 termination, reverse proxying, and static distribution serving.
- **API Server (FastAPI)**: Token-bucket rate limiting, Argon2id authentication, SSE live tail broadcasting, and TQL (Tailwatch Query Language) compilation.
- **Buffer (Valkey 8)**: Append-only memory queue handling ingest bursts up to 10,000 events per second.
- **Writer Daemon**: Background worker consuming microbatches from Valkey and executing high-throughput binary `COPY` into PostgreSQL.
- **Storage Engine (PostgreSQL 18)**: Native daily range partitioning on `logs`, GIN index acceleration for full-text search, and 1-minute rollup aggregates.
- **Web Console**: High-performance single page application built with React, TypeScript, and pure CSS Modules following the 60-30-10 design system with high-contrast dark and light modes.
- **Agent (Go)**: Static binary with sub-15 MB RAM overhead, multiline joining, RE2 secret redaction, Docker engine socket ingestion, and CRC32C segment disk spooling.
- **Chaos Suite**: Realistic synthetic microservice generator simulating normal operations and distributed system failures with an independent audit ledger for zero-loss verification.

## Deployment Profiles

| Profile | Target Size | vCPU | RAM | Partitions Retention | Max Log Burst |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S** | 1 to 5 nodes | 2 | 4 GB | 14 days | 5,000 / sec |
| **M** | 5 to 20 nodes | 4 | 8 GB | 30 days | 15,000 / sec |
| **L** | 20 to 50 nodes | 8 | 16 GB | 90 days | 35,000 / sec |

## Getting Started

### Prerequisites

- Docker Engine 24.0 or newer
- Docker Compose v2

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/ADI-2707/Tailwatch.git
   cd Tailwatch
   ```

2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Launch the platform:
   ```bash
   docker compose up --build -d
   ```

4. Access the web interface:
   Open `http://localhost` in your browser. Complete the initial setup wizard to create the administrator account and default project.

## Ingestion API

Log events are accepted at `/v1/ingest` via HTTP POST.

### Authentication
Requests require an API key passed in the `Authorization` header:
```
Authorization: Bearer <API_KEY>
```

### Payload Schema
```json
{
  "batch_id": "batch-100293",
  "events": [
    {
      "ts": "2026-10-18T12:00:00Z",
      "level": "error",
      "service": "billing-service",
      "message": "Failed to charge customer card",
      "fields": {
        "customer_id": "cust_8281",
        "error_code": "CARD_DECLINED",
        "attempt": 2
      }
    }
  ]
}
```

## Tailwatch Query Language (TQL)

The web console and `/v1/logs` search API support TQL expressions:

- Full-text search: `timeout connecting to redis`
- Service filtering: `service:shop-payment`
- Severity filtering: `level:error` or `level:>=warn`
- Structured field filtering: `fields.status_code=500` or `fields.latency_ms:>1000`
- Conjunctions: `service:shop-web level:error fields.status_code=500`

## Repository Structure

- `agent/`: Go log shipping agent source code and CLI.
- `server/`: Python backend, TQL compiler, writer daemon, and migration scripts.
- `web/`: React frontend web application with tokens and CSS Modules.
- `chaos/`: Microservice chaos test suite and verification CLI.
- `deploy/`: Caddyfile, PostgreSQL configuration, and deployment manifests.

## License

Apache-2.0 License.
