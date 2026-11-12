import assert from "node:assert/strict";
import test from "node:test";
import type {EventDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  cohortIds,
  EventPolicyBundleDocument,
  assertPolicyAllowsSignup,
  signupPolicyDecision,
  quotePriceInPaise,
  quoteAttendeeCancellation,
  normalizePolicy,
  initialPolicyFromTerms,
} from "./eventPolicy";

test("a private event gets its first policy from capacity and price", () => {
  // Future private schema permits this partial record; current type is rich.
  const event = {
    publicationState: "private",
    setupRevision: 1,
    capacityLimit: 24,
    priceInPaise: 0,
  } as unknown as EventDocument;
  const resolved = initialPolicyFromTerms(event);
  assert.equal(resolved.admission.capacityLimit, 24);
  assert.equal(resolved.pricing.basePriceInPaise, 0);
});

test("normalizePolicy derives cancellation applicability from price", () => {
  assert.equal(normalizePolicy({
    ...policy("strict"),
    pricing: {
      ...policy("strict").pricing,
      basePriceInPaise: 0,
    },
  }).cancellation.policyId, "notApplicable");

  assert.equal(normalizePolicy({
    ...policy("notApplicable"),
    pricing: {
      ...policy("notApplicable").pricing,
      basePriceInPaise: 25000,
    },
  }).cancellation.policyId, "standard");
});

test("quoteAttendeeCancellation follows attendee policy windows", () => {
  const startTimeMillis = Date.parse("2026-05-02T12:00:00.000Z");

  assert.deepEqual(
    quoteAttendeeCancellation({
      policy: policy("standard"),
      paidAmountInPaise: 40000,
      startTimeMillis,
      nowMillis: Date.parse("2026-05-01T11:00:00.000Z"),
    }),
    {
      remedy: "fullRefund",
      refundAmountInPaise: 40000,
      creditAmountInPaise: 0,
    }
  );
  assert.deepEqual(
    quoteAttendeeCancellation({
      policy: policy("standard"),
      paidAmountInPaise: 40000,
      startTimeMillis,
      nowMillis: Date.parse("2026-05-02T05:00:00.000Z"),
    }),
    {
      remedy: "platformCredit",
      refundAmountInPaise: 0,
      creditAmountInPaise: 20000,
    }
  );
  assert.deepEqual(
    quoteAttendeeCancellation({
      policy: policy("standard"),
      paidAmountInPaise: 40000,
      startTimeMillis,
      nowMillis: Date.parse("2026-05-02T07:00:00.000Z"),
    }),
    {
      remedy: "noRefund",
      refundAmountInPaise: 0,
      creditAmountInPaise: 0,
    }
  );
});

test(
  "quoteAttendeeCancellation releases waitlisted attendees without payment",
  () => {
    assert.deepEqual(
      quoteAttendeeCancellation({
        policy: policy("strict"),
        paidAmountInPaise: 40000,
        startTimeMillis: Date.parse("2026-05-02T12:00:00.000Z"),
        nowMillis: Date.parse("2026-05-02T11:00:00.000Z"),
        isWaitlisted: true,
      }),
      {
        remedy: "waitlistRelease",
        refundAmountInPaise: 0,
        creditAmountInPaise: 0,
      }
    );
  }
);

test("quotePriceInPaise includes same-cohort waitlist demand", () => {
  assert.equal(
    quotePriceInPaise({
      policy: {
        ...policy("standard"),
        pricing: {
          basePriceInPaise: 25000,
          cohortAdjustmentsInPaise: {},
          demandPricingRules: [{
            pricedCohortId: cohortIds.menInterestedInWomen,
            balancingCohortId: cohortIds.womenInterestedInMen,
            stepAdjustmentInPaise: 10000,
            maxAdjustmentInPaise: 30000,
            freeSkew: 1,
            demandStep: 1,
          }],
        },
      },
      cohortId: cohortIds.menInterestedInWomen,
      roster: {
        bookedCountsByCohort: {
          [cohortIds.menInterestedInWomen]: 2,
          [cohortIds.womenInterestedInMen]: 2,
        },
        waitlistedCountsByCohort: {
          [cohortIds.menInterestedInWomen]: 3,
        },
        totalBooked: 4,
      },
    }),
    55000
  );
});

