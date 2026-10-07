import json
from typing import Any, TypedDict

import pytest
from fastapi.testclient import TestClient
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt
from wd_api.graphs import default_registry
from wd_api.main import create_app
from wd_platform_sdk import Capabilities, FakeTextProvider, GraphRegistry


def parse(text: str) -> list[tuple[str, dict]]:
    out = []
    for block in text.strip().split("\n\n"):
        lines = [ln for ln in block.split("\n") if not ln.startswith(":")]
        if not lines:
            continue
        ev = lines[1].removeprefix("event: ")
        out.append((ev, json.loads(lines[2].removeprefix("data: "))))
    return out


@pytest.fixture
def client():
    caps = Capabilities(text=FakeTextProvider("Hello there friend"))
    app = create_app(default_registry(), caps, InMemorySaver(), heartbeat_s=0.05)
    with TestClient(app) as c:
        yield c


def test_hello_run_streams_tokens_and_done(client):
    r = client.post("/products/hello/runs", json={"input": {"message": "hi"}})
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/event-stream")
    events = parse(r.text)
    names = [e for e, _ in events]
    assert names[0] == "node" and names[-1] == "done"
    assert "".join(d["text"] for e, d in events if e == "token").strip() == "Hello there friend"
    seqs = [d["seq"] for _, d in events]
    assert seqs == list(range(1, len(seqs) + 1))
    assert events[-1][1]["outputs"]["reply"] == "Hello there friend"


def test_unknown_product_404(client):
    assert client.post("/products/nope/runs", json={}).status_code == 404


def test_reconnect_replays_after_last_event_id(client):
    r = client.post("/products/hello/runs", json={"input": {"message": "hi"}})
    events = parse(r.text)
    run_id = events[0][1]["run_id"]
    replay = client.get(f"/runs/{run_id}/events", headers={"Last-Event-ID": "2"})
    assert [d["seq"] for _, d in parse(replay.text)] == [d["seq"] for _, d in events][2:]


def test_other_users_run_is_404(client):
    from uuid import uuid4

    assert client.get(f"/runs/{uuid4()}/events").status_code == 404


class ApproveState(TypedDict, total=False):
    draft: str
    approved: str


def _approve_graph(caps: Capabilities, checkpointer: Any):
    def ask(state: ApproveState) -> ApproveState:
        answer = interrupt({"kind": "approve_draft", "draft": "v1"})
        return {"approved": answer}

    g = StateGraph(ApproveState)
    g.add_node("ask", ask)
    g.add_edge(START, "ask")
    g.add_edge("ask", END)
    return g.compile(checkpointer=checkpointer)


def test_interrupt_and_resume():
    registry = GraphRegistry()
    registry.register("approve", _approve_graph)
    app = create_app(registry, Capabilities(FakeTextProvider()), InMemorySaver(), 0.05)
    with TestClient(app) as c:
        first = parse(c.post("/products/approve/runs", json={}).text)
        assert first[-1][0] == "interrupt"
        assert first[-1][1]["kind"] == "approve_draft"
        run_id = first[-1][1]["run_id"]
        second = parse(c.post(f"/runs/{run_id}/resume", json={"value": "yes"}).text)
        assert second[-1][0] == "done"
        assert second[-1][1]["outputs"]["approved"] == "yes"
        assert second[0][1]["seq"] == first[-1][1]["seq"] + 1
        assert c.post(f"/runs/{run_id}/resume", json={"value": "x"}).status_code == 409
