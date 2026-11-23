import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {validatePublicOrganizerDocument} from
  "../shared/generated/validators/publicOrganizerDocument";
import {organizerWomenLed} from "../domain/events/womenLed";
import {
  organizerSummaryChanged,
  refreshOrganizerEventSummaries,
} from "./eventOrganizerSummary";
import {defineProjections} from "../platform/dispatch/runtime";

/**
 * Public organizer projection (#1221).
 *
 * organizers/{id} holds contact details, host defaults, provenance, intake,
 * admin search, ownership, claim and source evidence. The apps read
 * publicOrganizers/{id} for everything a guest may see, so the canonical
 * document can be limited to the organizer's own team. Fields are copied by
 * allowlist: a field added to organizers later stays private until it is
 * deliberately listed here and in public_organizers.schema.json.
 */
export const PUBLIC_ORGANIZER_FIELDS = [
  "name", "description", "location", "locationCityId", "locationMarketId",
  "area", "cityName", "regionName", "countryCode", "countryName",
  "hostUserId", "hostName", "hostAvatarUrl", "ownerUserId", "hostUserIds",
  "hostProfiles", "createdAt", "imageUrl", "profileImageUrl",
  "organizerPhotos", "logoPhoto", "tags", "memberCount", "followerCount",
  "rating", "reviewCount", "verifiedReviewCount", "nextEventAt",
  "nextEventLabel", "instagramHandle", "status", "archived", "archivedAt",
  "appVisibility", "supplyCapabilities", "organizerType",
  "publicCategoryLabel", "entityKind", "entitySubtypes", "displayCategory",
  "synthetic", "seedPrefix",
] as const;

/**
 * Public fields computed from the canonical document rather than copied.
 * womenLed resolves organizers/{id}.womenLed, whose audit fields stay private.
 * publicPagePath is the published website page's canonical path, so a
 * guest's own lists (the website account page) can link the page without
 * reading the canonical document.
 */
export const PUBLIC_ORGANIZER_DERIVED_FIELDS =
  ["womenLed", "publicPagePath"] as const;

const COLLECTION = "publicOrganizers";

type Source = Record<string, unknown>;

function hasHost(source: Source): boolean {
  const ids = Array.isArray(source.hostUserIds) ? source.hostUserIds : [];
  return typeof source.ownerUserId === "string" ||
    typeof source.hostUserId === "string" ||
    ids.some((id) => typeof id === "string");
}

/**
 * The published website page's canonical path, or null while the page is
 * not published.
 * @param {Source} source The canonical organizer document.
 * @return {string | null} The path.
 */
export function publishedPagePath(source: Source): string | null {
  const page = source.publicPage as Source | undefined;
  const path = page?.canonicalPath;
  return page?.publishStatus === "published" && typeof path === "string" &&
    path.length <= 240 && /^\/organizers\/(?:[a-z0-9-]+\/){1,2}$/u.test(path) ?
    path : null;
}

/**
 * Whether an organizer gets a public projection at all: the app shows it,
 * it has a host, or its website page is published. A scraped, unclaimed
 * listing that is neither shown nor published has none.
 * @param {Source | undefined} source The canonical organizer document.
 * @return {boolean} True when guests may read the organizer by id.
 */
export function publicOrganizerEligible(source: Source | undefined): boolean {
  if (!source) return false;
  if (source.status !== "active" && source.status !== "archived") {
    return false;
  }
  return source.appVisibility === "discoverable" || hasHost(source) ||
    publishedPagePath(source) !== null;
}

/**
 * Copies the public allowlist out of an organizer document.
 * @param {Source} source The canonical organizer document.
 * @return {Source} The public projection, before validation.
 */
export function projectPublicOrganizer(source: Source): Source {
  const projection: Source = {};
  for (const field of PUBLIC_ORGANIZER_FIELDS) {
    if (source[field] !== undefined) projection[field] = source[field];
  }
  // Derived, never copied: the declaration's audit fields stay private.
  projection.womenLed = organizerWomenLed(source);
  projection.publicPagePath = publishedPagePath(source);
  return projection;
}

export type PublicOrganizerOutcome =
  "written" | "unchanged" | "removed" | "absent" | "invalid";

interface PublicOrganizerDeps {
  firestore: () => FirebaseFirestore.Firestore;
}

const defaultDeps: PublicOrganizerDeps = {
  firestore: () => admin.firestore(),
};

/**
 * Rebuilds publicOrganizers/{id} from the current organizer document inside
 * a transaction, so out-of-order trigger delivery cannot leave a stale copy.
 * An organizer that is ineligible, deleted or fails the public contract has
 * no projection. Also reports whether the change touched a field the events'
 * organizerSummary holds, so only those writes fan out to events.
 * @param {string} organizerId Organizer id.
 * @param {PublicOrganizerDeps} deps Injectable Firebase dependencies.
 * @return {Promise<{outcome: PublicOrganizerOutcome, summaryChanged: boolean}>}
 *   What happened to the projection.
 */
