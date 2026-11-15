import {prepareNativePaidBooking} from "./nativeBooking";
import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import Razorpay from "razorpay";
import {verifyRazorpayPaymentHandler} from "./verifyRazorpayPayment";

process.env.GCLOUD_PROJECT = "catchdates-dev";
process.env.GCLOUDPROJECT = "catchdates-dev";

test(
  "verifyRazorpayPaymentHandler books trusted event from Razorpay metadata",
  async () => {
    const paymentDoc = createPaymentDocRecorder();
    const signUpCalls: Array<{
      eventId: string;
      userId: string;
      options: Record<string, unknown> | undefined;
    }> = [];
    const result = await verifyRazorpayPaymentHandler(
      buildRequest({
        auth: {uid: "runner-1"},
        data: {
          paymentId: "pay_123",
          orderId: "order_123",
          signature: "sig_123",
        },
      }),
      {
        firestore: () => createPaymentsFirestore(paymentDoc),
        createClient: () =>
        ({
          orders: {
            fetch: async () => ({
              id: "order_123",
              amount: 25000,
              currency: "INR",
              amount_paid: 25000,
              amount_due: 0,
              notes: {
                eventId: "trusted-event",
                userId: "runner-1",
                catchBookingProject: "catchdates-dev",
                catchBookingSchema: "1",
                inviteLinkId: "link-1",
                inviteSource: "instagram-bio",
              },
            }),
          },
          payments: {
            fetch: async () => ({
              id: "pay_123",
              order_id: "order_123",
              amount: 25000,
              currency: "INR",
              status: "captured",
              refund_status: "null",
            }),
            refund: async () => {
              throw new Error("Refund should not be called on success.");
            },
          },
        }) as unknown as Razorpay,
        serverTimestamp: () => "server-now",
        signUpForEvent: async (_db, eventId, userId, _paymentId, options) => {
          const {paidBooking, ...visibleOptions} = options!;
          signUpCalls.push({eventId, userId, options: visibleOptions});
          await _db.runTransaction(async (tx) => {
            (await prepareNativePaidBooking({db: _db, tx, eventId, userId,
              paymentId: _paymentId, booking: paidBooking!}))();
          });
        },
        verifySignature: () => true,
      }
    );

    assert.deepEqual(signUpCalls, [{
      eventId: "trusted-event",
      userId: "runner-1",
      options: {
        hasValidInvite: false,
        inviteAttribution: {
          inviteLinkId: "link-1",
          inviteSource: "instagram-bio",
        },
      },
    }]);
    assert.equal(paymentDoc.setCalls.length, 1);
    assert.equal(paymentDoc.setCalls[0].status, "completed");
    assert.equal(paymentDoc.setCalls[0].amount, 25000);
    assert.deepEqual(paymentDoc.setCalls[0].razorpayOwnership,
      {projectId: "catchdates-dev", schema: "1"});
    assert.ok(paymentDoc.setCalls[0].completedAt);
    assert.equal(paymentDoc.inviteLinkSetCalls.length, 1);
    assert.equal(paymentDoc.inviteLinkSetCalls[0].docId, "link-1");
    assert.ok("paidCount" in paymentDoc.inviteLinkSetCalls[0].data);
    assert.deepEqual(result, {verified: true, eventId: "trusted-event"});
  }
);

test(
  "verifyRazorpayPaymentHandler queues a durable refund for rejected admission",
  async () => {
    const paymentDoc = createPaymentDocRecorder();
    const refundCalls: Array<{paymentId: string; amount: number}> = [];

    await assert.rejects(
      verifyRazorpayPaymentHandler(
        buildRequest({
          auth: {uid: "runner-1"},
          data: {
            paymentId: "pay_123",
            orderId: "order_123",
            signature: "sig_123",
          },
        }),
        {
          firestore: () => createPaymentsFirestore(paymentDoc),
          createClient: () =>
          ({
            orders: {
              fetch: async () => ({
                id: "order_123",
                amount: 25000,
                currency: "INR",
                amount_paid: 25000,
                amount_due: 0,
                notes: {
                  eventId: "trusted-event",
                  userId: "runner-1",
                  catchBookingProject: "catchdates-dev",
                  catchBookingSchema: "1",
                },
              }),
            },
            payments: {
              fetch: async () => ({
                id: "pay_123",
                order_id: "order_123",
                amount: 25000,
                currency: "INR",
                status: "captured",
                refund_status: "null",
              }),
              refund: async (paymentId: string, data: {amount: number}) => {
                refundCalls.push({paymentId, amount: data.amount});
              },
            },
          }) as unknown as Razorpay,
          serverTimestamp: () => "server-now",
          signUpForEvent: async () => {
            throw new HttpsError(
              "failed-precondition",
              "This event is now full."
            );
          },
          verifySignature: () => true,
        }
      ),
      isHttpsError("failed-precondition", "This event is now full.")
    );

    assert.deepEqual(refundCalls, []);
    assert.equal(paymentDoc.setCalls.length, 1);
    assert.equal(paymentDoc.setCalls[0].status, "refundFailed");
    assert.deepEqual(
      (paymentDoc.setCalls[0].cancellationRefund as {state: string}).state,
      "pending");
    assert.deepEqual(
      (paymentDoc.setCalls[0].cancellationRefund as
        {razorpayOwnership: unknown}).razorpayOwnership,
      {projectId: "catchdates-dev", schema: "1"});
  }
);

