# Tailwatch Server

The core backend for Tailwatch, written in Python with FastAPI, psycopg3, and Valkey. The server encompasses the HTTP ingestion and query API, the asynchronous writer daemon, the TQL query compiler, the live tail streaming bus, and the alert evaluator.

## System Flowcharts

### 1. Ingestion and Storage Pipeline

```mermaid
graph TD
    REQ[HTTP Client Request] --> API[FastAPI /v1/ingest]
    API --> AUTH{Verify API Key}
    AUTH -->|Invalid| E401[401 Unauthorized]
    AUTH -->|Valid| TB{Token Bucket Limiter}
    TB -->|> 10,000 logs/s| E429[429 Too Many Requests]
    TB -->|Under Burst Limit| SHED{Queue Backpressure > 75k?}
    SHED -->|Yes| DROP[Drop debug & trace logs]
    SHED -->|No| PACK[Serialize orjson payload]
    DROP --> PACK
    PACK --> XADD[(Valkey Stream: tw:ingest:stream)]
    XADD -->|HTTP 202 Accepted| RES[Return batch_id to Client]

    subgraph Consumer Loop [Writer Daemon]
        XADD -->|XREADGROUP microbatch| BATCH[Microbatch Buffer]
        BATCH --> PART{Daily Partition Exists?}
        PART -->|No| MKPART[CREATE TABLE logs_pYYYYMMDD PARTITION OF logs]
        PART -->|Yes| BCOPY[Binary COPY into PostgreSQL 18]
        MKPART --> BCOPY
        BCOPY --> XACK[XACK stream entry]
    end
```

### 2. Alert Evaluation and Outbox Notification Flow

```mermaid
sequenceDiagram
    autonumber
    participant Lock as PostgreSQL Advisory Lock (Leader)
    participant Eval as Alert Evaluator Loop (every 15s)
    participant DB as PostgreSQL 18 Logs & Rules
    participant Outbox as Notifications Outbox Table
    participant Notifier as Notifier Worker
    participant Webhook as External Webhook Target

    Eval->>Lock: Try pg_try_advisory_lock(948271)
    alt Lock Acquired (Single Leader)
        Eval->>DB: Query Active Alert Rules
        loop For Each Active Rule
            Eval->>DB: Execute Compiled TQL Count Query over Time Window
            alt Count >= Threshold
                Eval->>DB: Transition state to PENDING or FIRING
                Eval->>Outbox: INSERT INTO notifications (outbox payload)
            else Count < Threshold
                Eval->>DB: Transition state to OK (Resolve alert)
            end
        end
    else Lock Busy
        Eval->>Eval: Standby mode (follower)
    end

    loop Outbox Delivery Loop (every 1s)
        Notifier->>Outbox: SELECT * FROM notifications WHERE status = 'pending' FOR UPDATE SKIP LOCKED
        Notifier->>Notifier: SSRF Guard (Reject private/loopback IP addresses)
        Notifier->>Webhook: POST JSON Payload (retry with jitter backoff)
        Notifier->>Outbox: UPDATE notifications SET status = 'delivered'
    end
```

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

## Project Structure

```
server/
├── src/
│   └── tailwatch/
│       ├── api/
│       │   ├── routes/
│       │   │   ├── auth.py       # Authentication, setup, login, sessions
│       │   │   ├── ingest.py     # High-speed log batch ingestion & rate limiter
│       │   │   ├── search.py     # Keyset-paginated search with context expansion
│       │   │   ├── histogram.py  # date_bin aggregation for log density
│       │   │   ├── tail.py       # Server-Sent Events (SSE) streaming endpoint
│       │   │   ├── projects.py   # Project and API key management CRUD
│       │   │   ├── alerts.py     # Alert rules management endpoints
│       │   │   └── telemetry.py  # Host sources and system status gauges
│       │   ├── deps.py           # FastAPI dependency injection & auth guard
│       │   └── main.py           # Application initialization, middleware, routes
│       ├── writer/
│       │   └── consumer.py       # Valkey stream reader & binary COPY writer
│       ├── query/
│       │   ├── lexer.py          # TQL recursive token scanner
│       │   └── compiler.py       # AST to parameterized PostgreSQL SQL compiler
│       ├── alerting/
│       │   ├── evaluator.py      # Leader-elected rule evaluation state machine
│       │   └── notifier.py       # Outbox notification worker with SSRF protection
│       ├── core/
│       │   ├── config.py         # Pydantic environment configuration
│       │   └── security.py       # Argon2id password hashing & session crypto
│       ├── db/
│       │   └── schema.sql        # PostgreSQL 18 partitioned database schema
│       └── cli.py                # Command line router (api, writer, migrate)
├── pyproject.toml                # Build system and dependencies specification
├── Dockerfile                    # Multi-stage production container
└── README.md                     # Server technical manual
```

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
