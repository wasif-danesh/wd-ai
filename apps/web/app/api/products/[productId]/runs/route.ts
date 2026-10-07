import { badRequest, isProductId, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

// Start a run; the response is the event stream.
export async function POST(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  if (!isProductId(productId)) return badRequest("invalid product");
  return proxy(req, `/products/${productId}/runs`, {
    body: await req.text(),
    headers: { "content-type": "application/json", accept: "text/event-stream" },
  });
}
