// BFF: proxy run requests to FastAPI and pass the SSE stream through unchanged.
// The browser never calls FastAPI directly.
export const dynamic = "force-dynamic";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function POST(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const upstream = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(productId)}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: await req.text(),
    signal: req.signal,
    cache: "no-store",
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
