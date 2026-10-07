"""Graph registry: products register graph builders; the API exposes them generically."""

from collections.abc import Callable
from importlib.metadata import entry_points
from typing import Any

from wd_platform_sdk.capabilities import Capabilities
from wd_platform_sdk.routes import RouteFactory

# builder(caps, checkpointer) -> compiled LangGraph graph
GraphBuilder = Callable[[Capabilities, Any], Any]


class GraphRegistry:
    def __init__(self) -> None:
        self._builders: dict[str, GraphBuilder] = {}
        self._routes: dict[str, RouteFactory] = {}

    def register(self, product_id: str, builder: GraphBuilder) -> None:
        if product_id in self._builders:
            raise ValueError(f"graph already registered for product {product_id!r}")
        self._builders[product_id] = builder

    def add_routes(self, product_id: str, factory: RouteFactory) -> None:
        """Register product-provided API routes, mounted under /products/{product_id}/."""
        self._routes[product_id] = factory

    def route_factories(self) -> dict[str, RouteFactory]:
        return dict(self._routes)

    def build(self, product_id: str, caps: Capabilities, checkpointer: Any) -> Any:
        try:
            return self._builders[product_id](caps, checkpointer)
        except KeyError:
            raise KeyError(f"unknown product {product_id!r}") from None

    def load_entry_points(self, group: str = "wd_ai.products") -> list[str]:
        """Let installed product packages register their graphs. A product declares

            [project.entry-points."wd_ai.products"]
            wd-music-ai = "wd_music_ai:register"

        where `register(registry)` calls `registry.register(...)`. Returns the names loaded."""
        loaded = []
        for ep in entry_points(group=group):
            ep.load()(self)
            loaded.append(ep.name)
        return loaded

    def products(self) -> list[str]:
        return sorted(self._builders)
