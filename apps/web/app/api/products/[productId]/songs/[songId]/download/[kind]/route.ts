import { badRequest, isProductId, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

const KINDS = new Set(["audio", "cover", "video"]);

/** The song's audio (with its cover and lyrics inside), cover or video as a download. Browsers ignore the `download` attribute on links to
 * another origin, so the file comes from the app's own origin with a Content-Disposition. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string; songId: string; kind: string }> },
) {
  const { productId, songId, kind } = await params;
  if (!isProductId(productId) || !isUuid(songId) || !KINDS.has(kind)) {
    return badRequest("invalid request");
  }
  return proxy(req, `/products/${productId}/songs/${songId}/download/${kind}`);
}
