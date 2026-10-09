import { badRequest, isProductId, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/** The transcript as a download (`?format=txt|srt|vtt|json`). Browsers ignore the `download` attribute
 * on a link to another origin, so the file comes from the app's own origin (ADR-0034). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string; transcriptId: string }> },
) {
  const { productId, transcriptId } = await params;
  if (!isProductId(productId) || !isUuid(transcriptId)) return badRequest("invalid id");
  const search = new URL(req.url).search;
  return proxy(req, `/products/${productId}/transcripts/${transcriptId}/download${search}`);
}
