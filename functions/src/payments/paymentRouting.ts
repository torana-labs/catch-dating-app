import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {PaymentRoutingPolicyDocument as Policy} from
  "../shared/generated/firestoreAdminTypes";
import type {PaymentRoutingSnapshot} from
  "../shared/generated/paymentRoutingSnapshot";
import {validatePaymentRoutingPolicyDocument} from
  "../shared/generated/validators/paymentRoutingPolicyDocument";
import {validatePaymentRoutingSnapshot} from
  "../shared/generated/validators/paymentRoutingSnapshot";
import {commercialTermsSnapshotsEqual} from "../commercialTerms/terms";

export type PaymentPurpose = "formFee" | "eventAdmission";
/** Routing policies also select the membership money flow. Memberships are
 * subscriptions, not orders, so they never produce a PaymentRoutingSnapshot.
 */
export type PaymentRoutingPurpose = PaymentPurpose | "hostMembership";
export type {PaymentRoutingSnapshot};
export type PaymentRouteSelection = PaymentRoutingSnapshot["selection"];
export type PaymentRoute = PaymentRouteSelection["route"];
export type PaymentRouteBinding = Pick<PaymentRoutingSnapshot,
  "bindingId" | "merchantAccountId" | "destinationAccountId" |
  "configurationVersion" | "checkoutKey" | "transferAmountMinor" |
  "settlementHold">;
export interface SelectedPaymentRoute {
  selection: PaymentRouteSelection;
  policySource: PaymentRoutingSnapshot["policySource"];
  appRevision: number;
  organizerRevision: number;
}

/** Stable hashed ids avoid app/organizer collisions and path interpretation. */
export function organizerPaymentPolicyId(organizerId: string): string {
  assertOrganizerId(organizerId);
  return `org_${createHash("sha256").update(organizerId).digest("hex")}`;
}

/** These are server-owned policies, never unchecked client checkout options. */
export async function readPaymentRoute(params: {
  db: FirebaseFirestore.Firestore; tx?: FirebaseFirestore.Transaction;
  organizerId: string; purpose: PaymentRoutingPurpose;
  legacySelection?: PaymentRouteSelection;
}): Promise<SelectedPaymentRoute> {
  const {db, tx, organizerId} = params;
  const refs = [db.collection("paymentRoutingPolicies").doc("app"),
    db.collection("paymentRoutingPolicies")
      .doc(organizerPaymentPolicyId(organizerId))];
  const snapshots = await Promise.all(refs.map((ref) =>
    tx ? tx.get(ref) : ref.get()));
  const policies = snapshots.map((snap) => snap.exists ?
    parsePaymentRoutingPolicy(snap.data()) : null);
  return selectPaymentRoute({...params, app: policies[0],
    organizer: policies[1]});
}

export function selectPaymentRoute(params: {
  organizerId: string; purpose: PaymentRoutingPurpose;
  app: Policy | null; organizer: Policy | null;
  legacySelection?: PaymentRouteSelection;
}): SelectedPaymentRoute {
  const {organizerId, purpose, app, organizer, legacySelection} = params;
  assertOrganizerId(organizerId);
  if (app) parsePaymentRoutingPolicy(app);
  if (organizer) parsePaymentRoutingPolicy(organizer);
  if (app && (app.scope !== "app" || app.organizerId !== null) ||
      organizer && (organizer.scope !== "organizer" ||
        organizer.organizerId !== organizerId)) {
    throw new HttpsError("failed-precondition",
      "Payment policy scope mismatch.");
  }
  const override = organizer?.[purpose];
  // Absence alone preserves the explicit legacy choice. A present app policy
  // A null purpose disables that purpose instead of reopening a legacy rail.
  const selection = override ?? (app ? app[purpose] ?? null : legacySelection);
  if (!selection || selection.route === "disabled") {
    throw new HttpsError("failed-precondition",
      "Automatic payments are disabled for this purpose.");
  }
  return {selection: {...selection},
    policySource: override ? "organizer" : app ? "app" : "legacy",
    appRevision: app?.revision ?? 0,
    organizerRevision: organizer?.revision ?? 0};
}

/** Adapters must verify provider/account eligibility, not infer it from config.
 * Readiness may do provider reads BEFORE a reservation transaction. The binding
 * returned to a transaction must be rechecked against its server-owned record.
 * Stripe adapters are deliberately absent until a supported integration exists.
 */
export interface PaymentRoutingAdapter<Runtime> {
  prepare(input: {organizerId: string; purpose: PaymentPurpose;
    selection: PaymentRouteSelection;
    amountMinor: number}): Promise<PaymentRouteBinding>;
  resume(snapshot: PaymentRoutingSnapshot): Promise<Runtime>;
}

/** Old payments execute only through their saved snapshot. */
export class PaymentRoutingRegistry<Runtime> {
  constructor(private readonly adapters:
    Partial<Record<PaymentRoute, PaymentRoutingAdapter<Runtime>>>) {}

