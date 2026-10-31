import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {HttpsError} from "firebase-functions/v2/https";
import {
  catchSpendProjection,
  eventRelativeAttendanceInsight,
  getEventRosterInsightsHandler,
  shouldExposeAttendanceInsight,
  withMemberSignal,
} from "./eventRosterInsights";
import type {
  OrganizerContactEventEdgeDocument,
  PaymentDocument,
} from "../shared/generated/firestoreAdminTypes";

class TestTimestamp {
  constructor(private readonly millis: number) {}

  toMillis(): number {
    return this.millis;
  }
}

function timestamp(millis: number): FirebaseFirestore.Timestamp {
  return new TestTimestamp(millis) as unknown as FirebaseFirestore.Timestamp;
}

const day = 24 * 60 * 60 * 1000;
const cutoff = 200 * day;

class FakeSnapshot {
  constructor(
    readonly id: string,
    private readonly value: Record<string, unknown> | undefined
  ) {}

  get exists(): boolean {
    return this.value !== undefined;
  }

  data(): Record<string, unknown> | undefined {
    return this.value;
  }
}

class FakeFirestore {
  constructor(private readonly docs: Record<
    string,
    Record<string, unknown> | undefined
  >) {}

  collection(path: string) {
    return {
      doc: (id: string) => ({
        get: async () => new FakeSnapshot(id, this.docs[`${path}/${id}`]),
      }),
    };
  }
}

function edge(overrides: Partial<OrganizerContactEventEdgeDocument> = {}):
OrganizerContactEventEdgeDocument {
  return {
    organizerId: "organizer-1",
    contactId: "contact-1",
    originContactId: "contact-1",
    eventId: "event-prior",
    attendeeId: "attendee-prior",
    displayName: "Asha",
    linkedUid: "user-1",
    phoneE164: null,
    email: null,
    source: "catchBooking",
    status: "checkedIn",
    expected: true,
    registered: true,
    cancelled: false,
    checkedIn: true,
    eventStartAt: timestamp(100 * day),
    eventEndAt: timestamp(101 * day),
    registeredAt: timestamp(90 * day),
    cancelledAt: null,
    checkedInAt: timestamp(100 * day),
    sourceCreatedAt: timestamp(90 * day),
    sourceUpdatedAt: timestamp(100 * day),
    revision: 1,
    createdAt: timestamp(90 * day),
    updatedAt: timestamp(100 * day),
    ...overrides,
  };
}

function payment(overrides: Partial<PaymentDocument> = {}): PaymentDocument {
  return {
    userId: "user-1",
    orderId: "order-1",
    paymentId: "payment-1",
    eventId: "event-1",
    amount: 1000,
    amountMinor: 1000,
    currency: "INR",
    status: "completed",
    signUpFailed: false,
    createdAt: timestamp(10 * day),
    ...overrides,
  };
}

test(
  "event-relative labels exclude the current event around check-in",
  () => {
    const currentBefore = edge({
      eventId: "event-current",
      attendeeId: "attendee-current",
      status: "registered",
      checkedIn: false,
      checkedInAt: null,
      eventStartAt: timestamp(cutoff),
      eventEndAt: timestamp(cutoff + day),
    });
    const currentAfter = edge({
      ...currentBefore,
      status: "checkedIn",
      checkedIn: true,
      checkedInAt: timestamp(cutoff + 1000),
    });
    const before = eventRelativeAttendanceInsight([currentBefore], cutoff);
    const after = eventRelativeAttendanceInsight([currentAfter], cutoff);

    assert.deepEqual(before, after);
    assert.deepEqual(before.signals, ["first_time"]);
    assert.equal(before.priorAttendedEventCount, 0);
  }
);

test("event-relative labels explain retention and no-show risk", () => {
  const insight = eventRelativeAttendanceInsight([
    edge({
      eventId: "attended-1",
      attendeeId: "a-1",
      checkedInAt: timestamp(20 * day),
    }),
    edge({
      eventId: "attended-2",
      attendeeId: "a-2",
      checkedInAt: timestamp(30 * day),
    }),
    edge({
      eventId: "missed-1",
      attendeeId: "m-1",
      status: "registered",
      checkedIn: false,
      checkedInAt: null,
      eventStartAt: timestamp(40 * day),
      eventEndAt: timestamp(41 * day),
    }),
    edge({
      eventId: "missed-2",
      attendeeId: "m-2",
      status: "registered",
      checkedIn: false,
      checkedInAt: null,
      eventStartAt: timestamp(50 * day),
      eventEndAt: timestamp(51 * day),
    }),
  ], cutoff);

  assert.equal(insight.priorAttendedEventCount, 2);
  assert.equal(insight.priorExpectedEventCount, 4);
  assert.equal(insight.priorNoShowCount, 2);
  assert.ok(insight.signals.includes("returning"));
  assert.ok(insight.signals.includes("re_engaging"));
  assert.ok(insight.signals.includes("needs_confirmation"));
  assert.ok(!insight.signals.includes("reliable"));
});

