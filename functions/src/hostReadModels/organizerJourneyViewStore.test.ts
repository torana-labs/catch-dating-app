import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {
  journeyReaders,
  journeyViewId,
  reconcileOrganizerJourneyViews,
} from "./organizerJourneyViewStore";

const at = (millis: number) => Timestamp.fromMillis(millis);

const claim = (uid: string, status: string, millis: number) => ({
  organizerId: "org", requesterUid: uid,
  requesterName: "Staff should not see this", status, createdAt: at(millis),
  decidedAt: at(millis + 1), decisionReason: "Internal reason",
});

function seed(extra: Record<string, Record<string, unknown>> = {}) {
  return new AudienceTestStore({
    "organizers/org": {name: "Moonmoth", createdAt: at(100),
      ownerUserId: "owner", hostUserIds: ["owner", "manager"]},
    "supplyIntakeRequests/intake-1": {
      request: {kind: "organizer_nomination", submittedAt: at(50),
        submittedBy: {uid: "nominator"},
        seed: {urls: ["https://example.test/moonmoth"]}},
      approval: {organizerId: "org", approvedAt: at(60),
        approvedByUid: "staff"},
    },
    "organizerClaimRequests/claim-1": claim("claimant", "pending", 200),
    "organizerClaimRequests/claim-2": claim("rejected", "rejected", 150),
    ...extra,
  });
}

type View = {
  organizerId: string;
  uid: string;
  waitingClaim: boolean;
  journey: {steps: Array<{kind: string; detail: string | null}>;
    waitingClaim: boolean; next: string | null; organizerName: string};
  version: number;
};

const view = (db: AudienceTestStore, uid: string) =>
  db.docs[`hostOrganizerJourneyViews/${journeyViewId("org", uid)}`] as
    View | undefined;

test("managers and waiting claimants each get their own journey",
  async () => {
    const db = seed();
    await reconcileOrganizerJourneyViews(db.asFirestore(), "org");
    const owner = view(db, "owner")!;
    assert.equal(owner.uid, "owner");
    assert.equal(owner.waitingClaim, false);
    assert.equal(owner.journey.organizerName, "Moonmoth");
    assert.deepEqual(owner.journey.steps.map((step) => step.kind),
      ["nominated", "listed"]);
    assert.ok(view(db, "manager"));
    const claimant = view(db, "claimant")!;
    assert.equal(claimant.waitingClaim, true);
    assert.equal(claimant.journey.steps.at(-1)?.kind, "claimRequested");
    // A decided claim's requester is neither a manager nor waiting.
    assert.equal(view(db, "rejected"), undefined);
    const json = JSON.stringify(db.docs);
    for (const hidden of ["nominator", "Internal reason"]) {
      assert.ok(!JSON.stringify(Object.entries(db.docs).filter(([path]) =>
        path.startsWith("hostOrganizerJourneyViews/"))).includes(hidden),
      hidden);
    }
    assert.ok(json.includes("example.test"));
  });

test("someone else's claim never reaches a manager's view", async () => {
  const db = seed();
  await reconcileOrganizerJourneyViews(db.asFirestore(), "org");
  const owner = JSON.stringify(view(db, "owner"));
  assert.ok(!owner.includes("claimRequested"));
  assert.ok(!owner.includes("claimRejected"));
});

test("an approved claim makes the claimant a manager, and a removed " +
  "manager loses the view", async () => {
  const db = seed();
  await reconcileOrganizerJourneyViews(db.asFirestore(), "org");
  db.docs["organizerClaimRequests/claim-1"] =
    claim("claimant", "approved", 200);
  db.docs["organizers/org"] = {name: "Moonmoth", createdAt: at(100),
    ownerUserId: "claimant", hostUserIds: ["claimant"],
    ownership: {claimedAt: at(300)}};
  await reconcileOrganizerJourneyViews(db.asFirestore(), "org");
  assert.equal(view(db, "owner"), undefined);
  assert.equal(view(db, "manager"), undefined);
  const claimant = view(db, "claimant")!;
  assert.equal(claimant.waitingClaim, false);
  assert.equal(claimant.journey.next, "firstEvent");
  assert.ok(claimant.journey.steps.some((step) => step.kind === "claimed"));
});

test("the first event and first paid booking reach every view", async () => {
  const db = seed({
    "events/late": {organizerId: "org", name: "Later run",
      startTime: at(900)},
    "events/early": {organizerId: "org", name: "Tuesday Trivia",
      startTime: at(400)},
    "organizerGrowthFacts/org": {milestones: {firstPaidBookingAt: at(500)}},
  });
  await reconcileOrganizerJourneyViews(db.asFirestore(), "org");
  const owner = view(db, "owner")!;
  assert.equal(owner.journey.next, null);
  assert.deepEqual(owner.journey.steps.slice(-2), [
    {kind: "firstEvent", atMillis: 400, detail: "Tuesday Trivia"},
    {kind: "firstPaidBooking", atMillis: 500, detail: null},
  ]);
});

test("a deleted organizer loses every view, and an unchanged one writes " +
  "nothing", async () => {
  const db = seed();
  await reconcileOrganizerJourneyViews(db.asFirestore(), "org");
  const before = view(db, "owner");
  await reconcileOrganizerJourneyViews(db.asFirestore(), "org");
  assert.equal(view(db, "owner"), before);
  delete db.docs["organizers/org"];
  await reconcileOrganizerJourneyViews(db.asFirestore(), "org");
  assert.deepEqual(Object.keys(db.docs).filter((path) =>
    path.startsWith("hostOrganizerJourneyViews/")), []);
});

test("readers are managers then waiting claimants, without duplicates", () => {
  assert.deepEqual(journeyReaders({ownerUserId: "owner",
    hostUserIds: ["owner", "manager"]},
  [{requesterUid: "owner", status: "pending"},
    {requesterUid: "claimant", status: "pending"},
    {requesterUid: "late", status: "rejected"}]),
  ["owner", "manager", "claimant"]);
});