test("manual approval policy blocks direct signup until host approval", () => {
  const requestPolicy: EventPolicyBundleDocument = {
    ...policy("standard"),
    admission: {
      ...policy("standard").admission,
      format: "manualApproval",
      manualApprovalRequired: true,
      waitlistPolicy: {mode: "manualReview", offerWindowMinutes: 0},
    },
  };
  const roster = {
    bookedCountsByCohort: {},
    waitlistedCountsByCohort: {},
    totalBooked: 0,
  };

  assert.throws(
    () => assertPolicyAllowsSignup({
      policy: requestPolicy,
      cohortId: cohortIds.menInterestedInWomen,
      roster,
    }),
    /Request to join/
  );
  assert.doesNotThrow(() => assertPolicyAllowsSignup({
    policy: requestPolicy,
    cohortId: cohortIds.menInterestedInWomen,
    roster,
    hasHostApproval: true,
  }));
});

test("reserved pair capacity stays separate from general admission", () => {
  const pairPolicy: EventPolicyBundleDocument = {
    ...policy("standard"),
    admission: {
      ...policy("standard").admission,
      capacityLimit: 10,
      crossPathsPairInventory: {
        enabled: true,
        reservedPairCapacity: 2,
        holdDurationMinutes: 15,
      },
    },
  };
  const roster = {
    bookedCountsByCohort: {},
    waitlistedCountsByCohort: {},
    totalBooked: 8,
    crossPathsPairHeldCount: 0,
    crossPathsPairConfirmedCount: 0,
  };
  assert.throws(
    () => assertPolicyAllowsSignup({
      policy: pairPolicy,
      cohortId: cohortIds.menInterestedInWomen,
      roster,
    }),
    /General admission is full/
  );
  assert.doesNotThrow(() => assertPolicyAllowsSignup({
    policy: pairPolicy,
    cohortId: cohortIds.menInterestedInWomen,
    roster,
    admissionMode: "crossPathsPair",
  }));
  assert.throws(
    () => assertPolicyAllowsSignup({
      policy: pairPolicy,
      cohortId: cohortIds.menInterestedInWomen,
      roster: {
        ...roster,
        crossPathsPairHeldCount: 2,
        totalBooked: 10,
      },
      admissionMode: "crossPathsPair",
    }),
    /event is now full|pair spot is not available/
  );
});

function policy(
  policyId: EventPolicyBundleDocument["cancellation"]["policyId"]
): EventPolicyBundleDocument {
  return {
    version: 1,
    admission: {
      format: "open",
      capacityLimit: 20,
      waitlistPolicy: {mode: "rankedOffer", offerWindowMinutes: 20},
      inviteRequired: false,
      membershipRequired: false,
      manualApprovalRequired: false,
      privateAccessPolicy: {
        mode: "none",
        inviteCodeHint: null,
        privateLinkEnabled: false,
      },
      cohortCapacityLimits: {},
      balancedRatioPolicy: null,
    },
    pricing: {
      basePriceInPaise: 40000,
      cohortAdjustmentsInPaise: {},
      demandPricingRules: [],
    },
    cancellation: {policyId},
    settlement: {hostPayoutTiming: "afterEventCompletion"},
  };
}


test("membership does not waive per-event review or capacity", () => {
  const gated = policy("standard");
  gated.admission.membershipRequired = true;
  gated.admission.manualApprovalRequired = true;
  const roster = {
    totalBooked: 0,
    bookedCountsByCohort: {},
    waitlistedCountsByCohort: {},
  };
  assert.throws(
    () =>
      assertPolicyAllowsSignup({
        policy: gated,
        cohortId: "menInterestedInWomen",
        roster,
        hasActiveCommunityMembership: true,
      }),
    /Request to join/
  );
  assert.throws(
    () =>
      assertPolicyAllowsSignup({
        policy: gated,
        cohortId: "menInterestedInWomen",
        roster: {...roster, totalBooked: 20},
        hasActiveCommunityMembership: true,
        hasHostApproval: true,
      }),
    /now full/
  );
  gated.admission.membershipRequired = false;
  gated.admission.format = "membersOnly";
  assert.throws(
    () =>
      assertPolicyAllowsSignup({
        policy: gated,
        cohortId: "menInterestedInWomen",
        roster,
        hasHostApproval: true,
      }),
    /Approved community membership/
  );
});

