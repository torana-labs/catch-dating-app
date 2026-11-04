import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import {departureRosterHarness} from "./departureRosterTestFixtures";
import {progressFixtureManager as manager} from "./groupProgressTestFixtures";
import {EventAccountabilityStore} from "./accountabilityStore";
import {accountabilityState} from "./accountabilityProjection";
import {guestCollections, guestIdentity} from "./guestRecords";
import {MEMBERSHIPS, membershipIdentity, membershipSourceState} from
  "./membershipReader";

/** The projection with no actor, as a view evaluator computes it. */
async function project(db: Firestore, context: {mode: "live";
  organizerId: string; eventId: string}, attendeeId: string, now: number) {
  const [eventSnap, attendeeSnap, planSnap, guestSnap, memberSnap] =
    await Promise.all([
      db.collection("events").doc(context.eventId).get(),
      db.collection("eventAttendees").doc(attendeeId).get(),
      db.collection("eventSuccessPlans").doc(context.eventId).get(),
      db.collection(guestCollections.guests)
        .doc(guestIdentity(context, attendeeId)).get(),
      db.collection(MEMBERSHIPS)
        .doc(membershipIdentity({context, attendeeId})).get(),
    ]);
  const member = membershipSourceState({scope: {context, attendeeId},
    eventSnap, attendeeSnap, planSnap, guestSnap, memberSnap, now});
  return accountabilityState({scope: {context, groupId: "event:whole",
    attendeeId}, member, checkpoint: null});
}

test("the actor-free projection equals the sweep read a manager gets",
  async () => {
    const h = await departureRosterHarness();
    const store = new EventAccountabilityStore(h.db, () => h.clock.now);
    const scope = {context: h.scope.context, groupId: "event:whole",
      attendeeId: h.attendeeId};
    const pick = (view: Awaited<ReturnType<typeof store.get>>["view"]) => ({
      sourceHash: view.sourceHash, revision: view.revision,
      episodeId: view.episodeId, disposition: view.disposition,
      availability: view.availability});
    assert.deepEqual(await project(h.db, h.scope.context, h.attendeeId,
      h.clock.now), pick((await store.get(manager, scope)).view));
    await h.guests.startEpisode(h.scope.context, h.attendeeId, "begin", null);
    assert.deepEqual(await project(h.db, h.scope.context, h.attendeeId,
      h.clock.now), pick((await store.get(manager, scope)).view));
  });
