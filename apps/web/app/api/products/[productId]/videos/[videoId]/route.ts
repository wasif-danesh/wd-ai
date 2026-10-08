import { badRequest, isProductId, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ productId: string; videoId: string }> };

async function forward(req: Request, { params }: Ctx) {
  const { productId, videoId } = await params;
  if (!isProductId(productId) || !isUuid(videoId)) return badRequest("invalid id");
  return proxy(req, `/products/${productId}/videos/${videoId}`);
}

export const GET = forward;
export const DELETE = forward;
