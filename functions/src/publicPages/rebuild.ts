import {FieldPath, Timestamp} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {canonicalMarkets} from "../locations/marketConfig";
import {validateEventPublicPageDocument} from
  "../shared/generated/validators/eventPublicPageDocument";
import {validateOrganizerPublicPageDocument} from
  "../shared/generated/validators/organizerPublicPageDocument";
import {
  buildOrganizerScope,
  contentHash,
  recommendationCard,
  type EventPage,
  type OrganizerPage,
  type OrganizerScopePages,
  type OrganizerScopeSources,
  type ReviewCounts,
  type SourceDocument,
} from "./pageModel";
import {publicCatchEventAuthorized} from "./sourceProjections";
import {publicExternalEvent} from "./publicExternalEvent";
import {projectPublicOrganizer} from "./publicOrganizer";

type Firestore = FirebaseFirestore.Firestore;
type Snapshot = FirebaseFirestore.DocumentSnapshot;

export const collections = {
  organizerPages: "organizerPublicPage",
  eventPages: "eventPublicPage",
  builds: "publicPageBuilds",
} as const;

/** The website's live event cities are the launched markets. */
export const liveMarkets: ReadonlySet<string> = new Set(canonicalMarkets
  .filter((market) => market.launchStatus === "launched")
  .map((market) => market.slug));

// The website reader's per-organizer bounds; past them it fails closed.
const eventReadBound = 200;
const reviewReadBound = 200;
const recommendationReadBound = 4;
const getAllChunk = 100;

export class PublicPageReadBoundError extends Error {
  constructor(collection: string, organizerId: string) {
    super(`${collection} for ${organizerId} exceed the public page read ` +
      "bound.");
  }
}

function docs(snapshots: readonly Snapshot[]): SourceDocument[] {
  return snapshots.filter((snapshot) => snapshot.exists)
    .map((snapshot) => ({id: snapshot.id, data: snapshot.data()}));
}

async function readBounded(
  query: FirebaseFirestore.Query, bound: number,
  collection: string, organizerId: string
): Promise<SourceDocument[]> {
  const snapshot = await query.limit(bound + 1).get();
  if (snapshot.size > bound) {
    throw new PublicPageReadBoundError(collection, organizerId);
  }
  return docs(snapshot.docs);
}

async function getAllInChunks(
  db: Firestore, refs: FirebaseFirestore.DocumentReference[]
): Promise<Snapshot[]> {
  const snapshots: Snapshot[] = [];
  for (let start = 0; start < refs.length; start += getAllChunk) {
    snapshots.push(...await db.getAll(
      ...refs.slice(start, start + getAllChunk)));
  }
  return snapshots;
}