test(
  "verifyRazorpayPaymentHandler persists recovery without calling the provider",
  async () => {
    const paymentDoc = createPaymentDocRecorder();

    await assert.rejects(
      verifyRazorpayPaymentHandler(
        buildRequest({
          auth: {uid: "runner-1"},
          data: {
            paymentId: "pay_123",
            orderId: "order_123",
            signature: "sig_123",
          },
        }),
        {
          firestore: () => createPaymentsFirestore(paymentDoc),
          createClient: () =>
          ({
            orders: {
              fetch: async () => ({
                id: "order_123",
                amount: 25000,
                currency: "INR",
                amount_paid: 25000,
                amount_due: 0,
                notes: {
                  eventId: "trusted-event",
                  userId: "runner-1",
                  catchBookingProject: "catchdates-dev",
                  catchBookingSchema: "1",
                },
              }),
            },
            payments: {
              fetch: async () => ({
                id: "pay_123",
                order_id: "order_123",
                amount: 25000,
                currency: "INR",
                status: "captured",
                refund_status: "null",
              }),
              refund: async () => {
                throw new Error("Razorpay refund API unavailable.");
              },
            },
          }) as unknown as Razorpay,
          serverTimestamp: () => "server-now",
          signUpForEvent: async () => {
            throw new HttpsError(
              "failed-precondition",
              "This event is now full."
            );
          },
          verifySignature: () => true,
        }
      ),
      isHttpsError("failed-precondition", "This event is now full.")
    );

    assert.equal(paymentDoc.setCalls.length, 1);
    assert.equal(paymentDoc.setCalls[0].status, "refundFailed");
    assert.equal(paymentDoc.setCalls[0].signUpFailed, true);
  }
);

test(
  "verifyRazorpayPaymentHandler is a no-op for an already-completed payment",
  async () => {
    const paymentDoc = createPaymentDocRecorder({
      existing: {status: "completed", userId: "runner-1",
        eventId: "trusted-event", orderId: "order_123",
        paymentId: "pay_123", amount: 25000, amountMinor: 25000,
        currency: "INR", provider: "razorpay"},
    });
    let signUpCalled = false;

    const result = await verifyRazorpayPaymentHandler(
      buildRequest({
        auth: {uid: "runner-1"},
        data: {
          paymentId: "pay_123",
          orderId: "order_123",
          signature: "sig_123",
        },
      }),
      {
        firestore: () => createPaymentsFirestore(paymentDoc),
        createClient: () =>
        ({
          orders: {
            fetch: async () => ({
              id: "order_123",
              amount: 25000,
              currency: "INR",
              amount_paid: 25000,
              amount_due: 0,
              notes: {
                eventId: "trusted-event",
                userId: "runner-1",
                catchBookingProject: "catchdates-dev",
                catchBookingSchema: "1",
              },
            }),
          },
          payments: {
            fetch: async () => ({
              id: "pay_123",
              order_id: "order_123",
              amount: 25000,
              currency: "INR",
              status: "captured",
              refund_status: "null",
            }),
            refund: async () => {
              throw new Error("Refund should not be called when idempotent.");
            },
          },
        }) as unknown as Razorpay,
        serverTimestamp: () => "server-now",
        signUpForEvent: async () => {
          signUpCalled = true;
        },
        verifySignature: () => true,
      }
    );

    // No re-sign-up and no payment writes for an already-finalized payment.
    assert.equal(signUpCalled, false);
    assert.deepEqual(paymentDoc.setCalls, []);
    assert.deepEqual(result, {verified: true, eventId: "trusted-event"});
  }
);

