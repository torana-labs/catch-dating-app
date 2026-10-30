import {brand} from "@catch/brand";

/** Build-owned destination, never inferred from a form answer or caller URL. */
export function formProfileReviewUrl(responseId: string): string | null {
  const configured = import.meta.env.VITE_CONSUMER_APP_URL;
  const origin = configured || (import.meta.env.VITE_FIREBASE_PROJECT_ID ===
    "catch-dating-app-64e51" ? brand.web.appOrigin : null);
  if (!origin) return null;
  try {
    const url = new URL(origin);
    const local = url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !local) || url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash) return null;
    // Flutter web retains hash routing. The route requires a fresh owned read.
    url.hash = `/you/forms/${encodeURIComponent(responseId)}`;
    return url.toString();
  } catch {
    return null;
  }
}
