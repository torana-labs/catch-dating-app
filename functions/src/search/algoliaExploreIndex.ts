import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {defineSecret} from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type {
  OrganizerDocument,
  EventDocument,
} from "../shared/generated/firestoreAdminTypes";
import {eventOrganizerRef} from "../shared/eventOrganizers";
import {isEventPubliclyAccessible} from "../events/eventPublicationAccess";
import {eventWomenLed, organizerWomenLed} from "../domain/events/womenLed";
import {
  algoliaAppId,
  organizersIndexName,
  eventsIndexName,
  normalizeSearchMarketId,
} from "./exploreSearch";

export const algoliaWriteApiKey = defineSecret("ALGOLIA_WRITE_API_KEY");

type FetchImpl = typeof fetch;

interface AlgoliaExploreIndexDeps {
  firestore: () => FirebaseFirestore.Firestore;
  fetchImpl: FetchImpl;
  writeApiKey: () => string;
}

const defaultDeps: AlgoliaExploreIndexDeps = {
  firestore: () => admin.firestore(),
  fetchImpl: fetch,
  writeApiKey: () => algoliaWriteApiKey.value(),
};

export interface AlgoliaOrganizerSearchRecord {
  objectID: string;
  type: "organizer";
  name: string;
  description: string;
  location: string;
  area: string;
  hostName: string;
  tags: string[];
  memberCount: number;
  organizerType?: OrganizerDocument["organizerType"];
  rating: number;
  reviewCount: number;
  status: OrganizerDocument["status"];
  archived: boolean;
  locationMarketId: string;
  nextEventAtEpoch: number | null;
  nextEventLabel: string | null;
  /** Resolved women-led default; exploreSearch filters on it. */
  womenLed: boolean;
}

export interface AlgoliaEventSearchRecord {
  objectID: string;
  type: "event";
  organizerId: string;
  organizerName: string;
  meetingPoint: string;
  locationDetails: string | null;
  description: string;
  discoveryCityName: string;
  discoveryMarketId: string;
  discoveryActivityKind: string;
  discoveryAvailability: string | null;
  startTimeEpoch: number;
  endTimeEpoch: number | null;
  status: EventDocument["status"];
  /** Resolved label: event override, else organizer default. */
  womenLed: boolean;
}

/**
 * Builds the settings needed by the club search index.
 * @return {Record<string, unknown>} Algolia settings payload.
 */
export function organizerSearchIndexSettings(): Record<string, unknown> {
  return {
    searchableAttributes: [
      "name",
      "area",
      "hostName",
      "tags",
      "description",
    ],
    attributesForFaceting: [
      "filterOnly(locationMarketId)",
      "filterOnly(status)",
      "filterOnly(archived)",
      "filterOnly(womenLed)",
    ],
    customRanking: [
      "desc(memberCount)",
      "desc(rating)",
      "desc(reviewCount)",
    ],
  };
}

/**
 * Builds the settings needed by the event search index.
 * @return {Record<string, unknown>} Algolia settings payload.
 */
export function eventSearchIndexSettings(): Record<string, unknown> {
  return {
    searchableAttributes: [
      "organizerName",
      "meetingPoint",
      "locationDetails",
      "description",
      "discoveryActivityKind",
    ],
    attributesForFaceting: [
      "filterOnly(discoveryMarketId)",
      "filterOnly(status)",
      "filterOnly(organizerId)",
      "filterOnly(womenLed)",
    ],
    customRanking: [
      "asc(startTimeEpoch)",
    ],
  };
}

/**
 * Converts an organizer document into an Algolia organizer record.
 * @param {string} organizerId Firestore organizer id.
 * @param {OrganizerDocument} organizer Organizer document data.
 * @return {AlgoliaOrganizerSearchRecord | null} Algolia record, or null if
 *     hidden.
 */
export function buildOrganizerSearchRecord(
  organizerId: string,
  organizer: OrganizerDocument
): AlgoliaOrganizerSearchRecord | null {
  const locationMarketId = normalizeSearchMarketId(
    organizer.locationMarketId ?? organizer.location
  );
  if (
    organizer.status !== "active" ||
    organizer.archived ||
    organizer.appVisibility === "hidden" ||
    !locationMarketId ||
    organizer.name.trim().length === 0
  ) {
    return null;
  }

  return {
    objectID: organizerId,
    type: "organizer",
    organizerType: organizer.organizerType,
    name: organizer.name,
    description: organizer.description,
    location: organizer.cityName ?? organizer.location,
    locationMarketId,
    area: organizer.area,
    hostName: organizer.hostName ?? organizer.name,
    tags: Array.isArray(organizer.tags) ? organizer.tags : [],
    memberCount: finiteNumberOrZero(organizer.followerCount),
    rating: finiteNumberOrZero(organizer.rating),
    reviewCount: finiteNumberOrZero(organizer.reviewCount),
    status: organizer.status,
    archived: organizer.archived,
    nextEventAtEpoch: timestampEpochSeconds(organizer.nextEventAt),
    nextEventLabel: organizer.nextEventLabel ?? null,
    womenLed: organizerWomenLed(organizer),
  };
}

