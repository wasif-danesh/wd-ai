import { badRequest, isProductId, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ productId: string; transcriptId: string }> };

async function forward(req: Request, { params }: Ctx) {
  const { productId, transcriptId } = await params;
  if (!isProductId(productId) || !isUuid(transcriptId)) return badRequest("invalid id");
  return proxy(req, `/products/${productId}/transcripts/${transcriptId}`);
}

export const GET = forward;
export const DELETE = forward;
