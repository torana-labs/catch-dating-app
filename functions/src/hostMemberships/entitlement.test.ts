import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateHostMembershipEntitlement,
  membershipIsEntitled,
  pastDueGraceMillis,
  planPriceForEvent,
  type MembershipFacts,
  type PlanFacts,
  type RulesFacts,
} from "./entitlement";

const now = 1_000_000_000;
const day = 24 * 60 * 60 * 1000;

function plan(overrides: Partial<PlanFacts> = {}): PlanFacts {
  return {planId: "hmp_AAAAAAAAAAAAAAAAAAAA", name: "Regulars",
    status: "published",
    prices: {monthly: {amountPaise: 49900, providerPriceIds: {}, revision: 1}},
    memberCap: null, activeMemberCount: 0,
    benefits: [{type: "eventDiscount", percentOff: 20}],
    limits: {maxUpcomingMemberPricedBookings: null}, ...overrides};
}

function member(overrides: Partial<MembershipFacts> = {}): MembershipFacts {
  return {status: "active", pause: null, currentPeriodEndMillis: now + day,
    trialEndsAtMillis: null, planId: "hmp_AAAAAAAAAAAAAAAAAAAA",
    ...overrides};
}

function rules(overrides: Partial<RulesFacts> = {}): RulesFacts {
  return {memberPriceOverrides: [], earlyAccess: null, membersOnly: false,
    ...overrides};
}

function evaluate(params: {
  list?: number; membership?: MembershipFacts | null; planFacts?: PlanFacts;
  published?: PlanFacts[]; rulesFacts?: RulesFacts | null; upcoming?: number;
}) {
  const planFacts = params.planFacts ?? plan();
  return evaluateHostMembershipEntitlement({
    listPriceInPaise: params.list ?? 50_000,
    rules: params.rulesFacts === undefined ? null : params.rulesFacts,
    membership: params.membership === undefined ? member() :
      params.membership,
    plan: planFacts,
    publishedPlans: params.published ?? [planFacts],
    upcomingMemberPricedBookings: params.upcoming ?? 0,
    nowMillis: now,
  });
}

test("entitled statuses respect the grace window and pause initiator", () => {
  assert.equal(membershipIsEntitled(member(), now), true);
  for (const status of ["trialing", "canceling", "past_due"] as const) {
    assert.equal(membershipIsEntitled(member({status}), now), true, status);
  }
  const lapsed = member({currentPeriodEndMillis: now - pastDueGraceMillis - 1});
  assert.equal(membershipIsEntitled(lapsed, now), false);
  assert.equal(membershipIsEntitled(member({
    currentPeriodEndMillis: now - pastDueGraceMillis + 1}), now), true);
  assert.equal(membershipIsEntitled(member({status: "expired"}), now), false);
  assert.equal(membershipIsEntitled(member({status: "paused",
    pause: {initiator: "member", pausedAtMillis: now}}), now), false);
  // A host's seasonal pause keeps access even after the period ended.
  assert.equal(membershipIsEntitled(member({status: "paused",
    currentPeriodEndMillis: now - 90 * day,
    pause: {initiator: "host", pausedAtMillis: now}}), now), true);
  assert.equal(membershipIsEntitled(member({status: "trialing",
    currentPeriodEndMillis: null, trialEndsAtMillis: now + day}), now), true);
  assert.equal(membershipIsEntitled(member({currentPeriodEndMillis: null}),
    now), false);
});

test("member price prefers the event override, then the plan discount", () => {
  const base = {listPriceInPaise: 50_000, plan: plan()};
  assert.equal(planPriceForEvent({...base, rules: null}), 40_000);
  assert.equal(planPriceForEvent({...base, rules: rules({
    memberPriceOverrides: [{planId: base.plan.planId, priceInPaise: 0}]})}),
  0);
  assert.equal(planPriceForEvent({...base, rules: rules({
    memberPriceOverrides: [{planId: base.plan.planId, percentOff: 50}]})}),
  25_000);
  // An override above list price is never a "member price".
  assert.equal(planPriceForEvent({...base, rules: rules({
    memberPriceOverrides: [{planId: base.plan.planId,
      priceInPaise: 60_000}]})}), null);
  assert.equal(planPriceForEvent({listPriceInPaise: 50_000,
    plan: plan({benefits: []}), rules: null}), null);
  // A sub-rupee result rounds up to the smallest chargeable amount.
  assert.equal(planPriceForEvent({listPriceInPaise: 150,
    plan: plan({benefits: [{type: "eventDiscount", percentOff: 99}]}),
    rules: null}), 100);
  assert.equal(planPriceForEvent({listPriceInPaise: 999,
    plan: plan({benefits: [{type: "eventDiscount", percentOff: 33}]}),
    rules: null}), 669);
});

