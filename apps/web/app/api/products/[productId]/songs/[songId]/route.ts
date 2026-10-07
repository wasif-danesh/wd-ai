import { badRequest, isProductId, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string; songId: string }> },
) {
  const { productId, songId } = await params;
  if (!isProductId(productId) || !isUuid(songId)) return badRequest("invalid id");
  return proxy(req, `/products/${productId}/songs/${songId}`);
}