/**
 * Converts a Firestore event document into an Algolia event record.
 * @param {string} eventId Firestore event id.
 * @param {EventDocument} event Event document data.
 * @param {OrganizerDocument} club Parent organizer document data.
 * @return {AlgoliaEventSearchRecord | null} Algolia record, or null if hidden.
 */
export function buildEventSearchRecord(
  eventId: string,
  event: EventDocument,
  organizer: OrganizerDocument
): AlgoliaEventSearchRecord | null {
  if (!isEventPubliclyAccessible(event)) return null;
  // Link-only events are never searchable; missing listing reads as listed.
  if (event.listing === "link") return null;
  const startTimeEpoch = timestampEpochSeconds(event.startTime);
  const discoveryMarketId = normalizeSearchMarketId(
    event.discoveryMarketId ?? organizer.locationMarketId ?? organizer.location
  );
  const discoveryCityName = normalizedSearchText(event.discoveryCityName) ??
    normalizedSearchText(organizer.publicPage?.citySlug) ??
    discoveryMarketId;
  if (
    event.status !== "active" ||
    organizer.status !== "active" ||
    organizer.archived ||
    organizer.appVisibility === "hidden" ||
    !discoveryMarketId ||
    !discoveryCityName ||
    startTimeEpoch == null ||
    typeof event.meetingPoint !== "string" ||
    typeof event.description !== "string"
  ) {
    return null;
  }

  return {
    objectID: eventId,
    type: "event",
    organizerId: event.organizerId,
    organizerName: organizer.name,
    meetingPoint: event.meetingPoint,
    locationDetails: event.locationDetails ?? null,
    description: event.description,
    discoveryCityName,
    discoveryMarketId,
    discoveryActivityKind:
      event.discoveryActivityKind ??
      event.eventFormat?.activityKind ??
      "socialRun",
    discoveryAvailability: event.discoveryAvailability ?? null,
    startTimeEpoch,
    endTimeEpoch: timestampEpochSeconds(event.endTime),
    status: event.status,
    womenLed: eventWomenLed(organizer, event),
  };
}

/** Syncs a canonical organizer and its events into Algolia. */
export async function syncAlgoliaOrganizerIndexHandler(
  organizerId: string,
  organizer: OrganizerDocument | undefined,
  deps: AlgoliaExploreIndexDeps = defaultDeps
): Promise<void> {
  const record = organizer ?
    buildOrganizerSearchRecord(organizerId, organizer) : null;
  if (record) {
    await upsertAlgoliaObject(organizersIndexName(), record, deps);
  } else {
    await deleteAlgoliaObject(organizersIndexName(), organizerId, deps);
  }
  await syncEventsForOrganizer(
    organizerId,
    record ? organizer : undefined,
    deps
  );
}

/**
 * Syncs one event into Algolia after an event write.
 * @param {string} eventId Firestore event id.
 * @param {EventDocument | undefined} event Current event data.
 * @param {AlgoliaExploreIndexDeps} deps Injectable dependencies.
 * @return {Promise<void>}
 */
export async function syncAlgoliaEventIndexHandler(
  eventId: string,
  event: EventDocument | undefined,
  deps: AlgoliaExploreIndexDeps = defaultDeps
): Promise<void> {
  // Trigger delivery order is not source order; always resolve current state.
  void event;
  await syncEventFromCurrentState(eventId, deps);
}

async function syncEventsForOrganizer(
  organizerId: string,
  organizer: OrganizerDocument | undefined,
  deps: AlgoliaExploreIndexDeps
): Promise<void> {
  const eventsSnap = await deps.firestore()
    .collection("events")
    .where("organizerId", "==", organizerId)
    .get();
  void organizer;
  await Promise.all(eventsSnap.docs.map((doc) =>
    syncEventFromCurrentState(doc.id, deps)));
}

