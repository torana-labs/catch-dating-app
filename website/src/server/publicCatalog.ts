import "server-only";
import {validatePublicRuntimeEnvironment} from "./publicEnvironment";
import {getApps, initializeApp, applicationDefault} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {cache} from "react";
import type {PublicCatalog} from "../app/next/publicCatalogTypes";
import {organizerPageRecord} from "../features/organizers/organizerPage";
import {withinReadDeadline, type PublicReader} from "./repositories/publicReader";
import {
  eventPageListing,
  findEventPage,
  findOrganizerPage,
  listOrganizerPages,
  organizerCatalogListing,
  organizerPageListings,
} from "./repositories/publicPageRepository";
import {organizerPath, publicDocumentId} from "./publicReadPolicy";
import type {HostListing} from "../features/organizers/types";
import type {EventPageData} from "../features/events/eventPageModel";
import {eventMapLink, eventMapsAvailable} from "./eventMapLink";

/**
 * The public website reads only the public page read models Functions build
 * (functions/src/publicPages): organizerPublicPage, eventPublicPage and
 * cityPlans. It never reads organizers, events, externalEvents or reviews,
 * so publication and suppression are decided once, on the server that
 * builds the pages.
 */
function publicReaderApp() {
  validatePublicRuntimeEnvironment();
  const projectId = process.env.CATCH_PUBLIC_FIRESTORE_PROJECT;
  if (!projectId) throw new Error("CATCH_PUBLIC_FIRESTORE_PROJECT is required");
  const name = "catch-public-website-reader";
  return getApps().find(candidate => candidate.name === name) ?? initializeApp({
    projectId, credential: applicationDefault(),
  }, name);
}
export function publicFirestore() {return getFirestore(publicReaderApp());}

/** Cloud Run's metadata server answers within milliseconds; elsewhere the lookup gives up within seconds. */
export const PUBLIC_READER_CREDENTIAL_DEADLINE_MS = 3_000;

/**
 * The reader once its credentials answer. Without credentials Firestore
 * retries every read for about eight seconds before failing, so a page that
 * cannot be read would take that long to say so. The credential library
 * remembers that no metadata server answered, so later checks fail at once.
 * The emulator needs no credentials.
 */
export async function publicReader(): Promise<PublicReader> {
  const app = publicReaderApp();
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    const credential = app.options.credential;
    if (!credential) throw new Error("PUBLIC_READER_CREDENTIALS_UNAVAILABLE");
    await withinReadDeadline(credential.getAccessToken(), PUBLIC_READER_CREDENTIAL_DEADLINE_MS,
      "PUBLIC_READER_CREDENTIALS_UNAVAILABLE");
  }
  return getFirestore(app);
}

/**
 * Discovery, directory, claim lookup and sitemap: every public organizer
 * page's listing with its listed events, one read-model document each.
 */
export async function assemblePublicCatalog(db: PublicReader, readAt: number): Promise<PublicCatalog> {
  const pages = await withinReadDeadline(listOrganizerPages(db));
  return {listings: pages.map(page => organizerCatalogListing(page, readAt)), readAt};
}

export interface PublishedOrganizerRoute {
  listing: HostListing;
  isLegacyPath: boolean;
}

export interface PublicOrganizerDetail {
  catalog: PublicCatalog;
  route: PublishedOrganizerRoute;
}

/**
 * One organizer page from its read model: one document holds the page the
 * organiser route renders, with the listing its routing and metadata read.
 * A page without a read model is withheld or unknown, and renders as not found.
 */
export async function assembleOrganizerDetailCatalog(
  db: PublicReader, pathname: string, readAt: number
): Promise<PublicOrganizerDetail | null> {
  return withinReadDeadline((async () => {
    const read = await findOrganizerPage(db, pathname);
    if (!read) return null;
    const listings = organizerPageListings(read.page, readAt);
    return {catalog: {listings, readAt, organizerPage: organizerPageRecord(read.page, readAt)},
      route: {listing: listings[0], isLegacyPath: read.isLegacyPath}};
  })());
}

/**
 * One event page from its read model. The listing still feeds route metadata
 * and the organizer analytics.
 */
export async function assembleEventDetailCatalog(
  db: PublicReader, eventId: string, readAt: number, mapsAvailable: () => Promise<boolean> = () => eventMapsAvailable()
): Promise<PublicCatalog | null> {
  return withinReadDeadline((async () => {
    // Secret Manager answers while the page is read; a cached answer is instant.
    const [page, mapsOn] = await Promise.all([findEventPage(db, eventId), mapsAvailable()]);
    if (!page) return null;
    const {builtAt: _builtAt, contentHash: _contentHash, listing: _listing, ...eventPage} = page;
    const catalog: PublicCatalog & {eventPage: EventPageData} = {listings: [eventPageListing(page, readAt)], readAt, eventPage};
    const {item} = eventPage;
    const eventMap = await eventMapLink(eventId, item.source === "catch" ? item.event.meetingLocation : null,
      async () => mapsOn);
    return eventMap ? {...catalog, eventMap} : catalog;
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

/**
 * Remembers one successful read for `ttlMs` and shares one in-flight read
 * between callers. A failed read is never remembered.
 */
export function memoizeFor<T>(ttlMs: number, read: () => Promise<T>, now: () => number = Date.now): () => Promise<T> {
  let entry: {at: number; value: Promise<T>} | null = null;
  return () => {
    const current = entry;
    if (current && now() - current.at < ttlMs) return current.value;
    const next = {at: now(), value: read()};
    entry = next;
    next.value.catch(() => {if (entry === next) entry = null;});
    return next.value;
  };
}

/**
 * Cloud Monitoring's uptime check calls the catalog route about 1,700 times a
 * day, 94% of its traffic, and reads every published organizer and event for
 * each call. It only needs a 200 that proves Firestore answers, so its calls
 * share one read per minute per instance. Browsers never use this: they
 * withhold a catalog 30 seconds after its read, so their live check reads
 * fresh. `readAt` stays the real read time.
 */
export const PUBLIC_CATALOG_PROBE_MEMO_MS = 120_000;

/** React cache deduplicates within one render only. No cross-request or offline cache. */
export const readRouteCatalog = cache(async (pathname: string) =>
  assembleRouteCatalog(await publicReader(), pathname, Date.now()));
export const readPublicCatalog = cache(async () => assemblePublicCatalog(await publicReader(), Date.now()));
/** The catalog for uptime probes only: at most one real read every two minutes per instance. */
export const readPublicCatalogForProbe = memoizeFor(PUBLIC_CATALOG_PROBE_MEMO_MS,
  async () => assemblePublicCatalog(await publicReader(), Date.now()));
