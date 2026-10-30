import * as admin from "firebase-admin";
import Razorpay from "razorpay";
import {HttpsError} from "firebase-functions/v2/https";
import type {OrganizerPaymentConnectionDocument as Connection} from
  "../shared/generated/firestoreAdminTypes";
import {requireDoc} from "../shared/validation";
import {PaymentRoutingRegistry, readPaymentRoute, assertPaymentRouteCurrent,
  assertPaymentRouteSnapshot,
  type PaymentPurpose, type PaymentRoutingSnapshot} from "./paymentRouting";
import {RazorpayPlatformPaymentConfigLoader,
  razorpayPlatformPaymentConfigVersion,
  type RazorpayPlatformPaymentConfig} from "./razorpayPlatformPaymentConfig";
import {formPaymentRuntime} from "./formPayments/formPaymentRuntime";
import {resolveCommercialTerms, resolveCommercialTermsIfConfigured} from
  "../commercialTerms/resolver";
import {atSourceFeeMinor, moneyFlowForRoute, type CommercialTermsSnapshot} from
  "../commercialTerms/terms";
import {requireReadyFormPaymentConnection} from
  "./formPayments/formPaymentConnectionPolicy";
import {readReadyRouteAccount} from
  "./formPayments/razorpayRouteFormAuthority";

let platformConfig: RazorpayPlatformPaymentConfigLoader | undefined;

function platformLoader(): RazorpayPlatformPaymentConfigLoader {
  const projectId = admin.app().options.projectId ??
    process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "";
  platformConfig ??= new RazorpayPlatformPaymentConfigLoader(projectId);
  return platformConfig;
}

export interface RazorpayCollectionRoutingDeps {
  oauth: typeof formPaymentRuntime;
  platformVersion: () => string;
  platform: (version: string) => Promise<RazorpayPlatformPaymentConfig>;
  verifyDestination: (profile: RazorpayPlatformPaymentConfig,
    accountId: string, productId: string) => Promise<void>;
  /** Injectable clock for the commercial terms snapshot. */
  now?: () => number;
}
export const razorpayCollectionRoutingDefaults:
  RazorpayCollectionRoutingDeps = {
    oauth: formPaymentRuntime,
    platformVersion: () => razorpayPlatformPaymentConfigVersion.value().trim(),
    platform: (version) => platformLoader().load(version),
    verifyDestination: async (profile, accountId, productId) => {
      try {
        const client = new Razorpay({key_id: profile.keyId,
          key_secret: profile.keySecret});
        const [account, product] = await Promise.all([
          client.accounts.fetch(accountId),
          client.products.fetch(accountId, productId),
        ]);
        const accountData = account as unknown as {id: string; status: string};
        const productData = product as unknown as {
        id: string; activation_status: string};
        if (accountData.id !== accountId ||
          !["created", "activated"].includes(accountData.status) ||
          productData.id !== productId ||
          productData.activation_status !== "activated") unavailable();
      } catch {
      // Provider replies can include onboarding details. Keep errors bounded.
        unavailable();
      }
    },
  };

