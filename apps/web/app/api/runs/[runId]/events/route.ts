import { badRequest, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

// Reconnect to a run's event stream. Last-Event-ID makes the server replay only what was missed.
export async function GET(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  if (!isUuid(runId)) return badRequest("invalid run id");
  const headers: Record<string, string> = { accept: "text/event-stream" };
  const last = req.headers.get("last-event-id");
  if (last && /^\d+$/.test(last)) headers["last-event-id"] = last;
  return proxy(req, `/runs/${runId}/events`, { headers });
}
