import assert from "node:assert/strict";
import test from "node:test";
import {safeOutcomeUnitId} from "../eventSuccess/guestHistory";
import {requestViewEventsForParticipation} from
  "../hostReadModels/requestViewTriggers";
import {outcomeUnitId, pairLabelWithoutAccount} from
  "./accountDeletionEventData";
import {deleteRunnerOne} from "./accountDeletionTestHarness";

// One test per collection of #2468 group 1 (guest event and dating data).
// runner-1 is the deleted account; runner-2 and runner-3 are other guests.

const deletes = (harness: Awaited<ReturnType<typeof deleteRunnerOne>>,
  path: string) => harness.deletedPublicDocs.includes(path);
const updatesOf = (harness: Awaited<ReturnType<typeof deleteRunnerOne>>,
  path: string) => harness.updateWrites.filter((write) => write.path === path)
  .map((write) => write.data);

test("deletion erases the account's meeting history and its entry in the " +
  "histories of guests it met", async () => {
  const harness = await deleteRunnerOne({
    "organizerMeetingHistory/club-1_runner-1": {organizerId: "club-1",
      uid: "runner-1", peers: {"runner-2": {meetings: 1, lastMetAtMs: 5}}},
    "organizerMeetingHistory/club-1_runner-2": {organizerId: "club-1",
      uid: "runner-2", peers: {"runner-1": {meetings: 1, lastMetAtMs: 5},
        "runner-3": {meetings: 2, lastMetAtMs: 5}}},
    "organizerMeetingHistory/club-1_runner-3": {organizerId: "club-1",
      uid: "runner-3", peers: {"runner-2": {meetings: 2, lastMetAtMs: 5}}},
  });
  assert.ok(deletes(harness, "organizerMeetingHistory/club-1_runner-1"));
  assert.deepEqual(updatesOf(harness,
    "organizerMeetingHistory/club-1_runner-2"),
  [{peers: {"runner-3": {meetings: 2, lastMetAtMs: 5}}}]);
  assert.deepEqual(updatesOf(harness,
    "organizerMeetingHistory/club-1_runner-3"), []);
  assert.ok(!deletes(harness, "organizerMeetingHistory/club-1_runner-2"));
});

test("deletion erases the account's game history and renames its half of " +
  "rank pair labels after the main writes", async () => {
  const slot = (peerUid: string) => ({roundIndex: 0, peerUid,
    slotId: "round-0-unit-0-a"});
  const harness = await deleteRunnerOne({
    "eventSuccessGuestHistory/event1_runner-1": {eventId: "event1",
      uid: "runner-1", rounds: []},
    "eventSuccessGuestHistory/event1_runner-2": {eventId: "event1",
      uid: "runner-2", rounds: []},
    "eventSuccessAssignments/event1_guided_rotations_runner-1": {
      eventId: "event1", uid: "runner-1", moduleId: "guided_rotations",
      peerUids: ["runner-2"], rotationSlots: [slot("runner-2")]},
    "eventSuccessStandings/event1": {eventId: "event1",
      unitOutcome: "rank", rounds: [{roundIndex: 0, entries: [
        {unitId: "round_0_round-0-unit-0-a", unitLabel: "Asha + Ravi"},
        {unitId: "round_0_round-0-unit-1-a", unitLabel: "Mira + Dev"},
      ]}], entries: [
        {unitId: "round_0_round-0-unit-0-a", unitLabel: "Asha + Ravi"}]},
  });
  assert.ok(deletes(harness, "eventSuccessGuestHistory/event1_runner-1"));
  assert.ok(!deletes(harness, "eventSuccessGuestHistory/event1_runner-2"));
  const [standings] = updatesOf(harness, "eventSuccessStandings/event1");
  // runner-1 sorts before runner-2, so it is the first name.
  assert.deepEqual(standings.entries,
    [{unitId: "round_0_round-0-unit-0-a", unitLabel: "Deleted user + Ravi"}]);
  assert.deepEqual((standings.rounds as Array<{entries: unknown}>)[0].entries,
    [{unitId: "round_0_round-0-unit-0-a", unitLabel: "Deleted user + Ravi"},
      {unitId: "round_0_round-0-unit-1-a", unitLabel: "Mira + Dev"}]);
  // The rename is the last commit, after the assignments are cleaned.
  const batches = harness.committedBatches;
  assert.deepEqual(batches[batches.length - 1],
    ["eventSuccessStandings/event1"]);
  assert.equal(pairLabelWithoutAccount("Asha", 0), "Deleted user");
  assert.equal(outcomeUnitId("round_0_a b/c"),
    safeOutcomeUnitId("round_0_a b/c"));
});

