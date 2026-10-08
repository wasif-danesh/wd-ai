import { badRequest, isProductId, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ productId: string; imageId: string }> };

async function forward(req: Request, { params }: Ctx) {
  const { productId, imageId } = await params;
  if (!isProductId(productId) || !isUuid(imageId)) return badRequest("invalid id");
  return proxy(req, `/products/${productId}/images/${imageId}`);
}

export const GET = forward;
export const DELETE = forward;
