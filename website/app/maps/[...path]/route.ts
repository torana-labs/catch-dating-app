import {eventMapResponse} from "../../../src/server/eventMapImage";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request, {params}: {params: Promise<{path: string[]}>}) {
  return eventMapResponse(request, (await params).path);
}
