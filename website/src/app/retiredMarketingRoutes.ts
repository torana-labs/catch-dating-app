// Relative with an extension: the postbuild test loads this module in Node.
import {inMarket} from "../content/markets/in.ts";

// Compatibility only: retired URLs have no route components or static pages.
const retiredDestinations: Readonly<Record<string, string>> = {
  overview: "/", platform: "/host/#features", workflows: "/host/#how-it-works",
  planners: "/host/#use-cases", mixers: "/host/#use-cases", clubs: "/host/#use-cases",
  stack: "/host/#existing-tools", directory: "/organizers/", claim: "/claim/", preview: "/host/",
  // The host pilot application retired (owner decision, 12 Nov 2026): Catch
  // Host is a free trial that starts in the app, from the landing's Start band.
  apply: "/host/#start",
};

/**
 * The organiser directory became Explore's organisers view (CAT-261). Its
 * query comes along unchanged, so search, city and attribution survive.
 */
export function organizerDirectoryDestination(query: URLSearchParams): string {
  const destination = new URLSearchParams(query);
  destination.set("show", "organisers");
  return `/explore/?${destination}`;
}

export function retiredMarketingDestination(location: {pathname: string; search: string; hash: string}): string | null {
  // Hosting implementations can append the original query after a redirect's
  // fragment. Restore it before analytics and section scrolling on Host only.
  const misplacedQuery = /^#(features|how-it-works|use-cases|existing-tools)\?(.+)$/.exec(location.hash);
  if (/^\/host\/?$/.test(location.pathname) && misplacedQuery) {
    const query = new URLSearchParams(location.search);
    for (const [key, value] of new URLSearchParams(misplacedQuery[2])) query.append(key, value);
    return `/host/?${query.toString()}#${misplacedQuery[1]}`;
  }
  const slug = /^\/host\/([^/]+)(?:\/|$)/.exec(location.pathname)?.[1];
  let destination = slug ? retiredDestinations[slug] : undefined;
  if (/^\/host\/?$/.test(location.pathname)) {
    if (location.hash === "#founding-hosts") destination = "/host/#start";
    if (location.hash === "#workflow") destination = "/host/#how-it-works";
  }
  if (location.pathname === "/" && ["#waitlist", "#events", "#formats", "#members", "#hosts", "#trust", "#download-app"].includes(location.hash)) {
    destination = `/explore/${location.hash}`;
  }
  // A city's retired path slug (/delhi/, /bangalore/) moves to its catalog
  // slug (/delhi-ncr/, /bengaluru/), keeping the query.
  const pathSlug = /^\/([a-z0-9-]+)\/?$/.exec(location.pathname)?.[1];
  const movedCity = pathSlug ? inMarket.cities.find((city) => (city.legacySlugs as readonly string[]).includes(pathSlug)) : undefined;
  if (movedCity) return `/${movedCity.slug}/${location.search}${location.hash}`;
  if (/^\/organizers\/?$/.test(location.pathname)) {
    return `${organizerDirectoryDestination(new URLSearchParams(location.search))}${location.hash}`;
  }
  if (!destination) return null;
  const [pathname, hash] = destination.split("#");
  // The new section supersedes obsolete source-page anchors. Attribution and
  // claim lookup parameters survive; sensitive transactional routes never match.
  return `${pathname}${location.search}${hash ? `#${hash}` : ""}`;
}
