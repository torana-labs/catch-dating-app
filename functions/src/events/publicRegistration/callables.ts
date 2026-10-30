import * as admin from "firebase-admin";
import {
  HttpsError,
  onCall,
  type CallableRequest,
} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {checkRateLimit} from "../../shared/rateLimit";
import {appCheckCallableOptionsWithLimits} from
  "../../shared/callableOptions";
import {validateCallableWithAjv} from "../../shared/validation";
import {validateManagePublicEventCheckoutCallablePayload as validateInput} from
  "../../shared/generated/validators/managePublicEventCheckoutInput";
import {validateManagePublicEventCheckoutCallableResponse as
validateResult} from
  "../../shared/generated/validators/managePublicEventCheckoutOutput";
import {validateConfigureEventRegistrationCallablePayload} from
  "../../shared/generated/validators/configureEventRegistrationInput";
import {validateConfigureEventRegistrationCallableResponse} from
  "../../shared/generated/validators/configureEventRegistrationOutput";
import type {ManagePublicEventCheckoutCallableResponse as Response} from
  "../../shared/generated/managePublicEventCheckoutCallableResponse";
import {
  eventAdmissionCollectionReady,
  prepareRazorpayCollectionRouting,
} from "../../payments/razorpayCollectionRouting";
import {cancelPaidEventAdmission} from
  "../../payments/eventCheckout/eventPaymentCancellation";
import {resolveInviteAttributionToken} from "../inviteLinks";
import {
  assertCurrentPublicGuest,
  readPublicEventSource,
  publicGuestMembership,
  readRegistrationManager,
} from "./authority";
import {publicCheckoutQuote, registrationUnavailable} from "./policy";
import {publicHostMembershipQuoteTerms} from
  "../../hostMemberships/publicCheckout";
import {
  publicPaymentId,
  PUBLIC_PAYMENT_COLLECTION,
  parsePublicPayment,
  publicPaymentLedger,
} from "./paymentLedger";
import {reservePublicPayment} from "./reservation";
import {publicPaymentExecutionFor} from "./runtime";
import {projectPublicPayment} from "./projection";
import {readPublicPaidAdmission} from "./admissionProof";
import {
  configureEventRegistration as configure,
  registrationChangeReceiptId,
} from "./configure";

/** Clients match `details.reason`, never the message text. */
export const ORGANIZER_PAYMENTS_NOT_READY = "organizerPaymentsNotReady";

/** Paid booking is closed because the organizer's collection account is not
 * ready. Catch never falls back to collecting the payment itself.
 */
export function organizerPaymentsNotReady(): never {
  throw new HttpsError(
    "failed-precondition",
    "Paid booking is unavailable until this organiser finishes " +
      "connecting their Razorpay account.",
    {reason: ORGANIZER_PAYMENTS_NOT_READY},
  );
}

/** A routing refusal means no collection account can take this payment. */
async function routingOrNotReady<T>(prepare: () => Promise<T>): Promise<T> {
  try {
    return await prepare();
  } catch (error) {
    if (error instanceof HttpsError && error.code === "failed-precondition") {
      organizerPaymentsNotReady();
    }
    throw error;
  }
}

export const publicCheckoutDefaults = {
  db: () => admin.firestore(),
  rateLimit: checkRateLimit,
  now: Date.now,
  guest: assertCurrentPublicGuest,
  source: readPublicEventSource,
  prepareRouting: prepareRazorpayCollectionRouting,
  collectionReady: eventAdmissionCollectionReady,
  reserve: reservePublicPayment,
  execution: publicPaymentExecutionFor,
  project: projectPublicPayment,
  invite: resolveInviteAttributionToken,
  cancel: cancelPaidEventAdmission,
};

