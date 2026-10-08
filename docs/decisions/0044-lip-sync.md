# ADR-0044: Lip Sync

- **Status:** Proposed
- **Date:** 2026-10-09

## Context

The studio's home page has a "Lip Sync" card marked Coming soon. A user supplies a **character image** and
a **voice, a song or a script**, and gets a video of the character speaking or singing in sync. It builds on the
other two speech ADRs and on the video product:

- the character image uses the picture upload and component (ADR-0035, ADR-0039);
- a **script** becomes speech with Text to Speech (ADR-0042, which also covers Bengali and the other Indic
  languages);
- an **uploaded or recorded voice or song** uses the audio upload and recorder (ADR-0043);
- the clip is made as a long background job with a "being made" row, a badge and a notice (ADR-0037).

It is also the riskiest product in the studio: a realistic video of a real person saying words they never said is
exactly what a deepfake is. The design starts from that, not from the model.

**The engine is InfiniteTalk** (MeiGen-AI), chosen by the owner. What was checked on 2026-10-09:

| Part | Licence | Notes |
|---|---|---|
| InfiniteTalk weights and code | Apache-2.0 | Audio-driven video generation. Two modes: video to video (dubbing) and **image to video**, which is what this product uses. A song works as audio. |
| Base model Wan2.1-I2V-14B-480P | Apache-2.0 (not gated) | A 14-billion-parameter video model; InfiniteTalk adds its audio conditioning on top of it |
| Audio encoder `chinese-wav2vec2-base` | MIT (not gated) | Turns the audio into features for the video model |
| ComfyUI workflow (`ComfyUI-WanVideoWrapper`, kijai) | Apache-2.0 | The route that fits our worker, which already drives ComfyUI |

What the project documents, and what it does **not** say:

- It makes 480P or 720P video. Image to video gives good results for up to about one minute (colour drift after
  that); the default maximum is 40 seconds. It offers an int8 quantised model, and a community low-memory
  runner (Wan2GP, licence not stated) exists.
- The reference setup assumes **NVIDIA CUDA** (a CUDA build of PyTorch and flash-attention). Nothing in what was
  read says it runs on Apple silicon, and **our own result with a neighbouring model is a warning**: Wan 2.2 5B
  image to video produced noise on this Mac (ADR-0037). Memory and time for the 14B model are not verified.
- The card's languages are English and Chinese, and the audio encoder was trained on Chinese. **How well the lips
  follow Bengali, Hindi, Spanish, Arabic or any other language is unverified.** Because the project must be
  multilingual, that is an acceptance test, not an assumption.
- The same team has released a newer avatar model (LongCat-Video-Avatar 1.5) that replaces the Wav2Vec2 encoder
  with Whisper-Large for more accurate audio understanding. It is noted here as the likely successor if
  InfiniteTalk's language coverage falls short; it is not part of this decision.

## Decision

- **A new product, `wd-lipsync-ai`,** built like the video product: a row with `status = working`, the user can
  leave, the same badge and notice, a "Lip syncs" kind in My creations. Web area `/lip-sync` and
  `/lip-sync/creations/{id}`. The Coming-soon card and page stay until it is accepted and built.
- **Inputs.** (1) A character image (PNG, JPEG or WebP, up to 10 MB, one face). (2) A voice, in one of three ways:
  *Script*: text, a language and a male or female voice, made into speech by ADR-0042 first; *Upload*: an audio
  file (or the audio of a video) through the ADR-0043 upload; *Record*: the ADR-0043 recorder. A song is just
  audio. (3) An optional short style hint ("calm, smiling"), with the Enhance button (ADR-0038) as for video.
- **Output.** An MP4 with the audio mixed in and a poster, like a video clip, **480P** (720P only if the
  evaluation shows it is affordable). The length equals the audio's; **at most 15 seconds in this version**
  (the model supports far more; the limit is for cost and is raised only from measured speed). One working lip
  sync per user.
