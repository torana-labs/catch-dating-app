/** Focused travel fixtures; fake transactions are not emulator proof. */
import assert from "node:assert/strict";
import * as admin from "firebase-admin";
import type {Firestore} from "firebase-admin/firestore";
import type {Message} from "firebase-admin/messaging";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {momentToDocument} from "../moments/momentDocuments";
import type {ProgramDeliveryMessageDocument} from
  "../shared/generated/programDeliveryMessageDocument";
import {deliverProgramActivity, type ProgramActivityRequest} from
  "./programActivityDelivery";

export const ACTIVITY_NOW = 12 * 60 * 60_000;
export const ACTIVITY_WINDOW = 6 * 60 * 60_000;
export const activityRequest: ProgramActivityRequest = {
  moment: {momentId: "m_flight", name: "Flight changed",
    scope: {kind: "program", programId: "prog"},
    initiation: {kind: "triggered", triggerKind: "flightDisrupted",
      functionId: null},
    sense: "audience", audience: {kind: "staffDuty", duty: "airportGreeter",
      scopeIds: ["airport"]},
    action: {kind: "push", notificationType: "organizerUpdate",
      preferenceKey: "eventStatusUpdates"}, status: "armed", revision: 3,
    approval: {approvedByUid: "mgr", approvedAtMillis: 1}, origin: "organizer"},
  run: {runId: "travel_v1_" + "a".repeat(64), momentId: "m_flight",
    dueAtMillis: ACTIVITY_NOW, anchorRevision: 0, status: "planned",
    expiresAtMillis: ACTIVITY_NOW + ACTIVITY_WINDOW,
    travelOccurrence: {momentRevision: 3, occurredAtMillis: ACTIVITY_NOW - 100,
      createdAtMillis: ACTIVITY_NOW}},
  facts: {scope: {startsAtMillis: ACTIVITY_NOW - 1,
    endsAtMillis: ACTIVITY_NOW + 2 * ACTIVITY_WINDOW,
    rsvpDeadlineAtMillis: null, revision: 1, messagingEnabled: true,
    cancelled: false, organizerId: "org-1"}, functions: {}, travelLegs: {}},
  recipient: {recipientKey: "uid:staff", endpoint: {kind: "uid", uid: "staff"},
    householdId: null},
  copy: {title: "Flight cancelled", body: "Contact the airport desk"},
};

/** The staff member's Host-app device row; null removes it. */
export function setStaffDevice(db: FakeFirestore, token: string | null) {
  const path = "users/staff/pushInstallations/host-token-1";
  if (token === null) db.deleteDoc(path);
  else db.setDoc(path, {token, appRole: "host"});
}

export function activityFirestore(request = activityRequest): FakeFirestore {
  const db = new FakeFirestore({});
  // Add only the DocumentReference.collection seam used by notifications.
  // All reads, writes, rollback and contention remain the existing fake's.
  const collection = db.collection.bind(db);
  db.collection = (path: string) => {
    const ref = collection(path);
    const doc = ref.doc.bind(ref);
    ref.doc = (id?: string) => {
      const child = doc(id);
      return Object.assign(child, {collection: (name: string) =>
        db.collection(`${child.path}/${name}`)});
    };
    return ref;
  };
  // The receipt scan is this suite's only nested-field query. Preserve the
  // fake's ordering/cursor behavior, then filter before applying its limit.
  const runQuery = db.runQuery.bind(db);
  db.runQuery = async (query) => {
    const nested = query.wheres.find((where) =>
      where.field === "intent.workflow.runId");
    if (!nested) return runQuery(query);
    if (nested.op !== "==") throw new Error("Unsupported receipt query");
    const expanded = Object.assign(Object.create(Object.getPrototypeOf(query)),
      query, {wheres: query.wheres.filter((where) => where !== nested),
        limitN: null});
    const snapshot = await runQuery(expanded);
    const docs = snapshot.docs.filter((doc) => {
      const intent = doc.data()?.intent as
        {workflow?: {runId?: string}} | undefined;
      return intent?.workflow?.runId === nested.value;
    });
    return Object.assign(snapshot, {docs: query.limitN === null ? docs :
      docs.slice(0, query.limitN)});
  };
  const ts = admin.firestore.Timestamp.fromMillis;
  const until = ACTIVITY_NOW + 2 * ACTIVITY_WINDOW;
  db.setDoc("organizerPrograms/prog", {organizerId: "org-1", status: "active",
    title: "Travel program", kind: "wedding", timezone: "UTC", revision: 1,
    createdBy: "mgr", startsAt: ts(ACTIVITY_NOW - 1), endsAt: ts(until),
    capabilities: ["messaging"]});
  db.setDoc("organizerMoments/m_flight",
    momentToDocument(request.moment, ACTIVITY_NOW, true));
  db.setDoc(`organizerMomentRuns/${request.run.runId}`, {...request.run});
  db.setDoc("programStaffGrants/prog__staff", {programId: "prog",
    organizerId: "org-1", uid: "staff", status: "active", createdBy: "mgr",
    revision: 1, expiresAt: ts(until), duties: [{duty: "airportGreeter",
      pickupPointIds: ["airport"], hotelIds: [], expiresAtMillis: until}]});
  db.setDoc("users/staff", {});
  db.setDoc("users/staff/pushInstallations/host-token-1",
    {token: "token-1", appRole: "host"});
  return db;
}

export function activityRecord(db: FakeFirestore):
  ProgramDeliveryMessageDocument {
  const rows = [...db.docs].filter(([path]) =>
    path.startsWith("deliveryMessages/"));
  assert.equal(rows.length, 1);
  return rows[0][1] as unknown as ProgramDeliveryMessageDocument;
}

export function activityItems(db: FakeFirestore) {
  return [...db.docs].filter(([path]) => path.startsWith("notifications/"));
}

export function activityHarness(db = activityFirestore(),
  request = activityRequest) {
  const clock = {now: ACTIVITY_NOW};
  const messages: Message[] = [];
  const send = async (message: Message) => {
    messages.push(message);
    return "projects/test/messages/real-sdk-message-id";
  };
  const deliver = (overrides: Partial<ProgramActivityRequest> = {}) =>
    deliverProgramActivity({...request, ...overrides,
      db: db as unknown as Firestore, now: () => clock.now, send});
  return {db, clock, messages, send, deliver};
}