test("a cancelled completed payment cannot confirm " +
  "checkout again", async () => {
  const existing = {status: "completed", signUpFailed: false,
    userId: "runner-1", eventId: "trusted-event", orderId: "order_123",
    paymentId: "pay_123", amount: 25000, amountMinor: 25000,
    currency: "INR", provider: "razorpay",
    razorpayOwnership: {projectId: "catchdates-dev", schema: "1"},
    cancellationRefund: {
      version: 1, reason: "guestCancelled", state: "complete",
      targetAmountMinor: 0, confirmedAmountMinor: 0,
      paymentFingerprint: "a".repeat(64), provider: "razorpay",
      providerPaymentId: "pay_123", orderId: "order_123", currency: "INR",
      stripeAccountId: null, refundApplicationFee: false,
      razorpayOwnership: {projectId: "catchdates-dev", schema: "1"},
      requestedAtMillis: 1, nextAttemptAtMillis: 1, leaseUntilMillis: 0,
      attempts: [], lastErrorCode: null,
    }};
  const paymentDoc = createPaymentDocRecorder({existing});
  let signUpCalled = false;

  await assert.rejects(verifyRazorpayPaymentHandler(buildRequest({
    auth: {uid: "runner-1"},
    data: {paymentId: "pay_123", orderId: "order_123",
      signature: "sig_123"},
  }), {
    firestore: () => createPaymentsFirestore(paymentDoc),
    createClient: () => ({
      orders: {fetch: async () => ({id: "order_123", amount: 25000,
        currency: "INR", amount_paid: 25000, amount_due: 0,
        notes: {eventId: "trusted-event", userId: "runner-1",
          catchBookingProject: "catchdates-dev", catchBookingSchema: "1"}})},
      payments: {fetch: async () => ({id: "pay_123",
        order_id: "order_123", amount: 25000, currency: "INR",
        status: "captured", amount_refunded: 0})},
    }) as unknown as Razorpay,
    serverTimestamp: () => "server-now",
    signUpForEvent: async () => {
      signUpCalled = true;
    },
    verifySignature: () => true,
  }), isHttpsError("failed-precondition",
    "This booking was not admitted. Check its refund status in Payments."));

  assert.equal(signUpCalled, false);
  assert.deepEqual(paymentDoc.setCalls, []);
});

test("a fully refunded replay cannot confirm checkout", async () => {
  const existing = {status: "refundFailed", userId: "runner-1",
    eventId: "trusted-event", orderId: "order_123",
    paymentId: "pay_123", amount: 25000, amountMinor: 25000,
    currency: "INR", provider: "razorpay",
    razorpayOwnership: {projectId: "catchdates-dev", schema: "1"}};
  const paymentDoc = createPaymentDocRecorder({existing});
  let signUpCalled = false;

  await assert.rejects(verifyRazorpayPaymentHandler(buildRequest({
    auth: {uid: "runner-1"},
    data: {paymentId: "pay_123", orderId: "order_123",
      signature: "sig_123"},
  }), {
    firestore: () => createPaymentsFirestore(paymentDoc),
    createClient: () => ({
      orders: {fetch: async () => ({id: "order_123", amount: 25000,
        currency: "INR", amount_paid: 25000, amount_due: 0,
        notes: {eventId: "trusted-event", userId: "runner-1",
          catchBookingProject: "catchdates-dev", catchBookingSchema: "1"}})},
      payments: {fetch: async () => ({id: "pay_123",
        order_id: "order_123", amount: 25000, currency: "INR",
        status: "refunded", amount_refunded: 25000})},
    }) as unknown as Razorpay,
    serverTimestamp: () => "server-now",
    signUpForEvent: async () => {
      signUpCalled = true;
    },
    verifySignature: () => true,
  }), isHttpsError("failed-precondition",
    "This booking was not admitted. Check its refund status in Payments."));

  assert.equal(signUpCalled, false);
  assert.deepEqual(paymentDoc.setCalls, []);
});

test(
  "verifyRazorpayPaymentHandler rejects invalid signatures before fetching",
  async () => {
    const paymentDoc = createPaymentDocRecorder();

    await assert.rejects(
      verifyRazorpayPaymentHandler(
        buildRequest({
          auth: {uid: "runner-1"},
          data: {
            paymentId: "pay_123",
            orderId: "order_123",
            signature: "bad",
          },
        }),
        {
          firestore: () => createPaymentsFirestore(paymentDoc),
          createClient: failOnClientUse,
          serverTimestamp: () => "server-now",
          signUpForEvent: async () => undefined,
          verifySignature: () => false,
        }
      ),
      isHttpsError(
        "invalid-argument",
        "Payment signature verification failed."
      )
    );

    assert.deepEqual(paymentDoc.setCalls, []);
  }
);

