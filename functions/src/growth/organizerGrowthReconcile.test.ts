import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {milestonesFromSources} from "./organizerGrowthReconcile";

const at = (ms: number) => Timestamp.fromMillis(ms);

test("source records give each organizer its earliest steps", () => {
  const steps = milestonesFromSources({
    organizers: [
      {id: "moonmoth", data: {createdAt: at(100),
        publicPage: {publishStatus: "published"},
        ownership: {state: "claimed", claimedAt: at(500)}}},
      {id: "draft", data: {createdAt: at(50),
        publicPage: {publishStatus: "draft"},
        ownership: {state: "programmatic", claimedAt: null}}},
      {id: "self", data: {createdAt: at(70),
        ownership: {state: "userCreated", claimedAt: null}}},
    ],
    claimRequests: [{organizerId: "moonmoth", createdAt: at(400)},
      {organizerId: "moonmoth", createdAt: at(300)}],
    events: [
      {id: "later", data: {organizerId: "moonmoth", startTime: at(900),
        bookedCount: 3, status: "active"}},
      {id: "first", data: {organizerId: "moonmoth", startTime: at(800),
        bookedCount: 1, status: "active"}},
      {id: "cancelled", data: {organizerId: "moonmoth", startTime: at(600),
        bookedCount: 2, status: "cancelled"}},
    ],
    payments: [{organizerId: "moonmoth", capturedAt: at(700)},
      {organizerId: "moonmoth", capturedAt: null}],
  });
  const moonmoth = steps.get("moonmoth")!;
  assert.deepEqual(Object.fromEntries(Object.entries(moonmoth.observed)
    .map(([key, value]) => [key, value!.toMillis()])), {listedAt: 100,
    claimedAt: 500, claimRequestedAt: 300, firstEventAt: 800,
    firstPaidBookingAt: 700});
  assert.equal(moonmoth.firstEventId, "first");
  assert.equal(steps.has("draft"), false);
  assert.equal(steps.get("self")?.observed.claimedAt?.toMillis(), 70);
});
