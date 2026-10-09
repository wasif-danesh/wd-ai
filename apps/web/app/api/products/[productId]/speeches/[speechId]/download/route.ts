import { badRequest, isProductId, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/** The speech as a download. Browsers ignore the `download` attribute on a link to another origin,
 * so the file comes from the app's own origin with a Content-Disposition (ADR-0034). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string; speechId: string }> },
) {
  const { productId, speechId } = await params;
  if (!isProductId(productId) || !isUuid(speechId)) return badRequest("invalid id");
  return proxy(req, `/products/${productId}/speeches/${speechId}/download`);
}