test(
  "verifyRazorpayPaymentHandler rate limits before signature or Razorpay fetch",
  async () => {
    const paymentDoc = createPaymentDocRecorder();

    await assert.rejects(
      verifyRazorpayPaymentHandler(
        buildRequest({
          auth: {uid: "runner-1"},
          data: {
            paymentId: "pay_123",
            orderId: "order_123",
            signature: "sig_123",
          },
        }),
        {
          firestore: () => createPaymentsFirestore(paymentDoc),
          createClient: failOnClientUse,
          serverTimestamp: () => "server-now",
          signUpForEvent: async () => undefined,
          verifySignature: () => {
            throw new Error("Signature should not be checked.");
          },
          checkRateLimit: async (_db, uid, action) => {
            assert.equal(uid, "runner-1");
            assert.equal(action, "verifyRazorpayPayment");
            throw new HttpsError(
              "resource-exhausted",
              "Too many payment verification attempts."
            );
          },
        }
      ),
      isHttpsError(
        "resource-exhausted",
        "Too many payment verification attempts."
      )
    );

    assert.deepEqual(paymentDoc.setCalls, []);
  }
);

for (const scenario of [
  {name: "wrong order", payment: {order_id: "order_other"},
    code: "invalid-argument"},
  {name: "wrong user", notes: {userId: "another-user"},
    code: "permission-denied"},
  {name: "wrong amount", payment: {amount: 24999},
    code: "invalid-argument"},
  {name: "wrong currency", payment: {currency: "USD"},
    code: "invalid-argument"},
  {name: "uncaptured authorization", payment: {status: "authorized"},
    code: "failed-precondition"},
  {name: "failed payment", payment: {status: "failed"},
    code: "failed-precondition"},
  {name: "partial refund", payment: {amount_refunded: 1},
    code: "failed-precondition"},
]) {
  test(`verifyRazorpayPayment rejects ${scenario.name} despite valid signature`,
    async () => {
      const paymentDoc = createPaymentDocRecorder();
      let admissionCalls = 0;
      let providerRefundCalls = 0;
      await assert.rejects(verifyRazorpayPaymentHandler(buildRequest({
        auth: {uid: "runner-1"},
        data: {paymentId: "pay_123", orderId: "order_123", signature: "valid"},
      }), {
        firestore: () => createPaymentsFirestore(paymentDoc),
        verifySignature: () => true,
        serverTimestamp: () => "server-now",
        signUpForEvent: async () => {
          admissionCalls++;
        },
        createClient: () => ({
          orders: {fetch: async () => ({id: "order_123", amount: 25000,
            currency: "INR", amount_paid: 25000, amount_due: 0,
            notes: {eventId: "trusted-event", userId: "runner-1",
              catchBookingProject: "catchdates-dev", catchBookingSchema: "1",
              ...scenario.notes}})},
          payments: {
            fetch: async () => ({id: "pay_123", order_id: "order_123",
              amount: 25000, currency: "INR", status: "captured",
              refund_status: null, ...scenario.payment}),
            refund: async () => {
              providerRefundCalls++;
            },
          },
        }) as unknown as Razorpay,
      }), (error: unknown) => error instanceof HttpsError &&
        error.code === scenario.code);
      assert.equal(admissionCalls, 0);
      assert.equal(providerRefundCalls, 0);
      assert.deepEqual(paymentDoc.setCalls, []);
      assert.deepEqual(paymentDoc.inviteLinkSetCalls, []);
    });
}

function buildRequest({
  data,
  auth,
}: {
  data: Record<string, unknown> | null;
  auth?: {uid: string};
}): CallableRequest<Record<string, unknown> | null> {
  return {
    data,
    auth: auth ?
      ({uid: auth.uid, token: {}} as CallableRequest["auth"]) :
      undefined,
    rawRequest: {} as CallableRequest["rawRequest"],
    acceptsStreaming: false,
  };
}

function createPaymentDocRecorder(
  options: {existing?: Record<string, unknown>} = {}
) {
  const setCalls: Array<Record<string, unknown>> = [];
  const inviteLinkSetCalls: Array<{
    docId: string;
    data: Record<string, unknown>;
  }> = [];
  return {
    setCalls,
    inviteLinkSetCalls,
    ref: {
      get: async () => ({
        exists: options.existing !== undefined,
        data: () => options.existing,
      }),
      set: async (data: Record<string, unknown>) => {
        setCalls.push(data);
      },
    },
  };
}