test("typed decisions preserve membership and review precedence", () => {
  const gated = policy("standard");
  gated.admission.membershipRequired = true;
  gated.admission.manualApprovalRequired = true;
  const params = {policy: gated, cohortId: "menInterestedInWomen",
    roster: {totalBooked: 20, bookedCountsByCohort: {},
      waitlistedCountsByCohort: {}}};
  assert.deepEqual(signupPolicyDecision({...params, hasHostApproval: true}),
    {allowed: false, reason: "membershipRequired"});
  assert.deepEqual(signupPolicyDecision({...params,
    hasActiveCommunityMembership: true}),
  {allowed: false, reason: "reviewRequired"});
  assert.deepEqual(signupPolicyDecision({...params, hasHostApproval: true,
    hasActiveCommunityMembership: true}), {allowed: false, reason: "full"});
  assert.deepEqual(signupPolicyDecision({...params, hasHostApproval: true,
    hasActiveCommunityMembership: true,
    roster: {...params.roster, totalBooked: 0}}), {allowed: true});
});

test("grants cannot waive invite, cohort or balance restrictions", () => {
  const gated = policy("standard");
  gated.admission.membershipRequired = true;
  gated.admission.inviteRequired = true;
  const params = {policy: gated, cohortId: "menInterestedInWomen",
    hasActiveCommunityMembership: true,
    roster: {totalBooked: 2, bookedCountsByCohort: {menInterestedInWomen: 2},
      waitlistedCountsByCohort: {}}};
  assert.deepEqual(signupPolicyDecision(params),
    {allowed: false, reason: "inviteRequired"});
  gated.admission.cohortCapacityLimits = {menInterestedInWomen: 2};
  assert.deepEqual(signupPolicyDecision({...params, hasValidInvite: true}),
    {allowed: false, reason: "cohortCapacityUnavailable"});
  gated.admission.cohortCapacityLimits = {};
  gated.admission.format = "balancedRatio";
  gated.admission.balancedRatioPolicy = {leftCohortId: "menInterestedInWomen",
    rightCohortId: "womenInterestedInMen", maxSkew: 1,
    openingBufferPerCohort: 1, outOfRatioCohortPolicy: "manualReview"};
  assert.deepEqual(signupPolicyDecision({...params, hasValidInvite: true}),
    {allowed: false, reason: "balanceUnavailable"});
});


test("member review exemption retains other admission gates", () => {
  const gated = policy("standard");
  gated.admission.manualApprovalRequired = true;
  gated.admission.approvedMembersSkipReview = true;
  const input = {policy: gated, cohortId: "menInterestedInWomen",
    roster: {totalBooked: 0, bookedCountsByCohort: {},
      waitlistedCountsByCohort: {}}};
  assert.deepEqual(signupPolicyDecision(input),
    {allowed: false, reason: "reviewRequired"});
  const member = {...input, hasActiveCommunityMembership: true};
  assert.deepEqual(signupPolicyDecision(member), {allowed: true});
  assert.deepEqual(signupPolicyDecision({...member,
    roster: {...input.roster, totalBooked: 20}}),
  {allowed: false, reason: "full"});
  gated.admission.inviteRequired = true;
  assert.deepEqual(signupPolicyDecision(member),
    {allowed: false, reason: "inviteRequired"});
  gated.admission.inviteRequired = false;
  gated.admission.cohortCapacityLimits = {menInterestedInWomen: 0};
  assert.deepEqual(signupPolicyDecision(member),
    {allowed: false, reason: "cohortCapacityUnavailable"});
});
