import type {
  EventMembershipRulesDocument,
  HostMembershipDocument,
  HostMembershipPlanDocument,
} from "../shared/generated/firestoreAdminTypes";
import {validateEventMembershipRulesDocument} from
  "../shared/generated/validators/eventMembershipRulesDocument";
import {validateHostMembershipBenefitUseDocument} from
  "../shared/generated/validators/hostMembershipBenefitUseDocument";
import {validateHostMembershipDocument} from
  "../shared/generated/validators/hostMembershipDocument";
import {validateHostMembershipPlanDocument} from
  "../shared/generated/validators/hostMembershipPlanDocument";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {
  evaluateHostMembershipEntitlement,
  membershipIsEntitled,
  type HostMembershipEntitlement,
  type PlanFacts,
} from "./entitlement";
import {hostMembershipBenefitUseId, hostMembershipId} from "./ids";
import {collections, HostMembershipIntegrityError} from "./membershipStore";

/** Plans per organizer are bounded by the plans callable. */
export const maxPlansPerOrganizer = 20;

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

export interface HostMembershipContext {
  membershipId: string;
  rules: EventMembershipRulesDocument | null;
  membership: HostMembershipDocument | null;
  plan: PlanFacts | null;
  publishedPlans: PlanFacts[];
  upcomingMemberPricedBookings: number;
}

export function planFacts(planId: string, plan: HostMembershipPlanDocument):
  PlanFacts {
  return {planId, name: plan.name, status: plan.status, prices: plan.prices,
    memberCap: plan.memberCap, benefits: plan.benefits, limits: plan.limits,
    activeMemberCount: plan.activeMemberCount};
}

function integrity(): never {
  throw new HostMembershipIntegrityError("Invalid host membership source.");
}

/**
 * Reads everything the evaluator needs, in the caller's transaction when one
 * is given. An organizer without plans costs two single-document reads and
 * one bounded query.
 */
export async function readHostMembershipContext(params: {
  db: Db; tx?: Tx; organizerId: string; uid: string; eventId: string;
  nowMillis: number;
}): Promise<HostMembershipContext> {
  const {db, tx, organizerId, uid, eventId, nowMillis} = params;
  const get = (ref: FirebaseFirestore.DocumentReference) =>
    tx ? tx.get(ref) : ref.get();
  const query = (q: FirebaseFirestore.Query) => tx ? tx.get(q) : q.get();
  const membershipId = hostMembershipId(organizerId, uid);
  const [rulesSnap, membershipSnap, plansSnap] = await Promise.all([
    get(db.collection(collections.eventRules).doc(eventId)),
    get(db.collection(collections.memberships).doc(membershipId)),
    query(db.collection(collections.plans)
      .where("organizerId", "==", organizerId)
      .limit(maxPlansPerOrganizer + 1)),
  ]);
  const rulesRaw = rulesSnap.data();
  if (rulesRaw !== undefined &&
      !validateEventMembershipRulesDocument(rulesRaw)) integrity();
  const rules = rulesRaw && rulesRaw.organizerId === organizerId &&
    rulesRaw.eventId === eventId ? rulesRaw : null;
  const membershipRaw = membershipSnap.data();
  if (membershipRaw !== undefined &&
      (!validateHostMembershipDocument(membershipRaw) ||
        membershipRaw.uid !== uid ||
        membershipRaw.organizerId !== organizerId)) integrity();
  const membership = membershipRaw ?? null;
  const plans: PlanFacts[] = [];
  for (const doc of plansSnap.docs) {
    const data = doc.data();
    if (!validateHostMembershipPlanDocument(data) ||
        data.organizerId !== organizerId) integrity();
    plans.push(planFacts(doc.id, data));
  }
  const plan = membership ?
    plans.find((entry) => entry.planId === membership.planId) ?? null : null;

  let upcomingMemberPricedBookings = 0;
  const cap = plan?.limits.maxUpcomingMemberPricedBookings ?? null;
  if (membership && plan && cap !== null &&
      membershipIsEntitled(membership, nowMillis)) {
    const uses = await query(db.collection(collections.benefitUses)
      .where("uid", "==", uid).where("organizerId", "==", organizerId)
      .where("state", "==", "booked")
      .where("eventStartMillis", ">", nowMillis)
      .orderBy("eventStartMillis").limit(cap + 2));
    const candidates = uses.docs.filter((doc) => {
      const data = doc.data();
      return validateHostMembershipBenefitUseDocument(data) &&
        data.eventId !== eventId &&
        doc.id === hostMembershipBenefitUseId(data.eventId, uid);
    }).map((doc) => doc.data().eventId as string);
    // A cancelled booking no longer counts even if its use was not released.
    const participations = await Promise.all(candidates.map((id) =>
      get(db.collection("eventParticipations")
        .doc(eventParticipationId(id, uid)))));
    upcomingMemberPricedBookings = participations.filter((snap) =>
      snap.data()?.status === "signedUp").length;
  }
  return {membershipId, rules, membership, plan,
    publishedPlans: plans.filter((entry) => entry.status === "published"),
    upcomingMemberPricedBookings};
}

export function evaluateHostMembershipContext(context: HostMembershipContext,
  listPriceInPaise: number, nowMillis: number): HostMembershipEntitlement {
  return evaluateHostMembershipEntitlement({listPriceInPaise,
    rules: context.rules, membership: context.membership, plan: context.plan,
    publishedPlans: context.publishedPlans,
    upcomingMemberPricedBookings: context.upcomingMemberPricedBookings,
    nowMillis});
}

export const hostMembershipRestrictionCopy = {
  paidMembershipRequired: "This event is for members only.",
  memberEarlyAccess:
    "Members are booking early. General sale opens soon.",
} as const;

/** Records a booking made at a member price; idempotent per event/member. */
export async function recordHostMembershipBenefitUse(params: {
  db: Db; context: HostMembershipContext;
  entitlement: HostMembershipEntitlement; eventId: string;
  eventStartMillis: number; nowMillis: number;
}): Promise<void> {
  const {db, context, entitlement} = params;
  if (!entitlement.memberPriceApplied || !context.membership) return;
  const membership = context.membership;
  await db.collection(collections.benefitUses)
    .doc(hostMembershipBenefitUseId(params.eventId, membership.uid))
    .set({schemaVersion: 1, membershipId: context.membershipId,
      organizerId: membership.organizerId, uid: membership.uid,
      eventId: params.eventId, planId: membership.planId,
      listPriceInPaise: entitlement.listPriceInPaise,
      paidPriceInPaise: entitlement.priceInPaise,
      savingsInPaise: entitlement.savingsInPaise,
      eventStartMillis: params.eventStartMillis, state: "booked",
      createdAtMillis: params.nowMillis});
}

/** Releases a member-priced booking after the attendee cancels it. */
export async function releaseHostMembershipBenefitUse(db: Db,
  eventId: string, uid: string): Promise<void> {
  const ref = db.collection(collections.benefitUses)
    .doc(hostMembershipBenefitUseId(eventId, uid));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.data()?.state === "booked") tx.update(ref, {state: "released"});
  });
}