test("deletion erases the account's assignments and every peer slot that " +
  "pairs a guest with it", async () => {
  const harness = await deleteRunnerOne({
    "eventSuccessAssignments/event1_guided_rotations_runner-1": {
      eventId: "event1", uid: "runner-1", moduleId: "guided_rotations",
      peerUids: ["runner-2"], rotationSlots: [{roundIndex: 0,
        peerUid: "runner-2"}]},
    "eventSuccessAssignments/event1_guided_rotations_runner-2": {
      eventId: "event1", uid: "runner-2", moduleId: "guided_rotations",
      peerUids: ["runner-1", "runner-3"], rotationSlots: [
        {roundIndex: 0, peerUid: "runner-1"},
        {roundIndex: 1, peerUid: "runner-3"},
        {roundIndex: 2, peerUid: "runner-3", partnerUid: "runner-3",
          opponentUids: ["runner-1", "runner-4"]},
      ], groupRotationSlots: [{roundIndex: 3,
        peerUids: ["runner-1", "runner-3"]}]},
    "eventSuccessAssignments/event1_guided_rotations_runner-3": {
      eventId: "event1", uid: "runner-3", moduleId: "guided_rotations",
      peerUids: ["runner-2"], rotationSlots: []},
  });
  assert.ok(deletes(harness,
    "eventSuccessAssignments/event1_guided_rotations_runner-1"));
  assert.deepEqual(updatesOf(harness,
    "eventSuccessAssignments/event1_guided_rotations_runner-2"), [{
    peerUids: ["runner-3"],
    rotationSlots: [{roundIndex: 1, peerUid: "runner-3"}],
    groupRotationSlots: [{roundIndex: 3, peerUids: ["runner-3"]}],
  }]);
  assert.deepEqual(updatesOf(harness,
    "eventSuccessAssignments/event1_guided_rotations_runner-3"), []);
});

test("deletion erases the account's assignment drafts and its slots in " +
  "peers' drafts", async () => {
  const harness = await deleteRunnerOne({
    "eventSuccessAssignmentDrafts/event1_guided_rotations_runner-1": {
      eventId: "event1", uid: "runner-1", roundIndex: 1,
      assignment: {uid: "runner-1", peerUids: ["runner-2"]}},
    "eventSuccessAssignmentDrafts/event1_guided_rotations_runner-2": {
      eventId: "event1", uid: "runner-2", roundIndex: 1,
      assignment: {uid: "runner-2", label: "Round 2",
        peerUids: ["runner-1"], rotationSlots: [{roundIndex: 1,
          peerUid: "runner-1"}]}},
  });
  assert.ok(deletes(harness,
    "eventSuccessAssignmentDrafts/event1_guided_rotations_runner-1"));
  assert.deepEqual(updatesOf(harness,
    "eventSuccessAssignmentDrafts/event1_guided_rotations_runner-2"), [{
    assignment: {uid: "runner-2", label: "Round 2", peerUids: [],
      rotationSlots: []},
  }]);
});

test("deletion drops Host plan constraints and overrides naming the account",
  async () => {
    const harness = await deleteRunnerOne({
      "eventBookings/event1_runner-1": {eventId: "event1", uid: "runner-1",
        status: "deleted"},
      "eventSuccessPlans/event1": {eventId: "event1", affinityConstraints: [
        {aUid: "runner-1", bUid: "runner-2", kind: "together"},
        {aUid: "runner-2", bUid: "runner-3", kind: "apart"},
      ], spatialOverrides: [
        {uid: "runner-3", targetPeerUid: "runner-1"},
        {uid: "runner-2", targetPeerUid: "runner-3"},
      ]},
      "eventSuccessPlans/event2": {eventId: "event2", affinityConstraints: [
        {aUid: "runner-2", bUid: "runner-3", kind: "apart"}]},
    });
    assert.deepEqual(updatesOf(harness, "eventSuccessPlans/event1"), [{
      affinityConstraints: [{aUid: "runner-2", bUid: "runner-3",
        kind: "apart"}],
      spatialOverrides: [{uid: "runner-2", targetPeerUid: "runner-3"}],
    }]);
    assert.deepEqual(updatesOf(harness, "eventSuccessPlans/event2"), []);
    assert.ok(!deletes(harness, "eventSuccessPlans/event1"));
  });

