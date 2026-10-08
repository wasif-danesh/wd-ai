import { badRequest, isProductId, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/** The clip as a download. Browsers ignore the `download` attribute on a link to another origin,
 * so the file comes from the app's own origin with a Content-Disposition (ADR-0034). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string; videoId: string }> },
) {
  const { productId, videoId } = await params;
  if (!isProductId(productId) || !isUuid(videoId)) return badRequest("invalid id");
  return proxy(req, `/products/${productId}/videos/${videoId}/download`);
}
