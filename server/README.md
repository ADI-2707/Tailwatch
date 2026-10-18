# Tailwatch Server

The core backend for Tailwatch, written in Python with FastAPI, psycopg3, and Valkey. The server encompasses the HTTP ingestion and query API, the asynchronous writer daemon, the TQL query compiler, the live tail streaming bus, and the alert evaluator.

## Architecture & Subsystems

### 1. Ingestion & API (`tailwatch.api`)
- Fast, non-blocking ingestion endpoint (`/v1/ingest`) validates incoming log batches, applies sliding-window token-bucket rate limiting per API key, records host heartbeat telemetry, and appends payloads directly into Valkey Streams (`tw:ingest:stream`).
- Exposes authenticated search endpoints (`/v1/logs`, `/v1/histogram`, `/v1/logs/tail`, `/v1/projects`, `/v1/alert-rules`, `/v1/sources`, `/v1/system/status`).
- Broadcasts real-time events to connected clients via Server-Sent Events (SSE) backed by Valkey Pub/Sub channels.

### 2. High-Throughput Writer (`tailwatch.writer`)
- Consumes microbatches from Valkey Streams using consumer groups.
- Executes PostgreSQL 18 binary `COPY` protocol via `psycopg` for peak throughput exceeding 30,000 logs/second.
- Dynamically checks and creates future daily range partitions (`logs_pYYYYMMDD`) to guarantee zero write failure on date boundaries.
- Deduplicates ingested batches using SHA-256 hash digests.

### 3. TQL Query Engine (`tailwatch.query`)
- Custom recursive-descent lexer and AST compiler transforming user-entered queries into parameterized SQL.
- Maps full-text terms to PostgreSQL `websearch_to_tsquery('english', %s)` accelerated by GIN indexes.
- Compiles service, level, and JSON field lookups (`fields.user_id = %s`, `fields.latency_ms > %s`).

### 4. Alerting Engine (`tailwatch.alerting`)
- Evaluator loop periodically queries active alert rules using PostgreSQL session-level advisory locks for single-leader coordination.
- Transition state machine tracks state transitions across `OK`, `PENDING`, and `FIRING`.
- Asynchronous notification dispatcher reads pending alerts from the `notifications` outbox table and delivers webhooks with SSRF IP address validation.

## Configuration Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `TW_DATABASE_URL` | `postgresql://tailwatch:tailwatch@localhost:5432/tailwatch` | PostgreSQL 18 connection string |
| `TW_VALKEY_URL` | `redis://localhost:6379/0` | Valkey or Redis connection string |
| `TW_SECRET_KEY` | `tw-default-change-in-production-secret-key-32b` | Secret key for crypto operations |
| `TW_ENV` | `development` | Runtime environment (`development`, `production`) |
| `TW_PORT` | `8000` | Port for the API server |
| `TW_INGEST_BURST_LIMIT` | `10000` | Burst maximum logs per second per key |
| `TW_RETENTION_DAYS` | `14` | Default log retention window in days |

## CLI Commands

The `tailwatch` command-line utility provides the service entrypoints:

```bash
# Run database migrations and prepare schema
tailwatch migrate

# Run the API web server
tailwatch api

# Run the microbatch writer daemon
tailwatch writer
```

## Local Development

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -e .

tailwatch migrate
tailwatch api
```
