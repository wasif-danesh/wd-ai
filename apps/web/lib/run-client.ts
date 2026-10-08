import { type ParsedEvent, parseSse } from "./sse";

export const PRODUCT = "wd-music-ai";

export type SongInput = { idea: string; genre?: string; mood?: string };
export type Approval = {
  action: "approve" | "regenerate";
  title?: string;
  lyrics?: string;
  style?: string;
};

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // not JSON
  }
  return `The server answered ${res.status}`;
}

type OnEvent = (e: ParsedEvent) => void;

async function stream(url: string, init: RequestInit, onEvent: OnEvent): Promise<void> {
  const res = await fetch(url, init);
  if (res.status === 401 && typeof window !== "undefined") {
    // the session ended: sign in again and come back
    window.location.assign(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
  }
  if (!res.ok || !res.body) throw new HttpError(res.status, await errorMessage(res));
  for await (const e of parseSse(res.body)) onEvent(e);
}

const JSON_HEADERS = { "content-type": "application/json", accept: "text/event-stream" };

export function startRun(
  input: object,
  signal: AbortSignal,
  onEvent: OnEvent,
  product: string = PRODUCT,
) {
  return stream(
    `/api/products/${product}/runs`,
    { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ input }), signal },
    onEvent,
  );
}

export type UploadedImage = {
  upload_id: string;
  key: string;
  width: number;
  height: number;
  bytes: number;
};

/** Send the user's picture to the server (ADR-0035). The body is the file itself. */
export async function uploadImage(
  product: string,
  file: File,
  signal?: AbortSignal,
): Promise<UploadedImage> {
  const res = await fetch(`/api/products/${product}/uploads/images`, {
    method: "POST",
    headers: { "content-type": file.type || "application/octet-stream" },
    body: file,
    signal,
  });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.assign(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
  }
  if (!res.ok) throw new HttpError(res.status, await errorMessage(res));
  return (await res.json()) as UploadedImage;
}

export function resumeRun(runId: string, value: Approval, signal: AbortSignal, onEvent: OnEvent) {
  return stream(
    `/api/runs/${runId}/resume`,
    { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ value }), signal },
    onEvent,
  );
}

/** Re-attach to a run; the server replays only the events after `lastSeq`. */
export function watchRun(runId: string, lastSeq: number, signal: AbortSignal, onEvent: OnEvent) {
  return stream(
    `/api/runs/${runId}/events`,
    { headers: { accept: "text/event-stream", "last-event-id": String(lastSeq) }, signal },
    onEvent,
  );
}