const emptyCounts = (): ReviewCounts => ({
  count: 0, verifiedCount: 0, verifiedAverage: null,
  distribution: {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
});

/**
 * Published-review aggregates, filtered as the organizer stats are. Counts
 * per rating, all and verified, need only equality filters, so no
 * composite index; the verified average follows from the verified counts.
 */
async function readReviewCounts(
  db: Firestore, organizerId: string
): Promise<ReviewCounts> {
  const published = db.collection("reviews")
    .where("organizerId", "==", organizerId)
    .where("moderationStatus", "==", "published");
  const verified = published.where("verificationStatus", "==", "verified");
  const ratings = ["1", "2", "3", "4", "5"] as const;
  const count = async (query: FirebaseFirestore.Query) =>
    (await query.count().get()).data().count;
  const [all, byRating, verifiedByRating] = await Promise.all([
    count(published),
    Promise.all(ratings.map((rating) =>
      count(published.where("rating", "==", Number(rating))))),
    Promise.all(ratings.map((rating) =>
      count(verified.where("rating", "==", Number(rating))))),
  ]);
  const distribution = emptyCounts().distribution;
  ratings.forEach((rating, index) => {
    distribution[rating] = byRating[index];
  });
  const verifiedCount = verifiedByRating.reduce((sum, item) => sum + item, 0);
  const verifiedTotal = verifiedByRating.reduce((sum, item, index) =>
    sum + item * (index + 1), 0);
  return {
    count: all,
    verifiedCount,
    verifiedAverage: verifiedCount ? verifiedTotal / verifiedCount : null,
    distribution,
  };
}

/** Recommendable organizers as today's rail shows them, in id order. */
async function readRecommendationCandidates(db: Firestore) {
  const snapshot = await db.collection(collections.organizerPages)
    .where("recommendable", "==", true)
    .orderBy(FieldPath.documentId())
    .limit(recommendationReadBound)
    .select("listing")
    .get();
  return snapshot.docs.map((doc) =>
    recommendationCard({listing: doc.get("listing")}));
}

/**
 * Reads everything one organizer's pages show. An organizer that fails the
 * publication rules reads nothing further and builds no pages.
 */
export async function readOrganizerScope(
  db: Firestore, organizerId: string, now: number
): Promise<OrganizerScopeSources> {
  const organizerSnapshot =
    await db.collection("organizers").doc(organizerId).get();
  const organizer = organizerSnapshot.exists ?
    {id: organizerSnapshot.id, data: organizerSnapshot.data()} : null;
  const sources: OrganizerScopeSources = {
    organizerId, organizer, pathConflict: false, catchEvents: [],
    externalEvents: [], ambiguousEventIds: new Set(), reviews: [],
    reviewCounts: emptyCounts(), recommendationCandidates: [],
    liveMarkets, now,
  };
  const listing = organizer &&
    projectPublicOrganizer(organizerId, organizer.data, liveMarkets);
  if (!listing) return sources;

  const reviewsReadable =
    listing.capabilities.publicReviews.readState === "enabled";
  const events = db.collection("events");
  const external = db.collection("externalEvents");
  const [peers, byOrganizer, externalEvents, reviews, reviewCounts,
    recommendationCandidates] = await Promise.all([
    db.collection("organizers")
      .where("publicPage.publishStatus", "==", "published")
      .where("publicPage.canonicalPath", "==", listing.path)
      .limit(3).get(),
    readBounded(events.where("organizerId", "==", organizerId)
      .where("publicationState", "==", "published"),
    eventReadBound, "events", organizerId),
    readBounded(external.where("canonicalHostId", "==", organizerId)
      .where("publicationStatus", "==", "public"),
    eventReadBound, "externalEvents", organizerId),
    reviewsReadable ? db.collection("reviews")
      .where("organizerId", "==", organizerId)
      .orderBy("createdAt", "desc")
      .limit(reviewReadBound).get()
      .then((snapshot) => docs(snapshot.docs)) : Promise.resolve([]),
    reviewsReadable ?
      readReviewCounts(db, organizerId) : Promise.resolve(emptyCounts()),
    readRecommendationCandidates(db),
  ]);
  sources.pathConflict = peers.docs.some((doc) => doc.id !== organizerId &&
    projectPublicOrganizer(doc.id, doc.data(), liveMarkets)?.path ===
      listing.path);
  const catchEvents = [...byOrganizer];
  // An id published as both kinds is ambiguous, so its event page is
  // withheld, as the website reader withholds it.
  const [externalTwins, catchTwins] = await Promise.all([
    getAllInChunks(db, catchEvents.map((doc) => external.doc(doc.id))),
    getAllInChunks(db, externalEvents.map((doc) => events.doc(doc.id))),
  ]);
  const ambiguous = new Set<string>();
  for (const twin of externalTwins) {
    if (twin.exists && publicExternalEvent(twin.id,
      twin.data() as Record<string, unknown>)) ambiguous.add(twin.id);
  }
  for (const twin of catchTwins) {
    if (twin.exists && publicCatchEventAuthorized(twin.id, twin.data(), now)) {
      ambiguous.add(twin.id);
    }
  }
  return {...sources, catchEvents, externalEvents,
    ambiguousEventIds: ambiguous, reviews, reviewCounts,
    recommendationCandidates};
}

export interface CommitResult {
  status: "committed" | "superseded";
  organizerPage: "written" | "unchanged" | "deleted" | "absent";
  eventPagesWritten: number;
  eventPagesDeleted: number;
  railChanged: boolean;
}

function railKey(page: unknown): string | null {
  const current = page as OrganizerPage | undefined;
  return current?.recommendable ?
    contentHash(recommendationCard(current)) : null;
}

/**
 * Writes one organizer's pages in a transaction guarded by its build
 * marker: a rebuild that read its sources before the last committed one
 * changes nothing, so it can never overwrite a newer page or revive a
 * withdrawn one. Pages whose content is unchanged are not rewritten.
 */
export async function commitOrganizerScope(
  db: Firestore, organizerId: string, pages: OrganizerScopePages,
  readStart: number
): Promise<CommitResult> {
  const builtAt = Timestamp.fromMillis(readStart);
  const organizerPages = db.collection(collections.organizerPages);
  const eventPages = db.collection(collections.eventPages);
  return db.runTransaction(async (tx) => {
    const markerRef = db.collection(collections.builds).doc(organizerId);
    const pageRef = organizerPages.doc(organizerId);
    const [marker, current] = await tx.getAll(markerRef, pageRef);
    const markedAt = marker.get("sourceReadAt");
    if (markedAt instanceof Timestamp && markedAt.toMillis() > readStart) {
      return {status: "superseded", organizerPage: "unchanged",
        eventPagesWritten: 0, eventPagesDeleted: 0, railChanged: false};
    }
    const owned = await tx.get(
      eventPages.where("organizerId", "==", organizerId));
    const targets = pages.eventPages.length ? await tx.getAll(
      ...pages.eventPages.map((page) => eventPages.doc(page.eventId))) : [];

    const result: CommitResult = {status: "committed",
      organizerPage: "absent", eventPagesWritten: 0, eventPagesDeleted: 0,
      railChanged: railKey(current.data()) !== railKey(
        pages.organizerPage ?? undefined)};
    if (pages.organizerPage) {
      const hash = contentHash(pages.organizerPage);
      if (current.get("contentHash") === hash) {
        result.organizerPage = "unchanged";
      } else {
        tx.set(pageRef, {...pages.organizerPage, builtAt, contentHash: hash});
        result.organizerPage = "written";
      }
    } else if (current.exists) {
      tx.delete(pageRef);
      result.organizerPage = "deleted";
    }
    const keep = new Set<string>();
    pages.eventPages.forEach((page: EventPage, index) => {
      keep.add(page.eventId);
      const target = targets[index];
      const hash = contentHash(page);
      const otherBuiltAt = target.get("builtAt");
      // A newer build for another organizer owns this event id.
      if (target.exists && target.get("organizerId") !== organizerId &&
          otherBuiltAt instanceof Timestamp &&
          otherBuiltAt.toMillis() > readStart) return;
      if (target.get("contentHash") === hash) return;
      tx.set(target.ref, {...page, builtAt, contentHash: hash});
      result.eventPagesWritten++;
    });
    for (const doc of owned.docs) {
      if (keep.has(doc.id)) continue;
      tx.delete(doc.ref);
      result.eventPagesDeleted++;
    }
    tx.set(markerRef, {
      schemaVersion: 1,
      organizerId,
      sourceReadAt: builtAt,
      published: pages.organizerPage !== null,
      eventPageCount: pages.eventPages.length,
    });
    return result;
  });
}

/**
 * Only pages that match their contract are stored. An invalid organizer page
 * withholds the organizer's pages; an invalid event page withholds itself.
 */
export function contractValidPages(
  pages: OrganizerScopePages, builtAt: Timestamp
): OrganizerScopePages {
  const stored = (page: OrganizerPage | EventPage) =>
    ({...page, builtAt, contentHash: contentHash(page)});
  if (pages.organizerPage &&
      !validateOrganizerPublicPageDocument(stored(pages.organizerPage))) {
    logger.error("Organizer public page breaks its contract.", {
      organizerId: pages.organizerPage.organizerId,
      errors: validateOrganizerPublicPageDocument.errors,
    });
    return {organizerPage: null, eventPages: []};
  }
  return {...pages, eventPages: pages.eventPages.filter((page) => {
    if (validateEventPublicPageDocument(stored(page))) return true;
    logger.error("Event public page breaks its contract.", {
      eventId: page.eventId, errors: validateEventPublicPageDocument.errors});
    return false;
  })};
}

export interface RebuildOptions {
  now?: () => number;
  /** Refresh other pages' recommendation rails when this card changes. */
  fanOut?: boolean;
}

/** Reads, builds and commits one organizer's organizer and event pages. */
export async function rebuildOrganizerScope(
  db: Firestore, organizerId: string, options: RebuildOptions = {}
): Promise<CommitResult> {
  const readStart = (options.now ?? Date.now)();
  const sources = await readOrganizerScope(db, organizerId, readStart);
  const pages = contractValidPages(buildOrganizerScope(sources),
    Timestamp.fromMillis(readStart));
  const result = await commitOrganizerScope(
    db, organizerId, pages, readStart);
  if (result.status === "committed" && result.railChanged &&
      options.fanOut !== false) {
    await refreshRecommendationRails(db, organizerId, options);
  }
  return result;
}

/**
 * Today's organizer pages show up to three recommendable organizers. When
 * one organizer's card changes, the other pages are rebuilt so their rails
 * match. Rebuilds started here never fan out again.
 */
export async function refreshRecommendationRails(
  db: Firestore, changedOrganizerId: string, options: RebuildOptions = {}
): Promise<number> {
  const ids = await listOrganizerPageIds(db);
  let rebuilt = 0;
  for (const id of ids) {
    if (id === changedOrganizerId) continue;
    await rebuildOrganizerScope(db, id, {...options, fanOut: false});
    rebuilt++;
  }
  return rebuilt;
}

async function listIds(query: FirebaseFirestore.Query): Promise<string[]> {
  const ids: string[] = [];
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  do {
    let page = query.orderBy(FieldPath.documentId()).limit(300).select();
    if (cursor) page = page.startAfter(cursor);
    const snapshot = await page.get();
    ids.push(...snapshot.docs.map((doc) => doc.id));
    cursor = snapshot.size === 300 ? snapshot.docs.at(-1) : undefined;
  } while (cursor);
  return ids;
}

export function listOrganizerPageIds(db: Firestore): Promise<string[]> {
  return listIds(db.collection(collections.organizerPages));
}

/**
 * Every organizer that has, or should have, public pages: published
 * organizers, existing pages and build markers that last published.
 */
export async function listPublicPageScopes(db: Firestore): Promise<string[]> {
  const [published, pages, markers] = await Promise.all([
    listIds(db.collection("organizers")
      .where("publicPage.publishStatus", "==", "published")),
    listOrganizerPageIds(db),
    listIds(db.collection(collections.builds)
      .where("published", "==", true)),
  ]);
  return [...new Set([...published, ...pages, ...markers])].sort();
}

export interface ReconcileSummary {
  scopes: number;
  failed: string[];
  results: Record<string, CommitResult>;
}

/** Rebuilds every scope. The daily reconcile and the backfill run this. */
export async function reconcilePublicPageScopes(
  db: Firestore, options: RebuildOptions = {}
): Promise<ReconcileSummary> {
  const ids = await listPublicPageScopes(db);
  const summary: ReconcileSummary = {scopes: ids.length, failed: [],
    results: {}};
  for (const id of ids) {
    try {
      // The final pass settles every rail, so no per-page fan-out.
      summary.results[id] =
        await rebuildOrganizerScope(db, id, {...options, fanOut: false});
    } catch (error) {
      summary.failed.push(id);
      logger.error("Public page rebuild failed.", {organizerId: id, error});
    }
  }
  return summary;
}

/**
 * Follows change an organizer's count often, so pages pick the count up in
 * batches: one rebuild per organizer whose page count differs.
 */
export async function refreshPublicPageFollowerCounts(
  db: Firestore, options: RebuildOptions = {}
): Promise<string[]> {
  const ids = await listOrganizerPageIds(db);
  const stale: string[] = [];
  for (let start = 0; start < ids.length; start += getAllChunk) {
    const chunk = ids.slice(start, start + getAllChunk);
    const pageRefs = chunk.map((id) =>
      db.collection(collections.organizerPages).doc(id));
    const organizerRefs = chunk.map((id) =>
      db.collection("organizers").doc(id));
    const [pages, organizers] = await Promise.all([
      db.getAll(...pageRefs, {fieldMask: ["followerCount"]}),
      db.getAll(...organizerRefs, {fieldMask: ["followerCount"]}),
    ]);
    pages.forEach((page, index) => {
      const count = organizers[index].get("followerCount");
      const current = Number.isSafeInteger(count) && count >= 0 ? count : 0;
      if (page.exists && page.get("followerCount") !== current) {
        stale.push(page.id);
      }
    });
  }
  for (const id of stale) {
    await rebuildOrganizerScope(db, id, {...options, fanOut: false});
  }
  return stale;
}

export interface ScopePlan {
  organizerId: string;
  organizerPage: "create" | "update" | "unchanged" | "delete" | "absent";
  eventPages: {create: number; update: number; unchanged: number;
    delete: number};
}

/**
 * What a rebuild would change for one organizer, read-only. The backfill
 * script prints these before it writes anything.
 */
export async function planOrganizerScope(
  db: Firestore, organizerId: string, now: number
): Promise<ScopePlan> {
  const pages = contractValidPages(buildOrganizerScope(
    await readOrganizerScope(db, organizerId, now)), Timestamp.fromMillis(now));
  const eventPages = db.collection(collections.eventPages);
  const [current, owned, targets] = await Promise.all([
    db.collection(collections.organizerPages).doc(organizerId).get(),
    eventPages.where("organizerId", "==", organizerId).select().get(),
    getAllInChunks(db, pages.eventPages.map((page) =>
      eventPages.doc(page.eventId))),
  ]);
  const plan: ScopePlan = {organizerId,
    organizerPage: pages.organizerPage ?
      !current.exists ? "create" :
        current.get("contentHash") === contentHash(pages.organizerPage) ?
          "unchanged" : "update" :
      current.exists ? "delete" : "absent",
    eventPages: {create: 0, update: 0, unchanged: 0, delete: 0}};
  const keep = new Set(pages.eventPages.map((page) => page.eventId));
  pages.eventPages.forEach((page, index) => {
    const target = targets[index];
    if (!target.exists) plan.eventPages.create++;
    else if (target.get("contentHash") === contentHash(page)) {
      plan.eventPages.unchanged++;
    } else plan.eventPages.update++;
  });
  plan.eventPages.delete =
    owned.docs.filter((doc) => !keep.has(doc.id)).length;
  return plan;
}

export function planChanges(plan: ScopePlan): boolean {
  return !["unchanged", "absent"].includes(plan.organizerPage) ||
    plan.eventPages.create + plan.eventPages.update +
      plan.eventPages.delete > 0;
}
