import type {MetadataRoute} from "next";

// Who may crawl catchdates.com. Search engines and the link-preview fetchers
// that render a shared organizer or event link are the acquisition channel,
// so they are named and allowed. Everyone else, including AI-training
// crawlers and generic scrapers, is told to stay out. robots.txt binds only
// crawlers that honour it; the data itself is protected by what the site and
// Firestore expose, not by this file. AI search assistants may read pages to
// cite them in answers (owner decision, 30 Oct 2026); AI-training crawlers
// are never named.
export const ALLOWED_CRAWLERS = Object.freeze([
  // Search indexes.
  "Googlebot", "Googlebot-Image", "Bingbot", "Applebot", "DuckDuckBot",
  // Link previews in the apps organizers and guests share links through.
  "facebookexternalhit", "Twitterbot", "LinkedInBot", "Slackbot", "WhatsApp", "TelegramBot", "Discordbot",
  // AI search assistants that cite pages in answers.
  "OAI-SearchBot", "PerplexityBot", "Claude-SearchBot",
]);

// Paths no crawler reads: private flows, tokens and transactional pages.
export const PRIVATE_PATHS = Object.freeze(["/api/", "/_legacy/", "/booking/", "/offer/", "/join/",
  "/event-update/", "/rehearse/", "/invite/", "/rsvp/", "/f/", "/demo/", "/claim/"]);

export function robotsPolicy(indexing: boolean): MetadataRoute.Robots {
  if (!indexing) return {rules: {userAgent: "*", disallow: "/"}};
  return {
    rules: [
      {userAgent: [...ALLOWED_CRAWLERS], allow: "/", disallow: [...PRIVATE_PATHS]},
      {userAgent: "*", disallow: "/"},
    ],
    sitemap: "https://catchdates.com/sitemap.xml",
  };
}
