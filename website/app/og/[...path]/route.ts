import {generatedPreviewCardResponse} from "../../../src/server/generatedPreviewCardResponse";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request, {params}: {params: Promise<{path: string[]}>}) {
  return generatedPreviewCardResponse(request, (await params).path);
}
