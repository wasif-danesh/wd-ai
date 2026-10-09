import { badRequest, isProductId, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/** The languages a speech to text product offers and its upload limits (ADR-0043). */
export async function GET(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  if (!isProductId(productId)) return badRequest("invalid product");
  return proxy(req, `/products/${productId}/languages`);
}
