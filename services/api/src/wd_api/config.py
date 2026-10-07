from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Secrets and environment wiring. Read only from env vars (see docs/configuration.md)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://wd:wd@localhost:5432/wd"
    redis_url: str = "redis://localhost:6379/0"
    litellm_base_url: str = "http://localhost:4000"
    litellm_api_key: str = ""
    comfyui_base_url: str = "http://host.containers.internal:8188"
    ollama_base_url: str = "http://host.containers.internal:11434"
    log_level: str = "INFO"

    @property
    def checkpoint_url(self) -> str:
        """psycopg-style DSN for the LangGraph Postgres checkpointer."""
        return self.database_url.replace("+asyncpg", "")

    default_tenant_id: str = "dev-tenant"
    dev_user_id: str = "dev-user"


@lru_cache
def get_settings() -> Settings:
    return Settings()