export async function reconcilePublicOrganizerDetailed(organizerId: string,
  deps: PublicOrganizerDeps = defaultDeps): Promise<{
    outcome: PublicOrganizerOutcome; summaryChanged: boolean;
  }> {
  const db = deps.firestore();
  const sourceRef = db.collection("organizers").doc(organizerId);
  const publicRef = db.collection(COLLECTION).doc(organizerId);
  return db.runTransaction(async (tx) => {
    const [sourceSnap, publicSnap] =
      await Promise.all([tx.get(sourceRef), tx.get(publicRef)]);
    const source = sourceSnap.exists ?
      sourceSnap.data() as Source : undefined;
    const current = publicSnap.exists ? publicSnap.data() : undefined;
    if (!publicOrganizerEligible(source)) {
      if (!publicSnap.exists) {
        return {outcome: "absent" as const, summaryChanged: false};
      }
      tx.delete(publicRef);
      return {outcome: "removed" as const,
        summaryChanged: organizerSummaryChanged(current, undefined)};
    }
    const projection = projectPublicOrganizer(source as Source);
    if (!validatePublicOrganizerDocument(projection)) {
      logger.warn("Organizer fails the public contract; no projection.",
        {organizerId});
      if (publicSnap.exists) tx.delete(publicRef);
      return {outcome: "invalid" as const,
        summaryChanged: organizerSummaryChanged(current, undefined)};
    }
    if (publicSnap.exists && isDeepStrictEqual(current, projection)) {
      return {outcome: "unchanged" as const, summaryChanged: false};
    }
    tx.set(publicRef, projection);
    return {outcome: "written" as const,
      summaryChanged: organizerSummaryChanged(current, projection)};
  });
}

export async function reconcilePublicOrganizer(organizerId: string,
  deps: PublicOrganizerDeps = defaultDeps): Promise<PublicOrganizerOutcome> {
  return (await reconcilePublicOrganizerDetailed(organizerId, deps)).outcome;
}

/**
 * Whether this organizer write moves the summary its events carry: the
 * summary of the public projection before and after. It depends only on
 * the write, so a retry of the same write asks again and refreshes again.
 * @param {Source | undefined} before Organizer before.
 * @param {Source | undefined} after Organizer after.
 * @return {boolean} Whether the events' summary may be stale.
 */
export function organizerWriteMovesSummary(before: Source | undefined,
  after: Source | undefined): boolean {
  const view = (source: Source | undefined) => {
    if (!publicOrganizerEligible(source)) return undefined;
    const projection = projectPublicOrganizer(source as Source);
    return validatePublicOrganizerDocument(projection) ? projection :
      undefined;
  };
  return organizerSummaryChanged(view(before), view(after));
}

export interface PublicOrganizerWriteDeps {
  reconcile: (organizerId: string) =>
    Promise<{summaryChanged: boolean}>;
  refresh: (organizerId: string) => Promise<unknown>;
}

const liveWriteDeps: PublicOrganizerWriteDeps = {
  reconcile: (organizerId) => reconcilePublicOrganizerDetailed(organizerId),
  refresh: (organizerId) => refreshOrganizerEventSummaries(organizerId),
};

/**
 * Keeps the projection current, and the organizerSummary on the
 * organizer's events that have not ended when it may be stale: when this
 * attempt changed the projection's summary, or when the write itself
 * moves it. The second condition makes a retry converge: an attempt that
 * wrote the projection and then failed part way through the events finds
 * the projection unchanged on the retry, but the write still moves the
 * summary, so the retry refreshes the events it missed. The refresh
 * rewrites only events whose summary differs from the current projection.
 * @param {string} organizerId Organizer id.
 * @param {Source | undefined} before Organizer before.
 * @param {Source | undefined} after Organizer after.
 * @param {PublicOrganizerWriteDeps} deps Injectable steps.
 * @return {Promise<void>} Resolves once both are current.
 */
export async function syncPublicOrganizerWrite(organizerId: string,
  before: Source | undefined, after: Source | undefined,
  deps: PublicOrganizerWriteDeps = liveWriteDeps): Promise<void> {
  const {summaryChanged} = await deps.reconcile(organizerId);
  if (summaryChanged || organizerWriteMovesSummary(before, after)) {
    await deps.refresh(organizerId);
  }
}

/**
 * The public organizer projection and its events' summary.
 * Served by the organizers dispatcher (issue #2451); it re-reads its
 * sources, so a retry or a replay converges.
 */
export const publicOrganizerProjections = defineProjections("organizers", [{
  id: "publicOrganizer", kind: "projection", when: () => true,
  run: (change) => syncPublicOrganizerWrite(change.documentId,
    change.before as Source | undefined,
    change.after as Source | undefined),
}]);

/**
 * Creates or refreshes the projection for every organizer. Dry run by
 * default. It writes only publicOrganizers documents and never changes an
 * organizers document.
 * @param {PublicOrganizerDeps} deps Injectable Firebase dependencies.
 * @param {boolean} apply Whether to write.
 * @return {Promise<Record<string, number>>} Counts by outcome.
 */
export async function backfillPublicOrganizers(deps: PublicOrganizerDeps,
  apply: boolean): Promise<Record<string, number>> {
  const db = deps.firestore();
  const counts: Record<string, number> = {};
  const count = (key: string) => {
    counts[key] = (counts[key] ?? 0) + 1;
  };
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection("organizers")
      .orderBy(admin.firestore.FieldPath.documentId()).limit(200);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) {
      if (apply) {
        count(await reconcilePublicOrganizer(doc.id, deps));
        continue;
      }
      const source = doc.data() as Source;
      if (!publicOrganizerEligible(source)) count("ineligible");
      else if (!validatePublicOrganizerDocument(
        projectPublicOrganizer(source))) count("invalid");
      else count("eligible");
    }
    if (page.docs.length < 200) break;
    cursor = page.docs[page.docs.length - 1];
  }
  return counts;
}
