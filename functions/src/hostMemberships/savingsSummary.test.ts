import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {hostMembershipId} from "./ids";
import {
  applyBenefitUseSavingsChange,
  benefitUseSavingsDeltas,
  membershipSavingsTotals,
} from "./savingsSummary";
import {now, organizerId, planId} from "./testFixture";

const membershipId = hostMembershipId(organizerId, "member-1");
const otherMembershipId = hostMembershipId("organizer-2", "member-1");
const membershipPath = `hostMemberships/${membershipId}`;

function use(overrides: Record<string, unknown> = {}):
  Record<string, unknown> {
  return {schemaVersion: 1, membershipId, organizerId, uid: "member-1",
    eventId: "event-1", planId, listPriceInPaise: 50000,
    paidPriceInPaise: 30000, savingsInPaise: 20000,
    eventStartMillis: now + 86_400_000, state: "booked",
    createdAtMillis: now, ...overrides};
}

function db(membership: Record<string, unknown> = {status: "active"}) {
  return new FakeFirestore({[membershipPath]: membership,
    [`hostMemberships/${otherMembershipId}`]: {status: "active",
      savedInPaise: 5000, memberPricedBookings: 1}});
}

const apply = (store: FakeFirestore, eventId: string, before: unknown,
  after: unknown) => applyBenefitUseSavingsChange({
  db: store as unknown as FirebaseFirestore.Firestore, eventId, before,
  after, nowMillis: now});

test("totals count booked uses and skip released or invalid ones", () => {
  assert.deepEqual(membershipSavingsTotals([
    use(),
    use({eventId: "event-2", savingsInPaise: 15000}),
    use({eventId: "event-3", state: "released"}),
    {membershipId, savingsInPaise: 99999},
  ]), {savedInPaise: 35000, memberPricedBookings: 2});
});

test("deltas add on booking, subtract on release and move memberships",
  () => {
    assert.deepEqual([...benefitUseSavingsDeltas(undefined, use())],
      [[membershipId, {savedInPaise: 20000, memberPricedBookings: 1}]]);
    assert.deepEqual([...benefitUseSavingsDeltas(use(),
      use({state: "released"}))],
    [[membershipId, {savedInPaise: -20000, memberPricedBookings: -1}]]);
    assert.deepEqual([...benefitUseSavingsDeltas(use(),
      use({membershipId: otherMembershipId}))], [
      [membershipId, {savedInPaise: -20000, memberPricedBookings: -1}],
      [otherMembershipId, {savedInPaise: 20000, memberPricedBookings: 1}],
    ]);
    assert.equal(benefitUseSavingsDeltas(use(), use()).size, 0);
    assert.equal(benefitUseSavingsDeltas(use({state: "released"}),
      undefined).size, 0);
  });

test("a booking then its release move the membership totals once each",
  async () => {
    const store = db();
    assert.equal(await apply(store, "evt-1", undefined, use()), "applied");
    assert.deepEqual(store.getDoc(membershipPath), {status: "active",
      savedInPaise: 20000, memberPricedBookings: 1});
    // A redelivery of the same event changes nothing.
    assert.equal(await apply(store, "evt-1", undefined, use()), "duplicate");
    assert.equal(store.getDoc(membershipPath)?.savedInPaise, 20000);

    await apply(store, "evt-2", undefined, use({eventId: "event-2",
      savingsInPaise: 10000}));
    assert.equal(await apply(store, "evt-3", use(),
      use({state: "released"})), "applied");
    assert.deepEqual(store.getDoc(membershipPath), {status: "active",
      savedInPaise: 10000, memberPricedBookings: 1});
  });

test("a use that changes membership leaves one total and joins the other",
  async () => {
    const store = db({status: "active", savedInPaise: 20000,
      memberPricedBookings: 1});
    await apply(store, "evt-move", use(),
      use({membershipId: otherMembershipId}));
    assert.deepEqual(store.getDoc(membershipPath), {status: "active",
      savedInPaise: 0, memberPricedBookings: 0});
    assert.deepEqual(store.getDoc(`hostMemberships/${otherMembershipId}`),
      {status: "active", savedInPaise: 25000, memberPricedBookings: 2});
  });

test("totals never go negative and a missing membership is skipped",
  async () => {
    const store = db();
    await apply(store, "evt-release", use(), use({state: "released"}));
    assert.deepEqual(store.getDoc(membershipPath), {status: "active",
      savedInPaise: 0, memberPricedBookings: 0});

    const empty = new FakeFirestore({});
    assert.equal(await apply(empty, "evt-gone", undefined, use()), "applied");
    assert.equal(empty.getDoc(membershipPath), undefined);
  });

test("a write that moves no total claims nothing", async () => {
  const store = db();
  assert.equal(await apply(store, "evt-noop", use(), use()), "unchanged");
  assert.equal([...store.docs.keys()].some((key) =>
    key.startsWith("commandReceipts/")), false);
});