/** Only new attempts choose policy. */
export async function prepareRazorpayCollectionRouting(input: {
  db: FirebaseFirestore.Firestore; organizerId: string;
  purpose: PaymentPurpose; connectionId: string | null; amountMinor: number;
}, deps: RazorpayCollectionRoutingDeps = razorpayCollectionRoutingDefaults):
  Promise<PaymentRoutingSnapshot> {
  const {db, organizerId, purpose, amountMinor} = input;
  let {connectionId} = input;
  if (!["formFee", "eventAdmission"].includes(purpose)) unavailable();
  const connectionSnap = connectionId ? await db
    .collection("organizerPaymentConnections").doc(connectionId).get() : null;
  let connection = connectionSnap?.exists ? requireDoc<Connection>(
    connectionSnap, "OrganizerPaymentConnectionDocument") : null;
  const selected = await readPaymentRoute({db, organizerId, purpose,
    legacySelection: purpose === "formFee" && connection ? {
      route: "razorpayOAuth", mode: connection.mode,
      currency: "INR", merchantCountry: "IN"} :
      undefined});
  if (purpose === "eventAdmission" && !connectionId &&
      selected.selection.route === "razorpayOAuth") {
    const candidates = await db.collection("organizerPaymentConnections")
      .where("organizerId", "==", organizerId).where("status", "==", "ready")
      .where("mode", "==", selected.selection.mode).limit(2).get();
    // Multiple merchants require Host reconciliation, never a guessed choice.
    if (candidates.docs.length !== 1) unavailable();
    connectionId = candidates.docs[0].id;
    connection = requireDoc<Connection>(candidates.docs[0],
      "OrganizerPaymentConnectionDocument");
  }
  // Terms are frozen with the attempt. A platformSplit route deducts its fee
  // from them, so it cannot run without them; a hostCollected route only
  // feeds the later commission statement and proceeds without a snapshot.
  const moneyFlow = moneyFlowForRoute(selected.selection.route);
  const termsInput = {db, organizerId, purpose,
    nowMillis: (deps.now ?? Date.now)()};
  const commercialTerms: CommercialTermsSnapshot | null =
    moneyFlow === "platformSplit" ?
      await resolveCommercialTerms({...termsInput, moneyFlow}) :
      moneyFlow === "hostCollected" ?
        await resolveCommercialTermsIfConfigured({...termsInput, moneyFlow}) :
        null;
  const registry = new PaymentRoutingRegistry<PaymentRoutingSnapshot>({
    razorpayOAuth: {
      prepare: async ({selection}) => {
        const ready = requireReadyFormPaymentConnection(connection,
          organizerId, Date.now());
        if (!connectionId || ready.mode !== selection.mode) unavailable();
        const runtime = await deps.oauth();
        if (runtime.mode !== selection.mode) unavailable();
        await runtime.credentials.access({organizerId, connectionId,
          accountId: ready.accountId!, mode: ready.mode});
        return {bindingId: connectionId, merchantAccountId: ready.accountId!,
          destinationAccountId: null, checkoutKey: ready.publicToken!,
          configurationVersion: runtime.configurationVersion,
          transferAmountMinor: null, settlementHold: null};
      },
      resume: async (snapshot) => snapshot,
    },
    razorpayRoute: {
      prepare: async ({selection}) => {
        const configurationVersion = deps.platformVersion();
        const profile = await deps.platform(configurationVersion);
        if (profile.mode !== selection.mode) unavailable();
        const {bindingId, account} = await readReadyRouteAccount({db,
          organizerId});
        await deps.verifyDestination(profile, account.providerAccountId,
          account.razorpayProductId!);
        if (!commercialTerms) unavailable();
        const feeMinor = atSourceFeeMinor(commercialTerms, amountMinor);
        const transferAmountMinor = amountMinor - feeMinor;
        if (transferAmountMinor < 100) unavailable();
        return {bindingId, merchantAccountId: profile.platformAccountId,
          destinationAccountId: account.providerAccountId,
          checkoutKey: profile.keyId, configurationVersion,
          transferAmountMinor, settlementHold: purpose === "eventAdmission"};
      },
      resume: async (snapshot) => snapshot,
    },
  });
  const prepared = await registry.prepare({organizerId, purpose,
    currency: "INR", amountMinor, selected});
  if (!commercialTerms) return prepared.snapshot;
  const snapshot = {...prepared.snapshot, commercialTerms};
  assertPaymentRouteSnapshot(snapshot, {organizerId, purpose, currency: "INR"});
  return snapshot;
}

function unavailable(): never {
  throw new HttpsError("failed-precondition",
    "The selected payment collection route is not ready.");
}

export function loadRazorpayPlatformProfile(configurationVersion: string) {
  return platformLoader().load(configurationVersion);
}

/** Recheck server-owned selection and account binding before a new hold/order.
 * Existing payment recovery uses its snapshot, never current policy selection.
 */
export async function assertRazorpayCollectionRoutingCurrent(params: {
  db: FirebaseFirestore.Firestore; tx: FirebaseFirestore.Transaction;
  snapshot: PaymentRoutingSnapshot; nowMillis: number;
}): Promise<void> {
  const {snapshot} = params;
  assertPaymentRouteSnapshot(snapshot, {organizerId: snapshot.organizerId,
    purpose: snapshot.purpose, currency: "INR"});
  await assertPaymentRouteCurrent(params);
  if (snapshot.purpose === "eventAdmission" &&
      snapshot.selection.route === "razorpayOAuth") {
    const candidates = await params.tx.get(params.db
      .collection("organizerPaymentConnections")
      .where("organizerId", "==", snapshot.organizerId)
      .where("status", "==", "ready")
      .where("mode", "==", snapshot.selection.mode).limit(2));
    if (candidates.docs.length !== 1 ||
        candidates.docs[0].id !== snapshot.bindingId) unavailable();
  }
  await assertRazorpayCollectionBindingReady(params);
}

/** Existing attempts retain policy; new orders check account readiness. */
export async function assertRazorpayCollectionBindingReady(params: {
  db: FirebaseFirestore.Firestore; tx: FirebaseFirestore.Transaction;
  snapshot: PaymentRoutingSnapshot; nowMillis: number;
}): Promise<void> {
  const {db, tx, snapshot, nowMillis} = params;
  assertPaymentRouteSnapshot(snapshot, {organizerId: snapshot.organizerId,
    purpose: snapshot.purpose, currency: "INR"});
  if (snapshot.selection.route === "razorpayRoute") {
    const {account} = await readReadyRouteAccount({db, tx,
      organizerId: snapshot.organizerId,
      expectedBindingId: snapshot.bindingId});
    if (account.providerAccountId !== snapshot.destinationAccountId ||
        snapshot.settlementHold !== (snapshot.purpose === "eventAdmission")) {
      unavailable();
    }
    return;
  }
  if (snapshot.selection.route !== "razorpayOAuth") unavailable();
  const connection = requireDoc<Connection>(await tx.get(db
    .collection("organizerPaymentConnections").doc(snapshot.bindingId)),
  "OrganizerPaymentConnectionDocument");
  const ready = requireReadyFormPaymentConnection(connection,
    snapshot.organizerId, nowMillis);
  if (ready.accountId !== snapshot.merchantAccountId ||
      ready.mode !== snapshot.selection.mode ||
      ready.publicToken !== snapshot.checkoutKey) unavailable();
}
