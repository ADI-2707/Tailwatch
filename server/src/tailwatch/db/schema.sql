CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,38}$'),
    name TEXT NOT NULL,
    retention_days INT NOT NULL DEFAULT 14 CHECK (retention_days BETWEEN 1 AND 365),
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION tw_tokenize(t text) RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT to_tsvector('simple', regexp_replace(left(t, 32768), '[/\\:=_,;()\[\]{}"''|<>@&?#.-]+', ' ', 'g'))
$$;

CREATE SEQUENCE IF NOT EXISTS logs_id_seq CACHE 1000;

CREATE TABLE IF NOT EXISTS logs (
    id BIGINT NOT NULL DEFAULT nextval('logs_id_seq'),
    project_id UUID NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    level SMALLINT NOT NULL,
    service TEXT NOT NULL,
    host TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    fields JSONB NOT NULL DEFAULT '{}',
    trace_id TEXT,
    pattern_id BIGINT,
    flags INT NOT NULL DEFAULT 0,
    msg_tsv TSVECTOR GENERATED ALWAYS AS (tw_tokenize(message)) STORED
) PARTITION BY RANGE (ts);

CREATE TABLE IF NOT EXISTS log_rollup_1m (
    project_id UUID NOT NULL,
    bucket TIMESTAMPTZ NOT NULL,
    service TEXT NOT NULL,
    host TEXT NOT NULL,
    level SMALLINT NOT NULL,
    events BIGINT NOT NULL,
    bytes BIGINT NOT NULL,
    PRIMARY KEY (project_id, bucket, service, host, level)
);

CREATE TABLE IF NOT EXISTS ingest_batches (
    project_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_count INT NOT NULL,
    PRIMARY KEY (project_id, batch_id)
);

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    scopes TEXT[] NOT NULL DEFAULT ARRAY['ingest'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);
