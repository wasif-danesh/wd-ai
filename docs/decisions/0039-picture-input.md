# ADR-0039: Picture input: choose, drag and drop, paste

- **Status:** Proposed
- **Date:** 2026-10-08

## Context

Today a picture is chosen with a file input in one form (the image product, ADR-0036), and is uploaded only when the
user presses the main button (ADR-0035). People now expect to add a picture in any of three ways: pick it, drag it
onto the page, or paste it (a screenshot, or "copy image" from another page). The video product (ADR-0037) needs the
same input, and the prompt enhancer (ADR-0038) needs the picture **before** the run, to describe it. Doing this once,
as a shared component, keeps every product the same and keeps the rules in one place.

## Decision

- **One shared component, `PictureInput`,** used by the image and video products and by any later product that
  takes a picture. It owns choosing, validating, uploading, previewing, replacing and removing.
- **Three ways in, one path.** A visible button ("Choose a picture"), a drop zone that highlights while a file is
  dragged over it, and paste: a `paste` handler on the form that takes an image file from the clipboard and
  leaves text pastes alone (a text paste into the prompt works as before). Dropping or pasting a picture while the
  form is in a text mode switches the form to the picture mode. Only files are accepted; a dragged link or text is
  ignored. Dropping a file outside the zone never makes the browser open it (the page's default drop is
  cancelled while the form is on screen). On phones the button opens the photo library or camera (`accept`
  lists the formats; iOS converts HEIC to JPEG for the picker).
- **Checks before upload,** the same limits the server enforces (ADR-0035): PNG, JPEG or WebP, up to 10 MB, not
  empty. A rejected file shows a plain message next to the zone and is not uploaded. One picture at a time; a
  second one replaces the first.
- **Upload at once, not at submit.** The picture goes up as soon as it is accepted, with a progress bar and a Cancel,
  so the enhancer can use it and the main button starts the run immediately. The form keeps the returned upload id.
  The page shows a preview built from the local file (no round trip), with Replace and Remove.
- **Removing deletes it.** A new route `DELETE /products/{product_id}/uploads/images/{upload_id}` removes the file
  and the record for the caller's own upload (404 for anyone else's), so "Remove" and replacing a picture do not
  leave a photo on the server until the 24 hour sweep. The sweep stays as the safety net for closed tabs. The
  rest of ADR-0035 (re-encoding, metadata stripped, limits, deletion when the image or clip is made) is unchanged.
- **Limits.** The hourly upload limit goes from 30 to 60, because replacing a picture is now an upload.
- **Accessibility.** The zone is a real button and file input, usable by keyboard; the drag highlight is also
  announced; errors use `role="alert"`; the preview has an alt text; reduced motion is respected.
- **Run input.** The image and video forms start the run with the upload id they already hold, so the run no
  longer uploads. The graphs keep the existing check that the picture belongs to the user (ADR-0036).

## Consequences

- New: the component and its tests (choose, drop, paste, bad files, replace, remove, keyboard), the delete route
  and its tests, the hourly limit change and a small change to `useImageFlow` (start with an existing upload).
  The image form moves onto the component.
- A user who picks a picture and leaves leaves it on the server for up to 24 hours; that is the same exposure as
  before, bounded by the sweep, and now shorter whenever they remove it.
- Paste handling is browser specific: some browsers give the clipboard image no name, so the component names it
  itself. Screenshots from desktop tools arrive as PNG; copying from another web page may arrive as WebP or JPEG.

## Not in this version

Several pictures, cropping or rotating in the browser, pasting a picture link to fetch it (the server would have to
fetch a URL), and audio or video uploads.