  async prepare(input: {organizerId: string; purpose: PaymentPurpose;
    currency: string; amountMinor: number; selected: SelectedPaymentRoute}):
    Promise<{snapshot: PaymentRoutingSnapshot; runtime: Runtime}> {
    const {selected, organizerId, purpose, currency, amountMinor} = input;
    assertOrganizerId(organizerId);
    if (selected.selection.currency !== currency) {
      throw new HttpsError("failed-precondition",
        "The selected payment route does not support this currency.");
    }
    const adapter = this.adapter(selected.selection.route);
    const binding = await adapter.prepare({organizerId, purpose,
      selection: selected.selection, amountMinor});
    const snapshot: PaymentRoutingSnapshot = {version: 1, organizerId,
      purpose, amountMinor, ...selected,
      selection: {...selected.selection}, ...binding};
    assertPaymentRouteSnapshot(snapshot, {organizerId, purpose, currency});
    return {snapshot, runtime: await adapter.resume(snapshot)};
  }

  async resume(snapshot: PaymentRoutingSnapshot,
    expected: {organizerId: string; purpose: PaymentPurpose; currency: string}):
    Promise<Runtime> {
    assertPaymentRouteSnapshot(snapshot, expected);
    // No policy reads, availability fallback or current default here. Refunds
    // and reconciliation must retain their original merchant after a switch.
    return this.adapter(snapshot.selection.route).resume(snapshot);
  }

  private adapter(route: PaymentRoute): PaymentRoutingAdapter<Runtime> {
    const adapter = this.adapters[route];
    if (!adapter) {
      throw new HttpsError("failed-precondition",
        "The selected payment integration is not available yet.");
    }
    return adapter;
  }
}

export function assertPaymentRouteSnapshot(snapshot: PaymentRoutingSnapshot,
  expected: {organizerId: string; purpose: PaymentPurpose; currency: string;
    amountMinor?: number}):
  void {
  if (!validatePaymentRoutingSnapshot(snapshot) ||
      snapshot.organizerId !== expected.organizerId ||
      snapshot.purpose !== expected.purpose ||
      snapshot.selection.currency !== expected.currency ||
      expected.amountMinor !== undefined &&
        snapshot.amountMinor !== expected.amountMinor ||
      !snapshot.bindingId || !snapshot.merchantAccountId ||
      !snapshot.configurationVersion) {
    throw new HttpsError("failed-precondition", "Payment routing mismatch.");
  }
  const route = snapshot.selection.route;
  const platform = route === "razorpayRoute" ||
    route === "stripeConnectDestination";
  if (platform !== !!snapshot.destinationAccountId ||
      platform !== (snapshot.transferAmountMinor !== null) ||
      platform !== (snapshot.settlementHold !== null) ||
      snapshot.transferAmountMinor !== null &&
        snapshot.transferAmountMinor > snapshot.amountMinor ||
      platform &&
        snapshot.destinationAccountId === snapshot.merchantAccountId) {
    throw new HttpsError("failed-precondition",
      "Payment collection account does not match the selected route.");
  }
  // This adapter boundary currently implements domestic Razorpay only. A
  // future cross-border route needs its own eligibility proof and contract.
  if ((route === "razorpayRoute" || route === "razorpayOAuth") &&
      (snapshot.selection.currency !== "INR" ||
        snapshot.selection.merchantCountry !== "IN" ||
        !snapshot.checkoutKey ||
        !snapshot.checkoutKey.startsWith(`rzp_${snapshot.selection.mode}_`))) {
    throw new HttpsError("failed-precondition",
      "This Razorpay integration supports Indian INR payments only.");
  }
}

/** Re-read policy in the reservation transaction; checkout preparation is not
 * permission to charge after the operator changes routing or disables fees. */
export async function assertPaymentRouteCurrent(params: {
  db: FirebaseFirestore.Firestore; tx: FirebaseFirestore.Transaction;
  snapshot: PaymentRoutingSnapshot;
}): Promise<void> {
  const {snapshot} = params;
  const current = await readPaymentRoute({...params,
    organizerId: snapshot.organizerId, purpose: snapshot.purpose,
    legacySelection: snapshot.policySource === "legacy" ?
      snapshot.selection : undefined});
  const key = (value: SelectedPaymentRoute) => JSON.stringify([
    value.policySource, value.appRevision, value.organizerRevision,
    value.selection.route, value.selection.mode, value.selection.currency,
    value.selection.merchantCountry,
  ]);
  if (key(current) !== key(snapshot)) {
    throw new HttpsError("aborted",
      "Payment routing changed. Review it again.");
  }
}

export function parsePaymentRoutingPolicy(value: unknown): Policy {
  if (!validatePaymentRoutingPolicyDocument(value)) {
    throw new HttpsError("failed-precondition",
      "Invalid payment routing policy.");
  }
  return value as unknown as Policy;
}

export function paymentRoutingSnapshotsMatch(left: PaymentRoutingSnapshot,
  right: PaymentRoutingSnapshot): boolean {
  if (!validatePaymentRoutingSnapshot(left) ||
      !validatePaymentRoutingSnapshot(right)) return false;
  for (const field of new Set([...Object.keys(left), ...Object.keys(right)]) as
    Set<keyof PaymentRoutingSnapshot>) {
    if (field === "selection") continue;
    if (field === "commercialTerms") {
      if (!commercialTermsSnapshotsEqual(left.commercialTerms,
        right.commercialTerms)) return false;
      continue;
    }
    if (left[field] !== right[field]) return false;
  }
  return (["route", "mode", "currency", "merchantCountry"] as const)
    .every((field) => left.selection[field] === right.selection[field]);
}

function assertOrganizerId(value: string): void {
  if (!value || value.length > 128 || value.includes("/") ||
      value === "." || value === "..") {
    throw new HttpsError("invalid-argument", "Invalid organizer identity.");
  }
}
