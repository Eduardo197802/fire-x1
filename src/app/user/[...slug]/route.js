import {
  GET as apiGET,
  POST as apiPOST
} from "../../api/user/[...slug]/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Backward-compatible alias for legacy clients still calling /user/*.
export async function GET(request, context) {
  return apiGET(request, context);
}

// Backward-compatible alias for legacy clients still calling /user/*.
export async function POST(request, context) {
  return apiPOST(request, context);
}
