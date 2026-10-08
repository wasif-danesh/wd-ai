# ADR-0035: Secured upload endpoint for user images

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Image-to-image (ADR-0036) needs the user's picture on the server. ADR-0020 let a run name a file that is
already in storage (`image_key`), but nothing lets a user put a file there. Uploaded files are untrusted
input and often personal photos, so the endpoint decides what we accept, keep and delete.

## Decision

- **`POST /products/{product_id}/uploads/images`** (raw body: the image itself, with its `Content-Type`; no multipart, so the cap applies while streaming), under the existing
  identity rule: no session, no upload. A product accepts uploads only if its `product.yaml` says so
  (`uploads: { image: { max_bytes: 10485760 } }`), so a product that does not use them cannot be made to
  store files. The web app has a matching BFF route that streams the body through.
- **Limits.** At most 10 MB per file (read with a hard cap, not trusted from `Content-Length`); PNG, JPEG
  or WebP, decided by decoding the content, never by the file name or the declared type; no SVG, GIF or
  anything with scripts; at most 24 megapixels (decompression bombs are refused); 30 uploads per user per
  hour (Redis counter).
- **What is stored is not what was sent.** The image is decoded, rotated by its EXIF orientation, **stripped
  of all metadata** (GPS, camera, software), scaled so its longest side is at most 2048 px (the model works
  at about one megapixel) and saved as a PNG. The client's file name is ignored and never echoed.
- **Where.** `{tenant}/{product}/{user}/uploads/{upload_id}.png`, like everything else the user owns. The
  response is `{"upload_id", "key", "width", "height", "bytes"}`; `key` is relative to the user's prefix
  and is what a run passes as `image_key`. A run may only use keys under the caller's own `uploads/`.
- **Lifetime.** A table `uploads` (id, tenant, product, user, key, bytes, created_at, consumed_at) tracks
  every upload. The graph that uses a file deletes it when its job finishes; an API background task
  deletes any upload older than 24 hours that was never used. There is no endpoint to read an upload back:
  the preview in the browser is made from the file the user picked.
- **Errors** are typed and plain: `413` too large, `415` not an image we accept, `422` cannot be decoded
  or too many pixels, `429` too many uploads. Every upload writes a usage event (`upload.created`, bytes).

## Consequences

- A new table (migration 0008), a Redis counter, a background sweeper and a product config key.
- Photos of people are kept for at most the length of a job (the common case) or 24 hours (abandoned).
- JPEGs become PNGs, so a stored upload can be larger than the original; the 2048 px cap bounds it.
- The same endpoint serves any later product that wants an image input (a mask, a reference).
