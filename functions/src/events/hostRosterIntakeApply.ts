import * as admin from "firebase-admin";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {validateManageHostRosterIntakeCallablePayload} from
  "../shared/generated/validators/manageHostRosterIntakeInput";
import type {
  EventAttendeeDocument,
  EventDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ImportEventAttendeesCallablePayload} from
  "../shared/generated/importEventAttendeesCallablePayload";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit} from "../shared/rateLimit";
import {
  EventAttendeeImportResult,
  importEventAttendeesForHost,
} from "./eventAttendees";
import {
  approveHostRosterIntakeApply,
  HostRosterCurrentRow,
  HostRosterIntakeDraft,
  HostRosterIntakeRow,
  previewHostRosterIntake,
} from "./hostRosterIntakeCore";
import {
  AuthorizeHostRosterSession,
  HostRosterAppliedReview,
  HostRosterIntakeSessionStore,
} from "./hostRosterIntakeSessionStore";

type CommitSource = NonNullable<Parameters<
  typeof importEventAttendeesForHost>[0]["commitSource"]>;
type AuthorizeSource = NonNullable<Parameters<
  typeof importEventAttendeesForHost>[0]["authorizeSource"]>;

export interface HostRosterIntakeApplyStore {
  get(params: {sessionId: string; hostUid: string},
    authorize: AuthorizeHostRosterSession):
    Promise<HostRosterIntakeDraft | null>;
  getAppliedReview(params: {sessionId: string; hostUid: string},
    authorize: AuthorizeHostRosterSession):
    Promise<HostRosterAppliedReview | null>;
  prepareCompletion(params: Parameters<
    HostRosterIntakeSessionStore["prepareCompletion"]>[0]):
    Promise<() => void>;
}

export interface HostRosterIntakeApplyDeps {
  store: HostRosterIntakeApplyStore;
  authorize: AuthorizeHostRosterSession;
  loadInitialCurrentRows(draft: HostRosterIntakeDraft):
    Promise<ReadonlyMap<string, HostRosterCurrentRow>>;
  loadTransactionCurrentRows(tx: Transaction, draft: HostRosterIntakeDraft):
    Promise<ReadonlyMap<string, HostRosterCurrentRow>>;
  importCanonical(params: {
    hostUid: string;
    payload: ImportEventAttendeesCallablePayload;
    authorizeSource: AuthorizeSource;
    commitSource: CommitSource;
  }): Promise<EventAttendeeImportResult>;
}

export interface HostRosterIntakeManageDeps extends
  Omit<HostRosterIntakeApplyDeps, "store"> {
  rateLimit(hostUid: string): Promise<void>;
  store: HostRosterIntakeApplyStore & Pick<HostRosterIntakeSessionStore,
    "createOrResume" | "revise">;
}

/** Runs one reviewed approval through the canonical roster transaction. */
export async function applyHostRosterIntake(params: {
  hostUid: string;
  sessionId: string;
  reviewHash: string;
}, deps?: HostRosterIntakeApplyDeps): Promise<EventAttendeeImportResult> {
  const runtime = deps ?? defaultHostRosterIntakeApplyDeps();
  const draft = await runtime.store.get({sessionId: params.sessionId,
    hostUid: params.hostUid}, runtime.authorize);
  if (!draft) throw new HttpsError("not-found", "Roster intake not found.");

  let payload: ImportEventAttendeesCallablePayload;
  let expectedReviewHash: string;
  if (draft.state === "applied") {
    const applied = await runtime.store.getAppliedReview({
      sessionId: params.sessionId, hostUid: params.hostUid,
    }, runtime.authorize);
    if (!applied || applied.preview.reviewHash !== params.reviewHash) {
      throw new HttpsError("failed-precondition",
        "Roster intake approval does not match its receipt.");
    }
    payload = applied.payload;
    expectedReviewHash = applied.preview.reviewHash;
  } else {
    const currentRows = await runtime.loadInitialCurrentRows(draft);
    const approved = approveHostRosterIntakeApply({draft, currentRows,
      reviewHash: params.reviewHash});
    payload = approved.payload;
    expectedReviewHash = approved.reviewHash;
  }

  const completion = async (tx: Transaction, importId: string,
    committedPayload: ImportEventAttendeesCallablePayload,
    replayed: boolean) => {
    const commit = await runtime.store.prepareCompletion({tx,
      sessionId: draft.sessionId, hostUid: params.hostUid,
      expectedDraft: draft, expectedReviewHash, committedPayload,
      importId, replayed, authorize: runtime.authorize,
      loadCurrentRows: runtime.loadTransactionCurrentRows});
    commit();
  };
  return runtime.importCanonical({hostUid: params.hostUid, payload,
    authorizeSource: async (tx, replayed, importId) => {
      if (replayed) await completion(tx, importId, payload, true);
    },
    commitSource: async (tx, importId, canonicalPayload) => {
      await completion(tx, importId, canonicalPayload, false);
    }});
}

