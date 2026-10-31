import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {signUpForFreeEventHandler} from "./signUpForFreeEvent";
import type {HostMembershipContext} from
  "../hostMemberships/entitlementReader";

test(
  "signUpForFreeEventHandler books a free event through shared signer",
  async () => {
    const signUpCalls: SignUpCall[] = [];
    const rateLimitCalls: Array<{uid: string; action: string}> = [];

    const result = await signUpForFreeEventHandler(
      request("runner-1", {eventId: " event-1 "}),
      deps({
        events: {
          "event-1": {
            priceInPaise: 0,
          },
        },
        signUpCalls,
        rateLimitCalls,
      })
    );

    assert.deepEqual(result, {success: true});
    assert.deepEqual(rateLimitCalls, [
      {uid: "runner-1", action: "signUpForFreeEvent"},
    ]);
    assert.deepEqual(signUpCalls, [{
      eventId: "event-1",
      userId: "runner-1",
      options: {hasValidInvite: true},
    }]);
  }
);

test("signUpForFreeEventHandler enforces invite-only access", async () => {
  const event = {
    priceInPaise: 0,
    capacityLimit: 12,
    bookedCount: 0,
    genderCounts: {},
    cohortCounts: {},
    waitlistedCohortCounts: {},
    constraints: {minAge: 0, maxAge: 99},
    eventPolicy: inviteOnlyPolicy(),
  };

  await assert.rejects(
    () => signUpForFreeEventHandler(
      request("runner-1", {eventId: "event-1"}),
      deps({
        events: {"event-1": event},
        eventPrivateAccess: {
          "event-1": {inviteCode: "CATCH-DELHI"},
        },
      })
    ),
    isHttpsError(
      "failed-precondition",
      "Enter a valid invite code to book this event."
    )
  );

  await assert.rejects(
    () => signUpForFreeEventHandler(
      request("runner-1", {
        eventId: "event-1",
        inviteCode: "wrong-code",
      }),
      deps({
        events: {"event-1": event},
        eventPrivateAccess: {
          "event-1": {inviteCode: "CATCH-DELHI"},
        },
      })
    ),
    isHttpsError(
      "failed-precondition",
      "Enter a valid invite code to book this event."
    )
  );

  const signUpCalls: SignUpCall[] = [];
  const result = await signUpForFreeEventHandler(
    request("runner-1", {
      eventId: "event-1",
      inviteCode: " catch-delhi ",
    }),
    deps({
      events: {"event-1": event},
      eventPrivateAccess: {
        "event-1": {inviteCode: "CATCH-DELHI"},
      },
      signUpCalls,
    })
  );

  assert.deepEqual(result, {success: true});
  assert.deepEqual(signUpCalls, [{
    eventId: "event-1",
    userId: "runner-1",
    options: {hasValidInvite: true},
  }]);
});

test("signUpForFreeEventHandler rejects paid events", async () => {
  await assert.rejects(
    () => signUpForFreeEventHandler(
      request("runner-1", {eventId: "event-1"}),
      deps({
        events: {
          "event-1": {
            priceInPaise: 10000,
          },
        },
      })
    ),
    isHttpsError(
      "permission-denied",
      "This event requires payment. Use the payment flow instead."
    )
  );
});

test("private or missing-price setup cannot enter free signup", async () => {
  for (const [candidate, message] of [
    [{publicationState: "private", setupRevision: 1},
      "This event is not open for public booking."],
    [{priceInPaise: undefined}, "This event is not ready for booking."],
    [{capacityLimit: undefined}, "This event is not ready for booking."],
  ] as const) {
    let signedUp = false;
    await assert.rejects(signUpForFreeEventHandler(
      request("runner-1", {eventId: "event-1"}),
      {
        ...deps({events: {"event-1": candidate}}),
        signUpForEvent: async () => {
          signedUp = true;
        },
      }
    ), isHttpsError("failed-precondition", message));
    assert.equal(signedUp, false);
  }
});

test(
  "signUpForFreeEventHandler requires host approval for request events",
  async () => {
    const event = {
      priceInPaise: 0,
      capacityLimit: 12,
      bookedCount: 0,
      genderCounts: {},
      cohortCounts: {},
      waitlistedCohortCounts: {},
      constraints: {minAge: 0, maxAge: 99},
      eventPolicy: manualApprovalPolicy(),
    };

    await assert.rejects(
      () => signUpForFreeEventHandler(
        request("runner-1", {eventId: "event-1"}),
        deps({events: {"event-1": event}})
      ),
      isHttpsError(
        "failed-precondition",
        "Request to join this event before booking."
      )
    );

    const signUpCalls: SignUpCall[] = [];
    const result = await signUpForFreeEventHandler(
      request("runner-1", {eventId: "event-1"}),
      deps({
        events: {"event-1": event},
        eventParticipations: {
          "event-1_runner-1": {hostApprovalStatus: "approved"},
        },
        signUpCalls,
      })
    );

    assert.deepEqual(result, {success: true});
    assert.deepEqual(signUpCalls, [{
      eventId: "event-1",
      userId: "runner-1",
      options: {hasValidInvite: true, hasHostApproval: true},
    }]);
  }
);

