# ADR-0037: The video product: text to video and image to video

- **Status:** Proposed
- **Date:** 2026-10-08

## Context

The studio's Video card (ADR-0033) is still a "Coming soon" page. The product should make a short clip from a
description ("text to video") or from one picture plus a description of what moves ("image to video"), on a small
open model that runs on the Mac we develop on, and later on any GPU through the same capability names.

We tried the two candidates on the local ComfyUI 0.39 (Apple silicon, 64 GB, MPS) before choosing. Same prompt, a
2-second clip each. Times include loading the model. Frames were looked at, not just counted.

| Model | Mode | Setting | Result | Time |
|---|---|---|---|---|
| LTX-Video 2B 0.9.5 | text to video | 768x512, 49 frames, 30 steps | A clear fox walking through snow | 185 s |
| LTX-Video 2B 0.9.5 | image to video | 640x352, 49 frames, 30 steps, image strength 1.0 | Faithful to the picture, little motion | 95-130 s |
| Wan 2.2 TI2V 5B | text to video | 640x352, 17 frames, 12 steps | Works, cartoonish, but only in fp32 | 110 s |
| Wan 2.2 TI2V 5B | image to video | 640x352, 33 frames, 20 steps | **Broken**: frame 1 is the picture, later frames collapse to noise | 205-296 s |

Findings that shape the decision:

- **Wan 2.2 5B gives abstract colour blur in fp16 and bf16 on the Mac.** The VAE alone round-trips a picture
  perfectly, so the fault is in the diffusion model on MPS. In fp32 text to video works. Image to video stayed
  broken in fp32, also with a prompt that matched the picture. We did not find out why.
- **LTX 0.9.5 worked in fp32 for both modes.** We did not try it in half precision.
- **LTX image to video needs image strength 1.0 and a prompt that describes the picture.** At the template's 0.15 it
  ignored the photo and drew the prompt instead.
- Wan 2.2 is Apache 2.0. LTX-Video 2B 0.9.5 is the Open RAIL-M licence (March 2025): commercial use is allowed
  but with use restrictions that must be passed on to users. Later LTX weights (0.9.6 and up) use a different
  licence that requires a paid licence above USD 10M annual revenue, so we pin 0.9.5 (ADR-0012 asks for a
  commercial-use check; this is it).

## Decision

- **A new product, `wd-video-ai`**, with its own tenancy, usage and quota, built like `wd-image-ai` (ADR-0036).
  Web area `/video` (create) and `/video/creations/{id}` (one clip). The home card goes live and the "Coming soon"
  page is retired.
- **Model: LTX-Video 2B 0.9.5** (`ltx-video-2b-v0.9.5.safetensors`, 6.3 GB, and the `t5xxl_fp16` text encoder,
  9.8 GB). Wan 2.2 5B is **not** used now: its image to video is broken on our hardware and it needs fp32 anyway.
  It stays a candidate for a CUDA host, where the `video.*` capabilities can be pointed at it without a code change.
- **Two modes, one picture at most.** *Text to video*: a prompt and a shape (landscape 768x512, portrait 512x768,
  square 512x512). *Image to video*: one uploaded picture (ADR-0035) and a description of what happens; the
  clip keeps the picture's shape, scaled to about 0.3 megapixel and to multiples of 32. Fixed length: **49 frames
  at 24 fps, about 2 seconds**. Longer clips, several pictures, audio and upscaling are not in the first version.
- **Capabilities, not models.** `video.generate` (text to video) and `video.animate` (image to video), bound in
  `product.yaml` to ComfyUI workflows `ltx-video-2b-t2v` and `ltx-video-2b-i2v` with map files, **both run for
  real** before acceptance. `video.animate` is a new verb next to `generate` and `edit` in the SDK; it takes
  `image_key` exactly as `image.edit` does. Both are switchable per capability at `/admin/media` (ADR-0032). Image
  strength is fixed at 1.0 in the i2v workflow, not a user setting.
