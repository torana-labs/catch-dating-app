import {
  validateEventPublicPageDocument,
  validateOrganizerPublicPageDocument,
} from "../../../../tool/contracts/generated/schema_contract_validators.mjs";
import type {EventPublicPageDocument} from "../../../../functions/src/shared/generated/eventPublicPageDocument";
import type {OrganizerPublicPageDocument} from "../../../../functions/src/shared/generated/organizerPublicPageDocument";
import type {
  HostListing,
  HostListingCatchEvent,
  HostListingExternalEvent,
} from "../../features/organizers/types";
import {organizerPath, publicDocumentId} from "../publicReadPolicy";
import type {PublicDocument, PublicReader} from "./publicReader";

/**
 * Functions maintain one read-model document per public organizer and event
 * page (functions/src/publicPages) with the same publication rules this
 * reader applies, so a page view reads one document. A page whose document
 * does not exist reads nothing else here.
 */
type PageEvent = OrganizerPublicPageDocument["upcomingEvents"][number];

export interface OrganizerPageRead {
  page: OrganizerPublicPageDocument;
  isLegacyPath: boolean;
}

function validOrganizerPage(doc: PublicDocument | undefined): OrganizerPublicPageDocument | null {
  const data = doc?.data();
  return doc && publicDocumentId(doc.id) && validateOrganizerPublicPageDocument(data) &&
    (data as OrganizerPublicPageDocument).organizerId === doc.id &&
    organizerPath((data as OrganizerPublicPageDocument).path) ?
    data as OrganizerPublicPageDocument : null;
}

/** A canonical path wins; otherwise one unambiguous legacy alias resolves. */
export async function findOrganizerPage(db: PublicReader, pathname: string): Promise<OrganizerPageRead | null> {
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const pages = db.collection("organizerPublicPage");
  const canonical = await pages.where("path", "==", path).limit(2).get();
  if (canonical.size > 1) return null;
  if (canonical.size === 1) {
    const page = validOrganizerPage(canonical.docs[0]);
    return page && page.path === path ? {page, isLegacyPath: false} : null;
  }
  const aliases = await pages.where("legacyPaths", "array-contains", path).limit(2).get();
  const page = aliases.size === 1 ? validOrganizerPage(aliases.docs[0]) : null;
  return page && page.legacyPaths.includes(path) ? {page, isLegacyPath: true} : null;
}

export async function findEventPage(db: PublicReader, eventId: string): Promise<EventPublicPageDocument | null> {
  if (!publicDocumentId(eventId)) return null;
  const snapshot = await db.collection("eventPublicPage").doc(eventId).get();
  const data = snapshot.exists ? snapshot.data() : null;
  return validateEventPublicPageDocument(data) && (data as EventPublicPageDocument).eventId === eventId &&
    (data as EventPublicPageDocument).item.eventId === eventId ? data as EventPublicPageDocument : null;
}

/** Pages are built ahead of the read, so an event that has since ended reads as past. */
function catchEventAt(event: HostListingCatchEvent, readAt: number): HostListingCatchEvent {
  const end = Date.parse(event.endTime ?? event.startTime);
  return {...event, timeline: Number.isFinite(end) && end < readAt ? "past" : event.timeline};
}

function byId<T extends {id: string}>(events: T[]): T[] {
  return events.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function withPageEvents(listing: HostListing, items: readonly PageEvent[], readAt: number): HostListing {
  const catchEvents = byId(items.flatMap((item) => item.source === "catch" ?
    [catchEventAt(item.event as HostListingCatchEvent, readAt)] : []));
  const externalEvents = byId(items.flatMap((item) => item.source === "external" ?
    [item.event as HostListingExternalEvent] : []));
  return {...listing, catchEvents, ...(externalEvents.length ? {externalEvents} : {})};
}

/** Today's organizer page: its listing with events and reviews, then the recommendation rail. */
export function organizerPageListings(page: OrganizerPublicPageDocument, readAt: number): HostListing[] {
  const listing = withPageEvents(page.listing as HostListing, [...page.upcomingEvents, ...page.pastMoments], readAt);
  return [{...listing, reviews: page.latestReviews}, ...page.recommendedOrganizers as HostListing[]];
}

/** Today's event page: the organizer listing with this one event and its reviews. */
export function eventPageListing(page: EventPublicPageDocument, readAt: number): HostListing {
  return withPageEvents(page.listing as HostListing, [page.item], readAt);
}