function createPaymentsFirestore(paymentDoc: {
  inviteLinkSetCalls: Array<{docId: string; data: Record<string, unknown>}>;
  ref: {
    get: () => Promise<{
      exists: boolean;
      data: () => Record<string, unknown> | undefined;
    }>;
    set: (data: Record<string, unknown>) => Promise<void>;
  };
}): FirebaseFirestore.Firestore {
  const docFor = (path: string, docId: string) => {
    if (path === "guestPayments") return paymentDoc.ref;
    if (path === "eventInviteLinks") {
      return {
        set: async (data: Record<string, unknown>) => {
          paymentDoc.inviteLinkSetCalls.push({docId, data});
        },
      };
    }
    return {
      get: async () => ({
        exists: false,
        data: () => undefined,
      }),
      // The shared fulfillment helper best-effort deletes the pending-order
      // tracking doc; a no-op keeps these focused tests quiet.
      delete: async () => undefined,
    };
  };
  return {
    collection: (path: string) => ({
      doc: (docId: string) => docFor(path, docId),
    }),
    // The completion + paidCount increment now run inside a transaction; the
    // fake routes tx reads/writes straight to the same doc stubs.
    runTransaction: async <T>(
      updateFn: (tx: FakeTransaction) => Promise<T>
    ): Promise<T> => {
      const tx: FakeTransaction = {
        get: (ref) => ref.get(),
        set: (ref, data, options) => {
          void ref.set(data, options);
        },
      };
      return updateFn(tx);
    },
  } as unknown as FirebaseFirestore.Firestore;
}

interface FakeTransaction {
  get: (ref: {
    get: () => Promise<{
      exists: boolean;
      data: () => Record<string, unknown> | undefined;
    }>;
  }) => Promise<unknown>;
  set: (
    ref: {set: (data: Record<string, unknown>, options?: unknown) => unknown},
    data: Record<string, unknown>,
    options?: unknown
  ) => void;
}

function failOnClientUse(): Razorpay {
  throw new Error("Razorpay client should not be created in this test.");
}

function isHttpsError(expectedCode: string, expectedMessage: string) {
  return (error: unknown) =>
    error instanceof HttpsError &&
    error.code === expectedCode &&
    error.message === expectedMessage;
}

// Append to verifyRazorpayPayment.test.ts. NOT EXECUTED.
test("ownership: valid callback cannot admit a foreign order for cloned " +
  "Auth UID",
async () => {
  const record = createPaymentDocRecorder();
  let signUps = 0;
  let refunds = 0;
  const previous = process.env.GCLOUD_PROJECT;
  const previousLegacy = process.env.GCLOUDPROJECT;
  process.env.GCLOUD_PROJECT = "catchdates-dev";
  process.env.GCLOUDPROJECT = "catchdates-dev";
  try {
    await assert.rejects(verifyRazorpayPaymentHandler(buildRequest({
      auth: {uid: "runner-1"},
      data: {paymentId: "pay_123", orderId: "order_123",
        signature: "sig_123"},
    }), {
      firestore: () => createPaymentsFirestore(record),
      createClient: () => ({
        orders: {fetch: async () => ({id: "order_123", amount: 25000,
          currency: "INR", amount_paid: 25000, amount_due: 0,
          notes: {eventId: "trusted-event", userId: "runner-1",
            catchBookingProject: "catch-dating-app-64e51",
            catchBookingSchema: "1"}})},
        payments: {fetch: async () => ({id: "pay_123", order_id: "order_123",
          amount: 25000, currency: "INR", status: "captured",
          refund_status: "null"}), refund: async () => {
          refunds++;
        }},
      }) as unknown as Razorpay,
      verifySignature: () => true,
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        signUps++;
      },
    }));
    assert.equal(signUps, 0);
    assert.equal(refunds, 0);
    assert.deepEqual(record.setCalls, []);
    assert.deepEqual(record.inviteLinkSetCalls, []);
  } finally {
    if (previous === undefined) delete process.env.GCLOUD_PROJECT;
    else process.env.GCLOUD_PROJECT = previous;
    if (previousLegacy === undefined) delete process.env.GCLOUDPROJECT;
    else process.env.GCLOUDPROJECT = previousLegacy;
  }
});
