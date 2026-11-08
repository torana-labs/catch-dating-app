import assert from "node:assert/strict";
import test from "node:test";
import {
  deferredCuesReleasedBy,
  deferredGuestCueId,
  releaseDeferredGuestCues,
} from "./deferredGuestCues";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import type {FcmParams} from "../shared/notifications";

test("held cues go out at a planned stop or the finish, never mid-activity",
  () => {
    assert.equal(deferredCuesReleasedBy({action: "complete"}), true);
    assert.equal(deferredCuesReleasedBy({action: "setActiveStep",
      activeStepIsActivity: false}), true);
    assert.equal(deferredCuesReleasedBy({action: "setActiveStep",
      activeStepIsActivity: true}), false);
    // An older host app that does not say keeps them held until the finish.
    assert.equal(deferredCuesReleasedBy({action: "setActiveStep"}), false);
    assert.equal(deferredCuesReleasedBy({action: "pauseActiveStep"}), false);
  });

test("releasing sends each held push once and clears it", async () => {
  const store = new AudienceTestStore({
    [`eventSuccessDeferredCues/${deferredGuestCueId("event-1", "runner-1")}`]:
      {eventId: "event-1", organizerId: "club-1", uid: "runner-1",
        kind: "companionReady"},
    [`eventSuccessDeferredCues/${deferredGuestCueId("event-1", "runner-2")}`]:
      {eventId: "event-1", organizerId: "club-1", uid: "runner-2",
        kind: "companionReady"},
    [`eventSuccessDeferredCues/${deferredGuestCueId("event-2", "runner-1")}`]:
      {eventId: "event-2", organizerId: "club-1", uid: "runner-1",
        kind: "companionReady"},
    "users/runner-1": {fcmToken: "token-1", prefsRunStatusUpdates: true},
    "users/runner-2": {fcmToken: "token-2", prefsRunStatusUpdates: false},
  });
  const sent: FcmParams[] = [];
  const event = {organizerId: "club-1", title: "Sunday Social Run"};

  const count = await releaseDeferredGuestCues(store.asFirestore(), {
    eventId: "event-1",
    event: event as never,
    sendNotification: async (params: FcmParams) => {
      sent.push(params);
    },
  });

  assert.equal(count, 1, "the guest who turned updates off gets none");
  assert.equal(sent[0].token, "token-1");
  assert.equal(sent[0].type, "eventCompanionReady");
  assert.equal(store.docs["eventSuccessDeferredCues/event-1_runner-1"],
    undefined);
  assert.equal(store.docs["eventSuccessDeferredCues/event-1_runner-2"],
    undefined);
  assert.ok(store.docs["eventSuccessDeferredCues/event-2_runner-1"],
    "another event's cue stays held");
});
