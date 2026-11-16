import {prepareNativePaidBooking} from "./nativeBooking";
import assert from "node:assert/strict";
import test from "node:test";
import {fulfillRazorpayPayment} from "./razorpayFulfillment";
import {VerifiedPaymentBooking} from "./paymentValidation";

const booking: VerifiedPaymentBooking = {
  eventId: "evt-1",
  userId: "user-1",
  amountInPaise: 25000,
  currency: "INR",
  inviteVerified: false,
  inviteLinkId: "link-1",
  inviteSource: "instagram",
};

test(
  "fulfillRazorpayPayment completes and bumps paidCount exactly once",
  async () => {
    // The payment doc is empty on the pre-signup read AND inside the completion
    // transaction: the clean, uncontended fulfillment path.
    const fake = createFulfillmentFirestore({
      statusByGet: () => undefined,
    });
    let signUpCalls = 0;

    const result = await fulfillRazorpayPayment({
      db: fake.db,
      orderId: "order-1",
      paymentId: "pay-1",
      booking,
      deps: {
        signUpForEvent: async (db, eventId, userId, paymentId, options) => {
          signUpCalls += 1;
          await db.runTransaction(async (tx) => {
            (await prepareNativePaidBooking({db, tx, eventId, userId,
              paymentId, booking: options!.paidBooking!}))();
          });
        },
        serverTimestamp: () => "server-now",
      },
    });

    assert.deepEqual(result, {fulfilled: true, alreadyFinalized: false});
    assert.equal(signUpCalls, 1);
    // Exactly one completed write and exactly one paidCount increment.
    assert.equal(fake.paymentSetCalls.length, 1);
    assert.equal(fake.paymentSetCalls[0].status, "completed");
    assert.ok(fake.paymentSetCalls[0].completedAt);
    assert.equal(fake.inviteLinkSetCalls.length, 1);
    assert.equal(fake.inviteLinkSetCalls[0].docId, "link-1");
    assert.ok("paidCount" in fake.inviteLinkSetCalls[0].data);
    // The tracking doc is cleaned up once fulfillment lands.
  }
);

test(
  "fulfillRazorpayPayment does not double-increment paidCount when a " +
    "concurrent caller finalizes between the pre-signup read and the " +
    "completion transaction",
  async () => {
    // Pre-signup read (get #1) sees a non-terminal doc, so this caller proceeds
    // past the early idempotency gate — exactly as the client callback, the
    // webhook, and the reconciliation sweep all can when they race. But by the
    // time the completion transaction re-reads the doc (get #2), a concurrent
    // caller has already flipped it to "completed". The in-transaction guard
    // must then skip BOTH the completed write and the paidCount increment, so
    // the counter is never double-bumped.
    const fake = createFulfillmentFirestore({
      statusByGet: (getCount) => (getCount >= 2 ? "completed" : undefined),
    });
    let signUpCalls = 0;

    const result = await fulfillRazorpayPayment({
      db: fake.db,
      orderId: "order-1",
      paymentId: "pay-1",
      booking,
      deps: {
        signUpForEvent: async (db, eventId, userId, paymentId, options) => {
          signUpCalls += 1;
          await db.runTransaction(async (tx) => {
            (await prepareNativePaidBooking({db, tx, eventId, userId,
              paymentId, booking: options!.paidBooking!}))();
          });
        },
        serverTimestamp: () => "server-now",
      },
    });

    // signUp still runs (it is idempotent via its own participation guard), but
    // no second completed write and no second paidCount increment occur.
    assert.equal(signUpCalls, 1);
    assert.equal(fake.paymentSetCalls.length, 0);
    assert.equal(fake.inviteLinkSetCalls.length, 0);
    assert.deepEqual(result, {fulfilled: true, alreadyFinalized: true});
  }
);

