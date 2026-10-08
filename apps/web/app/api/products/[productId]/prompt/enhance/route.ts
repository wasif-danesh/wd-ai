import { badRequest, isProductId, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/** Rewrite the user's prompt (ADR-0038). The body is small JSON; the API checks and limits it. */
export async function POST(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  if (!isProductId(productId)) return badRequest("invalid product");
  const body = await req.text();
  if (body.length > 20_000) return badRequest("too large");
  return proxy(req, `/products/${productId}/prompt/enhance`, {
    body,
    headers: { "content-type": "application/json" },
  });
}
