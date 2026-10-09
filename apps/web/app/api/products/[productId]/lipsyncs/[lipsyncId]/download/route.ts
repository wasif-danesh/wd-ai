import { badRequest, isProductId, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/** The clip as a download. Browsers ignore the `download` attribute on a link to another origin,
 * so the file comes from the app's own origin with a Content-Disposition (ADR-0034). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string; lipsyncId: string }> },
) {
  const { productId, lipsyncId } = await params;
  if (!isProductId(productId) || !isUuid(lipsyncId)) return badRequest("invalid id");
  return proxy(req, `/products/${productId}/lipsyncs/${lipsyncId}/download`);
}
