import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  EventDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  buildOrderCreatePayload,
  buildPaymentRecord,
  verifyPaidEventBooking,
} from "./paymentValidation";

function buildEventDoc(overrides: Partial<EventDocument> = {}): EventDocument {
  return {
    organizerId: "club-1",
    startTime: {toMillis: () => 1_000} as FirebaseFirestore.Timestamp,
    endTime: {toMillis: () => 2_000} as FirebaseFirestore.Timestamp,
    meetingPoint: "Carter Road",
    meetingLocation: {
      name: "Carter Road",
      address: null,
      placeId: null,
      latitude: 19.07,
      longitude: 72.82,
      notes: null,
    },
    startingPointLat: 19.07,
    startingPointLng: 72.82,
    locationDetails: null,
    eventFormat: {
      version: 1,
      activityKind: "socialRun",
      interactionModel: "pacePods",
      defaultPlaybookId: "social_run_light",
    },
    distanceKm: 5,
    pace: "easy",
    capacityLimit: 20,
    description: "Easy paced seaside event.",
    priceInPaise: 25000,
    currency: "INR",
    bookedCount: 0,
    checkedInCount: 0,
    waitlistedCount: 0,
    status: "active",
    cancelledAt: null,
    cancellationReason: null,
    constraints: {
      minAge: 0,
      maxAge: 99,
    },
    genderCounts: {},
    cohortCounts: {},
    waitlistedCohortCounts: {},
    discoveryCityName: "mumbai",
    discoveryMarketId: "in-mh-mumbai",
    discoveryActivityKind: "socialRun",
    discoveryGeoCell: "238:910",
    discoveryHasOpenSpots: true,
    discoveryAvailability: "open",
    discoveryOpenCohorts: [],
    discoveryWaitlistCohorts: [],
    discoveryInviteRequired: false,
    discoveryMembershipRequired: false,
    discoveryManualApprovalRequired: false,
    discoveryMinAge: 0,
    discoveryMaxAge: 99,
    ...overrides,
  };
}

test("buildOrderCreatePayload derives trusted amount and notes", () => {
  const payload = buildOrderCreatePayload({
    eventId: "event-1",
    event: buildEventDoc(),
    userId: "runner-1",
    receiptToken: 123,
  });

  assert.deepEqual(payload, {
    amount: 25000,
    currency: "INR",
    receipt: "event_event-1_123",
    notes: {
      eventId: "event-1",
      userId: "runner-1",
      quotedAmountInPaise: 25000,
      inviteVerified: "false",
    },
  });
});

test("order receipts fit Razorpay's 40-character contract for long event ids",
  () => {
    const inputs = {
      eventId: "cat151-prod-test-20261016-schema-acceptance",
      event: buildEventDoc(),
      userId: "cross_paths_mumbai_qa_user_002",
      receiptToken: 1792165900000,
      inviteVerified: true,
    };
    const payload = buildOrderCreatePayload(inputs);
    assert.ok(payload.receipt.length <= 40);
    assert.match(payload.receipt, /^[a-zA-Z0-9_-]+$/);
    assert.equal(payload.amount, 25000);
    assert.equal(payload.notes.eventId, inputs.eventId);
    assert.equal(payload.notes.userId, inputs.userId);
    assert.equal(payload.notes.inviteVerified, "true");
    assert.equal(buildOrderCreatePayload(inputs).receipt, payload.receipt);
    for (const changed of [
      {eventId: inputs.eventId + "-other"},
      {userId: inputs.userId + "-other"},
      {receiptToken: inputs.receiptToken + 1},
    ]) {
      assert.notEqual(buildOrderCreatePayload({...inputs, ...changed}).receipt,
        payload.receipt);
    }
  });

test("order receipts bound Unicode and long tokens at the boundary",
  () => {
    const inputs = {event: buildEventDoc(), userId: "runner-1",
      receiptToken: 123};
    const boundaryId = "e".repeat(30);
    assert.equal(
      buildOrderCreatePayload({...inputs, eventId: boundaryId}).receipt,
      `event_${boundaryId}_123`
    );
    for (const [eventId, receiptToken] of [
      [boundaryId + "x", 123],
      ["é".repeat(30), 123],
      ["event-1", "token".repeat(100)],
    ] as const) {
      const payload = buildOrderCreatePayload({
        ...inputs, eventId, receiptToken,
      });
      assert.ok(Buffer.byteLength(payload.receipt, "utf8") <= 40);
      assert.match(payload.receipt, /^[a-zA-Z0-9_-]+$/);
      assert.equal(payload.notes.eventId, eventId);
    }
    const prefix = "same-prefix-".repeat(10);
    assert.notEqual(
      buildOrderCreatePayload({...inputs, eventId: prefix + "a"}).receipt,
      buildOrderCreatePayload({...inputs, eventId: prefix + "b"}).receipt
    );
  });

