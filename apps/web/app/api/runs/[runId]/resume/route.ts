import { badRequest, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

// Answer a run's pending question (for example approving lyrics); the response continues the stream.
export async function POST(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  if (!isUuid(runId)) return badRequest("invalid run id");
  return proxy(req, `/runs/${runId}/resume`, {
    body: await req.text(),
    headers: { "content-type": "application/json", accept: "text/event-stream" },
  });
}
