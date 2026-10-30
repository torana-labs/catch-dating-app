import type {
  HostMembershipCheckoutDocument,
  HostMembershipDocument,
  HostMembershipPlanDocument,
  HostMembershipProgramDocument,
} from "../shared/generated/firestoreAdminTypes";
import {validateHostMembershipCheckoutDocument} from
  "../shared/generated/validators/hostMembershipCheckoutDocument";
import {validateHostMembershipDocument} from
  "../shared/generated/validators/hostMembershipDocument";
import {validateHostMembershipPlanDocument} from
  "../shared/generated/validators/hostMembershipPlanDocument";
import {validateHostMembershipProgramDocument} from
  "../shared/generated/validators/hostMembershipProgramDocument";
import type {ProviderSubscriptionSnapshot} from "./billingProvider";
import {hostMembershipId, isHostMembershipCheckoutId} from "./ids";
import type {MembershipPaymentBinding} from "./runtime";
import {nextMembershipState, type MembershipIntent} from "./stateMachine";

export const collections = {
  programs: "hostMembershipPrograms",
  plans: "hostMembershipPlans",
  memberships: "hostMemberships",
  checkouts: "hostMembershipCheckouts",
  charges: "hostMembershipCharges",
  receipts: "hostMembershipWebhookReceipts",
  benefitUses: "hostMembershipBenefitUses",
  eventRules: "eventMembershipRules",
} as const;

type Tx = FirebaseFirestore.Transaction;
type Db = FirebaseFirestore.Firestore;

export class HostMembershipIntegrityError extends Error {}

function integrity(message: string): never {
  throw new HostMembershipIntegrityError(message);
}

export async function readValid<T>(tx: Tx, ref: FirebaseFirestore
  .DocumentReference, validate: (value: unknown) => value is T):
  Promise<T | null> {
  const snap = await tx.get(ref);
  if (!snap.exists) return null;
  const data = snap.data();
  if (!validate(data)) integrity(`Invalid ${ref.path}`);
  return data;
}

export const readMembership = (db: Db, tx: Tx, id: string) =>
  readValid<HostMembershipDocument>(tx,
    db.collection(collections.memberships).doc(id),
    validateHostMembershipDocument);
export const readPlan = (db: Db, tx: Tx, id: string) =>
  readValid<HostMembershipPlanDocument>(tx,
    db.collection(collections.plans).doc(id),
    validateHostMembershipPlanDocument);
export const readProgram = (db: Db, tx: Tx, organizerId: string) =>
  readValid<HostMembershipProgramDocument>(tx,
    db.collection(collections.programs).doc(organizerId),
    validateHostMembershipProgramDocument);
export const readCheckout = (db: Db, tx: Tx, id: string) =>
  readValid<HostMembershipCheckoutDocument>(tx,
    db.collection(collections.checkouts).doc(id),
    validateHostMembershipCheckoutDocument);

export interface AppliedSnapshot {
  membershipId: string | null;
  membership: HostMembershipDocument | null;
  checkoutId: string | null;
  outcome: "applied" | "stale" | "ignored";
}

/**
 * The only writer of hostMemberships. Resolves the purchase from the
 * provider subscription's Catch notes, applies the pure transition and moves
 * member counters in the same transaction.
 */
export async function applySubscriptionSnapshot(params: {
  db: Db;
  snapshot: ProviderSubscriptionSnapshot;
  observedAtMillis: number;
  nowMillis: number;
  catchProject: string;
  intent?: MembershipIntent | null;
  expectedMembershipId?: string;
  /**
   * The account the snapshot was read from or delivered by. A snapshot only
   * applies to a checkout created on that same account, so an organizer's
   * merchant account can never write another account's memberships.
   */
  deliveredBy?: Pick<MembershipPaymentBinding, "moneyFlow" | "bindingId">;
}): Promise<AppliedSnapshot> {
  const {db, snapshot, nowMillis} = params;
  const ignored: AppliedSnapshot = {membershipId: null, membership: null,
    checkoutId: null, outcome: "ignored"};
  const checkoutId = snapshot.notes.catchCheckoutId;
  if (snapshot.notes.catchProject !== params.catchProject ||
      !isHostMembershipCheckoutId(checkoutId)) return ignored;
  return db.runTransaction(async (tx) => {
    const checkoutRef = db.collection(collections.checkouts).doc(checkoutId);
    const checkout = await readCheckout(db, tx, checkoutId);
    if (!checkout || checkout.uid !== snapshot.notes.uid ||
        checkout.organizerId !== snapshot.notes.organizerId ||
        checkout.planId !== snapshot.notes.planId ||
        checkout.providerSubscriptionId !== null &&
          checkout.providerSubscriptionId !== snapshot.id) {
      return {...ignored, checkoutId};
    }
    const delivered = params.deliveredBy;
    if (delivered) {
      const owner = checkout.payment;
      const ownerFlow = owner?.moneyFlow ?? "platformSplit";
      if (ownerFlow !== delivered.moneyFlow ||
          ownerFlow === "hostCollected" &&
            owner?.bindingId !== delivered.bindingId) {
        return {...ignored, checkoutId};
      }
    }
    const membershipId = hostMembershipId(checkout.organizerId, checkout.uid);
    if (params.expectedMembershipId &&
        params.expectedMembershipId !== membershipId) {
      return {...ignored, checkoutId};
    }
    const membershipRef = db.collection(collections.memberships)
      .doc(membershipId);
    const planRef = db.collection(collections.plans).doc(checkout.planId);
    const programRef = db.collection(collections.programs)
      .doc(checkout.organizerId);
    const [current, plan, program] = await Promise.all([
      readMembership(db, tx, membershipId),
      readPlan(db, tx, checkout.planId),
      readProgram(db, tx, checkout.organizerId),
    ]);
    const transition = nextMembershipState({current, snapshot,
      observedAtMillis: params.observedAtMillis, nowMillis,
      intent: params.intent ?? null,
      seed: plan ? {organizerId: checkout.organizerId, uid: checkout.uid,
        planId: checkout.planId, planName: plan.name,
        interval: checkout.interval, priceInPaise: checkout.priceInPaise,
        checkoutId} : null});
    let next = transition.next;
    // The membership records the account its current subscription lives on.
    if (next && checkout.payment &&
        next.providerSubscriptionId === snapshot.id) {
      next = {...next, payment: {...checkout.payment}};
    }
    if (transition.outcome === "applied" && next) {
      if (!validateHostMembershipDocument(next)) {
        integrity("Membership transition produced an invalid document.");
      }
      tx.set(membershipRef, next);
      if (transition.countDelta !== 0) {
        if (plan) {
          tx.update(planRef, {activeMemberCount: Math.max(0,
            plan.activeMemberCount + transition.countDelta)});
        }
        if (program) {
          tx.update(programRef, {memberCount: Math.max(0,
            program.memberCount + transition.countDelta),
          updatedAtMillis: nowMillis});
        }
      }
    }
    const owned = next?.providerSubscriptionId === snapshot.id;
    const checkoutState: HostMembershipCheckoutDocument["state"] =
      owned && next && next.status !== "expired" ? "authorized" :
        ["halted", "cancelled", "completed", "expired"]
          .includes(snapshot.status) && checkout.state !== "authorized" ?
          "failed" : checkout.state;
    if (checkoutState !== checkout.state ||
        checkout.providerSubscriptionId === null) {
      tx.update(checkoutRef, {state: checkoutState,
        providerSubscriptionId: snapshot.id, updatedAtMillis: nowMillis});
    }
    return {membershipId, membership: next, checkoutId,
      outcome: transition.outcome};
  });
}
