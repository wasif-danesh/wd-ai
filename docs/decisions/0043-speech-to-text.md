# ADR-0043: Speech to Text

- **Status:** Proposed
- **Date:** 2026-10-09

## Context

The studio's home page has a "Speech to Text" card marked Coming soon. A user gives the product an audio or
video file, or records their voice in the browser, and gets a transcript. It is the second speech product. It
shares the speech runtime introduced by ADR-0042 and adds three things the platform does not have yet: **uploads
of audio and video**, **recording in the browser**, and **jobs that can take many minutes and are about the
user's own private words**. It also supplies what ADR-0044 (Lip Sync) needs: audio input and a way to read what
an uploaded audio says.

The project must be multilingual, so the engine must work in many languages. What was checked on 2026-10-09:

| Engine | Licence | Languages | Notes |
|---|---|---|---|
| **Whisper large-v3-turbo** | MIT | 99 | Cannot translate (trained without translation data); weaker on rare languages (Thai and Cantonese are the usual examples) than full large-v3 |
| **Whisper large-v3** | MIT | 99 | Slower and larger; better on rare languages; can translate to English |
| **Parakeet-tdt-0.6b-v3** | CC-BY-4.0 (attribution required) | 25 European | Fast; far fewer languages |

Runtimes: **faster-whisper** (MIT) is what the Speaches server uses; on an Apple-silicon Mac it runs on the CPU
only, and an informal benchmark measured it about 7 times slower than **mlx-whisper** or **whisper.cpp** with
Core ML (about 1 second against 7 for a short clip; one machine, one run, so only an indication). Whisper
decides the language by itself or takes a language hint.

## Decision

- **A new product, `wd-stt-ai`,** built like the video product (ADR-0037): a row exists from the moment a job
  starts (`status = working`), the user can leave the page, and the header badge and the "ready" notice work for
  it too (the badge, now named for "working" creations of any kind, is generalised from the video one). Web area
  `/speech-to-text` and `/speech-to-text/creations/{id}`.
- **Two ways in, one path.** *Upload*: choose, drag and drop, or paste an audio or video file. *Record*: a
  Record button uses the browser's `MediaRecorder` (level meter, pause, stop, play back, record again; it asks
  for the microphone and explains clearly when it is refused or missing; recording needs a secure page, which
  `localhost` and HTTPS are). A recording is sent exactly like an upload.
- **A secured media upload endpoint** (extends ADR-0035): `POST /products/{id}/uploads/media`, raw body, under
  the same identity rule. The file is never trusted:
  - read with a hard size cap while streaming (**100 MB**);
  - the container type is decided by its first bytes (WAV, MP3, Ogg, FLAC, MP4/M4A/MOV, WebM/Matroska), never
    by name or declared type; anything else is a 415;
  - it is decoded by the bundled ffmpeg in a child process with no network and no input paths (data comes on
    stdin), a time limit, a memory limit and `-vn -sn -dn -map_metadata -1`, producing a **16 kHz mono WAV**;
    the video track and every tag are gone, and the original bytes are not kept;
  - the decoded length is limited (**30 minutes** in this version; set from the measured speed, below), and the
    result is stored at `{tenant}/{product}/{user}/uploads/{id}.wav`;
  - the `uploads` table gains `kind` (`image` or `audio`) and `seconds` (migration 0013); the 24 hour sweep,
    "Remove deletes it" (ADR-0039) and the hourly limit (20 media uploads an hour) apply.
  The shared picture component (ADR-0039) is generalised into a file input that also takes audio and video.
- **Engine and runtime: the same OpenAI-compatible server pattern as ADR-0042.** The worker gets an
  `openai-transcription` runner posting to `/v1/audio/transcriptions`; the capability is `speech.transcribe`; an
  admin can point it at another server at `/admin/media`. Speaches (faster-whisper) is the default server, and a
  native Apple-silicon server (whisper.cpp or an MLX server) can be set as the address for the Mac, as Ollama and
  ComfyUI already are. The model is **Whisper large-v3-turbo**, with large-v3 as the alternative where the
  evaluation shows turbo is not good enough for a language.
- **Graph.** `check_request` (the upload is the caller's, language choice valid, quota), `start_job` (creates the
  row), `await_job` (progress is audio seconds done), `finalise` (stores the transcript, deletes the audio, writes
  a usage event `transcript.created` with the minutes).
- **Language.** "Detect the language" is the default; the user can choose one from the list of Whisper's
  languages to fix a wrong guess. The detected language is stored and shown.
- **The result.** Text with timestamps per segment, the language and the length. Views and downloads: plain
  text, **SRT**, **VTT** and JSON. Copy to clipboard. Table `transcripts` (migration 0014: id, tenant, product,
  user, status, title, language, seconds, text, segments, error, created_at); the title is the first words of
  the transcript (the file name is ignored and never stored, like images). **The audio is deleted when the
  transcript is made** (it is private and large); keeping it with the transcript is a later option, and so is
  clicking a line to jump in the audio.
- **Quota and limits.** 120 minutes of audio per user per day (counted from usage events), one transcription
  working at a time, the upload limits above.
- **Safety and privacy.** A transcript is the user's own content, not generated content, so there is no
  moderation of what is said. Instead: access is scoped to the user in every query, transcripts and audio are
  never written to logs, and the product says what is kept. Output is plain text, shown as text (never as HTML).
- **Search (ADR-0041 rule).** A transcript is searchable: kind `transcript`, with its title, language and text.
  A transcript can be far longer than the 6000 characters the index embeds today, so the index changes: **one
  item can have several chunks** (a `chunk` column, migration 0015, unique on tenant, product, item and chunk;
  about 1500 characters per chunk, with overlap), search groups results by item and shows the best chunk, and the
  exact-word check looks at every chunk. This also benefits long lyrics. The usual `IndexSource`,
  `caps.index_creation`, `deps.unindex`, `ids=` filter, library card and evaluation row are needed.

## Evaluation before this is accepted

`services/api/evals/transcribe/` with the results written into this ADR.

1. **Accuracy per language:** word error rate (character error rate for Chinese and Japanese) on a small set
   of clips in each target language from public corpora with open licences (Common Voice is CC0, FLEURS is
   CC-BY-4.0), for turbo and for large-v3, and the language detection hit rate.
2. **Speed:** seconds of audio per second of compute (real-time factor) on the development Mac for each
   runtime (Speaches on the CPU, whisper.cpp with Core ML, MLX), and on a GPU if one is available. The upload
   length limit and the job timeout are set from this.
3. **Upload hardening:** the decoder is tried on malformed, truncated, huge-duration and mislabelled files
   (a text file named `.mp3`, a video with no audio, a zip bomb of silence) and must refuse or finish within the
   limits.

## Consequences

- New: the media upload endpoint and decoder, the recorder and the generalised file input, the `openai-transcription`
  runner and `speech.transcribe` capability, the product, three migrations (0013 uploads, 0014 transcripts, 0015
  index chunks), the generalised "working" badge, the library card and the index changes.
- ADR-0044 can use the audio upload, the recorder and the transcription (to moderate what an uploaded voice says).
- Speed on a Mac decides the maximum length offered; a longer limit is honest only after it is measured.
- Whisper's quality varies by language; the evaluation table is part of the product's documentation, and a
  language that does not reach the stated error rate is listed as limited, not hidden.

## Not in this version

Telling speakers apart, translating, live transcription while speaking, editing a transcript, summaries, keeping
the audio, and words in a language Whisper does not cover.