test(
  "fulfillRazorpayPayment is an early no-op for an already-completed payment",
  async () => {
    // Pre-signup read already sees a terminal status: never touch signUp,
    // Razorpay, the completed write, or the counter.
    const fake = createFulfillmentFirestore({
      statusByGet: () => "completed",
    });
    let signUpCalls = 0;

    const result = await fulfillRazorpayPayment({
      db: fake.db,
      orderId: "order-1",
      paymentId: "pay-1",
      booking,
      deps: {
        signUpForEvent: async (db, eventId, userId, paymentId, options) => {
          signUpCalls += 1;
          await db.runTransaction(async (tx) => {
            (await prepareNativePaidBooking({db, tx, eventId, userId,
              paymentId, booking: options!.paidBooking!}))();
          });
        },
        serverTimestamp: () => "server-now",
      },
    });

    assert.equal(signUpCalls, 0);
    assert.equal(fake.paymentSetCalls.length, 0);
    assert.equal(fake.inviteLinkSetCalls.length, 0);
    assert.deepEqual(result, {fulfilled: true, alreadyFinalized: true});
    // Even the no-op path retires the tracking doc.
  }
);

test(
  "fulfillRazorpayPayment rejects a terminal row for another checkout",
  async () => {
    const fake = createFulfillmentFirestore({
      statusByGet: () => "completed",
      paymentPatchByGet: () => ({orderId: "order-other"}),
    });
    let signUpCalls = 0;

    await assert.rejects(fulfillRazorpayPayment({
      db: fake.db,
      orderId: "order-1",
      paymentId: "pay-1",
      booking,
      deps: {
        signUpForEvent: async () => {
          signUpCalls++;
        },
        serverTimestamp: () => "server-now",
      },
    }), /Payment authority changed/u);

    assert.equal(signUpCalls, 0);
    assert.deepEqual(fake.paymentSetCalls, []);
    assert.deepEqual(fake.inviteLinkSetCalls, []);
  }
);

function createFulfillmentFirestore(options: {
  statusByGet: (getCount: number) => string | undefined;
  paymentPatchByGet?: (getCount: number) => Record<string, unknown>;
}) {
  const paymentSetCalls: Array<Record<string, unknown>> = [];
  const inviteLinkSetCalls: Array<{
    docId: string;
    data: Record<string, unknown>;
  }> = [];
  let paymentGetCount = 0;

  const paymentRef = {
    get: async () => {
      paymentGetCount += 1;
      const status = options.statusByGet(paymentGetCount);
      return {
        exists: status !== undefined,
        data: () => (status === undefined ? undefined : {
          status,
          userId: booking.userId,
          eventId: booking.eventId,
          orderId: "order-1",
          paymentId: "pay-1",
          amount: booking.amountInPaise,
          amountMinor: booking.amountInPaise,
          currency: booking.currency,
          provider: "razorpay",
          ...options.paymentPatchByGet?.(paymentGetCount),
        }),
      };
    },
    set: async (data: Record<string, unknown>) => {
      paymentSetCalls.push(data);
    },
  };

  const db = {
    collection: (path: string) => ({
      doc: (docId: string) => {
        if (path === "guestPayments") return paymentRef;
        if (path === "eventInviteLinks") {
          return {
            set: async (data: Record<string, unknown>) => {
              inviteLinkSetCalls.push({docId, data});
            },
          };
        }
        // eventParticipations (host-approval lookup) and any other collection.
        return {
          get: async () => ({exists: false, data: () => undefined}),
          delete: async () => undefined,
        };
      },
    }),
    runTransaction: async <T>(
      updateFn: (tx: {
        get: (ref: {get: () => Promise<unknown>}) => Promise<unknown>;
        set: (
          ref: {set: (data: Record<string, unknown>) => unknown},
          data: Record<string, unknown>
        ) => void;
      }) => Promise<T>
    ): Promise<T> => {
      return updateFn({
        get: (ref) => ref.get(),
        set: (ref, data) => {
          void ref.set(data);
        },
      });
    },
  } as unknown as FirebaseFirestore.Firestore;

  return {db, paymentSetCalls, inviteLinkSetCalls};
}
