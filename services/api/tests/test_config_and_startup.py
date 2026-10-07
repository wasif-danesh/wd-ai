import pytest
from fastapi.testclient import TestClient
from langgraph.checkpoint.memory import InMemorySaver
from wd_api.graphs import default_registry
from wd_api.graphs.hello import build_hello
from wd_api.main import create_app
from wd_platform_sdk import (
    ConfigError,
    GraphRegistry,
    InMemoryEventLog,
    InMemoryRunStore,
    InMemoryUsageRecorder,
)


def test_bad_product_config_fails_at_startup(tmp_path):
    (tmp_path / "hello").mkdir()
    (tmp_path / "hello" / "product.yaml").write_text(
        "id: hello\ncapabilities:\n  text.chat: { provider: litellm }\n"
    )
    registry = GraphRegistry()
    registry.register("hello", build_hello)
    app = create_app(
        registry,
        tmp_path,
        InMemorySaver(),
        InMemoryUsageRecorder(),
        event_log=InMemoryEventLog(),
        run_store=InMemoryRunStore(),
    )
    with pytest.raises(ConfigError, match="requires 'model'"):
        with TestClient(app):
            pass


def test_committed_hello_config_boots(tmp_path):
    from pathlib import Path

    products = Path(__file__).resolve().parents[3] / "products"
    app = create_app(
        default_registry(),
        products,
        InMemorySaver(),
        InMemoryUsageRecorder(),
        event_log=InMemoryEventLog(),
        run_store=InMemoryRunStore(),
    )
    with TestClient(app) as c:
        assert c.get("/health").json() == {"status": "ok"}
