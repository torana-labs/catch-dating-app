import assert from "node:assert/strict";
import test from "node:test";
import {contractFile} from "../shared/contractFixtures";
import {quotePriceInPaise, signupPolicyDecision, type SignupPolicyInput} from
  "./eventPolicy";
import {evaluateHostMembershipEntitlement} from
  "../hostMemberships/entitlement";
import {planFacts} from "../hostMemberships/entitlementReader";

// The Consumer app shows booking state from direct reads by mirroring these
// rules (lib/contexts/bookings and lib/contexts/payments). Functions owns
// them; these shared cases keep the mirror honest.
/* eslint-disable @typescript-eslint/no-explicit-any */
const cases = contractFile("parity/event_booking_viewer_cases.json") as {
  signup: Array<SignupPolicyInput & {name: string; expected: any}>;
  entitlement: Array<{name: string; nowMillis: number;
    listPriceInPaise: number; rules: any; membership: any;
    plans: Array<{planId: string; doc: any}>;
    upcomingMemberPricedBookings: number; expected: any}>;
};

for (const c of cases.signup) {
  test(`signup parity: ${c.name}`, () => {
    const decision = signupPolicyDecision(c);
    assert.deepEqual({
      restriction: decision.allowed ? null : decision.reason,
      quoteInPaise: quotePriceInPaise({policy: c.policy, cohortId: c.cohortId,
        roster: c.roster}),
    }, c.expected);
  });
}

for (const c of cases.entitlement) {
  test(`membership parity: ${c.name}`, () => {
    const plans = c.plans.map(({planId, doc}) => planFacts(planId, doc));
    const result = evaluateHostMembershipEntitlement({
      listPriceInPaise: c.listPriceInPaise, rules: c.rules,
      membership: c.membership,
      plan: c.membership ? plans.find((plan) =>
        plan.planId === c.membership.planId) ?? null : null,
      publishedPlans: plans.filter((plan) => plan.status === "published"),
      upcomingMemberPricedBookings: c.upcomingMemberPricedBookings,
      nowMillis: c.nowMillis,
    });
    assert.deepEqual({
      priceInPaise: result.priceInPaise,
      listPriceInPaise: result.listPriceInPaise,
      memberPriceApplied: result.memberPriceApplied,
      memberPriceBlockedReason: result.memberPriceBlockedReason,
      admission: result.admission.allowed ? null : result.admission.reason,
      memberEntitled: result.member ? result.member.entitled : null,
      offer: result.offer,
    }, c.expected);
  });
}
