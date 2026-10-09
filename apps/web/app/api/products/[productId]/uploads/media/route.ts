import { badRequest, isProductId, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

// The API enforces the real limits while it reads; this refuses an obviously too large file early.
const MAX_BYTES = 110 * 1024 * 1024;

/** The user's recording or video file, passed through to the API as a stream (ADR-0043). */
export async function POST(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  if (!isProductId(productId)) return badRequest("invalid product");
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    return Response.json({ detail: "That file is too large." }, { status: 413 });
  }
  return proxy(req, `/products/${productId}/uploads/media`, {
    body: req.body,
    headers: { "content-type": req.headers.get("content-type") ?? "application/octet-stream" },
  });
}
