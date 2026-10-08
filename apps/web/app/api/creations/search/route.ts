import { proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/** Search the signed-in user's own creations (ADR-0041). The API validates and limits the query. */
export async function GET(req: Request) {
  const search = new URL(req.url).search;
  return proxy(req, `/creations/search${search}`);
}
