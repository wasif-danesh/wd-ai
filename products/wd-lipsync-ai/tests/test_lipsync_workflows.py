"""The config and the workflow are consistent; the picture and voice reach the right nodes."""

from pathlib import Path

from wd_platform_sdk import (
    CapabilityBinding,
    InMemoryJobSink,
    RunContext,
    load_product_config,
    reset_context,
    set_context,
)
from wd_platform_sdk.providers.comfyui import ComfyUIProvider
from wd_platform_sdk.workflows import Workflow, workflow_problems

PRODUCTS = Path(__file__).resolve().parents[2]
WORKFLOWS = PRODUCTS / "wd-lipsync-ai" / "workflows"
NAME = "infinitetalk-i2v"


def test_the_product_config_loads_and_binds_everything_the_graph_asks_for():
    cfg = load_product_config(PRODUCTS, "wd-lipsync-ai", environ={})
    assert cfg.capabilities["video.lipsync"].workflow == NAME
    assert cfg.capabilities["speech.synthesize"].provider == "speech"
    assert cfg.capabilities["speech.transcribe"].provider == "speech"
    assert cfg.capabilities["text.moderate"].model == "moderator"
    assert cfg.capabilities["text.moderate_image"].model == "multimodal"
    assert cfg.quotas == {"lipsyncs_per_user_per_day": 3}
    assert cfg.uploads["image"].max_bytes == 10 * 1024 * 1024
    assert cfg.uploads["audio"].max_seconds == 15  # ADR-0044: at most 15 seconds


def test_every_mapped_node_exists_in_the_workflow():
    assert workflow_problems(WORKFLOWS, NAME) == []


def test_the_clip_is_saved_as_video_with_the_voice_mixed_in_and_licences_are_recorded():
    wf = Workflow.load(WORKFLOWS, NAME)
    graph = wf.graph
    assert wf.map.outputs["video"].type == "video" and graph["17"]["class_type"] == "SaveVideo"
    assert graph["16"]["class_type"] == "CreateVideo" and graph["16"]["inputs"]["audio"] == ["9", 0]
    assert "Apache-2.0" in (wf.map.licence or "")
    # the sampler is fully wired (a missing link fails only on a real run)
    for required in ("model", "image_embeds", "text_embeds", "multitalk_embeds", "steps", "seed"):
        assert required in graph["14"]["inputs"], required


def test_the_workflow_takes_a_picture_a_voice_a_size_and_a_length():
    wf = Workflow.load(WORKFLOWS, NAME)
    assert set(wf.map.inputs) == {
        "prompt", "seed", "steps", "length", "width", "height", "image", "audio"
    }  # fmt: skip
    graph = wf.fill(
        {"image": "wd-J.png", "audio": "wd-J.wav", "length": 100, "width": 512, "height": 512}
    )
    assert (
        graph["6"]["inputs"]["image"] == "wd-J.png" and graph["9"]["inputs"]["audio"] == "wd-J.wav"
    )
    assert graph["11"]["inputs"]["num_frames"] == 100
    # the size drives both the scaling of the picture and the video embeds
    assert (graph["7"]["inputs"]["width"], graph["13"]["inputs"]["width"]) == (512, 512)


async def test_a_lipsync_job_names_the_picture_and_the_voice_for_the_worker():
    sink = InMemoryJobSink()
    provider = ComfyUIProvider(WORKFLOWS, sink)
    binding = CapabilityBinding(
        provider="comfyui", workflow=NAME, defaults={"width": 640, "height": 640, "steps": 4}
    )
    token = set_context(RunContext("t1", "wd-lipsync-ai", "u1", "run-1", "th-1"))
    try:
        handle = await provider.generate(
            "video.lipsync",
            binding,
            {
                "prompt": "a person is talking", "seed": 1, "length": 75,
                "image_key": "uploads/a.png", "audio_key": "uploads/b.wav",
            },
        )  # fmt: skip
    finally:
        reset_context(token)
    (job,) = sink.submitted
    assert job.job_id == handle.job_id and job.capability == "video.lipsync"
    assert job.prompt["6"]["inputs"]["image"] == f"wd-{job.job_id}.png"
    assert job.prompt["9"]["inputs"]["audio"] == f"wd-{job.job_id}.wav"
    assert job.inputs["audio_key"] == "uploads/b.wav" and "uploads/" not in str(job.prompt)
    assert job.outputs["video"] == {"node": "17", "type": "video"}