test("signUpForFreeEventHandler rate limits before reading events", async (
) => {
  let readCount = 0;

  await assert.rejects(
    () => signUpForFreeEventHandler(
      request("runner-1", {eventId: "event-1"}),
      deps({
        onEventRead: () => {
          readCount += 1;
        },
        checkRateLimit: async () => {
          throw new HttpsError(
            "resource-exhausted",
            "Too many free event sign-up attempts."
          );
        },
      })
    ),
    isHttpsError(
      "resource-exhausted",
      "Too many free event sign-up attempts."
    )
  );

  assert.equal(readCount, 0);
});

function request(
  uid: string | null,
  data: Record<string, unknown>
): CallableRequest<unknown> {
  return {
    auth: uid ? {uid, token: {}} as CallableRequest["auth"] : undefined,
    data,
    rawRequest: {} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

function deps({
  events = {},
  users = {
    "runner-1": {
      gender: "man",
      interestedInGenders: ["woman"],
    },
  },
  eventPrivateAccess = {},
  eventParticipations = {},
  signUpCalls = [],
  rateLimitCalls = [],
  onEventRead,
  checkRateLimit,
  membershipContext,
  benefitUses = [],
}: {
  events?: Record<string, Record<string, unknown>>;
  users?: Record<string, Record<string, unknown>>;
  eventPrivateAccess?: Record<string, Record<string, unknown>>;
  eventParticipations?: Record<string, Record<string, unknown>>;
  signUpCalls?: SignUpCall[];
  rateLimitCalls?: Array<{uid: string; action: string}>;
  onEventRead?: () => void;
  membershipContext?: HostMembershipContext;
  benefitUses?: Array<{id: string; data: unknown}>;
  checkRateLimit?: (
    db: FirebaseFirestore.Firestore,
    uid: string,
    action: string
  ) => Promise<void>;
}) {
  const allowedCollections = [
    "events",
    "users",
    "eventPrivateAccess",
    "eventParticipations",
    "eventWaitlistOffers",
    "hostMembershipBenefitUses",
  ];
  const firestore = {
    collection: (path: string) => {
      assert.ok(allowedCollections.includes(path), path);
      if (path === "hostMembershipBenefitUses") {
        return {doc: (id: string) => ({set: async (data: unknown) => {
          benefitUses.push({id, data});
        }})};
      }
      if (path === "eventWaitlistOffers") {
        return {
          where: () => ({
            where: () => ({
              get: async () => ({docs: [], empty: true}),
            }),
          }),
        };
      }
      return {
        doc: (id: string) => ({
          get: async () => {
            if (path === "events") onEventRead?.();
            const data = path === "events" ?
              events[id] && {...configuredEventFixture(), ...events[id]} :
              path === "users" ?
                users[id] :
                path === "eventPrivateAccess" ?
                  eventPrivateAccess[id] :
                  eventParticipations[id];
            return {
              exists: data !== undefined,
              data: () => data,
            };
          },
        }),
      };
    },
  } as unknown as FirebaseFirestore.Firestore;

  return {
    firestore: () => firestore,
    checkRateLimit: checkRateLimit ?? (async (_db, uid, action) => {
      rateLimitCalls.push({uid, action});
    }),
    signUpForEvent: async (
      _db: FirebaseFirestore.Firestore,
      eventId: string,
      userId: string,
      _paymentId?: string,
      options?: {hasValidInvite?: boolean; hasHostApproval?: boolean}
    ) => {
      signUpCalls.push({eventId, userId, options});
    },
    readMembershipContext: async () => membershipContext ??
      emptyMembershipContext(),
    nowMillis: () => 500,
  };
}

function emptyMembershipContext(): HostMembershipContext {
  return {membershipId: "hm_" + "0".repeat(64), rules: null, membership: null,
    plan: null, publishedPlans: [], upcomingMemberPricedBookings: 0};
}

function configuredEventFixture(): Record<string, unknown> {
  const time = (millis: number) => ({toMillis: () => millis});
  return {
    organizerId: "club-1",
    startTime: time(1_000),
    endTime: time(2_000),
    meetingPoint: "Park gate",
    meetingLocation: {name: "Park", latitude: 19, longitude: 72},
    eventFormat: {
      version: 1,
      activityKind: "running",
      interactionModel: "pacePods",
    },
    capacityLimit: 20,
    priceInPaise: 0,
  };
}

interface SignUpCall {
  eventId: string;
  userId: string;
  options?: {hasValidInvite?: boolean; hasHostApproval?: boolean};
}

function inviteOnlyPolicy() {
  return {
    version: 1,
    admission: {
      format: "inviteOnly",
      capacityLimit: 12,
      waitlistPolicy: {mode: "rankedOffer", offerWindowMinutes: 20},
      inviteRequired: true,
      membershipRequired: false,
      manualApprovalRequired: false,
      privateAccessPolicy: {
        mode: "inviteCode",
        inviteCodeHint: "CA...HI",
        privateLinkEnabled: true,
      },
      cohortCapacityLimits: {},
      balancedRatioPolicy: null,
    },
    pricing: {
      basePriceInPaise: 0,
      cohortAdjustmentsInPaise: {},
      demandPricingRules: [],
    },
    cancellation: {policyId: "standard"},
    settlement: {hostPayoutTiming: "afterEventCompletion"},
  };
}

function manualApprovalPolicy() {
  return {
    version: 1,
    admission: {
      format: "manualApproval",
      capacityLimit: 12,
      waitlistPolicy: {mode: "rankedOffer", offerWindowMinutes: 20},
      inviteRequired: false,
      membershipRequired: false,
      manualApprovalRequired: true,
      privateAccessPolicy: {
        mode: "none",
        inviteCodeHint: null,
        privateLinkEnabled: false,
      },
      cohortCapacityLimits: {},
      balancedRatioPolicy: null,
    },
    pricing: {
      basePriceInPaise: 0,
      cohortAdjustmentsInPaise: {},
      demandPricingRules: [],
    },
    cancellation: {policyId: "standard"},
    settlement: {hostPayoutTiming: "afterEventCompletion"},
  };
}

function isHttpsError(expectedCode: string, expectedMessage: string) {
  return (error: unknown) =>
    error instanceof HttpsError &&
    error.code === expectedCode &&
    error.message === expectedMessage;
}

function memberContext(overrides: Partial<HostMembershipContext> = {}):
  HostMembershipContext {
  const plan = {planId: "hmp_AbCdEfGhIjKlMnOpQrSt", name: "Sunday Runners",
    status: "published" as const,
    prices: {monthly: {amountPaise: 49900, providerPriceIds: {},
      revision: 1}},
    memberCap: null, activeMemberCount: 1,
    benefits: [{type: "eventDiscount" as const, percentOff: 100},
      {type: "membersOnlyAccess" as const}],
    limits: {maxUpcomingMemberPricedBookings: null}};
  return {...emptyMembershipContext(), plan, publishedPlans: [plan],
    membership: {schemaVersion: 1, organizerId: "club-1", uid: "runner-1",
      planId: plan.planId, planName: plan.name, interval: "monthly",
      status: "active", statusReason: null, priceInPaise: 49900,
      currency: "INR", currentPeriodStartMillis: 0,
      currentPeriodEndMillis: 10_000, trialEndsAtMillis: null,
      cancelAtPeriodEnd: false, pause: null, pastDueSinceMillis: null,
      memberSinceMillis: 0,
      tenure: {accumulatedMillis: 0, stretchStartedAtMillis: 0},
      provider: "razorpay", providerSubscriptionId: "sub_TestSub1",
      providerPlanId: "plan_TestPlan1", providerEventAtMillis: 0,
      lastCheckoutId: "hmc_AbCdEfGhIjKlMnOpQrSt", revision: 1,
      createdAtMillis: 1, updatedAtMillis: 1},
    ...overrides};
}

test("an included member books a paid event through the free path",
  async () => {
    const signUpCalls: SignUpCall[] = [];
    const benefitUses: Array<{id: string; data: unknown}> = [];
    await signUpForFreeEventHandler(request("runner-1", {eventId: "event-1"}),
      deps({events: {"event-1": {priceInPaise: 50_000}}, signUpCalls,
        benefitUses, membershipContext: memberContext()}));
    assert.equal(signUpCalls.length, 1);
    assert.equal(benefitUses.length, 1);
    assert.equal(benefitUses[0].id, "event-1_runner-1");
    const use = benefitUses[0].data as Record<string, unknown>;
    assert.equal(use.listPriceInPaise, 50_000);
    assert.equal(use.paidPriceInPaise, 0);
    assert.equal(use.savingsInPaise, 50_000);
    assert.equal(use.state, "booked");
  });

test("a non-member cannot book a paid event for free or a members-only one",
  async () => {
    await assert.rejects(signUpForFreeEventHandler(
      request("runner-1", {eventId: "event-1"}),
      deps({events: {"event-1": {priceInPaise: 50_000}}})),
    /requires payment/);
    const signUpCalls: SignUpCall[] = [];
    const context = memberContext({membership: null,
      rules: {schemaVersion: 1, organizerId: "club-1", eventId: "event-1",
        memberPriceOverrides: [], earlyAccess: null, membersOnly: true,
        revision: 1, updatedAtMillis: 1, updatedBy: "host-1"}});
    await assert.rejects(signUpForFreeEventHandler(
      request("runner-1", {eventId: "event-1"}),
      deps({events: {"event-1": {}}, signUpCalls, membershipContext: context})),
    /members only/);
    assert.equal(signUpCalls.length, 0);
  });
