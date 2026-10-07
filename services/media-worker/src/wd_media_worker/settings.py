from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    """Environment wiring and secrets only (rule 13); product config never lands here."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    redis_url: str = "redis://localhost:6379/0"
    database_url: str = ""  # usage events; unset = do not record (local experiments only)

    comfyui_base_url: str = "http://localhost:8188"
    comfyui_mode: str = "real"  # real | stub (stub returns placeholder files, no GPU needed)

    ollama_base_url: str = ""  # set to unload LLMs from the GPU before each job
    unload_llm: bool = True

    gpu_id: str = "gpu0"  # workers sharing one GPU share this id and take turns
    job_timeout_s: int = 900
    max_attempts: int = 3
    log_level: str = "INFO"

    storage_endpoint: str = "http://localhost:8333"
    storage_bucket: str = "wd-ai"
    storage_region: str = "us-east-1"
    storage_access_key: str = ""
    storage_secret_key: str = ""
