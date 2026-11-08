import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {operationContentHash} from "../operations/durableActions";
import {validateEventAssistanceCaseDocument} from
  "../shared/generated/validators/eventAssistanceCaseDocument";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {request} from "../shared/testing/programFixtures";
import {parseHostCase} from "./operations/hostCaseRecords";
import {
  type EventRuntimeHostHelpDeps,
  requestEventRuntimeHostHelpHandler,
  runtimeHelpResponseId,
} from "./eventRuntimeHostHelp";

const nowMillis = 1_800_000_000_000;
const runtimeId = "runtime_1234567890abcdef";
const venueSessionToken = "v".repeat(64);
const generation = (seed: string) => operationContentHash(seed);

function seed(attendee: FakeData = {}): Record<string, FakeData> {
  return {
    "eventRuntimeParticipants/event-1_guest-1": {eventId: "event-1",
      organizerId: "club-1", uid: "guest-1", eventAttendeeId: "att-1",
      accessStatus: "ready"},
    "eventAttendees/att-1": {eventId: "event-1", organizerId: "club-1",
      linkedUid: "guest-1", status: "checkedIn", ...attendee},
  };
}

function deps(firestore: FakeFirestore,
  overrides: Partial<EventRuntimeHostHelpDeps> = {}):
  EventRuntimeHostHelpDeps {
  return {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    checkRateLimit: async () => undefined,
    nowMillis: () => nowMillis,
    resolveEvent: async (_db, publicRuntimeId) => {
      assert.equal(publicRuntimeId, runtimeId);
      return {eventId: "event-1", event: {organizerId: "club-1"}} as never;
    },
    verifyVenueSessionToken: () => {
      throw new HttpsError("failed-precondition", "expired QR");
    },
    sourceFacts: async () => ({eventTitle: "Run", eventStatus: "active",
      eventEnd: nowMillis + 60_000, attendeeStatus: "checkedIn",
      sourceGeneration: generation("source"),
      attendeeGeneration: generation("attendee")}),
    ...overrides,
  };
}

const payload = {publicRuntimeId: runtimeId, requestId: "help-request-1",
  category: "eventLogistics"};

test("a checked-in runtime guest opens an event-lead case once", async () => {
  const firestore = new FakeFirestore(seed());
  const first = await requestEventRuntimeHostHelpHandler(
    request(payload, "guest-1"), deps(firestore));
  const responseId = runtimeHelpResponseId("event-1", "guest-1",
    "help-request-1");
  assert.deepEqual(first, {caseId: "case:" + operationContentHash(responseId),
    status: "open", replayed: false});
  const stored = firestore.getDoc(`eventAssistanceCases/${first.caseId}`);
  assert.ok(validateEventAssistanceCaseDocument(stored));
  assert.equal(stored?.owner, "eventLead");
  assert.equal(stored?.category, "eventLogistics");
  // The live console's projection accepts it as a current case.
  const parsed = parseHostCase(stored, first.caseId,
    {mode: "live", eventId: "event-1", organizerId: "club-1"}, nowMillis);
  assert.equal(parsed.status, "open");

  const again = await requestEventRuntimeHostHelpHandler(
    request(payload, "guest-1"), deps(firestore));
  assert.deepEqual(again, {...first, replayed: true});
});

test("a guest not yet checked in proves the venue like check-in", async () => {
  const firestore = new FakeFirestore(seed({status: "registered"}));
  await assert.rejects(requestEventRuntimeHostHelpHandler(
    request(payload, "guest-1"), deps(firestore)),
  (error) => error instanceof HttpsError &&
    (error.details as {reason?: string})?.reason === "venueSessionRequired");
  await assert.rejects(requestEventRuntimeHostHelpHandler(
    request({...payload, venueSessionToken}, "guest-1"), deps(firestore)),
  /expired QR/);
  const verified: string[] = [];
  const result = await requestEventRuntimeHostHelpHandler(
    request({...payload, venueSessionToken}, "guest-1"), deps(firestore, {
      verifyVenueSessionToken: ({token, eventId}) => {
        verified.push(`${eventId}:${token.length}`);
        return {} as never;
      }}));
  assert.equal(result.replayed, false);
  assert.deepEqual(verified, ["event-1:64"]);
});

test("only a ready participant with their own place can ask", async () => {
  const cases: Array<[Record<string, FakeData>, string]> = [
    [{...seed(), "eventRuntimeParticipants/event-1_guest-1": {
      eventId: "event-1", organizerId: "club-1", uid: "guest-1",
      eventAttendeeId: "att-1", accessStatus: "needsInput"}},
    "failed-precondition"],
    [seed({linkedUid: "someone-else"}), "failed-precondition"],
    [seed({status: "cancelled"}), "failed-precondition"],
    [{"eventAttendees/att-1": seed()["eventAttendees/att-1"]},
      "failed-precondition"],
  ];
  for (const [data, code] of cases) {
    const firestore = new FakeFirestore(data);
    await assert.rejects(requestEventRuntimeHostHelpHandler(
      request(payload, "guest-1"), deps(firestore)),
    (error) => error instanceof HttpsError && error.code === code);
  }
});

test("help closes two hours after the event ends", async () => {
  const firestore = new FakeFirestore(seed());
  await assert.rejects(requestEventRuntimeHostHelpHandler(
    request(payload, "guest-1"), deps(firestore, {
      nowMillis: () => nowMillis + 60_000 + 2 * 60 * 60 * 1000 + 1})),
  (error) => error instanceof HttpsError &&
    (error.details as {reason?: string})?.reason === "eventEnded");
});

test("safety concerns are not runtime host help", async () => {
  const firestore = new FakeFirestore(seed());
  await assert.rejects(requestEventRuntimeHostHelpHandler(
    request({...payload, category: "comfortSafety"}, "guest-1"),
    deps(firestore)),
  (error) => error instanceof HttpsError &&
    error.code === "invalid-argument");
});
