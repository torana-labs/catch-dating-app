import assert from "node:assert/strict";
import test from "node:test";
import type {HostMembershipDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateHostMembershipDocument} from
  "../shared/generated/validators/hostMembershipDocument";
import {nextMembershipState, tenureMillis, type MembershipSeed} from
  "./stateMachine";
import type {ProviderSubscriptionStatus} from "./billingProvider";
import {dayMillis, now, subscription} from "./testFixture";

const seed: MembershipSeed = {organizerId: "organizer-1", uid: "member-1",
  planId: "hmp_AbCdEfGhIjKlMnOpQrSt", planName: "Sunday Runners",
  interval: "monthly", priceInPaise: 49900,
  checkoutId: "hmc_AbCdEfGhIjKlMnOpQrSt"};

function apply(current: HostMembershipDocument | null,
  status: ProviderSubscriptionStatus, at: number,
  extra: Partial<Parameters<typeof nextMembershipState>[0]> = {}) {
  return nextMembershipState({current,
    snapshot: subscription({status, ...(extra.snapshot ?? {})}),
    observedAtMillis: at, nowMillis: at, seed, ...extra});
}

function activeMembership(): HostMembershipDocument {
  const result = apply(null, "active", now);
  assert.ok(result.next);
  return result.next;
}

test("activation creates a valid counted membership", () => {
  const result = apply(null, "active", now);
  assert.equal(result.changed, true);
  assert.equal(result.countDelta, 1);
  assert.ok(result.next && validateHostMembershipDocument(result.next));
  assert.equal(result.next.status, "active");
  assert.equal(result.next.memberSinceMillis, now);
  assert.equal(result.next.tenure.stretchStartedAtMillis, now);
  assert.equal(result.next.currentPeriodEndMillis, now + 30 * dayMillis);
});

test("provider statuses map to membership statuses", () => {
  const active = activeMembership();
  const cases: Array<[string, string, string | null]> = [
    ["pending", "past_due", null],
    ["halted", "expired", "paymentFailed"],
    ["paused", "paused", "memberPaused"],
    ["cancelled", "expired", "providerCanceled"],
    ["completed", "expired", "planCompleted"],
    ["expired", "expired", "planCompleted"],
  ];
  for (const [provider, status, reason] of cases) {
    const next = apply(active, provider as ProviderSubscriptionStatus,
      now + 1).next!;
    assert.equal(next.status, status, provider);
    assert.equal(next.statusReason, reason, provider);
    assert.ok(validateHostMembershipDocument(next), provider);
  }
  assert.equal(apply(active, "pending", now + 1).next!.pastDueSinceMillis,
    now + 1);
});

test("created and immediate authentication grant nothing yet", () => {
  assert.equal(apply(null, "created", now).next, null);
  assert.equal(apply(null, "authenticated", now).next, null);
});

test("a future start after authentication is a trial", () => {
  const trialEnd = now + 7 * dayMillis;
  const result = apply(null, "authenticated", now, {snapshot:
    subscription({status: "authenticated", startAtMillis: trialEnd,
      currentStartMillis: null, currentEndMillis: null})});
  assert.equal(result.next?.status, "trialing");
  assert.equal(result.next?.trialEndsAtMillis, trialEnd);
  assert.equal(result.next?.currentPeriodEndMillis, trialEnd);
});

test("older provider evidence never overwrites newer state", () => {
  const paused = apply(activeMembership(), "paused", now + 10).next!;
  const stale = apply(paused, "active", now + 5);
  assert.equal(stale.outcome, "stale");
  assert.equal(stale.next, paused);
  // A local intent carries the provider's fresh response and always applies.
  const resumed = apply(paused, "active", now + 5, {intent: "memberResume"});
  assert.equal(resumed.next?.status, "active");
});

test("duplicate evidence is a no-op that keeps the revision", () => {
  const active = activeMembership();
  const again = apply(active, "active", now + 1);
  assert.equal(again.changed, false);
  assert.equal(again.next?.revision, active.revision);
  assert.equal(again.countDelta, 0);
});

test("pause initiator comes from the intent and is kept on replay", () => {
  const hostPaused = apply(activeMembership(), "paused", now + 1,
    {intent: "hostPause"}).next!;
  assert.deepEqual(hostPaused.pause, {initiator: "host",
    pausedAtMillis: now + 1});
  assert.equal(hostPaused.statusReason, "hostPaused");
  const replay = apply(hostPaused, "paused", now + 2).next!;
  assert.equal(replay.pause?.initiator, "host");
});

test("cancel at period end is canceling until the provider ends it", () => {
  const canceling = apply(activeMembership(), "active", now + 1,
    {intent: "memberCancel"}).next!;
  assert.equal(canceling.status, "canceling");
  assert.equal(canceling.cancelAtPeriodEnd, true);
  const renewed = apply(canceling, "active", now + 2).next!;
  assert.equal(renewed.status, "canceling");
  const ended = apply(canceling, "cancelled", now + 3);
  assert.equal(ended.next?.status, "expired");
  assert.equal(ended.next?.statusReason, "memberCanceled");
  assert.equal(ended.countDelta, -1);
});

test("tenure accumulates across pause, expiry and rejoin", () => {
  const active = activeMembership();
  const paused = apply(active, "paused", now + 10 * dayMillis).next!;
  assert.equal(paused.tenure.accumulatedMillis, 10 * dayMillis);
  assert.equal(paused.tenure.stretchStartedAtMillis, null);
  const resumed = apply(paused, "active", now + 20 * dayMillis).next!;
  const expired = apply(resumed, "cancelled", now + 25 * dayMillis).next!;
  assert.equal(tenureMillis(expired, now + 99 * dayMillis), 15 * dayMillis);
  // Rejoining with a new subscription keeps member-since and tenure.
  const rejoined = nextMembershipState({current: expired,
    snapshot: subscription({id: "sub_TestSub2", status: "active"}),
    observedAtMillis: now + 30 * dayMillis,
    nowMillis: now + 30 * dayMillis,
    seed: {...seed, checkoutId: "hmc_ZyXwVuTsRqPoNmLkJiHg"}});
  assert.equal(rejoined.countDelta, 1);
  assert.equal(rejoined.next?.memberSinceMillis, now);
  assert.equal(rejoined.next?.providerSubscriptionId, "sub_TestSub2");
  assert.equal(rejoined.next?.lastCheckoutId, "hmc_ZyXwVuTsRqPoNmLkJiHg");
  assert.equal(tenureMillis(rejoined.next!, now + 31 * dayMillis),
    16 * dayMillis);
});

test("evidence about another subscription never touches a live one", () => {
  const active = activeMembership();
  const other = nextMembershipState({current: active,
    snapshot: subscription({id: "sub_TestSub9", status: "cancelled"}),
    observedAtMillis: now + 1, nowMillis: now + 1, seed});
  assert.equal(other.outcome, "ignored");
  assert.equal(other.next, active);
});

test("a halted subscription that recovers is revived", () => {
  const halted = apply(activeMembership(), "halted", now + 1);
  assert.equal(halted.countDelta, -1);
  const revived = apply(halted.next, "active", now + 2);
  assert.equal(revived.next?.status, "active");
  assert.equal(revived.countDelta, 1);
});
