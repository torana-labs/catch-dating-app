import {onCall, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {
  EventDocument,
  ExternalEventDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminListEventDirectoryCallablePayload} from
  "../shared/generated/adminListEventDirectoryCallablePayload";
import type {AdminListEventDirectoryCallableResponse} from
  "../shared/generated/adminListEventDirectoryCallableResponse";
import {
  validateAdminListEventDirectoryCallablePayload,
} from "../shared/generated/validators/adminListEventDirectoryInput";
import {validateCallableWithAjv} from "../shared/validation";
import {requireAdminRole} from "./adminAuth";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {
  catchEventStatus,
  catchEventTitle,
  cityOf,
  clampPageLimit,
  countFacets,
  importedEventStatus,
  matchesQueryText,
  normalizeNullableString,
  normalizeQueryText,
  pageOf,
  recordsReaderRoles,
  timestampIso,
  timestampMillis,
} from "./recordsDirectory";

/** The most events of one source a directory read covers. */
export const eventDirectoryScanLimit = 3000;
const weekMillis = 7 * 24 * 60 * 60 * 1000;

type DirectoryRow = AdminListEventDirectoryCallableResponse["rows"][number];
type View = NonNullable<AdminListEventDirectoryCallablePayload["view"]>;
type Query = FirebaseFirestore.Query;

interface EventDirectoryDeps {
  firestore: () => FirebaseFirestore.Firestore;
  /** Exact count of a query; tests count the fake's documents. */
  count: (query: Query) => Promise<number>;
  now?: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: EventDirectoryDeps = {
  firestore: () => admin.firestore(),
  count: async (query) => (await query.count().get()).data().count,
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

const catchEventFields = ["name", "eventFormat", "organizerId", "startTime",
  "status", "publicationState", "discoveryAvailability", "discoveryMarketId",
  "bookedCount", "capacityLimit"];
const importedEventFields = ["eventId", "title", "canonicalHostId",
  "startTime", "status", "publicationStatus", "discovery.citySlug",
  "externalSource.platform"];

interface Candidate {
  row: DirectoryRow;
  startMillis: number;
}

/**
 * Lists the Admin Events directory: Catch and imported events in one table.
 * View totals are exact counts; the selected view is read up to the scan
 * limit per source and filtered, counted and paged in memory.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventDirectoryDeps} deps Injectable dependencies.
 * @return {Promise<AdminListEventDirectoryCallableResponse>} One page.
 */
export async function adminListEventDirectoryHandler(
  request: CallableRequest<unknown>,
  deps: EventDirectoryDeps = defaultDeps
): Promise<AdminListEventDirectoryCallableResponse> {
  const adminContext = requireAdminRole(request, recordsReaderRoles);
  const data = validateCallableWithAjv<AdminListEventDirectoryCallablePayload>(
    request,
    validateAdminListEventDirectoryCallablePayload,
    normalizePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid,
    "adminListEventDirectory", {maxRequests: 60, windowMs: 60 * 1000});
  const now = deps.now?.() ?? new Date();
  const view: View = data.view ?? "upcoming";
  const events = db.collection("events");
  const imported = db.collection("externalEvents");

  const [views, catchSnap, importedSnap] = await Promise.all([
    viewCounts(deps.count, [events, imported], now),
    viewQuery(events, view, now).select(...catchEventFields)
      .limit(eventDirectoryScanLimit + 1).get(),
    viewQuery(imported, view, now).select(...importedEventFields)
      .limit(eventDirectoryScanLimit + 1).get(),
  ]);
  const complete = catchSnap.docs.length <= eventDirectoryScanLimit &&
    importedSnap.docs.length <= eventDirectoryScanLimit;
  const catchDocs = catchSnap.docs.slice(0, eventDirectoryScanLimit);
  const importedDocs = importedSnap.docs.slice(0, eventDirectoryScanLimit);

  const candidates: Candidate[] = [
    ...catchDocs.map((doc) => catchCandidate(doc.id,
      doc.data() as Partial<EventDocument>)),
    ...importedDocs.map((doc) => importedCandidate(doc.id,
      doc.data() as Partial<ExternalEventDocument>)),
  ].filter((c) => inView(c, view, now.getTime()));

  const queryText = normalizeQueryText(data.query);
  // Searching matches organizer names too, so a search reads every name once.
  const organizerNames = queryText ? await allOrganizerNames(db) :
    new Map<string, string>();
  const withName = (c: Candidate) => ({...c, row: {...c.row,
    organizerName: c.row.organizerId ?
      organizerNames.get(c.row.organizerId) ?? null : null}});
  const named = candidates.map(withName);

  const weekEnd = now.getTime() + weekMillis;
  const filters = {
    city: (c: Candidate) => !data.citySlug || c.row.citySlug === data.citySlug,
    source: (c: Candidate) => !data.source || c.row.source === data.source,
    needsCheck: (c: Candidate) => !data.needsCheck ||
      c.row.status === "needsCheck",
    thisWeek: (c: Candidate) => !data.thisWeek ||
      c.startMillis >= now.getTime() && c.startMillis < weekEnd,
    organizer: (c: Candidate) => !data.organizerId ||
      c.row.organizerId === data.organizerId,
    query: (c: Candidate) => matchesQueryText(queryText, [c.row.eventId,
      c.row.title, c.row.organizerName, c.row.cityLabel, c.row.platform]),
  };
  type FilterName = keyof typeof filters;
  const passingExcept = (skip: FilterName | null) => named.filter((c) =>
    (Object.keys(filters) as FilterName[])
      .every((name) => name === skip || filters[name](c)));

  const matching = passingExcept(null).sort((a, b) =>
    (view === "upcoming" ? 1 : -1) * (a.startMillis - b.startMillis) ||
    a.row.title.localeCompare(b.row.title));
  const page = pageOf(matching, data.cursor, clampPageLimit(data.limit));
  const pageNames = queryText ? organizerNames : await loadOrganizerNames(db,
    page.rows.map((c) => c.row.organizerId));

  return {
    generatedAt: now.toISOString(),
    total: matching.length,
    views,
    facets: {
      catch: passingExcept("source")
        .filter((c) => c.row.source === "catch").length,
      imported: passingExcept("source")
        .filter((c) => c.row.source === "imported").length,
      needsCheck: passingExcept("needsCheck")
        .filter((c) => c.row.status === "needsCheck").length,
      thisWeek: passingExcept("thisWeek").filter((c) =>
        c.startMillis >= now.getTime() && c.startMillis < weekEnd).length,
      cities: countFacets(passingExcept("city").flatMap((c) =>
        c.row.citySlug ?
          [{value: c.row.citySlug, label: c.row.cityLabel ?? c.row.citySlug}] :
          [])),
    },
    scan: {complete, scanned: catchDocs.length + importedDocs.length},
    rows: page.rows.map((c) => ({
      ...c.row,
      organizerName: c.row.organizerId ?
        pageNames.get(c.row.organizerId) ?? null : null,
    })),
    nextCursor: page.nextCursor,
  };
}

/**
 * The query that reads one view. Single-field time order only, so every
 * view runs on Firestore's automatic indexes; status is filtered after.
 * @param {Query} collection Events or externalEvents.
 * @param {View} view Directory view.
 * @param {Date} now Clock.
 * @return {Query} The view's query.
 */
function viewQuery(collection: Query, view: View, now: Date): Query {
  const at = Timestamp.fromDate(now);
  if (view === "cancelled") {
    return collection.where("status", "==", "cancelled");
  }
  if (view === "past") {
    return collection.where("startTime", "<", at).orderBy("startTime", "desc");
  }
  return collection.where("startTime", ">=", at).orderBy("startTime", "asc");
}

function inView(c: Candidate, view: View, nowMillis: number): boolean {
  if (view === "cancelled") return c.row.status === "cancelled";
  if (c.row.status === "cancelled") return false;
  return view === "past" ? c.startMillis < nowMillis :
    c.startMillis >= nowMillis;
}

/**
 * Exact totals of each view across both sources, from count aggregations
 * on the existing (status, startTime) indexes.
 * @param {EventDirectoryDeps["count"]} count Count reader.
 * @param {Query[]} collections Events and externalEvents.
 * @param {Date} now Clock.
 * @return {Promise<AdminListEventDirectoryCallableResponse["views"]>} Totals.
 */
async function viewCounts(
  count: EventDirectoryDeps["count"],
  collections: Query[],
  now: Date
): Promise<AdminListEventDirectoryCallableResponse["views"]> {
  const totals = await Promise.all(collections.map((collection) =>
    Promise.all([
      count(collection.where("status", "==", "active")
        .where("startTime", ">=", Timestamp.fromDate(now))),
      count(collection.where("status", "==", "active")
        .where("startTime", "<", Timestamp.fromDate(now))),
      count(collection.where("status", "==", "cancelled")),
    ])));
  const sum = (index: number) =>
    totals.reduce((total, counts) => total + counts[index], 0);
  return {upcoming: sum(0), past: sum(1), cancelled: sum(2)};
}

function catchCandidate(
  eventId: string,
  event: Partial<EventDocument>
): Candidate {
  const city = cityOf(event.discoveryMarketId);
  return {
    row: {
      key: `catch:${eventId}`,
      eventId,
      source: "catch",
      platform: null,
      title: catchEventTitle(event),
      organizerId: event.organizerId ?? null,
      organizerName: null,
      startTime: timestampIso(event.startTime),
      citySlug: city.slug,
      cityLabel: city.label,
      status: catchEventStatus(event),
      bookedCount: event.bookedCount ?? 0,
      capacityLimit: event.capacityLimit ?? null,
    },
    startMillis: timestampMillis(event.startTime) ?? 0,
  };
}

function importedCandidate(
  docId: string,
  event: Partial<ExternalEventDocument>
): Candidate {
  const city = cityOf(event.discovery?.citySlug);
  const eventId = event.eventId || docId;
  return {
    row: {
      key: `imported:${eventId}`,
      eventId,
      source: "imported",
      platform: event.externalSource?.platform ?? null,
      title: event.title?.trim() || "Event",
      organizerId: event.canonicalHostId ?? null,
      organizerName: null,
      startTime: timestampIso(event.startTime),
      citySlug: city.slug,
      cityLabel: city.label,
      status: importedEventStatus(event),
      bookedCount: null,
      capacityLimit: null,
    },
    startMillis: timestampMillis(event.startTime) ?? 0,
  };
}

async function allOrganizerNames(
  db: FirebaseFirestore.Firestore
): Promise<Map<string, string>> {
  const snapshot = await db.collection("organizers").select("name")
    .limit(eventDirectoryScanLimit).get();
  return new Map(snapshot.docs.flatMap((doc) => {
    const name = (doc.data() as Partial<OrganizerDocument>).name?.trim();
    return name ? [[doc.id, name] as [string, string]] : [];
  }));
}

/**
 * Names of the given organizers, read one document each.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {Array<string | null>} organizerIds Organizer ids.
 * @return {Promise<Map<string, string>>} Names by organizer id.
 */
export async function loadOrganizerNames(
  db: FirebaseFirestore.Firestore,
  organizerIds: Array<string | null>
): Promise<Map<string, string>> {
  const ids = [...new Set(organizerIds.filter(
    (id): id is string => typeof id === "string" && id.length > 0))];
  const names = new Map<string, string>();
  await Promise.all(ids.map(async (id) => {
    const snap = await db.collection("organizers").doc(id).get();
    const name = (snap.data() as Partial<OrganizerDocument> | undefined)
      ?.name?.trim();
    if (name) names.set(id, name);
  }));
  return names;
}

function normalizePayload(value: unknown): unknown {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    query: normalizeNullableString(data.query),
    citySlug: normalizeNullableString(data.citySlug),
    source: normalizeNullableString(data.source),
    organizerId: normalizeNullableString(data.organizerId),
    cursor: normalizeNullableString(data.cursor),
  };
}

export const adminListEventDirectory = onCall(
  appCheckCallableOptions,
  (request) => adminListEventDirectoryHandler(request)
);