async function currentEventRecord(eventId: string,
  deps: AlgoliaExploreIndexDeps): Promise<AlgoliaEventSearchRecord | null> {
  const db = deps.firestore();
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) return null;
  const event = eventSnap.data() as EventDocument;
  if (!isEventPubliclyAccessible(event)) return null;
  const organizerSnap = await eventOrganizerRef(db, event).get();
  return organizerSnap.exists ? buildEventSearchRecord(eventId, event,
    organizerSnap.data() as OrganizerDocument) : null;
}

/** Current source and a post-write fence repair publication changes.
 * Search remains an asynchronous projection, never an access-control authority.
 */
async function syncEventFromCurrentState(eventId: string,
  deps: AlgoliaExploreIndexDeps): Promise<void> {
  const record = await currentEventRecord(eventId, deps);
  if (!record) {
    await deleteAlgoliaObject(eventsIndexName(), eventId, deps);
    return;
  }
  await upsertAlgoliaObject(eventsIndexName(), record, deps);
  const after = await currentEventRecord(eventId, deps);
  if (JSON.stringify(after) !== JSON.stringify(record)) {
    await deleteAlgoliaObject(eventsIndexName(), eventId, deps);
    if (after) {
      throw new SearchSourceChangedError();
    }
  }
}

/**
 * Writes one Algolia object by object id.
 * @param {string} indexName Algolia index name.
 * @param {{objectID: string}} record Algolia record with object id.
 * @param {AlgoliaExploreIndexDeps} deps Injectable dependencies.
 * @return {Promise<void>}
 */
async function upsertAlgoliaObject(
  indexName: string,
  record: {objectID: string},
  deps: AlgoliaExploreIndexDeps
): Promise<void> {
  await algoliaFetch(
    `/1/indexes/${encodeURIComponent(indexName)}/` +
      encodeURIComponent(String(record.objectID)),
    {
      method: "PUT",
      body: JSON.stringify(record),
    },
    deps
  );
}

/**
 * Deletes one Algolia object and ignores absent objects.
 * @param {string} indexName Algolia index name.
 * @param {string} objectId Algolia object id.
 * @param {AlgoliaExploreIndexDeps} deps Injectable dependencies.
 * @return {Promise<void>}
 */
async function deleteAlgoliaObject(
  indexName: string,
  objectId: string,
  deps: AlgoliaExploreIndexDeps
): Promise<void> {
  await algoliaFetch(
    `/1/indexes/${encodeURIComponent(indexName)}/` +
      encodeURIComponent(objectId),
    {method: "DELETE"},
    deps,
    {ignoreNotFound: true}
  );
}

/**
 * Sends a write request to Algolia with backend-only credentials.
 * @param {string} path Algolia REST path.
 * @param {RequestInit} init Fetch init.
 * @param {AlgoliaExploreIndexDeps} deps Injectable dependencies.
 * @param {object} options Error handling options.
 * @return {Promise<void>}
 */
async function algoliaFetch(
  path: string,
  init: RequestInit,
  deps: AlgoliaExploreIndexDeps,
  options: {ignoreNotFound?: boolean} = {}
): Promise<void> {
  const response = await deps.fetchImpl(algoliaEndpoint(path), {
    ...init,
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "x-algolia-application-id": algoliaAppId.value(),
      "x-algolia-api-key": deps.writeApiKey(),
      ...init.headers,
    },
  });
  if (response.ok || (options.ignoreNotFound && response.status === 404)) {
    return;
  }

  const body = await response.text().catch(() => "");
  throw new AlgoliaRequestError(response.status, body.slice(0, 500));
}

/** An Algolia answer that was not a success; the status decides the retry. */
export class AlgoliaRequestError extends Error {
  constructor(readonly status: number, body: string) {
    super(`Algolia request failed with ${status}: ${body}`);
    this.name = "AlgoliaRequestError";
  }
}

/** Thrown when the source changed under a write; the next attempt reads the
 * current state, so it always retries. */
export class SearchSourceChangedError extends Error {
  constructor() {
    super("Event search source changed; retry current state.");
    this.name = "SearchSourceChangedError";
  }
}

/** How long a failing trigger delivery keeps retrying. Eventarc would retry
 * for a day, which turned one unreachable Algolia app into tens of thousands
 * of attempts and Firestore reads. The index is a projection: the next write
 * or the backfill tool repairs a dropped one. */
export const ALGOLIA_RETRY_WINDOW_MS = 30 * 60_000;

// gRPC codes worth another attempt: aborted, deadline, exhausted, unavailable.
const transientFirestoreCodes: ReadonlySet<unknown> =
  new Set([4, 8, 10, 14, "aborted", "deadline-exceeded",
    "resource-exhausted", "unavailable"]);

