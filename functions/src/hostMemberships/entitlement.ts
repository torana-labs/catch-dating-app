import type {
  EventMembershipRulesDocument,
  HostMembershipDocument,
  HostMembershipPlanDocument,
} from "../shared/generated/firestoreAdminTypes";

/** Entitlements survive this long after a period end while retries run. */
export const pastDueGraceMillis = 3 * 24 * 60 * 60 * 1000;
/** Razorpay's smallest chargeable amount. */
const minimumChargeInPaise = 100;

export type MembershipStatus = HostMembershipDocument["status"];
export type PlanBenefit = HostMembershipPlanDocument["benefits"][number];
export type MemberPriceOverride =
  EventMembershipRulesDocument["memberPriceOverrides"][number];

export type MembershipFacts = Pick<HostMembershipDocument,
  "status" | "pause" | "currentPeriodEndMillis" | "trialEndsAtMillis" |
  "planId">;
export type PlanFacts = Pick<HostMembershipPlanDocument,
  "name" | "status" | "prices" | "memberCap" | "benefits" | "limits" |
  "activeMemberCount"> & {planId: string};
export type RulesFacts = Pick<EventMembershipRulesDocument,
  "memberPriceOverrides" | "earlyAccess" | "membersOnly">;

/**
 * Whether a membership grants enforced benefits now. A host billing pause
 * keeps entitlements (a seasonal break the host chose); a member pause stops
 * them. The period-end guard bounds access if provider evidence is lost.
 */
export function membershipIsEntitled(membership: MembershipFacts,
  nowMillis: number): boolean {
  switch (membership.status) {
  case "paused":
    return membership.pause?.initiator === "host";
  case "expired":
    return false;
  default: {
    const endsAt = membership.currentPeriodEndMillis ??
      membership.trialEndsAtMillis;
    return endsAt !== null && nowMillis < endsAt + pastDueGraceMillis;
  }
  }
}

/** Badges and CRM count paused members as members; expired ones are lapsed. */
export function membershipIsCurrent(membership: MembershipFacts,
  nowMillis: number): boolean {
  return membership.status === "paused" ||
    membershipIsEntitled(membership, nowMillis);
}

export function planHasBenefit(plan: Pick<PlanFacts, "benefits">,
  type: PlanBenefit["type"]): boolean {
  return plan.benefits.some((benefit) => benefit.type === type);
}

function applyPercentOff(listPriceInPaise: number, percentOff: number):
  number {
  const discounted = Math.floor(listPriceInPaise * (100 - percentOff) / 100);
  if (discounted > 0 && discounted < minimumChargeInPaise) {
    return Math.min(listPriceInPaise, minimumChargeInPaise);
  }
  return discounted;
}

/**
 * The plan's price for one event: an event override first, then the plan's
 * default discount. Null means the plan gives no member price here.
 */
export function planPriceForEvent(params: {
  listPriceInPaise: number;
  plan: Pick<PlanFacts, "planId" | "benefits">;
  rules: Pick<RulesFacts, "memberPriceOverrides"> | null;
}): number | null {
  const list = Math.max(0, Math.trunc(params.listPriceInPaise));
  const override = params.rules?.memberPriceOverrides
    .find((entry) => entry.planId === params.plan.planId);
  let price: number | null = null;
  if (override) {
    price = "priceInPaise" in override ?
      Math.min(list, override.priceInPaise) :
      applyPercentOff(list, override.percentOff);
  } else {
    const discount = params.plan.benefits.find((benefit) =>
      benefit.type === "eventDiscount");
    if (discount && discount.type === "eventDiscount") {
      price = applyPercentOff(list, discount.percentOff);
    }
  }
  return price === null || price >= list ? null : price;
}

export type HostMembershipRestriction =
  | {allowed: true}
  | {allowed: false; reason: "paidMembershipRequired"}
  | {allowed: false; reason: "memberEarlyAccess";
      generalSaleOpensAtMillis: number};

export interface HostMembershipOffer {
  planId: string;
  planName: string;
  interval: "monthly" | "annual";
  planPriceInPaise: number;
  memberPriceInPaise: number;
  savingsInPaise: number;
  unlocksAccess: boolean;
}

export interface HostMembershipEntitlement {
  member: {planId: string; entitled: boolean} | null;
  priceInPaise: number;
  listPriceInPaise: number;
  savingsInPaise: number;
  memberPriceApplied: boolean;
  memberPriceBlockedReason: null | "bookingCapReached";
  admission: HostMembershipRestriction;
  offer: HostMembershipOffer | null;
}

