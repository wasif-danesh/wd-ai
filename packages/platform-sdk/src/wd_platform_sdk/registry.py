"""Graph registry: products register graph builders; the API exposes them generically."""

from collections.abc import Callable
from typing import Any

from wd_platform_sdk.capabilities import Capabilities

# builder(caps, checkpointer) -> compiled LangGraph graph
GraphBuilder = Callable[[Capabilities, Any], Any]


class GraphRegistry:
    def __init__(self) -> None:
        self._builders: dict[str, GraphBuilder] = {}

    def register(self, product_id: str, builder: GraphBuilder) -> None:
        if product_id in self._builders:
            raise ValueError(f"graph already registered for product {product_id!r}")
        self._builders[product_id] = builder

    def build(self, product_id: str, caps: Capabilities, checkpointer: Any) -> Any:
        try:
            return self._builders[product_id](caps, checkpointer)
        except KeyError:
            raise KeyError(f"unknown product {product_id!r}") from None

    def products(self) -> list[str]:
        return sorted(self._builders)