- **Engine: InfiniteTalk, in its image-to-video mode, as a ComfyUI workflow** (`infinitetalk-i2v.json` and its map
  file, with a wav2vec2 audio-encoder node), bound to a new capability `video.lipsync` in `product.yaml` like the
  video workflows (ADR-0037). The audio goes to the worker the way a picture does: the worker reads it from the
  user's `uploads/` prefix and puts it where the workflow's audio-loading node reads it. Where it runs is decided
  by the spike below: on a CUDA machine if the Mac cannot run it, reached as a ComfyUI backend (ADR-0032), so the
  product code is the same either way. The workflow must be run for real before it is accepted, and the weights
  (the 14B base, the audio encoder and InfiniteTalk's own: tens of gigabytes together) are downloaded only when you
  say so.
- **Graph.** `check_request` (inputs, quota, guardrails below), then for a script a `speech.synthesize` job
  (ADR-0042) and `await_job`, then the lip-sync job and `await_job`, then `finalise`: store the MP4, make the poster,
  write the row, delete the uploaded image and audio, write a usage event `lipsync.created` (seconds). Failures
  mark the row `failed` with a plain message.
- **The safety policy (needs your confirmation; the defaults here are the cautious ones).**
  1. **No photographs of real people in this version.** A multimodal check of the image (the existing
     `multimodal` alias, like the picture guardrail of ADR-0036) classifies it as `real_person_photo` or not;
     photographs of people are refused with a fixed message. Illustrations, cartoons, 3D renders, paintings,
     mascots and animals are allowed. A classifier is not perfect and a realistic AI-generated face may pass,
     so the check is evaluated on a labelled set (like the image guardrail) and fails closed.
  2. **What is said is checked.** For a script, `text.moderate` on the text. For an uploaded or recorded voice,
     the audio is transcribed with ADR-0043's `speech.transcribe` and the transcript is moderated, in any
     language. Songs are checked the same way (their lyrics).
  3. **No voice cloning,** and the voices for scripts are the preset ones of ADR-0042.
  4. **Marked as AI-generated:** the MP4 metadata says so, and an optional visible mark can be switched on in
     configuration (`LIPSYNC_VISIBLE_MARK`, off by default).
  5. **Limits and records:** 3 per user per day, one working at a time, usage events for every one, and no
     sharing or public gallery in this version.
  Loosening any of this (allowing photographs, for example with a consent step) is a separate ADR.
- **Quota.** 3 lip syncs per user per day.
- **Search (ADR-0041 rule).** A lip sync is searchable: kind `lipsync`, indexed text = the script, or the
  transcript of the voice, plus the style hint. Needs an `IndexSource` (finished ones only), `caps.index_creation`,
  `deps.unindex`, an `ids=` filter, a library card (poster, words) and an evaluation row.

## Evaluation before this is accepted

`services/api/evals/lipsync/` with the results written into this ADR. Nothing in the product is built before
step 1 answers where InfiniteTalk can run.

1. **The feasibility spike (decides where it runs).** Run the InfiniteTalk ComfyUI workflow with a 5 and a 15
   second audio on (a) the development Mac, in the half and full precisions the video work needed (ADR-0037 found
   that fp16 and bf16 gave noise for Wan and fp32 was needed), with and without the int8 model and the
   speed-up LoRA the project mentions; and (b) a CUDA GPU if one can be used. Report seconds of compute per second
   of output, peak memory, and whether the output is a face that moves rather than noise. If the Mac cannot run
   it, this ADR records that and the product targets a GPU host.
2. **Languages.** The same character with speech in Bengali, Hindi, English, Spanish, Arabic, German, Japanese,
   Chinese and Russian, and a sung line. Lip alignment is scored with a lip-sync confidence measure (a SyncNet
   style distance and confidence; the licence of whatever tool does the scoring is checked first) and by a person
   who speaks the language; the table lists which languages are good, weak or not usable. A language that fails
   is shown as limited on the page, and the Whisper-encoder successor is tried for it.
3. **The image guardrail:** a labelled set of photographs, illustrations, cartoons, 3D renders and AI-generated
   faces: how many real-person photographs are refused (must be all of the clear photographs), how many
   harmless drawings are refused (a few at most), and an honest note on realistic AI faces. Photographs of
   people in the set are synthetic or properly licensed; no real person's photograph is generated or kept.
4. **The audio check:** a script, a spoken file and a song in several languages each reach the moderator through
   the right path.

## Consequences

- New: the `video.lipsync` capability and InfiniteTalk workflow, the product and graph, migration 0016
  (`lipsyncs`), the web area, the library card and the index source, the image classification prompt and its
  evaluation, the visible-mark option, and tens of gigabytes of weights on whatever machine runs it (the 14B base alone is about 28 GB in 16-bit
  precision).
- Depends on ADR-0042 and ADR-0043 being built first; the ADRs are written so the pieces they share are built
  once.
- **Real risk to the plan:** if InfiniteTalk cannot run on the Mac, development of the product (the page, the
  jobs, the guardrail, the library) continues against a placeholder backend, as the media worker already has a
  stub mode, but real clips need a CUDA host. That is a cost and operations decision for you, not a code one.
- The output length (15 s) and the cost per clip are limited by the model; the first version may be slow. The
  page says how long it takes, as video does.
- InfiniteTalk's language coverage is unproven for the project's languages (see above); the evaluation table is
  part of the product's documentation and an unsupported language is listed, not hidden.
- Not allowing photographs of real people removes a popular use (a photo of a relative speaking). That is a
  deliberate trade for safety, to be revisited with consent design, not by loosening the classifier.

## Not in this version

Photographs of real people, voice cloning, several characters in one image (the multi-person variant exists in the
model), full-body animation, changing the words on an existing video (the dubbing mode), clips longer than 15
seconds, sharing or a public gallery, and translating a voice into another language.
