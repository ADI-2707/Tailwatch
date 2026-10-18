from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    tw_database_url: str = "postgresql://tailwatch:tailwatch@localhost:5432/tailwatch"
    tw_valkey_url: str = "redis://localhost:6379/0"
    tw_master_key: str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    tw_session_secret: str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    tw_public_url: str = "http://localhost:80"
    tw_api_workers: int = 2
    tw_writer_workers: int = 2
    tw_ingest_max_events: int = 5000
    tw_ingest_max_body: int = 5 * 1024 * 1024
    tw_ingest_max_decompressed: int = 20 * 1024 * 1024
    tw_lean_indexes: bool = False
    tw_retention_default_days: int = 14
    tw_log_level: str = "info"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
