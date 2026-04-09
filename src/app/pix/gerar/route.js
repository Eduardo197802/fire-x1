import { POST as apiPOST } from "../../api/pix/gerar/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Backward-compatible alias for legacy clients still calling /pix/gerar.
export async function POST(request, context) {
  return apiPOST(request, context);
}
