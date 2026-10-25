// Runs once when the Node server starts, before it serves a request.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const {installPublicPageCachePromotion} = await import("./src/server/publicPageCacheResponse");
  installPublicPageCachePromotion();
}
