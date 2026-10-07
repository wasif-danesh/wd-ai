from wd_platform_sdk import GraphRegistry

from wd_api.graphs.hello import build_hello


def default_registry() -> GraphRegistry:
    registry = GraphRegistry()
    registry.register("hello", build_hello)
    return registry
