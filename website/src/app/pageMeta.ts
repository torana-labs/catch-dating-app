import type {HostListing} from "../features/organizers/types";
import type {EventDetailRecord} from "../features/events/eventDetailModel";
import metaContent from "../content/meta.json";
import {interpolateContent} from "../content/interpolate";
import {validatedWebsiteMeta} from "../content/metaContract";
import type {PublishedLegalPageKey} from "../content/types";
import {activeMarket} from "../content/markets";
import type {MarketCity} from "../content/markets/types";
import {explorePageCopy} from "../content/explorePage";

export type PageKey =
  | "sales_demo"
  | "home"
  | "visitor_discovery"
  | "host"
  | "organizers"
  | "listing"
  | "event_detail"
  | "event_runtime"
  | "event_assistance"
  | "event_offer"
  | "event_booking"
  | "event_rehearsal"
  | "event_invite"
  | "household_rsvp"
  | "public_form"
  | "claim"
  | "privacy"
  | "terms"
  | "help"
  | "account_deletion"
  | "refunds"
  | "contact"
  | "not_found";

export interface PageMeta {
  title: string;
  description: string;
  canonicalPath: string;
  twitterDescription: string;
  robots?: string;
}

const websiteMeta = validatedWebsiteMeta(metaContent);

export function isLegalPageKey(page: PageKey): page is PublishedLegalPageKey {
  return page === "privacy" || page === "terms" || page === "help" || page === "account_deletion" ||
    page === "refunds" || page === "contact";
}

export const pageMeta: Record<Exclude<PageKey, "listing" | "event_detail">, PageMeta> =
  websiteMeta.routes;

export function pageMetaForHostPath(pathname: string): PageMeta | null {
  const path = pathname.replace(/\/+$/, "") + "/";
  return path === "/host/apply/" ? websiteMeta.routes.host_apply : null;
}

export function pageMetaForListing(
  listing: HostListing,
  options: {noindexOverride?: boolean} = {}
): PageMeta {
  return {
    title: interpolateContent(websiteMeta.listing.titleTemplate, {
      name: listing.name,
      city: listing.city,
    }),
    description: listing.description,
    canonicalPath: listing.path,
    twitterDescription: listing.sourceSummary,
    robots: options.noindexOverride ? "noindex, follow" : listing.indexing,
  };
}

export function pageMetaForEvent(event: EventDetailRecord): PageMeta {
  const description = event.summary || event.listing.description;
  return {
    title: interpolateContent(websiteMeta.event.titleTemplate, {
      title: event.title,
      city: event.listing.city,
    }),
    description,
    canonicalPath: event.path,
    twitterDescription: event.supply === "external"
      ? interpolateContent(websiteMeta.event.externalTwitterTemplate, {
        title: event.title,
        source: event.sourceLabel,
      })
      : interpolateContent(websiteMeta.event.catchTwitterTemplate, {
        title: event.title,
        organizer: event.listing.name,
      }),
    robots: event.listing.indexing,
  };
}

export function getPageKey(
  pathname: string = window.location.pathname
): Exclude<PageKey, "listing" | "event_detail"> {
  if (pathname.startsWith("/demo/")) return "sales_demo";
  if (pathname.startsWith("/claim")) return "claim";
  if (pathname.startsWith("/privacy")) return "privacy";
  if (pathname.startsWith("/terms")) return "terms";
  if (pathname.startsWith("/help")) return "help";
  if (pathname.startsWith("/delete-account")) return "account_deletion";
  if (pathname.startsWith("/refunds")) return "refunds";
  if (pathname.startsWith("/contact")) return "contact";
  if (pathname.startsWith("/booking/")) return "event_booking";
  if (pathname.startsWith("/join/")) return "event_runtime";
  if (pathname === "/offer" || pathname === "/offer/") return "event_offer";
  if (pathname.startsWith("/event-update/")) return "event_assistance";
  if (pathname.startsWith("/rehearse/")) return "event_rehearsal";
  if (pathname.startsWith("/invite/")) return "event_invite";
  if (pathname.startsWith("/rsvp/")) return "household_rsvp";
  if (pathname.startsWith("/f/")) return "public_form";
  if (["/host", "/host/", "/host/apply", "/host/apply/"].includes(pathname)) return "host";
  if (pathname.startsWith("/organizers")) return "organizers";
  if (pathname === "/explore" || pathname === "/explore/" || cityForPath(pathname)) return "visitor_discovery";
  if (pathname === "/" || pathname === "") return "home";
  return "not_found";
}

export function pageClassFor(page: PageKey) {
  if (page === "host") return "host-page";
  if (page === "listing") return "listing-page";
  if (page === "event_detail") return "event-detail-page";
  if (page === "sales_demo" || page === "event_runtime" || page === "event_rehearsal" ||
      page === "event_assistance" || page === "event_offer" || page === "event_booking" ||
      page === "event_invite" ||
      page === "household_rsvp" ||
      page === "public_form") {
    return "event-runtime-page";
  }
  if (page === "organizers") return "organizers-page";
  if (page === "claim") return "claim-page";
  if (isLegalPageKey(page)) return "legal-page";
  if (page === "not_found") return "not-found-page";
  return "home-page";
}

/** The market city a city page path names, such as /mumbai/. */
export function cityForPath(pathname: string): MarketCity | null {
  const slug = /^\/([a-z0-9-]+)\/?$/u.exec(pathname)?.[1];
  return activeMarket.cities.find((city) => city.slug === slug) ?? null;
}

/**
 * A city page is Explore's city state at its own URL. A city that has not
 * opened stays out of search until CAT-181 decides on discovery indexing.
 */
export function pageMetaForCity(city: MarketCity): PageMeta {
  const fill = (template: string) => interpolateContent(template, {city: city.label});
  return {
    title: fill(explorePageCopy.meta.title),
    description: fill(explorePageCopy.meta.description),
    twitterDescription: fill(explorePageCopy.meta.twitterDescription),
    canonicalPath: `/${city.slug}/`,
    ...(city.status === "live" ? {} : {robots: "noindex, follow"}),
  };
}