function admissionFor(params: {
  rules: RulesFacts | null;
  plan: Pick<PlanFacts, "benefits"> | null;
  entitled: boolean;
  nowMillis: number;
}): HostMembershipRestriction {
  const {rules, plan, entitled, nowMillis} = params;
  if (!rules) return {allowed: true};
  const holds = (type: PlanBenefit["type"]) =>
    entitled && plan !== null && planHasBenefit(plan, type);
  if (rules.membersOnly && !holds("membersOnlyAccess")) {
    return {allowed: false, reason: "paidMembershipRequired"};
  }
  const early = rules.earlyAccess;
  if (early && nowMillis < early.generalSaleOpensAtMillis &&
      !holds("earlyAccess")) {
    return {allowed: false, reason: "memberEarlyAccess",
      generalSaleOpensAtMillis: early.generalSaleOpensAtMillis};
  }
  return {allowed: true};
}

function hasSpareCapacity(plan: PlanFacts): boolean {
  return plan.memberCap === null || plan.activeMemberCount < plan.memberCap;
}

function offerPrice(plan: PlanFacts):
  {interval: "monthly" | "annual"; amount: number} | null {
  if (plan.prices.monthly) {
    return {interval: "monthly", amount: plan.prices.monthly.amountPaise};
  }
  if (plan.prices.annual) {
    return {interval: "annual", amount: plan.prices.annual.amountPaise};
  }
  return null;
}

/** Monthly-equivalent cost, for comparing plans billed differently. */
function monthlyEquivalent(price: {interval: string; amount: number}): number {
  return price.interval === "annual" ? price.amount / 12 : price.amount;
}

/**
 * Single owner of paid-membership checkout semantics. Every server path
 * (viewer state, free booking, public checkout) calls this; clients never
 * compute it.
 */
export function evaluateHostMembershipEntitlement(params: {
  listPriceInPaise: number;
  rules: RulesFacts | null;
  membership: MembershipFacts | null;
  plan: PlanFacts | null;
  publishedPlans: readonly PlanFacts[];
  upcomingMemberPricedBookings: number;
  nowMillis: number;
}): HostMembershipEntitlement {
  const list = Math.max(0, Math.trunc(params.listPriceInPaise));
  const {membership, nowMillis, rules} = params;
  const plan = membership && params.plan?.planId === membership.planId ?
    params.plan : null;
  const entitled = membership !== null && plan !== null &&
    membershipIsEntitled(membership, nowMillis);
  const admission = admissionFor({rules, plan, entitled, nowMillis});

  let price = list;
  let memberPriceApplied = false;
  let memberPriceBlockedReason: HostMembershipEntitlement[
    "memberPriceBlockedReason"] = null;
  if (entitled && plan) {
    const memberPrice = planPriceForEvent({listPriceInPaise: list, plan,
      rules});
    const cap = plan.limits.maxUpcomingMemberPricedBookings;
    if (memberPrice !== null) {
      if (cap !== null && params.upcomingMemberPricedBookings >= cap) {
        memberPriceBlockedReason = "bookingCapReached";
      } else {
        price = memberPrice;
        memberPriceApplied = true;
      }
    }
  }

  // Plan switching is not supported, so only people without a current
  // membership see an offer.
  const canJoin = membership === null || membership.status === "expired";
  let offer: HostMembershipOffer | null = null;
  if (canJoin) {
    let best: {offer: HostMembershipOffer; monthly: number} | null = null;
    for (const candidate of params.publishedPlans) {
      if (candidate.status !== "published" || !hasSpareCapacity(candidate)) {
        continue;
      }
      const billed = offerPrice(candidate);
      if (!billed) continue;
      const candidateAdmission = admissionFor({rules, plan: candidate,
        entitled: true, nowMillis});
      if (!candidateAdmission.allowed) continue;
      const unlocksAccess = !admission.allowed;
      const memberPrice = planPriceForEvent({listPriceInPaise: list,
        plan: candidate, rules}) ?? list;
      if (!unlocksAccess && memberPrice >= price) continue;
      const next = {offer: {planId: candidate.planId,
        planName: candidate.name, interval: billed.interval,
        planPriceInPaise: billed.amount, memberPriceInPaise: memberPrice,
        savingsInPaise: Math.max(0, list - memberPrice), unlocksAccess},
      monthly: monthlyEquivalent(billed)};
      if (!best || next.offer.memberPriceInPaise <
          best.offer.memberPriceInPaise ||
          next.offer.memberPriceInPaise === best.offer.memberPriceInPaise &&
          next.monthly < best.monthly) {
        best = next;
      }
    }
    offer = best?.offer ?? null;
  }

  return {
    member: membership && plan ? {planId: plan.planId, entitled} :
      membership ? {planId: membership.planId, entitled: false} : null,
    priceInPaise: price,
    listPriceInPaise: list,
    savingsInPaise: list - price,
    memberPriceApplied,
    memberPriceBlockedReason,
    admission,
    offer,
  };
}