test("deletion erases First Hello missions on either side of the account",
  async () => {
    const harness = await deleteRunnerOne({
      "eventSuccessArrivalMissions/event1_runner-1": {eventId: "event1",
        observerUid: "runner-1", targetUid: "runner-2"},
      "eventSuccessArrivalMissions/event1_runner-3": {eventId: "event1",
        observerUid: "runner-3", targetUid: "runner-1"},
      "eventSuccessArrivalMissions/event1_runner-2": {eventId: "event1",
        observerUid: "runner-2", targetUid: "runner-3"},
    });
    assert.ok(deletes(harness, "eventSuccessArrivalMissions/event1_runner-1"));
    assert.ok(deletes(harness, "eventSuccessArrivalMissions/event1_runner-3"));
    assert.ok(!deletes(harness,
      "eventSuccessArrivalMissions/event1_runner-2"));
  });

test("deletion erases wingman requests made by or about the account",
  async () => {
    const harness = await deleteRunnerOne({
      "eventSuccessWingmanRequests/event1_runner-1": {eventId: "event1",
        requesterUid: "runner-1", targetUid: "runner-2"},
      "eventSuccessWingmanRequests/event1_runner-3": {eventId: "event1",
        requesterUid: "runner-3", targetUid: "runner-1"},
      "eventSuccessWingmanRequests/event1_runner-2": {eventId: "event1",
        requesterUid: "runner-2", targetUid: "runner-3"},
    });
    assert.ok(deletes(harness, "eventSuccessWingmanRequests/event1_runner-1"));
    assert.ok(deletes(harness, "eventSuccessWingmanRequests/event1_runner-3"));
    assert.ok(!deletes(harness,
      "eventSuccessWingmanRequests/event1_runner-2"));
  });

for (const collection of ["eventSuccessPreferences", "eventSuccessPresence",
  "eventSuccessDeferredCues", "eventSuccessLateArrivals",
  "eventRuntimeClaimRequests", "eventRuntimeDataRequests"]) {
  test(`deletion erases the account's ${collection} rows`, async () => {
    const harness = await deleteRunnerOne({
      [`${collection}/event1_runner-1`]: {eventId: "event1",
        uid: "runner-1", resolvedByUid: "host-1"},
      [`${collection}/event2_runner-1`]: {eventId: "event2",
        uid: "runner-1"},
      [`${collection}/event1_runner-2`]: {eventId: "event1",
        uid: "runner-2"},
    });
    assert.ok(deletes(harness, `${collection}/event1_runner-1`));
    assert.ok(deletes(harness, `${collection}/event2_runner-1`));
    assert.ok(!deletes(harness, `${collection}/event1_runner-2`));
  });
}

test("deletion erases the account's venue session receipts", async () => {
  const harness = await deleteRunnerOne({
    "eventVenueSessionRedemptions/redemption-1": {eventId: "event1",
      sessionId: "session-1", uid: "runner-1", purpose: "first_hello"},
    "eventVenueSessionRedemptions/redemption-2": {eventId: "event1",
      sessionId: "session-1", uid: "runner-2", purpose: "first_hello"},
  });
  assert.ok(deletes(harness, "eventVenueSessionRedemptions/redemption-1"));
  assert.ok(!deletes(harness, "eventVenueSessionRedemptions/redemption-2"));
});

test("a deleted waitlisted participation refreshes the Host request view",
  () => {
    // Account deletion marks the participation deleted
    // (accountDeletionSeats); the request view trigger re-evaluates the
    // event and drops the account's row.
    assert.deepEqual(requestViewEventsForParticipation(
      {eventId: "event1", uid: "runner-1", status: "waitlisted"},
      {eventId: "event1", uid: "runner-1", status: "deleted"}), ["event1"]);
  });

test("deletion deletes the account's follow edges only", async () => {
  const harness = await deleteRunnerOne({
    "organizerFollows/club-1_runner-1": {organizerId: "club-1",
      uid: "runner-1", status: "active"},
    "organizerFollows/club-2_runner-1": {organizerId: "club-2",
      uid: "runner-1", status: "inactive"},
    "organizerFollows/club-1_runner-2": {organizerId: "club-1",
      uid: "runner-2", status: "active"},
  });
  assert.ok(deletes(harness, "organizerFollows/club-1_runner-1"));
  assert.ok(deletes(harness, "organizerFollows/club-2_runner-1"));
  assert.ok(!deletes(harness, "organizerFollows/club-1_runner-2"));
  assert.ok(!harness.setWrites.some((write) =>
    write.path.startsWith("organizerFollows/")));
});
