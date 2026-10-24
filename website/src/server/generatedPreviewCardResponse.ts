import {resolvePublicRoute} from "./publicRoute";
import {generatedPreviewCardFor, generatedPreviewCardVersion, pagePathForGeneratedCard} from "./generatedPreviewCards";
import {renderGeneratedPreviewCard} from "./generatedPreviewCardImage";
import {previewCardImage} from "./previewCards";

/** Anything that is not a public organiser or event gets the brand card, as its page does. */
function brandCard(cacheControl: string) {
  const {pathname, search} = new URL(previewCardImage("default").url);
  return new Response(null, {status: 302, headers: {Location: pathname + search, "Cache-Control": cacheControl}});
}

/** /og/<page path>card.png: the page's own public record drawn as its link-preview card. */
export async function generatedPreviewCardResponse(request: Request, segments: readonly string[]) {
  const pagePath = pagePathForGeneratedCard(segments);
  if (!pagePath) return new Response(null, {status: 404, headers: {"Cache-Control": "public, max-age=300"}});
  try {
    const card = generatedPreviewCardFor(await resolvePublicRoute(pagePath));
    if (!card) return brandCard("public, max-age=300, s-maxage=300");
    // Pages link the current version. An older link draws today's record, cached briefly.
    const current = new URL(request.url).searchParams.get("v") === generatedPreviewCardVersion(card);
    const png = await renderGeneratedPreviewCard(card);
    return new Response(new Uint8Array(png), {headers: {"Content-Type": "image/png", "Cache-Control": current
      ? "public, max-age=3600, s-maxage=3600" : "public, max-age=300, s-maxage=300"}});
  } catch {
    return brandCard("no-store");
  }
}
