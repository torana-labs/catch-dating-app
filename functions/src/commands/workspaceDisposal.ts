import type {StoredTryItWorkspace} from "./workspace";
import {deleteTryItDraftEvent} from "../domain/events/eventDocumentWrites";

// Removing a try-it workspace's guest data before its organizer goes (owner
// decision on #2061, 19 Nov 2026, question 1 (a)). A due workspace whose
// only events are try-it drafts it recorded (tryItWorkspaces/{uid}
// .tryItEventIds) is disposable: those events go with their guests, and
// then the organizer's contacts go with the organizer.
//
// Guest data can outgrow one transaction (20 drafts of 250 guests, each
// projected into contacts), so deletion runs in bounded batches and in two
// passes a day apart:
//
// 1. Each draft's guests, import receipts and review sessions, then the
//    draft itself. Deleting guests fires the audience projection, which
//    removes their contact edges and identity links and rebuilds contacts.
// 2. On a later run, once no draft is left and the projection has settled,
//    every organizer-scoped contact record, then the organizer as before.
//
// Every step is idempotent: a run that stops part-way leaves the workspace
// due, and the next run carries on.

/** Writes per deletion transaction, under Firestore's 500. */
export const DISPOSAL_BATCH = 400;
/** Deletes one workspace may use in one run; the rest wait a day. */
export const DISPOSAL_BUDGET = 4_000;
/** More events than a workspace can record means events the host made. */
const MAX_EVENTS_READ = 21;

/** Per-event guest records, by the field that names the event. */
const EVENT_SCOPED: Array<{collection: string; field: string;
  subcollections?: string[]}> = [
    {collection: "eventAttendees", field: "eventId"},
    {collection: "eventAttendeeImports", field: "eventId"},
    {collection: "hostRosterIntakeSessions", field: "draft.eventId",
      subcollections: ["receipts"]},
  ];

/**
 * Organizer-scoped contact records (each carries organizerId). The audience
 * summary and tag vocabulary are keyed by the organizer id and carry it too.
 */
export const ORGANIZER_SCOPED = [
  "organizerContacts",
  "organizerContactTraits",
  "organizerContactOrigins",
  "organizerContactIdentityLinks",
  "organizerContactIdentityClaims",
  "organizerContactEventEdges",
  "organizerContactChannelStates",
  "organizerContactNotes",
  "organizerContactOutreach",
  "organizerContactMergeReceipts",
  "organizerContactMergeReviewDecisions",
  "organizerContactTagVocabularies",
  "organizerAudienceSummaries",
];

export type WorkspaceEvents =
  | {kind: "none"}
  | {kind: "try_it_only"; eventIds: string[]}
  | {kind: "host_events"};

/**
 * Sorts the organizer's events: none, only private try-it drafts the
 * workspace recorded, or at least one event the host made or published.
 * @return {Promise<WorkspaceEvents>} What the organizer's events are.
 */
export async function readWorkspaceEvents(
  read: (query: FirebaseFirestore.Query) =>
    Promise<FirebaseFirestore.QuerySnapshot>,
  db: FirebaseFirestore.Firestore,
  pointer: StoredTryItWorkspace
): Promise<WorkspaceEvents> {
  const events = await read(db.collection("events")
    .where("organizerId", "==", pointer.organizerId).limit(MAX_EVENTS_READ));
  if (events.empty) return {kind: "none"};
  const recorded = new Set(pointer.tryItEventIds ?? []);
  if (events.size >= MAX_EVENTS_READ) return {kind: "host_events"};
  for (const doc of events.docs) {
    if (!recorded.has(doc.id) || !isTryItDraft(doc.data())) {
      return {kind: "host_events"};
    }
  }
  return {kind: "try_it_only", eventIds: events.docs.map((doc) => doc.id)};
}

/**
 * A try-it draft is still disposable while it is private and active and
 * has no seat ledger (seat-ready events hold seat records of their own).
 * @return {boolean} Whether the event can go with the workspace.
 */
export function isTryItDraft(event: Record<string, unknown>): boolean {
  return event.publicationState === "private" &&
    event.status === "active" && event.seatMode !== "ready";
}

export type WorkspaceForms =
  | {kind: "none"}
  | {kind: "try_it_only"; formIds: string[]}
  | {kind: "host_forms"};

/**
 * Sorts the organizer's forms the same way as its events: none, only
 * unpublished try-it drafts the workspace recorded
 * (tryItWorkspaces/{uid}.tryItFormIds, from form.import-from-link), or at
 * least one form the host made or published.
 * @return {Promise<WorkspaceForms>} What the organizer's forms are.
 */
export async function readWorkspaceForms(
  read: (query: FirebaseFirestore.Query) =>
    Promise<FirebaseFirestore.QuerySnapshot>,
  db: FirebaseFirestore.Firestore,
  pointer: StoredTryItWorkspace
): Promise<WorkspaceForms> {
  const forms = await read(db.collection("organizerForms")
    .where("organizerId", "==", pointer.organizerId).limit(MAX_EVENTS_READ));
  if (forms.empty) return {kind: "none"};
  const recorded = new Set(pointer.tryItFormIds ?? []);
  if (forms.size >= MAX_EVENTS_READ) return {kind: "host_forms"};
  for (const doc of forms.docs) {
    if (!recorded.has(doc.id) ||
        !isTryItFormDraft(doc.data(), pointer.organizerId)) {
      return {kind: "host_forms"};
    }
  }
  return {kind: "try_it_only", formIds: forms.docs.map((doc) => doc.id)};
}