- **The video runs on its own ComfyUI.** Our test needed ComfyUI started with `--fp32-unet`, a process-wide flag,
  and fp32 would slow and enlarge the image and music models if they shared it. So `video.generate` and
  `video.animate` are bound to a second local ComfyUI (default `http://localhost:8189`, set by the capability's
  `base_url` binding, ADR-0032). Both instances share one GPU and one `gpu_id`, so the worker still runs one job at
  a time and the LLM-unload rule still applies. The dedicated instance's start command goes in
  `docs/configuration.md` and the setup script. If half precision is later shown to work for LTX on this hardware,
  the second instance can be dropped.
- **Jobs take minutes.** A clip is 2-3 minutes on the Mac, so the worker's `job_timeout_s` (900 s today) is enough;
  queue position and progress use the existing `job_progress` events (ADR-0021). The UI says "about 3 minutes".
  Quota: `videos_per_user_per_day: 5` (to be tuned with real usage).
- **Graph.** `check_request` (input validation, quota, guardrail) then `start_job` / `await_job` and `finalise`:
  save the MP4 (H.264, no audio), make a 480 px JPEG poster from its first frame (with the bundled ffmpeg the
  downloads already use, ADR-0034), delete the uploaded picture, write the `videos` row (migration 0010:
  id, tenant, product, user, mode, prompt, width, height, frames, fps, video_key, poster_key, created_at) and the
  usage event `video.created`. A failed job also deletes the upload.
- **Guardrail: the same as the image product (ADR-0036), fail closed.** The prompt goes to the `moderator` alias, a
  picture also to `multimodal`, with the same categories, fixed refusal texts and a canary. Animating a photo of a
  real person is the same ordinary-edit case the user already allowed for images, and it is the riskier one for
  video: **this ADR keeps that rule but flags it for review** once there are real examples. The model makes no sound
  or lip-sync, which limits impersonation. The finished clip is **not screened** (same known gap as images; the
  next safety step for both products, and more pressing for video).
- **My creations.** Clips appear in the unified My creations library at `/creations`, which already lists songs
  and images; it gains a "Videos" filter and a clip card (poster, prompt, time). `GET /videos`, `GET/DELETE
  /videos/{id}` and a same-origin download route (the MP4 as an attachment, like songs and images) serve it.
  Deleting removes the row, the video and the poster.
- **Web.** `/video` mirrors `/image`: a "From text" / "From a picture" switch, the 10 MB picture check, a note that
  the upload is deleted once the clip is made, and a hint to describe the picture and what should move (image to
  video fights a prompt that contradicts its picture). Result: an inline player, Download, Make another, Open in
  My creations. Sign-in is required for `/video`, like `/music` and `/image`.

## Consequences

- Needs ADR-0035 (done) and ADR-0036's patterns. New pieces, in order: the two workflows and map files and a real
  run of each; the `video.animate` verb in the SDK and the `openai-images`-style backends ignoring it (no hosted
  backend for video yet, so `/admin/media` offers only ComfyUI backends for these capabilities); the product, its
  guardrail evaluation and tests; the web area and the Videos filter; docs.
- About 16 GB of model files for LTX (the Wan files we downloaded for the test, about 18 GB, can be removed).
- A second ComfyUI process on the Mac, with its own memory use (about 8 GB for the fp32 model plus the text
  encoder). Production images and Helm values need the same "video ComfyUI" option; the chart's `comfyui.*` values
  already allow more than one.
- The Open RAIL-M restrictions must reach users through the terms of service, which do not exist yet
  ("Legal basics" in the roadmap). That must be done before the video product is opened to the public.
- Clips are short and the image-to-video motion is gentle. Better motion (higher resolution, more steps, a newer
  model) is a later change behind the same capability names.

## Not verified

- LTX in half precision on this hardware, higher resolutions, longer clips, and Comfy Cloud or other backends.
- The reason Wan 2.2 5B fails on MPS (image to video in fp32, and every mode in half precision).
- The guardrail on unsafe pictures and the clip output, as for images.
