import {watchConnectionAuthorization} from
  "../formPayments/razorpayAuthorizationRevocation";
import {HttpsError} from "firebase-functions/v2/https";
import {assertPaymentRouteSnapshot} from "../paymentRouting";
import {razorpayCollectionRoutingDefaults,
  assertRazorpayCollectionBindingReady,
  type RazorpayCollectionRoutingDeps} from "../razorpayCollectionRouting";
import {RazorpayRouteProvider} from "../formPayments/razorpayRouteProvider";
import type {EventPaymentAuthority, EventPaymentProcessorDeps} from
  "./eventPaymentProcessor";
import type {EventPaymentState} from "./eventPaymentState";
import type {PaymentRoutingSnapshot} from "../paymentRouting";

/** Recovery loads the frozen configuration, regardless of today's default. */
export async function eventPaymentProviderFor(input: {
  db: FirebaseFirestore.Firestore; routing: PaymentRoutingSnapshot;
  organizerId: string; currency: "INR"; amountPaise: number;
}, deps: RazorpayCollectionRoutingDeps = razorpayCollectionRoutingDefaults) {
  const {db, routing: snapshot, organizerId, currency, amountPaise} = input;
  assertPaymentRouteSnapshot(snapshot, {organizerId,
    purpose: "eventAdmission", currency, amountMinor: amountPaise});
  let provider: EventPaymentProcessorDeps<EventPaymentState>["provider"];
  let resolve: EventPaymentAuthority["resolve"];
  if (snapshot.selection.route === "razorpayRoute") {
    const profile = await deps.platform(snapshot.configurationVersion);
    if (profile.mode !== snapshot.selection.mode ||
        profile.platformAccountId !== snapshot.merchantAccountId ||
        profile.keyId !== snapshot.checkoutKey || !snapshot.settlementHold) {
      unavailable();
    }
    provider = new RazorpayRouteProvider({keyId: profile.keyId,
      keySecret: profile.keySecret, mode: profile.mode, terms: {
        paymentAmountMinor: snapshot.amountMinor,
        destinationAccountId: snapshot.destinationAccountId!,
        transferAmountMinor: snapshot.transferAmountMinor!,
        settlementHold: true}});
    resolve = async () => ({accountId: profile.platformAccountId,
      mode: profile.mode, authorizationHandle: profile.keyId,
      checkoutKey: profile.keyId, expiresAtMillis: Number.MAX_SAFE_INTEGER});
  } else if (snapshot.selection.route === "razorpayOAuth") {
    const runtime = await deps.oauth(snapshot.configurationVersion);
    if (runtime.mode !== snapshot.selection.mode) unavailable();
    // A 401 on the organizer's token means it revoked Catch's access.
    provider = watchConnectionAuthorization(runtime.provider,
      snapshot.bindingId);
    resolve = async () => {
      const credential = await runtime.credentials.access({
        organizerId: snapshot.organizerId, connectionId: snapshot.bindingId,
        accountId: snapshot.merchantAccountId, mode: snapshot.selection.mode});
      if (credential.accountId !== snapshot.merchantAccountId ||
          credential.mode !== snapshot.selection.mode ||
          credential.token.publicToken !== snapshot.checkoutKey ||
          credential.token.expiresAt <= Date.now()) unavailable();
      return {accountId: credential.accountId, mode: credential.mode,
        authorizationHandle: credential.token.accessToken,
        checkoutKey: credential.token.publicToken,
        expiresAtMillis: credential.token.expiresAt};
    };
  } else {
    unavailable();
  }
  const authority: EventPaymentAuthority = {resolve,
    assertReady: (tx) => assertRazorpayCollectionBindingReady({db, tx,
      snapshot, nowMillis: Date.now()})};
  return {db, routing: snapshot, authority, provider};
}
function unavailable(): never {
  throw new HttpsError("failed-precondition", "Payment route is unavailable.");
}
