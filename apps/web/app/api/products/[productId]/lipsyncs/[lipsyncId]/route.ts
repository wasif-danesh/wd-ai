import { badRequest, isProductId, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ productId: string; lipsyncId: string }> };

async function forward(req: Request, { params }: Ctx) {
  const { productId, lipsyncId } = await params;
  if (!isProductId(productId) || !isUuid(lipsyncId)) return badRequest("invalid id");
  return proxy(req, `/products/${productId}/lipsyncs/${lipsyncId}`);
}

export const GET = forward;
export const DELETE = forward;
