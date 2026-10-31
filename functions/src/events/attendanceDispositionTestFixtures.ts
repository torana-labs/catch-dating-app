import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {EventAssistanceMessageIntent as Intent} from
  "../shared/generated/eventAssistanceMessageIntent";
import {EventAttendanceDispositionStore} from "./attendanceDispositionStore";
import {Decision, View} from "./attendanceDispositionPolicy";
import {ProgressFirestore, seedJoiningProgress, progressFixtureManager} from
  "../eventSuccess/operations/groupProgressTestFixtures";
import {GuestAssistanceStore} from
  "../eventSuccess/operations/guestAssistanceStore";

export const manager = progressFixtureManager;
export const start = 1_000_000;
export const end = 3_000_000;
export const hostDecision: Decision = {kind: "record",
  evidence: {kind: "hostConfirmed"}};
const fixture = (name: string) => JSON.parse(readFileSync(
  "../contracts/fixtures/valid/" + name + ".json", "utf8"));

export async function harness(realDb?: Firestore) {
  const fake = new ProgressFirestore();
  const db = realDb ?? fake as unknown as Firestore;
  const id = randomUUID();
  const context = {mode: "live" as const, eventId: "e-" + id,
    organizerId: "o-" + id};
  const scope = {context, attendeeId: "a-" + id};
  const seeded = await seedJoiningProgress(db, context, start, end);
  const progress = {...seeded, plan: {...seeded.plan,
    createdAt: Timestamp.fromMillis(start - 1000),
    updatedAt: Timestamp.fromMillis(start)}};
  const attendee = {...fixture("event_attendee_doc"),
    eventId: context.eventId, organizerId: context.organizerId,
    status: "registered", linkedUid: "guest-1",
    checkedInAt: null, checkedInBy: null, attendanceRevision: 7,
    createdAt: Timestamp.fromMillis(start - 1000),
    updatedAt: Timestamp.fromMillis(start - 1000)};
  const put = async (path: string, value: object) => {
    if (realDb) await db.doc(path).set(value);
    else fake.write(path, value as Record<string, unknown>);
  };
  const attendeePath = "eventAttendees/" + scope.attendeeId;
  const planPath = "eventSuccessPlans/" + context.eventId;
  const eventPath = "events/" + context.eventId;
  await put(attendeePath, attendee);
  await put(planPath, progress.plan);
  const clock = {now: start};
  const store = new EventAttendanceDispositionStore(db, () => clock.now);
  const finish = async () => {
    clock.now = end;
    await put(planPath, {...progress.plan, status: "complete",
      completedAt: Timestamp.fromMillis(end)});
  };
  const view = async () => (await store.get(manager, scope)).view;
  return {db, fake, scope, progress, attendee, attendeePath, eventPath,
    planPath, clock, store, put, finish, view};
}
type Harness = Awaited<ReturnType<typeof harness>>;
export function command(view: View, decision: Decision = hostDecision,
  operationId = "decision") {
  return {expectedSourceHash: view.sourceHash, command: {
    kind: "recordNoShow", context: view.context, eventId: view.context.eventId,
    operationId, payload: {attendeeId: view.attendeeId,
      expectedAttendanceRevision: view.attendance.revision,
      expectedDispositionRevision: view.disposition.revision, decision}}};
}

export async function decline(h: Harness) {
  const guests = new GuestAssistanceStore(h.db, () => h.clock.now);
  const guest = await guests.startEpisode(h.scope.context,
    h.scope.attendeeId, "begin", null);
  const intent: Intent = {schemaVersion: 1, kind: "joiningUpdate",
    intentId: "decline-" + randomUUID(), revision: 1, context: h.scope.context,
    eventId: h.scope.context.eventId, attendeeId: h.scope.attendeeId,
    episodeId: guest.episodeId,
    workflow: {kind: "lateJoin", occurrenceId: "departure"},
    createdAt: start, expiresAt: end - 1,
    permittedRoutes: ["catchEventSms"], deliveryPolicy: {maxAttempts: 1,
      maxAttemptsPerRoute: 1, minimumRetrySeconds: 1},
    guidance: h.progress.guidance, choices: [{choiceId: "decline",
      label: "Not coming", value: {kind: "joinIntent",
        intention: {kind: "notComing"}}}]};
  const thread = await guests.publishMessage(intent, null);
  const link = await guests.issueLink(thread.threadId, "attempt", {
    currentKeyId: "fixture-key", keyFor: () => Buffer.alloc(32, 9)});
  const view = await guests.getView(link.linkId, link.secret);
  assert.equal(view.status, "ready");
  if (view.status !== "ready") throw new Error("Missing guest reply view");
  await guests.submit({linkId: link.linkId, secret: link.secret,
    intentId: view.intentId, intentRevision: view.intentRevision,
    expectedGuestRevision: view.guestRevision, choiceId: "decline",
    requestId: "guest-declined"});
}
