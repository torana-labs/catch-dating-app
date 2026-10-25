import "server-only";
import {validatePublicRuntimeEnvironment} from "./publicEnvironment";
import {getApps, initializeApp, applicationDefault} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {cache} from "react";
import {activeEventLiveCities} from "../content/markets";
import type {PublicCatalog} from "../app/next/publicCatalogTypes";
import type {LivePublicCatchEvent} from "../features/organizers/publicCatchEventProjection";
import type {HostListing} from "../features/organizers/types";
import {withinReadDeadline, type PublicReader} from "./repositories/publicReader";
import {
  findPublishedOrganizerById,
  findPublishedOrganizerByPath,
  listPublishedOrganizers,
  listRecommendedOrganizers,
  type PublishedOrganizerRoute,
} from "./repositories/organizerRepository";
import {
  findPublishedCatchEvent,
  listPublishedCatchEvents,
  listPublishedCatchEventsForOrganizer,
} from "./repositories/catchEventRepository";
import {
  findPublicExternalEvent,
  listPublicExternalEvents,
  listPublicExternalEventsForOrganizer,
  type PublicExternalEventRow,
} from "./repositories/externalEventRepository";
import {withPublicReviews} from "./repositories/reviewRepository";
import {
  eventPageListing,
  findEventPage,
  findOrganizerPage,
  organizerPageListings,
} from "./repositories/publicPageRepository";
import {organizerPath, publicDocumentId} from "./publicReadPolicy";

const markets = new Set(activeEventLiveCities.map(city => city.slug));
export function publicFirestore() {
  validatePublicRuntimeEnvironment();
  const projectId = process.env.CATCH_PUBLIC_FIRESTORE_PROJECT;
  if (!projectId) throw new Error("CATCH_PUBLIC_FIRESTORE_PROJECT is required");
  const name = "catch-public-website-reader";
  const app = getApps().find(candidate => candidate.name === name) ?? initializeApp({
    projectId, credential: applicationDefault(),
  }, name);
  return getFirestore(app);
}

function withEvents(listing: HostListing, events: readonly LivePublicCatchEvent[],
  externalEvents: readonly PublicExternalEventRow[]): HostListing {
  return {...listing, catchEvents: events.map(row => row.event),
    ...(externalEvents.length ? {externalEvents: externalEvents.map(row => row.event)} : {})};
}

/** Discovery, directory, claim lookup and sitemap: every published listing with its events. */
export async function assemblePublicCatalog(db: PublicReader, readAt: number): Promise<PublicCatalog> {
  const [listings, events, externalEvents] = await withinReadDeadline(Promise.all([
    listPublishedOrganizers(db, markets),
    listPublishedCatchEvents(db, readAt),
    listPublicExternalEvents(db),
  ]));
  const byId = new Map(listings.map(listing => [listing.id, listing]));
  for (const row of events) byId.get(row.organizerId)?.catchEvents?.push(row.event);
  for (const row of externalEvents) {
    const listing = byId.get(row.organizerId);
    if (listing) (listing.externalEvents ??= []).push(row.event);
  }
  return {listings, readAt};
}

export interface PublicOrganizerDetail {
  catalog: PublicCatalog;
  route: PublishedOrganizerRoute;
}

/**
 * One organizer page from its read model: one document holds the listing,
 * its events and reviews, and the recommendation rail. Until every
 * environment is backfilled (functions/scripts/backfill-public-pages.cjs
 * --check), a page without a read model is assembled from its sources under
 * the same publication rules, so a withdrawn page stays withdrawn either way.
 */
export async function assembleOrganizerDetailCatalog(
  db: PublicReader, pathname: string, readAt: number
): Promise<PublicOrganizerDetail | null> {
  return withinReadDeadline((async () => {
    const read = await findOrganizerPage(db, pathname);
    if (read) {
      const listings = organizerPageListings(read.page, readAt);
      return {catalog: {listings, readAt}, route: {listing: listings[0], isLegacyPath: read.isLegacyPath}};
    }
    return assembleOrganizerDetailFromSources(db, pathname, readAt);
  })());
}

