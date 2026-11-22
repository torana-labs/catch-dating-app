import type {LoadRecipientAuth} from
  "../../organizerEventOfferRecipients/recipientGrant";
import {HttpsError} from "firebase-functions/v2/https";
import type {PublicEventPaymentDocument as Payment} from
  "../../shared/generated/firestoreAdminTypes";
import type {ManagePublicEventCheckoutCallableResponse as Response} from
  "../../shared/generated/managePublicEventCheckoutCallableResponse";
import {assertRazorpayCollectionBindingReady} from
  "../../payments/razorpayCollectionRouting";
import {eventGuestCancellationQuote} from
  "../../payments/eventCheckout/eventCancellationPolicy";
import {
  assertCurrentPublicGuest,
  readPublicEventSource,
  publicGuestMembership,
} from "./authority";
import {assertPublicRegistrationPolicy} from "./policy";
import {readPublicPaidAdmission} from "./admissionProof";
import {
  PUBLIC_PAYMENT_COLLECTION,
  parsePublicPayment,
  publicPaymentPlaces,
} from "../../domain/payments/publicEventPayments";

/** Read a current, UID-owned view. No merchant IDs, routing secrets, phone or
 * other guest records leave the callable. Ended payment history stays readable.
 */
export async function projectPublicPayment(input: {
  db: FirebaseFirestore.Firestore;
  tx?: FirebaseFirestore.Transaction;
  eventId?: string;
  organizerId?: string;
  includeCheckout?: boolean;
  paymentId: string;
  uid: string;
  nowMillis: number;
  loadCurrentAuthUser?: LoadRecipientAuth;
}): Promise<Pick<Response, "payment" | "admission">> {
  const {db, paymentId, uid, nowMillis} = input;
  const read = async (tx: FirebaseFirestore.Transaction) => {
    const p = parsePublicPayment(
      (
        await tx.get(
          db.collection(PUBLIC_PAYMENT_COLLECTION).doc(paymentId),
        )
      ).data(),
      paymentId,
    );
    if (p.recipientUid !== uid ||
        input.eventId !== undefined && p.eventId !== input.eventId ||
        input.organizerId !== undefined &&
          p.organizerId !== input.organizerId) {
      throw new HttpsError("permission-denied", "Payment unavailable.");
    }
    let checkout: NonNullable<Response["payment"]>["checkout"] = null;
    let admission: Response["admission"] = null;
    if (
      input.includeCheckout !== false &&
      ["checkoutReady", "failed"].includes(p.status) &&
      !p.capturedAt &&
      !p.admissionReceiptId &&
      !p.reservationReleased &&
      p.providerOrderId &&
      p.routing.checkoutKey &&
      p.checkoutExpiresAt.toMillis() > nowMillis
    ) {
      try {
        await assertCurrentPublicGuest({
          db,
          tx,
          uid,
          phoneE164: p.phoneE164,
          loadCurrentAuthUser: input.loadCurrentAuthUser,
        });
        const {event, organizer} = await readPublicEventSource({
          db,
          tx,
          eventId: p.eventId,
        });
        assertPublicRegistrationPolicy(event, organizer, "paid", nowMillis,
          await publicGuestMembership({db, tx, event, uid, nowMillis}));
        if (
          event.startTime.toMillis() ===
          p.cancellationPolicy.eventStartsAtMillis
        ) {
          await assertRazorpayCollectionBindingReady({
            db,
            tx,
            snapshot: p.routing,
            nowMillis,
          });
          checkout = {
            publicToken: p.routing.checkoutKey,
            orderId: p.providerOrderId,
            amountPaise: p.amountPaise,
            currency: p.currency,
            description: checkoutDescription(p),
            expiresAtMillis: p.checkoutExpiresAt.toMillis(),
          };
        }
      } catch (error) {
        if (
          !(error instanceof HttpsError) ||
          ![
            "permission-denied",
            "failed-precondition",
            "not-found",
          ].includes(error.code)
        ) {
          throw error;
        }
      }
    }
    let cancellationQuote = eventGuestCancellationQuote(p, nowMillis);
    if (p.status === "admitted") {
      const proof = await readPublicPaidAdmission({
        db,
        tx,
        payment: p,
        paymentId,
      });
      const [event, attendee] = await Promise.all([
        tx.get(db.collection("events").doc(p.eventId)),
        tx.get(db.collection("eventAttendees").doc(proof.attendeeId)),
      ]);
      const row = attendee.data();
      if (
        row?.eventId === p.eventId &&
        row.organizerId === p.organizerId &&
        row.linkedUid === uid &&
        ["registered", "checkedIn"].includes(row.status) &&
        row.revenueOrderReference === p.providerOrderId
      ) {
        admission = {
          eventId: p.eventId,
          attendeeId: proof.attendeeId,
          status: row.status,
          placeCount: publicPaymentPlaces(p).placeCount,
        };
      }
      if (
        !admission ||
        row?.status !== "registered" ||
        event.data()?.status !== "active" ||
        !(event.data()?.startTime?.toMillis?.() > nowMillis)
      ) {
        cancellationQuote = null;
      }
    }
    return {
      payment: paymentProjection(p, paymentId, checkout, cancellationQuote),
      admission,
    };
  };
  return input.tx ? read(input.tx) : db.runTransaction(read);
}

/** The provider sheet names the party size so the guest sees what they pay
 * for; one place keeps the plain event name. */
function checkoutDescription(p: Payment): string {
  const {placeCount} = publicPaymentPlaces(p);
  return placeCount > 1 ? `${p.eventName} · ${placeCount} places` :
    p.eventName;
}

function paymentProjection(
  p: Payment,
  paymentId: string,
  checkout: NonNullable<Response["payment"]>["checkout"],
  cancellationQuote: NonNullable<Response["payment"]>["cancellationQuote"],
): NonNullable<Response["payment"]> {
  const {placeCount, unitAmountPaise, memberPlaceCount, guestUnitAmountPaise} =
    publicPaymentPlaces(p);
  return {
    paymentId,
    status: p.status,
    amountPaise: p.amountPaise,
    placeCount,
    unitAmountPaise,
    ...(memberPlaceCount === 1 ? {memberPlaceCount, guestUnitAmountPaise} :
      {}),
    currency: p.currency,
    mode: p.routing.selection.mode,
    refundedAmountPaise: p.refundedAmountPaise,
    cancellationReason: p.cancellation?.reason ?? null,
    cancellationPolicy: p.cancellationPolicy,
    cancellationQuote,
    expiresAtMillis: p.checkoutExpiresAt.toMillis(),
    checkout,
    eventId: p.eventId,
    eventName: p.eventName,
    startTimeMillis: p.cancellationPolicy.eventStartsAtMillis,
  };
}
