import {websiteCities} from "@content/markets";
import type {MarketCity} from "@content/markets/types";
import {publicSiteCopy} from "@content/site";

/** Where the event page sits in the site: the pages above it, outermost first, then the event. */
export interface EventBreadcrumbTrail {
  links: Array<{href: string; label: string}>;
  current: string;
}

/**
 * The event page's breadcrumb, as the playbook's event board draws it:
 * What's on, then the organiser's city when that city's page is open, then
 * the event. A city the website does not list, or one not open yet, is left
 * out rather than linked to a launch notice.
 */
export function eventBreadcrumbs(
  {city, title}: {city: string; title: string},
  cities: readonly MarketCity[] = websiteCities,
): EventBreadcrumbTrail {
  const key = city.trim().toLocaleLowerCase("en-IN");
  const open = key ? cities.find((item) => item.status === "live" &&
    [item.label, ...item.aliases].some((label) => label.toLocaleLowerCase("en-IN") === key)) : undefined;
  return {
    links: [
      {href: publicSiteCopy.whatsOn.href, label: publicSiteCopy.whatsOn.label},
      ...(open ? [{href: `/${encodeURIComponent(open.slug)}/`, label: open.label}] : []),
    ],
    current: title,
  };
}

/** The same trail as schema.org BreadcrumbList structured data, with absolute URLs. */
export function eventBreadcrumbJsonLd(trail: EventBreadcrumbTrail, {origin, path}: {origin: string; path: string}) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [...trail.links, {href: path, label: trail.current}].map((link, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: link.label,
      item: `${origin}${link.href}`,
    })),
  };
}