test("Catch spend excludes non-authoritative payment states", () => {
  const projection = catchSpendProjection([
    payment(),
    payment({paymentId: "payment-2", orderId: "order-2", amount: 1500,
      amountMinor: 1500}),
    payment({paymentId: "refund", orderId: "refund", status: "refunded",
      amount: 9000, amountMinor: 9000}),
    payment({paymentId: "failed", orderId: "failed", status: "completed",
      signUpFailed: true, amount: 9000, amountMinor: 9000}),
    payment({
      paymentId: "late",
      orderId: "late",
      completedAt: timestamp(cutoff + 1),
      amount: 9000, amountMinor: 9000}),
  ], cutoff);

  assert.deepEqual(projection.byUid.get("user-1"), [{
    currency: "INR",
    amountMinor: 2500,
    paidOrderCount: 2,
  }]);
});

test("top Catch spender uses the eligible top quartile", () => {
  const payments: PaymentDocument[] = [];
  for (const [index, total] of [1000, 2000, 3000, 4000].entries()) {
    for (let order = 0; order < 2; order += 1) {
      payments.push(payment({
        userId: `user-${index + 1}`,
        orderId: `order-${index}-${order}`,
        paymentId: `payment-${index}-${order}`,
        amount: total / 2,
        amountMinor: total / 2,
      }));
    }
  }
  const projection = catchSpendProjection(payments, cutoff);
  assert.deepEqual(
    [...projection.topUidsByCurrency.get("INR") ?? []],
    ["user-4"]
  );
});

test("single imported identities stay unlabeled", () => {
  assert.equal(shouldExposeAttendanceInsight({
    identityState: "unlinked",
    sourceCount: 1,
  }), false);
  assert.equal(shouldExposeAttendanceInsight({
    identityState: "verified",
    sourceCount: 1,
  }), true);
  assert.equal(shouldExposeAttendanceInsight({
    identityState: "unlinked",
    sourceCount: 2,
  }), true);
  assert.equal(shouldExposeAttendanceInsight({
    identityState: "ambiguous",
    sourceCount: 4,
  }), false);
});

test("the callable denies organizer staff without management authority",
  async () => {
    const firestore = new FakeFirestore({
      "events/event-1": {
        organizerId: "organizer-1",
        startTime: timestamp(cutoff),
      },
      "organizers/organizer-1": {
        hostUserId: "owner-1",
        ownerUserId: "owner-1",
        hostUserIds: ["owner-1"],
        hostProfiles: [],
      },
    });

    await assert.rejects(
      getEventRosterInsightsHandler({
        auth: {uid: "operator-1", token: {}} as CallableRequest["auth"],
        data: {eventId: "event-1"},
        rawRequest: {headers: {}} as CallableRequest["rawRequest"],
      } as CallableRequest<unknown>, {
        firestore: () =>
          firestore as unknown as FirebaseFirestore.Firestore,
        checkRateLimit: async () => undefined,
        timestamp: () => timestamp(cutoff),
      }),
      (error) => error instanceof HttpsError &&
        error.code === "permission-denied"
    );
  });

test("paid members are badged even before attendance history", () => {
  const row = {attendeeId: "attendee-1", contactId: "contact-1",
    availability: "insufficientHistory" as const, signals: [],
    priorAttendedEventCount: 0, priorExpectedEventCount: 0,
    priorNoShowCount: 0, lastAttendedAtMillis: null, attendanceRate: null,
    catchSpend: []};
  const traits = new Map([["contact-1", {segmentIds: ["active_member"]}]]) as
    unknown as Parameters<typeof withMemberSignal>[1];
  const contact = (identityState: string) => new Map([["contact-1",
    {id: "contact-1", data: {identityState}}]]) as
    unknown as Parameters<typeof withMemberSignal>[2];
  assert.deepEqual(withMemberSignal(row, traits, contact("verified")).signals,
    ["member"]);
  assert.deepEqual(withMemberSignal(row, traits, contact("ambiguous"))
    .signals, []);
  assert.deepEqual(withMemberSignal({...row, availability:
    "projectionPending"}, traits, contact("verified")).signals, []);
  assert.deepEqual(withMemberSignal(row, new Map() as typeof traits,
    contact("verified")).signals, []);
});
