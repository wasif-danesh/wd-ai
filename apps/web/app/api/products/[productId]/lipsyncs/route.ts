import { badRequest, isProductId, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  if (!isProductId(productId)) return badRequest("invalid product");
  const search = new URL(req.url).search;
  return proxy(req, `/products/${productId}/lipsyncs${search}`);
}
