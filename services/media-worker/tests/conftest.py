import pytest
from fake_comfyui import FakeComfyServer


@pytest.fixture
def comfy():
    server = FakeComfyServer()
    base_url = server.start()
    yield base_url, server.fake
    server.stop()