test("entitled members get the member price and savings", () => {
  const result = evaluate({planFacts: plan({benefits: [
    {type: "eventDiscount", percentOff: 100}]})});
  assert.deepEqual(result.member, {planId: plan().planId, entitled: true});
  assert.equal(result.priceInPaise, 0);
  assert.equal(result.savingsInPaise, 50_000);
  assert.equal(result.memberPriceApplied, true);
  assert.equal(result.offer, null);
});

test("member-paused and lapsed members pay list price", () => {
  for (const membership of [
    member({status: "paused", pause: {initiator: "member",
      pausedAtMillis: now}}),
    member({status: "expired"}),
  ]) {
    const result = evaluate({membership});
    assert.equal(result.priceInPaise, 50_000);
    assert.equal(result.memberPriceApplied, false);
    assert.equal(result.member?.entitled, false);
  }
});

test("members-only and early access gate by plan benefit", () => {
  const membersOnly = rules({membersOnly: true});
  assert.deepEqual(evaluate({membership: null, rulesFacts: membersOnly})
    .admission, {allowed: false, reason: "paidMembershipRequired"});
  assert.deepEqual(evaluate({rulesFacts: membersOnly}).admission,
    {allowed: false, reason: "paidMembershipRequired"});
  const withAccess = plan({benefits: [{type: "membersOnlyAccess"}]});
  assert.deepEqual(evaluate({planFacts: withAccess, rulesFacts: membersOnly})
    .admission, {allowed: true});

  const early = rules({earlyAccess: {hours: 48, anchorMillis: now - day,
    generalSaleOpensAtMillis: now + day}});
  assert.deepEqual(evaluate({membership: null, rulesFacts: early}).admission,
    {allowed: false, reason: "memberEarlyAccess",
      generalSaleOpensAtMillis: now + day});
  assert.deepEqual(evaluate({planFacts: plan({benefits: [
    {type: "earlyAccess"}]}), rulesFacts: early}).admission, {allowed: true});
  const opened = rules({earlyAccess: {hours: 1, anchorMillis: now - day,
    generalSaleOpensAtMillis: now - 1}});
  assert.deepEqual(evaluate({membership: null, rulesFacts: opened}).admission,
    {allowed: true});
});

test("the upcoming member-priced booking cap falls back to list price", () => {
  const capped = plan({limits: {maxUpcomingMemberPricedBookings: 2}});
  assert.equal(evaluate({planFacts: capped, upcoming: 1}).memberPriceApplied,
    true);
  const blocked = evaluate({planFacts: capped, upcoming: 2});
  assert.equal(blocked.memberPriceApplied, false);
  assert.equal(blocked.priceInPaise, 50_000);
  assert.equal(blocked.memberPriceBlockedReason, "bookingCapReached");
});

test("upsell offers the cheapest result, breaking ties by monthly cost",
  () => {
    const cheap = plan({planId: "hmp_BBBBBBBBBBBBBBBBBBBB", name: "Annual",
      prices: {annual: {amountPaise: 360000, providerPriceIds: {},
        revision: 1}},
      benefits: [{type: "eventDiscount", percentOff: 100}]});
    const pricey = plan({planId: "hmp_CCCCCCCCCCCCCCCCCCCC", name: "Monthly",
      prices: {monthly: {amountPaise: 49900, providerPriceIds: {},
        revision: 1}},
      benefits: [{type: "eventDiscount", percentOff: 100}]});
    const partial = plan();
    const full = plan({planId: "hmp_DDDDDDDDDDDDDDDDDDDD", memberCap: 1,
      activeMemberCount: 1,
      benefits: [{type: "eventDiscount", percentOff: 100}]});
    const draft = plan({planId: "hmp_EEEEEEEEEEEEEEEEEEEE", status: "draft",
      benefits: [{type: "eventDiscount", percentOff: 100}]});
    const result = evaluate({membership: null,
      published: [partial, pricey, cheap, full, draft]});
    assert.deepEqual(result.offer, {planId: cheap.planId, planName: "Annual",
      interval: "annual", planPriceInPaise: 360000, memberPriceInPaise: 0,
      savingsInPaise: 50_000, unlocksAccess: false});
    assert.equal(evaluate({membership: null, published: [plan({
      benefits: []})]}).offer, null);
    // Current members are never upsold; plan switching is out of scope.
    assert.equal(evaluate({published: [cheap]}).offer, null);
    assert.equal(evaluate({membership: member({status: "expired"}),
      published: [cheap]}).offer?.planId, cheap.planId);
  });

test("upsell for a gated event names a plan that lifts the gate", () => {
  const access = plan({planId: "hmp_FFFFFFFFFFFFFFFFFFFF",
    benefits: [{type: "membersOnlyAccess"}]});
  const discountOnly = plan();
  const result = evaluate({membership: null,
    rulesFacts: rules({membersOnly: true}),
    published: [discountOnly, access]});
  assert.equal(result.offer?.planId, access.planId);
  assert.equal(result.offer?.unlocksAccess, true);
  assert.equal(result.offer?.memberPriceInPaise, 50_000);
});
