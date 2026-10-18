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

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email CITEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    config_enc TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    kind TEXT NOT NULL DEFAULT 'threshold',
    query TEXT NOT NULL,
    window_s INT NOT NULL DEFAULT 300,
    comparator TEXT NOT NULL DEFAULT 'above',
    threshold NUMERIC NOT NULL,
    for_s INT NOT NULL DEFAULT 0,
    resolve_after INT NOT NULL DEFAULT 2,
    cooldown_s INT NOT NULL DEFAULT 600,
    renotify_s INT NOT NULL DEFAULT 3600,
    severity TEXT NOT NULL DEFAULT 'warning',
    channel_ids UUID[] DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_instances (
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'ok',
    since TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_eval_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_value NUMERIC NOT NULL DEFAULT 0,
    incident_id UUID,
    PRIMARY KEY (rule_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL,
    channel_id UUID,
    kind TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
