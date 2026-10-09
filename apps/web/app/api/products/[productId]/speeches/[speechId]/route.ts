import { badRequest, isProductId, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ productId: string; speechId: string }> };

async function forward(req: Request, { params }: Ctx) {
  const { productId, speechId } = await params;
  if (!isProductId(productId) || !isUuid(speechId)) return badRequest("invalid id");
  return proxy(req, `/products/${productId}/speeches/${speechId}`);
}

export const GET = forward;
export const DELETE = forward;