test("buildOrderCreatePayload records verified invite orders", () => {
  const payload = buildOrderCreatePayload({
    eventId: "event-1",
    event: buildEventDoc(),
    userId: "runner-1",
    receiptToken: 123,
    inviteVerified: true,
  });

  assert.equal(payload.notes.inviteVerified, "true");
});

test("buildOrderCreatePayload rejects free events", () => {
  assert.throws(
    () =>
      buildOrderCreatePayload({
        eventId: "event-1",
        event: buildEventDoc({priceInPaise: 0}),
        userId: "runner-1",
        receiptToken: 123,
      }),
    isHttpsError("invalid-argument", "Event price must be a positive integer.")
  );
});

test(
  "buildOrderCreatePayload rejects non-INR paid events until a provider exists",
  () => {
    assert.throws(
      () =>
        buildOrderCreatePayload({
          eventId: "event-1",
          event: buildEventDoc({currency: "AUD"}),
          userId: "runner-1",
          receiptToken: 123,
        }),
      isHttpsError(
        "failed-precondition",
        "Paid bookings are not available for this event currency yet."
      )
    );
  }
);

test("buildOrderCreatePayload rejects cancelled events", () => {
  assert.throws(
    () =>
      buildOrderCreatePayload({
        eventId: "event-1",
        event: buildEventDoc({status: "cancelled"}),
        userId: "runner-1",
        receiptToken: 123,
      }),
    isHttpsError("failed-precondition", "This event has been cancelled.")
  );
});

test(
  "verifyPaidEventBooking returns booking details from trusted Razorpay data",
  () => {
    const booking = verifyPaidEventBooking({
      order: {
        id: "order_123",
        amount: 25000,
        currency: "INR",
        amount_paid: 25000,
        amount_due: 0,
        notes: {
          eventId: "event-1",
          userId: "runner-1",
          inviteVerified: "true",
          inviteLinkId: "link-1",
          inviteSource: "instagram-bio",
        },
      },
      payment: {
        id: "pay_123",
        order_id: "order_123",
        amount: 25000,
        currency: "INR",
        status: "captured",
        refund_status: "null",
      },
      expectedUserId: "runner-1",
    });

    assert.deepEqual(booking, {
      eventId: "event-1",
      userId: "runner-1",
      amountInPaise: 25000,
      currency: "INR",
      inviteVerified: true,
      inviteLinkId: "link-1",
      inviteSource: "instagram-bio",
    });
  }
);

test(
  "verifyPaidEventBooking rejects mismatched users and refunded payments",
  () => {
    assert.throws(
      () =>
        verifyPaidEventBooking({
          order: {
            id: "order_123",
            amount: 25000,
            currency: "INR",
            amount_paid: 25000,
            amount_due: 0,
            notes: {
              eventId: "event-1",
              userId: "runner-2",
            },
          },
          payment: {
            id: "pay_123",
            order_id: "order_123",
            amount: 25000,
            currency: "INR",
            status: "captured",
            refund_status: "null",
          },
          expectedUserId: "runner-1",
        }),
      isHttpsError(
        "permission-denied",
        "This order does not belong to the signed-in user."
      )
    );

    assert.throws(
      () =>
        verifyPaidEventBooking({
          order: {
            id: "order_123",
            amount: 25000,
            currency: "INR",
            amount_paid: 25000,
            amount_due: 0,
            notes: {
              eventId: "event-1",
              userId: "runner-1",
            },
          },
          payment: {
            id: "pay_123",
            order_id: "order_123",
            amount: 25000,
            currency: "INR",
            status: "captured",
            refund_status: "full",
            amount_refunded: 25000,
          },
          expectedUserId: "runner-1",
        }),
      isHttpsError(
        "failed-precondition",
        "Refunded payments cannot be used for booking."
      )
    );
  }
);

test("buildPaymentRecord always writes signUpFailed explicitly", () => {
  assert.deepEqual(
    buildPaymentRecord({
      userId: "runner-1",
      orderId: "order_123",
      paymentId: "pay_123",
      eventId: "event-1",
      amountInPaise: 25000,
      currency: "INR",
      status: "completed",
    }),
    {
      userId: "runner-1",
      orderId: "order_123",
      paymentId: "pay_123",
      eventId: "event-1",
      amount: 25000,
      amountMinor: 25000,
      currency: "INR",
      provider: "razorpay",
      status: "completed",
      signUpFailed: false,
    }
  );
});

function isHttpsError(expectedCode: string, expectedMessage: string) {
  return (error: unknown) =>
    error instanceof HttpsError &&
    error.code === expectedCode &&
    error.message === expectedMessage;
}


test("authorization alone cannot admit a paid booking", () => {
  assert.throws(() => verifyPaidEventBooking({
    order: {id: "order_one", amount: 1000, currency: "INR",
      amount_paid: 1000, amount_due: 0,
      notes: {eventId: "event1", userId: "user1"}},
    payment: {id: "pay_one", order_id: "order_one", amount: 1000,
      currency: "INR", status: "authorized"}, expectedUserId: "user1",
  }), /successful state/);
});
