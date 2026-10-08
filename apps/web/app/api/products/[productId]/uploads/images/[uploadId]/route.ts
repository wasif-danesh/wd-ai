import { badRequest, isProductId, isUuid, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/** Take back a picture the user uploaded and no longer wants (ADR-0039). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productId: string; uploadId: string }> },
) {
  const { productId, uploadId } = await params;
  if (!isProductId(productId) || !isUuid(uploadId)) return badRequest("invalid id");
  return proxy(req, `/products/${productId}/uploads/images/${uploadId}`);
}