export function defaultHostRosterIntakeApplyDeps():
  HostRosterIntakeManageDeps {
  const db = admin.firestore();
  const authorize = managerAuthorizer(db);
  const store = new HostRosterIntakeSessionStore(db);
  const load = (tx: Transaction, draft: HostRosterIntakeDraft) =>
    loadCurrentRows(db, tx, draft);
  return {store, authorize,
    rateLimit: (hostUid) => checkRateLimit(db, hostUid,
      "manageHostRosterIntake",
      {maxRequests: 60, windowMs: 60 * 1000}),
    loadInitialCurrentRows: (draft) => db.runTransaction(async (tx) => {
      await authorize({tx, hostUid: draft.hostUid,
        organizerId: draft.organizerId, eventId: draft.eventId});
      return load(tx, draft);
    }),
    loadTransactionCurrentRows: load,
    importCanonical: (input) => importEventAttendeesForHost(input)};
}

type ManageHostRosterIntakeResponse = {
  draft: HostRosterIntakeDraft;
  preview: ReturnType<typeof previewHostRosterIntake> | null;
  receipt: HostRosterAppliedReview | null;
  result: EventAttendeeImportResult | null;
};

/** Authenticated Host entrypoint for the saved review workflow. */
export async function manageHostRosterIntakeHandler(
  request: CallableRequest<unknown>,
  deps: HostRosterIntakeManageDeps = defaultHostRosterIntakeApplyDeps()
): Promise<ManageHostRosterIntakeResponse> {
  const hostUid = requireAuth(request);
  await deps.rateLimit(hostUid);
  const data = validateCallableWithAjv(request,
    validateManageHostRosterIntakeCallablePayload) as unknown as
    Record<string, unknown>;
  const action = data.action;
  if (!["start", "get", "revise", "preview", "apply"].includes(
    typeof action === "string" ? action : "")) {
    throw new HttpsError("invalid-argument", "Invalid roster intake action.");
  }
  if (action === "start") {
    const mapping = numberMap(data.mapping, "mapping");
    const rows = objectArray(data.rows, "rows") as unknown as
      HostRosterIntakeRow[];
    let draft = await deps.store.createOrResume({
      hostUid,
      organizerId: stringValue(data.organizerId, "organizerId"),
      eventId: stringValue(data.eventId, "eventId"),
      fileFingerprint: stringValue(data.fileFingerprint, "fileFingerprint"),
      fileName: stringValue(data.fileName, "fileName"),
      format: enumValue(data.format, ["csv", "xlsx"], "format"),
      headers: stringArray(data.headers, "headers"),
      mapping,
      rows,
    }, deps.authorize);
    if (draft.state === "review" &&
        (JSON.stringify(draft.mapping) !== JSON.stringify(mapping) ||
          JSON.stringify(draft.rows) !== JSON.stringify(rows))) {
      draft = await deps.store.revise({sessionId: draft.sessionId, hostUid,
        expectedRevision: draft.revision, rows,
        // A deliberate remap starts a fresh row decision pass. Keeping an old
        // exclusion would make a corrected row impossible to restore in UI.
        excludedRowIds: [], mapping,
      }, deps.authorize);
    }
    return reviewResponse(draft, deps);
  }
  const sessionId = stringValue(data.sessionId, "sessionId");
  const draft = await deps.store.get({sessionId, hostUid}, deps.authorize);
  if (!draft) throw new HttpsError("not-found", "Roster intake not found.");
  if (action === "get") {
    const receipt = draft.state === "applied" ?
      await deps.store.getAppliedReview({sessionId, hostUid},
        deps.authorize) : null;
    return {draft, preview: null, receipt, result: null};
  }
  if (action === "revise") {
    const revised = await deps.store.revise({sessionId, hostUid,
      expectedRevision: integerValue(data.expectedRevision,
        "expectedRevision"),
      rows: objectArray(data.rows, "rows") as unknown as
        HostRosterIntakeRow[],
      excludedRowIds: stringArray(data.excludedRowIds, "excludedRowIds"),
      mapping: data.mapping === undefined ? undefined :
        numberMap(data.mapping, "mapping"),
    }, deps.authorize);
    return reviewResponse(revised, deps);
  }
  if (action === "apply") {
    const reviewHash = stringValue(data.reviewHash, "reviewHash");
    const result = await applyHostRosterIntake({hostUid, sessionId,
      reviewHash}, deps);
    const applied = await deps.store.get({sessionId, hostUid}, deps.authorize);
    const receipt = await deps.store.getAppliedReview({sessionId, hostUid},
      deps.authorize);
    if (!applied || !receipt) {
      throw new HttpsError("internal", "Roster intake receipt is missing.");
    }
    return {draft: applied, preview: receipt.preview, receipt, result};
  }
  return reviewResponse(draft, deps);
}