export async function managePublicEventCheckoutHandler(
  request: CallableRequest<unknown>,
  deps = publicCheckoutDefaults,
): Promise<Response> {
  const uid = requireAuth(request);
  const phone = request.auth?.token.phone_number;
  if (typeof phone !== "string" || !/^\+[1-9][0-9]{7,14}$/u.test(phone)) {
    throw new HttpsError(
      "unauthenticated",
      "Verify your phone to continue.",
    );
  }
  const data = validateCallableWithAjv(request, validateInput);
  const db = deps.db();
  await deps.rateLimit(db, uid, "managePublicEventCheckout", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await db.runTransaction((tx) =>
    deps.guest({db, tx, uid, phoneE164: phone}),
  );
  const result: Response = {
    quote: null,
    payment: null,
    admission: null,
    serverTimeMillis: deps.now(),
  };
  if (data.action === "quote") {
    const quoted = await db.runTransaction(async (tx) => {
      const {event, organizer} = await deps.source({
        db,
        tx,
        eventId: data.eventId,
      });
      return {organizerId: event.organizerId!, quote: publicCheckoutQuote(
        data.eventId,
        event,
        organizer,
        deps.now(),
        await publicGuestMembership({db, tx, event, uid,
          nowMillis: deps.now()}),
        await publicHostMembershipQuoteTerms({db, tx, eventId: data.eventId,
          event, uid, nowMillis: deps.now()}),
      )};
    });
    // Say so before the guest reviews a price nobody can collect.
    if (!(await deps.collectionReady({db, organizerId: quoted.organizerId,
      nowMillis: deps.now()}))) organizerPaymentsNotReady();
    result.quote = quoted.quote;
  } else if (data.action === "find") {
    const rows = await db
      .collection(PUBLIC_PAYMENT_COLLECTION)
      .where("eventId", "==", data.eventId)
      .where("recipientUid", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    if (rows.docs[0]) {
      Object.assign(
        result,
        await deps.project({
          db,
          uid,
          paymentId: rows.docs[0].id,
          nowMillis: deps.now(),
        }),
      );
    }
  } else {
    const paymentId =
      data.action === "prepare" ?
        publicPaymentId(data.eventId, uid, data.requestId) :
        data.paymentId;
    const snap = await db
      .collection(PUBLIC_PAYMENT_COLLECTION)
      .doc(paymentId)
      .get();
    let payment = snap.exists ?
      parsePublicPayment(snap.data(), paymentId) :
      null;
    if (payment && payment.recipientUid !== uid) {
      throw new HttpsError("permission-denied", "Payment unavailable.");
    }
    if (data.action === "prepare") {
      let routing = payment?.routing;
      let inviteLinkId = payment?.inviteLinkId ?? null;
      if (!payment) {
        const source = await db.runTransaction(async (tx) => {
          const source = await deps.source({
            db,
            tx,
            eventId: data.eventId,
          });
          const quote = publicCheckoutQuote(
            data.eventId,
            source.event,
            source.organizer,
            deps.now(),
            await publicGuestMembership({db, tx, event: source.event, uid,
              nowMillis: deps.now()}),
            await publicHostMembershipQuoteTerms({db, tx,
              eventId: data.eventId, event: source.event, uid,
              nowMillis: deps.now()}),
          );
          return {organizerId: source.event.organizerId!, quote};
        });
        routing = await routingOrNotReady(() => deps.prepareRouting({
          db,
          organizerId: source.organizerId,
          purpose: "eventAdmission",
          connectionId: null,
          amountMinor: source.quote.amountPaise,
        }));
        inviteLinkId =
          (
            await deps.invite({
              db,
              eventId: data.eventId,
              inviteToken: data.inviteToken,
            })
          )?.inviteLinkId ?? null;
      }
      const reserved = await deps.reserve({
        db,
        eventId: data.eventId,
        uid,
        phoneE164: phone,
        displayName: data.displayName,
        requestId: data.requestId,
        reviewedQuote: data.reviewedQuote,
        routing: routing!,
        inviteLinkId,
        nowMillis: deps.now,
      });
      if ("admission" in reserved) {
        result.admission = reserved.admission;
        return checked(result, deps.now());
      }
      payment = reserved.payment;
    }
    if (!payment) registrationUnavailable();
    if (data.action === "cancelAdmission") {
      if (
        !(await deps.cancel({
          db,
          paymentId,
          nowMillis: deps.now(),
          ledger: publicPaymentLedger,
          readAdmission: readPublicPaidAdmission,
          guest: {
            uid,
            expectedRefundAmountPaise: data.expectedRefundAmountPaise,
          },
        }))
      ) {
        registrationUnavailable(
          "This admission cannot be cancelled. Refresh its status.",
        );
      }
      payment = parsePublicPayment(
        (
          await db
            .collection(PUBLIC_PAYMENT_COLLECTION)
            .doc(paymentId)
            .get()
        ).data(),
        paymentId,
      );
    }
    if (payment.admissionReceiptId && payment.status === "admitted") {
      await deps.cancel({
        db,
        paymentId,
        nowMillis: deps.now(),
        ledger: publicPaymentLedger,
        readAdmission: readPublicPaidAdmission,
      });
    }
    // Preserve history and queued refunds even while a merchant is offline.
    if (
      !payment.admissionReceiptId &&
      !["refunded", "reviewRequired"].includes(payment.status) &&
      !(
        payment.status === "expired" &&
        (data.action !== "status" || !data.callback)
      )
    ) {
      const processor = await deps.execution({db, paymentId});
      if (data.action === "status" && data.callback) {
        await processor.verifyClientCallback({
          uid,
          providerPaymentId: data.callback.paymentId,
          signature: data.callback.signature,
        });
      } else if (data.action === "prepare") await processor.ensureOrder();
      else await processor.reconcile();
    }
    Object.assign(
      result,
      await deps.project({db, paymentId, uid, nowMillis: deps.now()}),
    );
  }
  return checked(result, deps.now());
}
function checked(result: Response, now: number): Response {
  result.serverTimeMillis = now;
  if (!validateResult(result)) {
    throw new HttpsError("internal", "Invalid checkout result.");
  }
  return result;
}

export async function configureEventRegistrationHandler(
  request: CallableRequest<unknown>,
) {
  const actorUid = requireAuth(request);
  const command = validateCallableWithAjv(
    request,
    validateConfigureEventRegistrationCallablePayload,
  );
  const db = admin.firestore();
  await checkRateLimit(db, actorUid, "configureEventRegistration", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  // Read-only provider preparation follows manager authorization; the final
  // transaction rechecks manager, revision, policy and frozen routing binding.
  const source = await db.runTransaction((tx) =>
    readRegistrationManager({
      db,
      tx,
      actorUid,
      eventId: command.eventId,
      organizerId: command.organizerId,
    }),
  );
  const prior = await db
    .collection("eventRegistrationReceipts")
    .doc(registrationChangeReceiptId(command))
    .get();
  if (prior.exists) return configure({db, actorUid, command});
  const routing =
    command.mode === "paid" ?
      await routingOrNotReady(() => prepareRazorpayCollectionRouting({
        db,
        organizerId: command.organizerId,
        purpose: "eventAdmission",
        connectionId: null,
        amountMinor: source.event.priceInPaise ?? 0,
      })) :
      undefined;
  const result = await configure({db, actorUid, command, routing});
  if (!validateConfigureEventRegistrationCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid registration result.");
  }
  return result;
}
export const managePublicEventCheckout = onCall(
  appCheckCallableOptionsWithLimits({
    timeoutSeconds: 120,
    maxInstances: 10,
    concurrency: 10,
  }),
  (request) => managePublicEventCheckoutHandler(request),
);
export const configureEventRegistration = onCall(
  appCheckCallableOptionsWithLimits({
    timeoutSeconds: 120,
    maxInstances: 10,
    concurrency: 10,
  }),
  (request) => configureEventRegistrationHandler(request),
);
