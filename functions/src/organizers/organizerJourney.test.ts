import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {OrganizerDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  listMyOrganizerJourneysHandler,
  organizerJourneyView,
  type OrganizerJourneyDeps,
} from "./organizerJourney";

const at = (millis: number) => ({
  toMillis: () => millis,
  toDate: () => new Date(millis),
});

const claim = (uid: string, status: string, millis: number) => ({
  requesterUid: uid, requesterName: "Staff should not see this", status,
  createdAt: at(millis), decidedAt: at(millis + 1),
  decisionReason: "Internal reason", organizerId: "org",
});

const view = (overrides: Record<string, unknown> = {}) =>
  organizerJourneyView({
    organizerId: "org",
    organizer: {name: "Afterfly", createdAt: at(100)} as never,
    nomination: {
      request: {
        submittedAt: at(50),
        submittedBy: {uid: "nominator"},
        seed: {urls: ["https://luma.com/afterfly"]},
      },
      result: {eventCount: 3},
      approval: {approvedAt: at(60), approvedByUid: "staff"},
    } as never,
    claims: [],
    firstEvent: undefined,
    firstPaidBookingAt: null,
    uid: "me",
    ...overrides,
  });

test("the organizer sees steps that mean something to them, and no names",
  () => {
    const journey = view();
    assert.deepEqual(journey.steps.map((step) => step.kind),
      ["nominated", "listed"]);
    assert.equal(journey.steps[0].detail, "https://luma.com/afterfly");
    const json = JSON.stringify(journey);
    for (const hidden of ["nominator", "staff", "Staff"]) {
      assert.ok(!json.includes(hidden), hidden);
    }
    assert.equal(journey.next, "runYourPage");
  });

test("someone else's claim stays with staff", () => {
  const journey = view({claims: [claim("other", "rejected", 200)]});
  assert.deepEqual(journey.steps.map((step) => step.kind),
    ["nominated", "listed"]);
  assert.equal(journey.waitingClaim, false);
});

test("my own waiting claim shows, without the staff's facts", () => {
  const journey = view({claims: [claim("me", "pending", 200)]});
  assert.equal(journey.waitingClaim, true);
  assert.equal(journey.steps.at(-1)?.kind, "claimRequested");
  assert.equal(journey.steps.at(-1)?.detail, null);
  assert.ok(!JSON.stringify(journey).includes("Staff should not"));
});

test("a rejection of my claim shows, without the reason", () => {
  const journey = view({claims: [claim("me", "rejected", 200)]});
  assert.equal(journey.steps.at(-1)?.kind, "claimRejected");
  assert.ok(!JSON.stringify(journey).includes("Internal reason"));
});

test("a claimed page moves on to its first event, then to nothing", () => {
  const claimed = {name: "Afterfly", createdAt: at(100),
    ownership: {claimedAt: at(300)}};
  assert.equal(view({organizer: claimed}).next, "firstEvent");
  const ran = view({organizer: claimed,
    firstEvent: {name: "Tuesday Trivia", startTime: at(400)},
    firstPaidBookingAt: at(500)});
  assert.equal(ran.next, null);
  assert.deepEqual(ran.steps.slice(-2).map((step) => step.kind),
    ["firstEvent", "firstPaidBooking"]);
});

function deps(world: {
  organizer?: Partial<OrganizerDocument>;
  waiting?: Record<string, unknown>[];
}): OrganizerJourneyDeps {
  const query = (name: string, filters: Record<string, unknown> = {}) => ({
    where: (field: string, _op: string, value: unknown) =>
      query(name, {...filters, [field]: value}),
    orderBy: () => query(name, filters),
    limit: () => query(name, filters),
    doc: () => ({get: async () => ({data: () =>
      name === "organizers" ? world.organizer : undefined})}),
    get: async () => ({docs: name === "organizerClaimRequests" &&
      filters.requesterUid ?
      (world.waiting ?? []).map((row) => ({data: () => row})) : []}),
  });
  return {
    db: () => ({collection: (name: string) => query(name)}) as unknown as
      FirebaseFirestore.Firestore,
    checkRateLimit: async () => undefined,
  };
}

const request = (uid: string, organizerId: string | null) =>
  ({auth: {uid}, data: {organizerId}}) as unknown as CallableRequest<unknown>;

test("only an organizer's hosts can read its journey", async () => {
  const world = {organizer: {name: "Afterfly", ownerUserId: "owner",
    hostUserIds: ["owner"]} as Partial<OrganizerDocument>};
  await assert.rejects(listMyOrganizerJourneysHandler(
    request("stranger", "org"), deps(world)), {code: "permission-denied"});
  const result = await listMyOrganizerJourneysHandler(
    request("owner", "org"), deps(world));
  assert.equal(result.journeys[0].organizerName, "Afterfly");
});

test("with no organizer, the caller gets the pages they wait to claim",
  async () => {
    const result = await listMyOrganizerJourneysHandler(request("me", null),
      deps({organizer: {name: "Afterfly"},
        waiting: [claim("me", "pending", 200)]}));
    assert.deepEqual(result.journeys.map((item) => item.organizerName),
      ["Afterfly"]);
    const none = await listMyOrganizerJourneysHandler(request("me", null),
      deps({}));
    assert.deepEqual(none.journeys, []);
  });