/**
 * A try-it form is disposable while it is still an unpublished draft of the
 * workspace's own organizer.
 * @return {boolean} Whether the form can go with the workspace.
 */
export function isTryItFormDraft(form: Record<string, unknown>,
  organizerId: string): boolean {
  return form.status === "draft" && form.organizerId === organizerId;
}

/**
 * Pass 1, forms: deletes each try-it draft form with its draft definition,
 * each in a transaction that checks it is still an unpublished draft.
 * @return {Promise<number>} How many documents were deleted.
 */
export async function deleteTryItForms(db: FirebaseFirestore.Firestore,
  organizerId: string, formIds: string[]): Promise<number> {
  let deleted = 0;
  for (const formId of formIds) {
    deleted += await db.runTransaction(async (tx) => {
      const formRef = db.collection("organizerForms").doc(formId);
      const form = (await tx.get(formRef)).data();
      // A form published since the sweep looked keeps the workspace on the
      // next run.
      if (form && !isTryItFormDraft(form, organizerId)) return 0;
      tx.delete(formRef);
      tx.delete(db.collection("organizerFormDrafts").doc(formId));
      return 2;
    });
  }
  return deleted;
}

/** What one disposal pass did. */
export interface DisposalPass {
  deleted: number;
  /** True when guests were deleted, so contacts wait for the next run. */
  guestsDeleted: boolean;
  /** True when the budget ran out before the pass finished. */
  incomplete: boolean;
}

/**
 * Pass 1: deletes the try-it drafts' guest records, then each draft whose
 * records are all gone, within the budget.
 * @return {Promise<DisposalPass>} What was deleted.
 */
export async function deleteTryItDrafts(db: FirebaseFirestore.Firestore,
  eventIds: string[], budget = DISPOSAL_BUDGET): Promise<DisposalPass> {
  let deleted = 0;
  let guestsDeleted = false;
  for (const eventId of eventIds) {
    for (const scope of EVENT_SCOPED) {
      const removed = await deleteMatching(db, db.collection(scope.collection)
        .where(scope.field, "==", eventId), budget - deleted,
      scope.subcollections ?? []);
      deleted += removed.deleted;
      if (scope.collection === "eventAttendees" && removed.deleted > 0) {
        guestsDeleted = true;
      }
      if (removed.incomplete) {
        return {deleted, guestsDeleted, incomplete: true};
      }
    }
    // The draft goes with its event-keyed setup state (as deleteEvent).
    const draftDocuments = await db.runTransaction(async (tx) => {
      const eventRef = db.collection("events").doc(eventId);
      const event = (await tx.get(eventRef)).data();
      // A draft published since the sweep looked is left for the next run,
      // which keeps the workspace.
      if (event && !isTryItDraft(event)) return 0;
      return deleteTryItDraftEvent(tx, db, eventId);
    });
    deleted += draftDocuments;
  }
  return {deleted, guestsDeleted, incomplete: false};
}

/**
 * Pass 2: deletes every organizer-scoped contact record, within the budget.
 * @return {Promise<DisposalPass>} What was deleted.
 */
export async function deleteOrganizerContacts(
  db: FirebaseFirestore.Firestore, organizerId: string,
  budget = DISPOSAL_BUDGET): Promise<DisposalPass> {
  let deleted = 0;
  for (const collection of ORGANIZER_SCOPED) {
    const removed = await deleteMatching(db, db.collection(collection)
      .where("organizerId", "==", organizerId), budget - deleted, []);
    deleted += removed.deleted;
    if (removed.incomplete) {
      return {deleted, guestsDeleted: false, incomplete: true};
    }
  }
  return {deleted, guestsDeleted: false, incomplete: false};
}

/**
 * Deletes what [query] matches, with the named subcollections of each
 * match, in transactions of at most DISPOSAL_BATCH writes.
 * @return {Promise<{deleted: number, incomplete: boolean}>} The count, and
 *   whether matches remain because the budget ran out.
 */
async function deleteMatching(db: FirebaseFirestore.Firestore,
  query: FirebaseFirestore.Query, budget: number,
  subcollections: string[]): Promise<{deleted: number;
    incomplete: boolean}> {
  let deleted = 0;
  for (;;) {
    const room = Math.min(DISPOSAL_BATCH, budget - deleted);
    if (room <= 0) return {deleted, incomplete: true};
    const page = await query.limit(room).get();
    if (page.empty) return {deleted, incomplete: false};
    const refs: FirebaseFirestore.DocumentReference[] = [];
    for (const doc of page.docs) {
      for (const name of subcollections) {
        const children = await db.collection(`${doc.ref.path}/${name}`)
          .get();
        refs.push(...children.docs.map((child) => child.ref));
      }
      refs.push(doc.ref);
    }
    for (let start = 0; start < refs.length; start += DISPOSAL_BATCH) {
      const chunk = refs.slice(start, start + DISPOSAL_BATCH);
      await db.runTransaction(async (tx) => {
        for (const ref of chunk) tx.delete(ref);
      });
    }
    deleted += refs.length;
  }
}