/** One event page from its read model, or from its sources until backfilled. */
export async function assembleEventDetailCatalog(
  db: PublicReader, eventId: string, readAt: number
): Promise<PublicCatalog | null> {
  return withinReadDeadline((async () => {
    const page = await findEventPage(db, eventId);
    if (page) return {listings: [eventPageListing(page, readAt)], readAt};
    return assembleEventDetailFromSources(db, eventId, readAt);
  })());
}

/**
 * One organizer page from its sources: its listing with events and reviews,
 * then the verified organizers its recommendation rail can show. Reads scale
 * with that organizer, not with the catalog.
 */
export async function assembleOrganizerDetailFromSources(
  db: PublicReader, pathname: string, readAt: number
): Promise<PublicOrganizerDetail | null> {
  return withinReadDeadline((async () => {
    const route = await findPublishedOrganizerByPath(db, pathname, markets);
    if (!route) return null;
    const [events, externalEvents, recommended] = await Promise.all([
      listPublishedCatchEventsForOrganizer(db, route.listing.id, readAt),
      listPublicExternalEventsForOrganizer(db, route.listing.id),
      listRecommendedOrganizers(db, markets, route.listing.id),
    ]);
    const listing = await withPublicReviews(db, withEvents(route.listing, events, externalEvents));
    return {catalog: {listings: [listing, ...recommended], readAt}, route: {...route, listing}};
  })());
}

/** One event page from its sources: the event on its organizer listing, with reviews for both. */
export async function assembleEventDetailFromSources(
  db: PublicReader, eventId: string, readAt: number
): Promise<PublicCatalog | null> {
  return withinReadDeadline((async () => {
    const [catchEvent, externalEvent] = await Promise.all([
      findPublishedCatchEvent(db, eventId, readAt),
      findPublicExternalEvent(db, eventId),
    ]);
    // An id published as both kinds is ambiguous, so the full catalog withholds it too.
    if (catchEvent && externalEvent) return null;
    const organizerId = catchEvent?.organizerId ?? externalEvent?.organizerId;
    if (!organizerId) return null;
    const organizer = await findPublishedOrganizerById(db, organizerId, markets);
    if (!organizer) return null;
    const listing = withEvents(organizer, catchEvent ? [catchEvent] : [], externalEvent ? [externalEvent] : []);
    return {listings: [await withPublicReviews(db, listing, eventId)], readAt};
  })());
}

function eventIdForPath(path: string): string | null {
  const match = /^\/events\/([^/]+)\/$/u.exec(path);
  if (!match) return null;
  try {
    const eventId = decodeURIComponent(match[1]);
    return publicDocumentId(eventId) ? eventId : null;
  } catch {
    return null;
  }
}

/**
 * The smallest catalog that renders a public route, per the read plan in
 * docs/web_surface_architecture.md. A detail path that names nothing published
 * reads nothing further and renders as not found.
 */
export async function assembleRouteCatalog(
  db: PublicReader, pathname: string, readAt: number
): Promise<PublicCatalog> {
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const none: PublicCatalog = {listings: [], readAt};
  if (path.startsWith("/organizers/") && path !== "/organizers/") {
    return organizerPath(path) ? (await assembleOrganizerDetailCatalog(db, path, readAt))?.catalog ?? none : none;
  }
  if (path.startsWith("/events/")) {
    const eventId = eventIdForPath(path);
    return eventId ? await assembleEventDetailCatalog(db, eventId, readAt) ?? none : none;
  }
  return assemblePublicCatalog(db, readAt);
}

/** React cache deduplicates within one render only. No cross-request or offline cache. */
export const readRouteCatalog = cache((pathname: string) =>
  assembleRouteCatalog(publicFirestore(), pathname, Date.now()));
export const readPublicCatalog = cache(() => assemblePublicCatalog(publicFirestore(), Date.now()));
