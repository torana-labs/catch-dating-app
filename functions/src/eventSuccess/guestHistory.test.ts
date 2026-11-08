import assert from "node:assert/strict";
import test from "node:test";
import {AudienceTestStore} from
  "../organizers/organizerAudienceTestStore";
import {
  guestHistoryFor,
  guestUnitsFrom,
  projectGuestHistory,
  standingsSource,
} from "./guestHistory";

const standings = {
  eventId: "event-1",
  organizerId: "org-1",
  unitOutcome: "score",
  revision: 2,
  rounds: [
    {roundIndex: 1, entries: [
      {unitId: "team_unit_0", unitLabel: "Quizzy Rascals", position: 2,
        value: 70, roundsRecorded: 2},
      {unitId: "team_unit_1", unitLabel: "Harbour Lights", position: 1,
        value: 72, roundsRecorded: 2},
    ]},
    {roundIndex: 0, entries: [
      {unitId: "team_unit_0", unitLabel: "Quizzy Rascals", position: 1,
        value: 41, roundsRecorded: 1},
      {unitId: "team_unit_1", unitLabel: "Harbour Lights", position: 2,
        value: 38, roundsRecorded: 1},
    ]},
  ],
};

test("a guest's team carries their standing round by round", () => {
  const units = guestUnitsFrom(
    [{uid: "guest-1", moduleId: "team", unitIndex: 0, label: "A"}], []);
  const source = standingsSource("event-1", standings)!;
  const history = guestHistoryFor(source, "guest-1",
    units.get("guest-1")!, 9);
  assert.deepEqual(history.rounds.map((round) =>
    [round.roundIndex, round.position, round.first]), [[0, 1, true],
    [1, 2, false]]);
  assert.equal(history.finalStanding?.unitLabel, "Quizzy Rascals");
  assert.equal(history.finalStanding?.value, 70);
});

test("rank formats follow the guest's pair in each round", () => {
  const units = guestUnitsFrom([{uid: "guest-1", moduleId: "rotations",
    rotationSlots: [{roundIndex: 0, peerUid: "guest-2", slotId: "s1"}]}],
  [{linkedUid: "guest-3", arrivalGroup: "  Early  Birds "}]);
  assert.deepEqual([...units.get("guest-2")!.byRound.get(0)!],
    ["round_0_s1"]);
  assert.deepEqual([...units.get("guest-3")!.always],
    ["arrival_group_early_birds"]);
});

test("the projection writes one history per placed guest", async () => {
  const store = new AudienceTestStore({
    "eventSuccessAssignments/a1": {eventId: "event-1", uid: "guest-1",
      moduleId: "team", unitIndex: 0},
    "eventSuccessAssignments/a2": {eventId: "event-1", uid: "guest-2",
      moduleId: "team", unitIndex: 1},
    "eventSuccessAssignments/x": {eventId: "event-2", uid: "guest-9",
      moduleId: "team", unitIndex: 0},
    "eventAttendees/b1": {eventId: "event-1", linkedUid: "guest-4"},
  });
  const written = await projectGuestHistory(store.asFirestore(),
    standingsSource("event-1", standings)!, 5);
  assert.equal(written, 2);
  assert.equal(
    (store.docs["eventSuccessGuestHistory/event-1_guest-2"].finalStanding as
      {first: boolean}).first, true);
  assert.equal(store.docs["eventSuccessGuestHistory/event-1_guest-9"],
    undefined);
  assert.equal(store.docs["eventSuccessGuestHistory/event-1_guest-4"],
    undefined);
});
