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

export function startRun(input: SongInput, signal: AbortSignal, onEvent: OnEvent) {
  return stream(
    `/api/products/${PRODUCT}/runs`,
    { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ input }), signal },
    onEvent,
  );
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
