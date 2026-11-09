import {watchConnectionAuthorization} from
  "./razorpayAuthorizationRevocation";
import {HttpsError} from "firebase-functions/v2/https";
import type {OrganizerFormPaymentDocument as Payment} from
  "../../shared/generated/firestoreAdminTypes";
import {requireDoc} from "../../shared/validation";
import {readPaymentRoute, assertPaymentRouteSnapshot,
  type PaymentRoutingSnapshot} from "../paymentRouting";
import {prepareRazorpayCollectionRouting, loadRazorpayPlatformProfile,
  razorpayCollectionRoutingDefaults as defaults,
  type RazorpayCollectionRoutingDeps as RoutingDeps} from
  "../razorpayCollectionRouting";
import {FormPaymentProcessor, type FormPaymentAuthority} from
  "./formPaymentProcessor";
import {RazorpayRouteProvider} from "./razorpayRouteProvider";
import {RazorpayRouteFormAuthority, readReadyRouteAccount} from
  "./razorpayRouteFormAuthority";

export interface FormPaymentExecution {
  processor: FormPaymentProcessor;
  authority?: FormPaymentAuthority;
}
/** Forms retain their existing OAuth fallback only when no policy is set. */
export async function prepareFormPaymentRouting(input: {
  db: FirebaseFirestore.Firestore; paymentId: string; organizerId: string;
  connectionId: string | null; amountPaise: number;
}, deps: RoutingDeps = defaults):
  Promise<{snapshot: PaymentRoutingSnapshot; runtime: FormPaymentExecution}> {
  const snapshot = await prepareRazorpayCollectionRouting({
    db: input.db, organizerId: input.organizerId, purpose: "formFee",
    connectionId: input.connectionId, amountMinor: input.amountPaise}, deps);
  const runtime = await executionForSnapshot(input.db, input.paymentId,
    snapshot, deps);
  return {snapshot, runtime};
}

/** Pinned provider and authority are always resolved together, per payment. */
export async function formPaymentExecutionFor(input: {
  db: FirebaseFirestore.Firestore; paymentId: string; payment: Payment;
}, deps: RoutingDeps = defaults): Promise<FormPaymentExecution> {
  const {db, paymentId, payment} = input;
  if (!payment.routing) {
    // Compatibility for the existing, necessarily OAuth-only ledger shape.
    if (!payment.connectionId) unavailable();
    const runtime = await deps.oauth();
    return {processor: new FormPaymentProcessor({...runtime, db,
      provider: watchConnectionAuthorization(runtime.provider,
        payment.connectionId),
      boundPaymentId: paymentId})};
  }
  assertPaymentRouteSnapshot(payment.routing, {
    organizerId: payment.organizerId,
    purpose: "formFee", currency: payment.currency,
    amountMinor: payment.amountPaise});
  return executionForSnapshot(db, paymentId, payment.routing, deps);
}

async function executionForSnapshot(db: FirebaseFirestore.Firestore,
  paymentId: string, snapshot: PaymentRoutingSnapshot, deps: RoutingDeps):
  Promise<FormPaymentExecution> {
  assertPaymentRouteSnapshot(snapshot, {organizerId: snapshot.organizerId,
    purpose: "formFee", currency: "INR"});
  if (snapshot.selection.route === "razorpayOAuth") {
    const runtime = await deps.oauth(snapshot.configurationVersion);
    if (runtime.mode !== snapshot.selection.mode) unavailable();
    // A 401 on the organizer's token means it revoked Catch's access.
    return {processor: new FormPaymentProcessor({...runtime, db,
      provider: watchConnectionAuthorization(runtime.provider,
        snapshot.bindingId),
      boundPaymentId: paymentId, expectedRouting: snapshot})};
  }
  if (snapshot.selection.route !== "razorpayRoute") unavailable();
  const profile = await deps.platform(snapshot.configurationVersion);
  const authority = new RazorpayRouteFormAuthority(db, snapshot, profile);
  const provider = new RazorpayRouteProvider({keyId: profile.keyId,
    keySecret: profile.keySecret, mode: profile.mode, terms: {
      paymentAmountMinor: snapshot.amountMinor,
      destinationAccountId: snapshot.destinationAccountId!,
      transferAmountMinor: snapshot.transferAmountMinor!,
      settlementHold: snapshot.settlementHold!,
    }});
  return {authority, processor: new FormPaymentProcessor({db, provider,
    authority, boundPaymentId: paymentId, expectedRouting: snapshot})};
}

function unavailable(): never {
  throw new HttpsError("failed-precondition",
    "The selected payment collection route is not ready.");
}

/** Recovery does not depend on current routing configuration. */
export function routedFormPaymentProcessor(db: FirebaseFirestore.Firestore) {
  return {reconcile: async (paymentId: string, providerPaymentId?: string) => {
    const payment = requireDoc<Payment>(await db
      .collection("organizerFormPayments").doc(paymentId).get(),
    "OrganizerFormPaymentDocument");
    const {processor} = await formPaymentExecutionFor({db, paymentId, payment});
    return processor.reconcile(paymentId, providerPaymentId);
  }};
}

/** Safe Host setup projection without fallback to another route. */
export async function formPaymentCollectionSetup(input: {
  db: FirebaseFirestore.Firestore; organizerId: string;
}, deps: RoutingDeps = defaults): Promise<{
  route: "disabled" | PaymentRoutingSnapshot["selection"]["route"];
  mode: "test" | "live" | null; ready: boolean;
} | null> {
  let selected;
  try {
    selected = await readPaymentRoute({...input, purpose: "formFee",
      legacySelection: {route: "razorpayOAuth", mode: "test",
        currency: "INR", merchantCountry: "IN"}});
  } catch {
    return {route: "disabled", mode: null, ready: false};
  }
  if (selected.policySource === "legacy") return null;
  const {route, mode, currency, merchantCountry} = selected.selection;
  const result = {route, mode, ready: false};
  if (currency !== "INR" || merchantCountry !== "IN") return result;
  try {
    if (route === "razorpayRoute") {
      const profile = await deps.platform(deps.platformVersion());
      if (profile.mode !== mode) return result;
      const {account} = await readReadyRouteAccount(input);
      await deps.verifyDestination(profile, account.providerAccountId,
        account.razorpayProductId!);
      return {...result, ready: true};
    }
    if (route === "razorpayOAuth") {
      const runtime = await deps.oauth();
      return {...result, ready: runtime.mode === mode};
    }
  } catch {
    return result;
  }
  return result;
}

export function loadFormPlatformProfile(configurationVersion: string) {
  return loadRazorpayPlatformProfile(configurationVersion);
}
