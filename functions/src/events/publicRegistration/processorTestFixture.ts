import {FormPaymentProviderError} from
  "../../payments/formPayments/razorpayPaymentProvider";
import assert from "node:assert/strict";
import type {
  FormPaymentOrder,
  FormProviderPayment,
} from "../../payments/formPayments/razorpayPaymentProvider";
import {PublicPaymentProcessor} from "./paymentProcessor";
import {publicFixture, now} from "./testFixture";
import {
  PUBLIC_PAYMENT_COLLECTION,
  parsePublicPayment,
} from "./paymentLedger";
import {assertCurrentPublicGuest} from "./authority";
import {reservePublicPayment} from "./reservation";
import {projectPublicPayment} from "./projection";
import {publicCheckoutDefaults} from "./callables";

export async function processorFixture() {
  const h = await publicFixture();
  let time = now + 20;
  let order: FormPaymentOrder | null = null;
  let observation: FormProviderPayment | null = null;
  let lostOrder = false;
  let rejectOrder = false;
  let lostRefund = false;
  const calls = {
    orders: 0,
    routes: 0,
    executions: 0,
    refunds: [] as string[],
  };
  const db = {
    runTransaction: h.store.runTransaction.bind(h.store),
    collection: (name: string) => {
      const base = h.store.collection(name);
      const query = (filters: Array<[string, unknown]> = []) => ({
        where: (field: string, _op: string, value: unknown) =>
          query([...filters, [field, value]]),
        orderBy: () => query(filters),
        limit: () => query(filters),
        get: async () => ({
          docs: [...h.store.rows]
            .filter(
              ([path, row]) =>
                path.startsWith(`${name}/`) &&
                filters.every(([field, value]) => row[field] === value),
            )
            .slice(-1)
            .map(([path, row]) => ({
              id: path.split("/").at(-1)!,
              data: () => row,
            })),
        }),
      });
      return {
        ...base,
        ...(name === PUBLIC_PAYMENT_COLLECTION ? query() : {}),
        doc: (id: string) => ({
          ...base.doc(id),
          get: async () => ({
            exists: !!h.store.get(`${name}/${id}`),
            data: () => h.store.get(`${name}/${id}`),
          }),
        }),
      };
    },
  } as unknown as FirebaseFirestore.Firestore;
  const execution = async ({paymentId}: { paymentId: string }) => {
    calls.executions++;
    const p = parsePublicPayment(
      h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${paymentId}`),
      paymentId,
    );
    return new PublicPaymentProcessor({
      db,
      paymentId,
      routing: p.routing,
      now: () => time,
      loadCurrentAuthUser: h.auth,
      authority: {
        resolve: async () => ({
          accountId: "acc_platform",
          mode: "test",
          authorizationHandle: "key",
          checkoutKey: "key",
          expiresAtMillis: Number.MAX_SAFE_INTEGER,
        }),
        assertReady: async () => undefined,
      },
      provider: {
        createOrder: async (_token, input) => {
          calls.orders++;
          if (rejectOrder) {
            rejectOrder = false;
            throw new FormPaymentProviderError("Rejected order", "rejected");
          }
          order = {
            ...input,
            id: "order_one",
            currency: "INR",
            status: "created",
          };
          if (lostOrder) {
            lostOrder = false;
            throw new Error("Lost order response");
          }
          return order;
        },
        findOrderByReceipt: async () => order,
        fetchOrder: async () => {
          assert.ok(order);
          return order;
        },
        fetchOrderPayments: async () => (observation ? [observation] : []),
        fetchPayment: async () => {
          assert.ok(observation);
          return observation;
        },
        capturePayment: async () => {
          assert.ok(observation);
          observation = {
            ...observation,
            captured: true,
            status: "captured",
          };
          return observation;
        },
        verifyCheckout: (input) => input.signature === "b".repeat(64),
        refundPayment: async (_token, input) => {
          calls.refunds.push(input.idempotencyKey);
          if (lostRefund) {
            lostRefund = false;
            throw new Error("Lost refund response");
          }
          return {
            id: "rfnd_one",
            paymentId: input.paymentId,
            amount: input.amount,
            status: "processed",
          };
        },
        fetchRefund: async () => ({
          id: "rfnd_one",
          paymentId: "pay_one",
          amount: 10000,
          status: "processed",
        }),
      },
    });
  };
  const deps: typeof publicCheckoutDefaults = {
    ...publicCheckoutDefaults,
    db: () => db,
    now: () => time,
    rateLimit: async () => undefined,
    guest: (input) =>
      assertCurrentPublicGuest({...input, loadCurrentAuthUser: h.auth}),
    reserve: (input) =>
      reservePublicPayment({...input, loadCurrentAuthUser: h.auth}),
    project: (input) =>
      projectPublicPayment({...input, loadCurrentAuthUser: h.auth}),
    prepareRouting: async () => {
      calls.routes++;
      return h.routing;
    },
    collectionReady: async () => true,
    invite: async () => null,
    execution,
  };
  return {
    ...h,
    db,
    deps,
    calls,
    execution,
    observe: (patch: Partial<FormProviderPayment> = {}) => {
      observation = {
        id: "pay_one",
        orderId: "order_one",
        amount: 10000,
        currency: "INR",
        status: "captured",
        captured: true,
        amountRefunded: 0,
        ...patch,
      };
    },
    advance: (at: number) => {
      time = at;
    },
    rejectOrder: () => {
      rejectOrder = true;
    },
    loseOrder: () => {
      lostOrder = true;
    },
    loseRefund: () => {
      lostRefund = true;
    },
  };
}