async function reviewResponse(draft: HostRosterIntakeDraft,
  deps: HostRosterIntakeManageDeps): Promise<ManageHostRosterIntakeResponse> {
  if (draft.state === "applied") {
    const receipt = await deps.store.getAppliedReview({
      sessionId: draft.sessionId, hostUid: draft.hostUid,
    }, deps.authorize);
    return {draft, preview: receipt?.preview ?? null, receipt, result: null};
  }
  const currentRows = await deps.loadInitialCurrentRows(draft);
  return {draft, preview: previewHostRosterIntake({draft, currentRows}),
    receipt: null, result: null};
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpsError("invalid-argument", "Roster intake data is invalid.");
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return value;
}

function integerValue(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return value as number;
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return value;
}

function objectArray(value: unknown, field: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some((item) => !item ||
      typeof item !== "object" || Array.isArray(item))) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return value as Record<string, unknown>[];
}

function numberMap(value: unknown, field: string): Record<string, number> {
  const data = record(value);
  if (Object.values(data).some((item) => !Number.isSafeInteger(item))) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return data as Record<string, number>;
}

function enumValue<T extends string>(value: unknown, values: readonly T[],
  field: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return value as T;
}

export const manageHostRosterIntake = onCall(appCheckCallableOptions,
  (request) => manageHostRosterIntakeHandler(request));

function managerAuthorizer(db: Firestore): AuthorizeHostRosterSession {
  return async ({tx, hostUid, organizerId, eventId}) => {
    const eventSnap = await tx.get(db.collection("events").doc(eventId));
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    if ((event.organizerId ?? event.clubId) !== organizerId ||
        event.status === "cancelled") {
      throw new HttpsError("failed-precondition",
        "Roster intake event scope is no longer current.");
    }
    const organizerSnap = await tx.get(eventOrganizerRef(db, event));
    const organizer = requireEventOrganizer(organizerSnap, event);
    if (!isEventOrganizerManager(organizer, event, hostUid)) {
      throw new HttpsError("permission-denied",
        "Only an organizer manager can review this roster intake.");
    }
  };
}

async function loadCurrentRows(db: Firestore, tx: Transaction,
  draft: HostRosterIntakeDraft):
  Promise<ReadonlyMap<string, HostRosterCurrentRow>> {
  const snap = await tx.get(db.collection("eventAttendees")
    .where("eventId", "==", draft.eventId).limit(1001));
  if (snap.size > 1000) {
    throw new HttpsError("resource-exhausted",
      "Roster is too large for one reviewed intake operation.");
  }
  return new Map(snap.docs.map((doc) => {
    const row = requireDoc<EventAttendeeDocument>(doc,
      "EventAttendeeDocument");
    return [doc.id, currentRow(doc.id, row)];
  }));
}

export function currentRow(attendeeId: string,
  row: EventAttendeeDocument): HostRosterCurrentRow {
  return {eventId: row.eventId, attendeeId, source: row.source,
    displayName: row.displayName, status: row.status,
    linkedUid: row.linkedUid, phoneE164: row.phoneE164,
    email: row.email, cityMarketId: row.cityMarketId ?? null,
    externalReference: row.externalReference,
    arrivalGroup: row.arrivalGroup, ticketType: row.ticketType,
    revenueAmountMinor: row.revenueAmountMinor ?? null,
    revenueCurrency: row.revenueCurrency ?? null,
    revenueSource: row.revenueSource ?? null,
    updatedAtMillis: row.updatedAt.toMillis()};
}
