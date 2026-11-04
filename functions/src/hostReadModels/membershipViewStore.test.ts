import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync, writeFileSync} from "node:fs";
import {contractValidator} from "../shared/contractTestValidators";
import {departureRosterHarness} from
  "../eventSuccess/operations/departureRosterTestFixtures";
import {progressFixtureManager as manager} from
  "../eventSuccess/operations/groupProgressTestFixtures";
import {membershipIdentity} from
  "../eventSuccess/operations/membershipReader";
import {handoverReview} from
  "../eventSuccess/operations/membershipReceivers";
import {reconcileMembershipView} from "./membershipViewStore";
import {membershipViewsCollection} from "./guestViewSupport";
import {allowDeletes, documentsOf, viewDeps, withoutServerTime} from
  "./movementViewTestFixtures";

const validate = contractValidator("HostEventMembershipViewDocument");
const end = 3_000_000;
type Data = Record<string, unknown>;

async function harness() {
  const h = await departureRosterHarness();
  allowDeletes(h.fake);
  await h.groups();
  const reconcile = () => reconcileMembershipView(h.db,
    h.scope.context.eventId, h.attendeeId, viewDeps(h.clock));
  const doc = () => documentsOf(h.fake, membershipViewsCollection).get(
    membershipIdentity({context: h.scope.context,
      attendeeId: h.attendeeId})) as Data | undefined;
  const read = async () => (await h.membership.get(manager,
    {context: h.scope.context, attendeeId: h.attendeeId})).view;
  return {...h, reconcile, doc, read};
}

test("the view is the manager's read and receivers rebuild its review",
  async () => {
    const h = await harness();
    await h.place("easy");
    await h.grant("pacer", "fast", "pacer", 1_500_000);
    assert.equal((await h.reconcile()).kind, "complete");
    const doc = h.doc()!;
    assert.ok(validate(doc), JSON.stringify(validate.errors));
    assert.equal(doc.eventEndAtMillis, end);
    const read = await h.read();
    const {handoverReview: review, ...rest} = withoutServerTime(read);
    assert.deepEqual(doc.view, rest);
    assert.ok(review);
    assert.deepEqual(handoverReview(doc.receivers as typeof review.receivers,
      end, h.clock.now), review);
    const pacer = (doc.receivers as Array<{operatorId: string;
      groups: Array<{groupId: string; validUntil: number}>}>)
      .find((r) => r.operatorId === "pacer")!;
    assert.deepEqual(pacer.groups, [{groupId: "fast", validUntil: 1_500_000}],
      "receivers keep the duty's own end; the phone caps the review");
    assert.equal((await h.reconcile()).kind, "unchanged");
  });

test("readiness is evaluated just before the end; the phone applies it",
  async () => {
    const h = await harness();
    h.clock.now = end + 60_000;
    await h.reconcile();
    const view = h.doc()!.view as {ready: boolean; actions: string[]};
    assert.equal(view.ready, true, "the server never decides the end passed");
    assert.ok(view.actions.includes("propose"));
  });

test("gone attendees and events lose their view; invalid rows keep it",
  async () => {
    const h = await harness();
    await h.reconcile();
    const before = h.doc()!;
    await h.put(h.attendeePath, {...h.attendee, status: "nonsense"});
    assert.equal((await h.reconcile()).kind, "invalidSource");
    assert.deepEqual(h.doc()!.view, before.view);
    assert.equal(h.doc()!.incompleteSource, "eventAttendees");
    await h.put(h.attendeePath, h.attendee);
    h.fake.remove("events/" + h.scope.context.eventId);
    assert.deepEqual(await h.reconcile(), {kind: "removed", existed: true});
    assert.equal(h.doc(), undefined);
  });

test("native membership fixtures hold actual views and the manager's actions",
  async () => {
    const h = await departureRosterHarness(undefined,
      "00000000-0000-0000-0000-000000000124");
    allowDeletes(h.fake);
    await h.groups();
    await h.grant("pacer", "fast", "pacer", 1_500_000);
    const {context} = h.scope;
    const start = h.clock.now;
    const states: Record<string, unknown> = {};
    const stage = async (name: string, attendeeId: string, now: number) => {
      await reconcileMembershipView(h.db, context.eventId, attendeeId,
        viewDeps(h.clock));
      const stored = documentsOf(h.fake, membershipViewsCollection)
        .get(membershipIdentity({context, attendeeId}))!;
      const {evaluatedAt: _evaluatedAt, ...doc} = stored;
      void _evaluatedAt;
      const at = h.clock.now;
      h.clock.now = now;
      const view = (await h.membership.get(manager, {context, attendeeId}))
        .view;
      h.clock.now = at;
      states[name] = {actorUid: manager, now, doc, expected: {
        actions: view.actions, ready: view.ready,
        transferState: view.transferState}};
    };
    const decide = async (operationId: string, decision: object) => {
      const view = (await h.membership.get(manager,
        {context, attendeeId: h.attendeeId})).view;
      await h.membership.transfer(manager, {expectedSourceHash:
        view.sourceHash, command: {kind: "transferGroup", context,
        eventId: context.eventId, operationId, payload: {
          attendeeId: h.attendeeId, episodeId: view.episodeId,
          expectedMembershipRevision: view.revision,
          expectedParticipationRevision: view.participationRevision,
          decision}}});
      return (await h.membership.get(manager,
        {context, attendeeId: h.attendeeId})).view;
    };
    const unplaced = "a-no-episode";
    await h.put("eventAttendees/" + unplaced, {...h.attendee});
    await stage("noEpisode", unplaced, start);
    await stage("ready", h.attendeeId, start);
    await stage("notReady", h.attendeeId, end);
    await decide("fixture-place", {kind: "place", groupId: "easy"});
    await stage("accepted", h.attendeeId, start);
    const toActor = await decide("fixture-propose-actor", {kind: "propose",
      from: "easy", to: "fast", receivingOperatorId: manager,
      expiresAtMillis: start + 10_000});
    await stage("pendingToActor", h.attendeeId, start);
    await decide("fixture-cancel", {kind: "cancel",
      transferId: toActor.transfer!.transferId});
    await decide("fixture-propose-other", {kind: "propose", from: "easy",
      to: "fast", receivingOperatorId: "pacer",
      expiresAtMillis: start + 10_000});
    await stage("pendingToOther", h.attendeeId, start);
    await stage("expiredTransfer", h.attendeeId, start + 10_000);
    const samples = {scope: {organizerId: context.organizerId,
      eventId: context.eventId}, states};
    const file = "../test/event_success/fixtures/membership_views.json";
    if (process.env.UPDATE_MEMBERSHIP_VIEW_FIXTURE === "1") {
      writeFileSync(file, JSON.stringify(samples, null, 2) + "\n");
    }
    assert.deepEqual(JSON.parse(readFileSync(file, "utf8")),
      JSON.parse(JSON.stringify(samples)));
  });
