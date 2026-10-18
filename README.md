# Tailwatch

Logs and alerts for small teams. One compose file.

## Overview
Tailwatch is a self-hosted log platform designed for teams with 1 to 10 servers. It installs with one compose file, ships logs through a small static agent, supports fast full-text and field search, and sends alerts that do not spam.

## Architecture
- **Agent:** Go static binary (files, docker, multiline, secret masking, disk spool)
- **API & Writer:** Python async service (FastAPI, psycopg3 binary COPY, orjson)
- **Queue:** Valkey Streams (in-memory buffer + AOF)
- **Database:** PostgreSQL 18 (daily range partitions, tsvector full-text search)
- **Web UI:** React 19, TypeScript, Vite, CSS Modules with strict design tokens
- **Proxy:** Caddy 2 with automatic TLS
