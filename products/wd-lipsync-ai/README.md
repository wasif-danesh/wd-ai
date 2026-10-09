# wd-lipsync-ai: Lip Sync (ADR-0044)

A character picture and a voice become a short talking or singing clip. The voice is a **script** (made into
speech by Text to Speech, any of its languages), an **uploaded file** (audio, or the audio of a video) or a
**recording**. A song works as a voice. Clips are at most **15 seconds**; one is made at a time per user.

Engine: **InfiniteTalk** (MeiGen-AI, Apache-2.0) on Wan2.1-I2V-14B, as a ComfyUI workflow
(`workflows/infinitetalk-i2v.json` and its map) through ComfyUI-WanVideoWrapper. The feasibility spike
(ADR-0044) found that the development Mac cannot run it at a usable speed, so the real workflow is meant for a CUDA
host (the video ComfyUI, `COMFYUI_VIDEO_BASE_URL`). Until one exists the worker's stub mode (`COMFYUI_MODE=stub`)
returns a placeholder clip, which is what the rest of the product is tested and demonstrated with.

## How a run goes (`graphs/lipsync.py`)

    check_request -> begin -> [ voice_start -> voice_await -> voice_finish ] -> start_job -> await_job -> finalise
         |                                                    |
         v                                                    v
       refuse                                              refuse

- `check_request`: the inputs, one at a time, the daily limit, then (with the safeguards on) the words and the
  picture are moderated.
- A **script** is made into speech first (`speech.synthesize`); the speech is moved under the user's `uploads/`
  prefix, where the worker reads a job's inputs. An **uploaded voice** is, with the safeguards on, transcribed
  (`speech.transcribe`) and its words moderated before it is used.
- The row exists from `begin` with status `working`; the site shows "being made" on every page. Failures mark it
  `failed` with a plain message. The picture and the voice are deleted when the run ends.

## The safeguards (ADR-0044, switched by ADR-0047)

With the system switch on (always in production): photographs of real people are refused
(`real_person_photo`, a model that looks at the picture), the words of a script, of an uploaded voice and the
style hint are moderated in any language (the text to speech moderator), the MP4 is marked as AI-generated in
its metadata, and 3 lip syncs per user per day are allowed. With the switch off (the default on local and
staging) none of these apply and an uploaded voice is not transcribed. Upload hardening and the
one-at-a-time rule never switch off. No voice cloning: scripts use the preset voices.

## API (under `/products/wd-lipsync-ai/`)

`POST uploads/images` and `POST uploads/media` (the picture and the voice), `GET lipsyncs` (`status=`, `ids=`,
paging), `GET/DELETE lipsyncs/{id}`, `GET lipsyncs/{id}/download`. A run is started with source `script` (`script`,
`language`, `gender`, optional `voice_id`) or `audio` (`audio_key`), plus `image_key` and an optional `style`.

## Searchable

Kind `lipsync`: the indexed text is the script (or the words of the voice, when they were checked) and the style.
Index source `LipSyncIndexSource`, `ids=` filter on the list route, card and filter in My creations, and a row in
the search evaluation corpus.

## Tests

`uv run pytest products/wd-lipsync-ai`: the graph end to end with scripted fake models (script, uploaded voice,
refusals, limits, failures, safeguards off), the routes, search, the workflow map, the guardrail and the canary.
Not covered: the real model (needs a CUDA host), the languages and the picture guardrail on a labelled set
(ADR-0044, evaluation steps 2 and 3).