/**
 * Whether another delivery could succeed. Only failures that can pass on
 * their own are transient: a network error reaching Algolia, a 5xx, 408 or
 * 429 from it, a transient Firestore error, or a source change mid-write.
 * Everything else (a rejected request, a malformed event) fails the same way
 * every time.
 * @param {unknown} error The failure.
 * @return {boolean} True when a retry could help.
 */
export function isTransientSearchSyncError(error: unknown): boolean {
  if (error instanceof SearchSourceChangedError) return true;
  if (error instanceof AlgoliaRequestError) {
    return error.status >= 500 || error.status === 408 ||
      error.status === 429;
  }
  // fetch() rejects with a TypeError when the host cannot be reached.
  if (error instanceof TypeError && error.message === "fetch failed") {
    return true;
  }
  return transientFirestoreCodes.has((error as {code?: unknown})?.code);
}

/**
 * Runs one index sync so a failure cannot retry forever. A permanent error is
 * logged and dropped; a transient one is rethrown (so the trigger retries)
 * only while the delivery is younger than ALGOLIA_RETRY_WINDOW_MS.
 * @param {string} trigger Trigger name for the log.
 * @param {string} documentId Id of the document that was written.
 * @param {string | undefined} eventTime CloudEvent time of the write.
 * @param {Function} work The sync.
 * @param {Function} now Clock.
 * @return {Promise<void>}
 */
export async function syncOrDropAlgolia(
  trigger: string,
  documentId: string,
  eventTime: string | undefined,
  work: () => Promise<void>,
  now: () => number = Date.now
): Promise<void> {
  try {
    await work();
  } catch (error) {
    const written = eventTime ? Date.parse(eventTime) : NaN;
    const expired = Number.isFinite(written) &&
      now() - written > ALGOLIA_RETRY_WINDOW_MS;
    const transient = isTransientSearchSyncError(error);
    if (transient && !expired) throw error;
    logger.error("Search index sync dropped", {
      trigger,
      documentId,
      reason: transient ? "retry window expired" : "permanent error",
      name: error instanceof Error ? error.name : typeof error,
      status: (error as {status?: unknown})?.status,
      message: error instanceof Error ? error.message.slice(0, 500) :
        String(error).slice(0, 500),
    });
  }
}

/**
 * Builds an Algolia app endpoint for a REST path.
 * @param {string} path Algolia REST path.
 * @return {string} Absolute endpoint URL.
 */
function algoliaEndpoint(path: string): string {
  return `https://${algoliaAppId.value()}.algolia.net${path}`;
}

/**
 * Converts a Firestore timestamp to epoch seconds.
 * @param {FirebaseFirestore.Timestamp | null | undefined} value Timestamp.
 * @return {number | null} Epoch seconds, or null.
 */
function timestampEpochSeconds(
  value: FirebaseFirestore.Timestamp | null | undefined
): number | null {
  if (!value) return null;
  return Math.floor(value.toMillis() / 1000);
}

/**
 * Normalizes optional text fields used as searchable fallbacks.
 * @param {string | null | undefined} value Candidate text.
 * @return {string | undefined} Lowercase non-empty text, or undefined.
 */
function normalizedSearchText(
  value: string | null | undefined
): string | undefined {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Normalizes optional numeric ranking fields.
 * @param {number} value Candidate number.
 * @return {number} Finite number, or zero.
 */
function finiteNumberOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export const syncAlgoliaOrganizerIndex = onDocumentWritten(
  {
    document: "organizers/{organizerId}",
    retry: true,
    secrets: [algoliaWriteApiKey],
  },
  async (event) => {
    const organizer = event.data?.after.data() as
      OrganizerDocument | undefined;
    await syncOrDropAlgolia(
      "syncAlgoliaOrganizerIndex", event.params.organizerId, event.time,
      () => syncAlgoliaOrganizerIndexHandler(
        event.params.organizerId,
        organizer
      )
    );
  }
);

export const syncAlgoliaEventIndex = onDocumentWritten(
  {
    document: "events/{eventId}",
    retry: true,
    secrets: [algoliaWriteApiKey],
  },
  async (event) => {
    const eventDoc = event.data?.after.data() as EventDocument | undefined;
    await syncOrDropAlgolia(
      "syncAlgoliaEventIndex", event.params.eventId, event.time,
      () => syncAlgoliaEventIndexHandler(event.params.eventId, eventDoc)
    );
  }
);
