"""One-node walking-skeleton graph: streams a reply to the user's message."""

from typing import Any, TypedDict

from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph
from wd_platform_sdk import Capabilities

SYSTEM = "You are a friendly assistant. Answer in one or two short sentences."


class HelloState(TypedDict, total=False):
    message: str
    reply: str


def build_hello(caps: Capabilities, checkpointer: Any):
    async def hello(state: HelloState) -> HelloState:
        write = get_stream_writer()
        write({"type": "node", "node": "hello", "status": "started", "label": "Thinking"})
        parts: list[str] = []
        async for delta in caps.text.stream("chat", SYSTEM, state.get("message", "")):
            parts.append(delta)
            write({"type": "token", "node": "hello", "text": delta})
        return {"reply": "".join(parts).strip()}

    graph = StateGraph(HelloState)
    graph.add_node("hello", hello)
    graph.add_edge(START, "hello")
    graph.add_edge("hello", END)
    return graph.compile(checkpointer=checkpointer)
