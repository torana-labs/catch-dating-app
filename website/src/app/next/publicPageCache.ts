import type {PageKey} from "../pageMeta";

/**
 * Firebase Hosting's CDN keeps these public pages for up to a minute. It cannot
 * purge one page on demand, so edits reach the cached HTML within this window.
 * The browser checks live status as soon as the page loads, so a withdrawal
 * leaves the visible page at once even when the HTML came from the cache.
 */
export const PUBLIC_PAGE_CACHE_SECONDS = 60;
export const PUBLIC_PAGE_CACHE_CONTROL = `public, s-maxage=${PUBLIC_PAGE_CACHE_SECONDS}`;
/**
 * The proxy marks an authorized page before it renders. The server promotes
 * the mark to PUBLIC_PAGE_CACHE_CONTROL only on a 200, so a render that fails
 * after the preflight keeps Next's no-store 500. The mark never leaves.
 */
export const PUBLIC_PAGE_CACHE_MARK = "x-catch-public-page";
/**
 * A page that rendered its unavailable state because its data could not be
 * read. The server turns its 200 into an uncached 503, so the visitor still
 * sees the page's own message while no cache keeps it and no monitor reads it
 * as healthy. This mark never leaves either.
 */
export const PUBLIC_PAGE_UNAVAILABLE_MARK = "x-catch-public-page-unavailable";

// Organiser, event and city-aware discovery pages render the same HTML for
// every viewer. Claim, booking, follow, signed-in and private-shell routes stay
// uncached: their state loads in the browser or behind a no-store shell.
const cachedPages: ReadonlySet<PageKey> = new Set(["home", "visitor_discovery", "organizers", "listing", "event_detail"]);

export function isCachedPublicPage(page: PageKey): boolean {return cachedPages.has(page);}
