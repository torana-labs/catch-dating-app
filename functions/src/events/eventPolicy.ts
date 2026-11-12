import {HttpsError} from "firebase-functions/v2/https";
import type {
  EventDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {requireEventPolicyTerms} from "./configuredEvent";

import {requiresCommunityMembership} from
  "../memberships/communityMembershipAuthority";

export const cohortIds = {
  unspecified: "unspecified",
  menInterestedInWomen: "menInterestedInWomen",
  womenInterestedInMen: "womenInterestedInMen",
  queerOrOpen: "queerOrOpen",
  nonBinaryOrOther: "nonBinaryOrOther",
} as const;

export type EventCohortId = typeof cohortIds[keyof typeof cohortIds];

export type EventAdmissionFormat =
  | "open"
  | "inviteOnly"
  | "manualApproval"
  | "fixedCohortCaps"
  | "balancedRatio"
  | "membersOnly";

export type EventWaitlistMode =
  | "disabled"
  | "rankedOffer"
  | "broadcastFirstComeFirstServed"
  | "manualReview";

export type EventOutOfRatioCohortPolicy =
  | "admitWithinGeneralCapacity"
  | "waitlist"
  | "manualReview"
  | "reject";

export type EventPrivateAccessMode = "none" | "inviteCode";

export type EventCancellationPolicyId =
  | "notApplicable"
  | "flexible"
  | "standard"
  | "strict";

export type EventCancellationRemedy =
  | "fullRefund"
  | "platformCredit"
  | "noRefund"
  | "waitlistRelease";

export interface EventPolicyBundleDocument {
  version: number;
  admission: {
    format: EventAdmissionFormat;
    capacityLimit: number;
    waitlistPolicy?: {
      mode: EventWaitlistMode;
      offerWindowMinutes: number;
    };
    inviteRequired?: boolean;
    membershipRequired?: boolean;
    manualApprovalRequired?: boolean;
    approvedMembersSkipReview?: boolean;
    privateAccessPolicy?: {
      mode: EventPrivateAccessMode;
      inviteCodeHint: string | null;
      privateLinkEnabled: boolean;
    };
    cohortCapacityLimits?: Record<string, number>;
    balancedRatioPolicy?: {
      leftCohortId: string;
      rightCohortId: string;
      maxSkew: number;
      openingBufferPerCohort: number;
      outOfRatioCohortPolicy: EventOutOfRatioCohortPolicy;
    } | null;
    crossPathsPairInventory?: {
      enabled: boolean;
      reservedPairCapacity: number;
      holdDurationMinutes: number;
    };
  };
  pricing: {
    basePriceInPaise: number;
    cohortAdjustmentsInPaise?: Record<string, number>;
    demandPricingRules?: Array<{
      pricedCohortId: string;
      balancingCohortId: string;
      stepAdjustmentInPaise: number;
      maxAdjustmentInPaise: number;
      freeSkew: number;
      demandStep: number;
    }>;
  };
  cancellation: {
    policyId: EventCancellationPolicyId;
  };
  settlement: {
    hostPayoutTiming: "afterEventCompletion";
  };
}

export interface EventRosterSnapshot {
  bookedCountsByCohort: Record<string, number>;
  waitlistedCountsByCohort: Record<string, number>;
  totalBooked: number;
  crossPathsPairHeldCount?: number;
  crossPathsPairConfirmedCount?: number;
}

export function eventPolicyFromEvent(
  event: EventDocument
): EventPolicyBundleDocument {
  requireEventPolicyTerms(event);
  const policy = (event as EventDocument & {
    eventPolicy?: EventPolicyBundleDocument | null;
  }).eventPolicy;
  if (!policy) {
    throw new HttpsError("failed-precondition",
      "This event needs its admission and pricing policy.");
  }
  return normalizePolicy(policy);
}

export function normalizePolicy(policy: EventPolicyBundleDocument):
  EventPolicyBundleDocument {
  const basePriceInPaise = Math.max(0, Math.trunc(
    policy.pricing?.basePriceInPaise ?? 0
  ));
  return {
    version: 2,
    admission: {
      format: policy.admission?.format ?? "open",
      capacityLimit: Math.max(1, Math.trunc(
        policy.admission?.capacityLimit ?? 1
      )),
      waitlistPolicy: policy.admission?.waitlistPolicy ?? {
        mode: "rankedOffer",
        offerWindowMinutes: 20,
      },
      inviteRequired: policy.admission?.inviteRequired === true,
      membershipRequired: policy.admission?.membershipRequired === true,
      manualApprovalRequired:
        policy.admission?.manualApprovalRequired === true,
      ...(policy.admission?.approvedMembersSkipReview === true ?
        {approvedMembersSkipReview: true} : {}),
      privateAccessPolicy: normalizePrivateAccessPolicy(
        policy.admission?.privateAccessPolicy,
        policy.admission?.inviteRequired === true ||
          policy.admission?.format === "inviteOnly"
      ),
      cohortCapacityLimits: sanitizeCountMap(
        policy.admission?.cohortCapacityLimits
      ),
      balancedRatioPolicy: policy.admission?.balancedRatioPolicy ?? null,
      crossPathsPairInventory: normalizeCrossPathsPairInventory(
        policy.admission?.crossPathsPairInventory,
        Math.max(1, Math.trunc(policy.admission?.capacityLimit ?? 1))
      ),
    },
    pricing: {
      basePriceInPaise,
      cohortAdjustmentsInPaise: sanitizeAmountMap(
        policy.pricing?.cohortAdjustmentsInPaise
      ),
      demandPricingRules: policy.pricing?.demandPricingRules ?? [],
    },
    cancellation: {
      policyId: basePriceInPaise === 0 ?
        "notApplicable" :
        paidCancellationPolicyId(policy.cancellation?.policyId),
    },
    settlement: {
      hostPayoutTiming: "afterEventCompletion",
    },
  };
}

/**
 * The starting policy for an event that is getting capacity and price terms
 * for the first time: open admission, or fixed cohort caps when the event's
 * constraints cap men or women. The event-policy migration used the same
 * derivation for older events that had terms but no stored policy.
 */
export function initialPolicyFromTerms(
  event: EventDocument
): EventPolicyBundleDocument {
  const configured = requireEventPolicyTerms(event);
  const maxMen = configured.constraints?.maxMen;
  const maxWomen = configured.constraints?.maxWomen;
  const hasCaps = maxMen != null || maxWomen != null;
  return normalizePolicy({
    version: 1,
    admission: {
      format: hasCaps ? "fixedCohortCaps" : "open",
      capacityLimit: configured.capacityLimit,
      waitlistPolicy: {
        mode: "rankedOffer",
        offerWindowMinutes: 20,
      },
      inviteRequired: false,
      membershipRequired: false,
      manualApprovalRequired: false,
      privateAccessPolicy: {
        mode: "none",
        inviteCodeHint: null,
        privateLinkEnabled: false,
      },
      cohortCapacityLimits: {
        ...(maxMen != null ? {[cohortIds.menInterestedInWomen]: maxMen} : {}),
        ...(maxWomen != null ?
          {[cohortIds.womenInterestedInMen]: maxWomen} :
          {}),
      },
      balancedRatioPolicy: null,
      crossPathsPairInventory: {
        enabled: false,
        reservedPairCapacity: 0,
        holdDurationMinutes: 15,
      },
    },
    pricing: {
      basePriceInPaise: configured.priceInPaise,
      cohortAdjustmentsInPaise: {},
      demandPricingRules: [],
    },
    cancellation: {
      policyId: configured.priceInPaise === 0 ? "notApplicable" : "standard",
    },
    settlement: {hostPayoutTiming: "afterEventCompletion"},
  });
}

export function cohortIdForUser(user: UserProfileDocument): EventCohortId {
  const interests = new Set(user.interestedInGenders ?? []);
  if (!user.gender || interests.size === 0) return cohortIds.unspecified;
  if (user.gender === "man" && interests.size === 1 &&
      interests.has("woman")) {
    return cohortIds.menInterestedInWomen;
  }
  if (user.gender === "woman" && interests.size === 1 &&
      interests.has("man")) {
    return cohortIds.womenInterestedInMen;
  }
  if (user.gender === "nonBinary" || user.gender === "other") {
    return cohortIds.nonBinaryOrOther;
  }
  return cohortIds.queerOrOpen;
}

export function rosterFromEvent(event: EventDocument): EventRosterSnapshot {
  const storedCohortCounts = (event as EventDocument & {
    cohortCounts?: Record<string, number> | null;
  }).cohortCounts;
  const bookedCountsByCohort = sanitizeCountMap(storedCohortCounts);
  const waitlistedCountsByCohort = sanitizeCountMap(
    (event as EventDocument & {
      waitlistedCohortCounts?: Record<string, number> | null;
    }).waitlistedCohortCounts
  );
  const crossPathsPairHeldCount = Math.max(0, Math.trunc(
    (event as EventDocument & {crossPathsPairHeldCount?: number})
      .crossPathsPairHeldCount ?? 0
  ));
  const crossPathsPairConfirmedCount = Math.max(0, Math.trunc(
    (event as EventDocument & {crossPathsPairConfirmedCount?: number})
      .crossPathsPairConfirmedCount ?? 0
  ));
  const heldCohortCounts = sanitizeCountMap(
    (event as EventDocument & {
      crossPathsPairHeldCohortCounts?: Record<string, number> | null;
    }).crossPathsPairHeldCohortCounts
  );
  for (const [cohortId, count] of Object.entries(heldCohortCounts)) {
    bookedCountsByCohort[cohortId] =
      (bookedCountsByCohort[cohortId] ?? 0) + count;
  }
  const totalBooked = (event.bookedCount ??
    Object.values(bookedCountsByCohort).reduce(
      (sum, count) => sum + count,
      0
    )) + crossPathsPairHeldCount;
  return {
    bookedCountsByCohort,
    waitlistedCountsByCohort,
    totalBooked,
    crossPathsPairHeldCount,
    crossPathsPairConfirmedCount,
  };
}

export function quotePriceInPaise(params: {
  policy: EventPolicyBundleDocument;
  cohortId: string;
  roster: EventRosterSnapshot;
  includeRequestedAttendee?: boolean;
}): number {
  const includeRequestedAttendee = params.includeRequestedAttendee ?? true;
  const pricing = params.policy.pricing;
  let amount = pricing.basePriceInPaise;
  amount += pricing.cohortAdjustmentsInPaise?.[params.cohortId] ?? 0;

  for (const rule of pricing.demandPricingRules ?? []) {
    if (params.cohortId !== rule.pricedCohortId) continue;
    const pricedDemand =
      (params.roster.bookedCountsByCohort[rule.pricedCohortId] ?? 0) +
      (params.roster.waitlistedCountsByCohort[rule.pricedCohortId] ?? 0) +
      (includeRequestedAttendee ? 1 : 0);
    const balancingDemand =
      (params.roster.bookedCountsByCohort[rule.balancingCohortId] ?? 0) +
      (params.roster.waitlistedCountsByCohort[rule.balancingCohortId] ?? 0);
    const excessDemand = pricedDemand - balancingDemand - rule.freeSkew;
    if (excessDemand <= 0) continue;
    const steps = Math.ceil(excessDemand / Math.max(1, rule.demandStep));
    amount += Math.min(rule.maxAdjustmentInPaise,
      rule.stepAdjustmentInPaise * steps);
  }

  return Math.max(0, Math.trunc(amount));
}

/** Last instant that the configured policy returns the full cash payment. */
export function fullRefundDeadlineMillis(policyId: EventCancellationPolicyId,
  startTimeMillis: number): number {
  const window = cancellationWindow(policyId);
  return Math.max(0, startTimeMillis - window.fullRefundBeforeStartMillis);
}

export function quoteAttendeeCancellation(params: {
  policy: EventPolicyBundleDocument;
  paidAmountInPaise: number;
  startTimeMillis: number;
  nowMillis: number;
  isWaitlisted?: boolean;
}): {
  remedy: EventCancellationRemedy;
  refundAmountInPaise: number;
  creditAmountInPaise: number;
} {
  if (params.isWaitlisted) {
    return {
      remedy: "waitlistRelease",
      refundAmountInPaise: 0,
      creditAmountInPaise: 0,
    };
  }

  const paidAmount = Math.max(0, Math.trunc(params.paidAmountInPaise));
  if (paidAmount === 0) {
    return {
      remedy: "fullRefund",
      refundAmountInPaise: 0,
      creditAmountInPaise: 0,
    };
  }

  const window = cancellationWindow(params.policy.cancellation.policyId);
  const beforeStartMillis = params.startTimeMillis - params.nowMillis;
  if (beforeStartMillis >= window.fullRefundBeforeStartMillis) {
    return {
      remedy: "fullRefund",
      refundAmountInPaise: paidAmount,
      creditAmountInPaise: 0,
    };
  }
  if (beforeStartMillis >= window.creditBeforeStartMillis &&
      window.creditPercent > 0) {
    return {
      remedy: "platformCredit",
      refundAmountInPaise: 0,
      creditAmountInPaise: Math.trunc(paidAmount * window.creditPercent / 100),
    };
  }
  return {
    remedy: "noRefund",
    refundAmountInPaise: 0,
    creditAmountInPaise: 0,
  };
}

/** Entitlement never waives event review, invitation, inventory or payment. */
export function assertPolicyAllowsMembership(params: {
  policy: EventPolicyBundleDocument;
  hasActiveCommunityMembership?: boolean;
}): void {
  if (!membershipAllowsSignup(params)) {
    throw new HttpsError("failed-precondition",
      signupRestrictionCopy.membershipRequired);
  }
}

export interface SignupPolicyInput {
  policy: EventPolicyBundleDocument;
  cohortId: string;
  roster: EventRosterSnapshot;
  hasValidInvite?: boolean;
  hasHostApproval?: boolean;
  hasActiveCommunityMembership?: boolean;
  admissionMode?: "general" | "crossPathsPair";
}

export type SignupPolicyRestriction =
  | "membershipRequired"
  | "inviteRequired"
  | "reviewRequired"
  | "full"
  | "pairCapacityUnavailable"
  | "generalCapacityUnavailable"
  | "cohortCapacityUnavailable"
  | "outOfRatioReviewRequired"
  | "balanceUnavailable";

export type SignupPolicyDecision = {allowed: true} |
  {allowed: false; reason: SignupPolicyRestriction};

const signupRestrictionCopy: Record<SignupPolicyRestriction, string> = {
  membershipRequired:
    "Approved community membership is required to book this event.",
  inviteRequired:
    "Enter a valid invite code to book this event.",
  reviewRequired:
    "Request to join this event before booking.",
  full:
    "This event is now full.",
  pairCapacityUnavailable:
    "A Cross Paths pair spot is not available right now.",
  generalCapacityUnavailable:
    "General admission is full. Reserved Cross Paths spots remain separate.",
  cohortCapacityUnavailable:
    "A matching spot is not available right now. Join the waitlist.",
  outOfRatioReviewRequired:
    "This booking needs host review.",
  balanceUnavailable:
    "A balanced spot is not available right now. Join the waitlist.",
};

function membershipAllowsSignup(params: Pick<SignupPolicyInput,
  "policy" | "hasActiveCommunityMembership">): boolean {
  return !requiresCommunityMembership(params.policy) ||
    params.hasActiveCommunityMembership === true;
}

/** The shared read outcome and mutation check have one policy owner. */
export function signupPolicyDecision(params: SignupPolicyInput):
  SignupPolicyDecision {
  const admission = params.policy.admission;
  if (!membershipAllowsSignup(params)) {
    return {allowed: false, reason: "membershipRequired"};
  }
  if (admission.inviteRequired && params.hasValidInvite !== true) {
    return {allowed: false, reason: "inviteRequired"};
  }
  if (admission.manualApprovalRequired && params.hasHostApproval !== true &&
      !(admission.approvedMembersSkipReview === true &&
        params.hasActiveCommunityMembership === true)) {
    return {allowed: false, reason: "reviewRequired"};
  }

  const pairInventory = admission.crossPathsPairInventory ?? {
    enabled: false,
    reservedPairCapacity: 0,
    holdDurationMinutes: 15,
  };
  const admissionMode = params.admissionMode ?? "general";
  const pairHeldCount = params.roster.crossPathsPairHeldCount ?? 0;
  const pairConfirmedCount = params.roster.crossPathsPairConfirmedCount ?? 0;
  if (params.roster.totalBooked >= admission.capacityLimit) {
    return {allowed: false, reason: "full"};
  }
  if (admissionMode === "crossPathsPair") {
    if (
      !pairInventory.enabled ||
      pairInventory.reservedPairCapacity <= 0 ||
      pairHeldCount + pairConfirmedCount >=
        pairInventory.reservedPairCapacity
    ) {
      return {allowed: false, reason: "pairCapacityUnavailable"};
    }
  } else if (pairInventory.enabled) {
    const generalOccupied = params.roster.totalBooked -
      pairHeldCount - pairConfirmedCount;
    const generalCapacity = Math.max(
      0,
      admission.capacityLimit - pairInventory.reservedPairCapacity
    );
    if (generalOccupied >= generalCapacity) {
      return {allowed: false, reason: "generalCapacityUnavailable"};
    }
  }

  const cohortLimit = admission.cohortCapacityLimits?.[params.cohortId];
  if (cohortLimit != null &&
      (params.roster.bookedCountsByCohort[params.cohortId] ?? 0) >=
        cohortLimit) {
    return {allowed: false, reason: "cohortCapacityUnavailable"};
  }

  const ratio = admission.balancedRatioPolicy;
  if (admission.format !== "balancedRatio" || !ratio) return {allowed: true};

  const applies = params.cohortId === ratio.leftCohortId ||
    params.cohortId === ratio.rightCohortId;
  if (!applies) {
    if (ratio.outOfRatioCohortPolicy === "admitWithinGeneralCapacity") {
      return {allowed: true};
    }
    return {allowed: false, reason: "outOfRatioReviewRequired"};
  }

  const counterpartId = params.cohortId === ratio.leftCohortId ?
    ratio.rightCohortId :
    ratio.leftCohortId;
  const currentCount =
    params.roster.bookedCountsByCohort[params.cohortId] ?? 0;
  const counterpartCount =
    params.roster.bookedCountsByCohort[counterpartId] ?? 0;
  const nextCount = currentCount + 1;

  if (counterpartCount === 0 &&
      currentCount < ratio.openingBufferPerCohort) {
    return {allowed: true};
  }
  if (nextCount <= counterpartCount + ratio.maxSkew) return {allowed: true};

  return {allowed: false, reason: "balanceUnavailable"};
}

/** Existing mutation callers retain their code, copy and check order. */
export function assertPolicyAllowsSignup(params: SignupPolicyInput):
  void {
  const decision = signupPolicyDecision(params);
  if (!decision.allowed) {
    throw new HttpsError("failed-precondition",
      signupRestrictionCopy[decision.reason]);
  }
}

export async function rosterWithReservedWaitlistOffers(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  baseRoster: EventRosterSnapshot,
  options: {excludeUid?: string; nowMillis?: number} = {}
): Promise<EventRosterSnapshot> {
  const offerSnap = await db
    .collection("eventWaitlistOffers")
    .where("eventId", "==", eventId)
    .where("status", "in", ["active", "accepted"])
    .get();
  const offers = offerSnap.docs.map((doc) => doc.data());
  if (offers.length === 0) return baseRoster;

  const participationSnaps = await Promise.all(
    offers.map((offer) => db
      .collection("eventParticipations")
      .doc(eventParticipationId(eventId, String(offer.uid ?? "")))
      .get())
  );
  return rosterWithReservableOfferData({
    baseRoster,
    offers,
    participationData: participationSnaps.map((snap) => snap.data()),
    excludeUid: options.excludeUid,
    nowMillis: options.nowMillis ?? Date.now(),
  });
}

/** Bounded read adapters must not treat a truncated offer set as inventory. */
export class EventRosterReadLimitError extends Error {}

export async function rosterWithReservedWaitlistOffersInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  eventId: string,
  baseRoster: EventRosterSnapshot,
  options: {excludeUid?: string; nowMillis?: number; readLimit?: number} = {}
): Promise<EventRosterSnapshot> {
  let offerQuery = db
    .collection("eventWaitlistOffers")
    .where("eventId", "==", eventId)
    .where("status", "in", ["active", "accepted"]);
  if (options.readLimit !== undefined) {
    offerQuery = offerQuery.limit(options.readLimit + 1);
  }
  const offerSnap = await tx.get(offerQuery);
  if (options.readLimit !== undefined &&
      offerSnap.docs.length > options.readLimit) {
    throw new EventRosterReadLimitError();
  }
  if (offerSnap.empty) return baseRoster;

  const offers = offerSnap.docs.map((doc) => doc.data());
  const participationSnaps = await Promise.all(
    offers.map((offer) => tx.get(db
      .collection("eventParticipations")
      .doc(eventParticipationId(eventId, String(offer.uid ?? "")))))
  );
  return rosterWithReservableOfferData({
    baseRoster,
    offers,
    participationData: participationSnaps.map((snap) => snap.data()),
    excludeUid: options.excludeUid,
    nowMillis: options.nowMillis ?? Date.now(),
  });
}

export async function hasValidInviteForEvent(params: {
  db: FirebaseFirestore.Firestore;
  tx?: FirebaseFirestore.Transaction;
  eventId: string;
  policy: EventPolicyBundleDocument;
  inviteCode?: string | null;
}): Promise<boolean> {
  if (!params.policy.admission.inviteRequired) return true;
  const submittedCode = normalizeInviteCode(params.inviteCode);
  if (!submittedCode) return false;

  const ref = params.db.collection("eventPrivateAccess").doc(params.eventId);
  const accessSnap = params.tx ? await params.tx.get(ref) : await ref.get();
  if (!accessSnap.exists) return false;

  const storedCode = normalizeInviteCode(accessSnap.data()?.inviteCode);
  return storedCode !== null &&
    storedCode.toLowerCase() === submittedCode.toLowerCase();
}

export function normalizeInviteCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function incrementCount(
  counts: Record<string, number>,
  key: string
): Record<string, number> {
  return {...counts, [key]: (counts[key] ?? 0) + 1};
}

export function decrementCount(
  counts: Record<string, number>,
  key: string
): Record<string, number> {
  return {...counts, [key]: Math.max(0, (counts[key] ?? 0) - 1)};
}

function sanitizeCountMap(value?: Record<string, number> | null):
  Record<string, number> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, count]) => Number.isFinite(count))
      .map(([key, count]) => [key, Math.max(0, Math.trunc(count))])
  );
}

function sanitizeAmountMap(value?: Record<string, number> | null):
  Record<string, number> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, amount]) => Number.isFinite(amount))
      .map(([key, amount]) => [key, Math.trunc(amount)])
  );
}

function normalizePrivateAccessPolicy(
  value:
    | EventPolicyBundleDocument["admission"]["privateAccessPolicy"]
    | undefined,
  inviteRequired: boolean
): NonNullable<EventPolicyBundleDocument["admission"]["privateAccessPolicy"]> {
  if (!inviteRequired) {
    return {
      mode: "none",
      inviteCodeHint: null,
      privateLinkEnabled: false,
    };
  }

  return {
    mode: value?.mode === "inviteCode" ? "inviteCode" : "inviteCode",
    inviteCodeHint: typeof value?.inviteCodeHint === "string" ?
      value.inviteCodeHint :
      null,
    privateLinkEnabled: value?.privateLinkEnabled !== false,
  };
}

function cancellationWindow(policyId: EventCancellationPolicyId): {
  fullRefundBeforeStartMillis: number;
  creditBeforeStartMillis: number;
  creditPercent: number;
} {
  const hourMillis = 60 * 60 * 1000;
  switch (policyId) {
  case "notApplicable":
    return {
      fullRefundBeforeStartMillis: 0,
      creditBeforeStartMillis: 0,
      creditPercent: 0,
    };
  case "flexible":
    return {
      fullRefundBeforeStartMillis: 6 * hourMillis,
      creditBeforeStartMillis: hourMillis,
      creditPercent: 100,
    };
  case "strict":
    return {
      fullRefundBeforeStartMillis: 72 * hourMillis,
      creditBeforeStartMillis: 24 * hourMillis,
      creditPercent: 50,
    };
  case "standard":
  default:
    return {
      fullRefundBeforeStartMillis: 24 * hourMillis,
      creditBeforeStartMillis: 6 * hourMillis,
      creditPercent: 50,
    };
  }
}

function paidCancellationPolicyId(
  value: EventCancellationPolicyId | undefined
): Exclude<EventCancellationPolicyId, "notApplicable"> {
  return value === "flexible" || value === "strict" ? value : "standard";
}

/**
 * Returns whether a participation edge carries host approval for a manual
 * request-to-join event.
 * @param {unknown} participation Event participation data.
 * @return {boolean} Whether the request was approved by a host.
 */
export function hasHostApprovedJoinRequest(
  participation: unknown,
  nowMillis = Date.now()
): boolean {
  if (hasAcceptedWaitlistOfferAccess(participation, nowMillis)) return true;
  return typeof participation === "object" &&
    participation !== null &&
    (participation as {hostApprovalStatus?: unknown})
      .hostApprovalStatus === "approved";
}

export function hasAcceptedWaitlistOfferAccess(
  participation: unknown,
  nowMillis = Date.now()
): boolean {
  if (typeof participation !== "object" || participation === null) {
    return false;
  }
  const data = participation as {
    waitlistOfferStatus?: unknown;
    waitlistOfferExpiresAt?: unknown;
  };
  if (data.waitlistOfferStatus !== "accepted") return false;
  const expiresAtMillis = timestampLikeMillis(data.waitlistOfferExpiresAt);
  return expiresAtMillis !== null && expiresAtMillis > nowMillis;
}

function rosterWithReservableOfferData(params: {
  baseRoster: EventRosterSnapshot;
  offers: Array<FirebaseFirestore.DocumentData | undefined>;
  participationData: Array<FirebaseFirestore.DocumentData | undefined>;
  excludeUid?: string;
  nowMillis: number;
}): EventRosterSnapshot {
  let totalBooked = params.baseRoster.totalBooked;
  let bookedCountsByCohort = {
    ...params.baseRoster.bookedCountsByCohort,
  };

  params.offers.forEach((offer, index) => {
    const uid = typeof offer?.uid === "string" ? offer.uid : null;
    const status = offer?.status;
    const cohortAtOffer =
      typeof offer?.cohortAtOffer === "string" ? offer.cohortAtOffer : null;
    const expiresAtMillis = timestampLikeMillis(offer?.expiresAt);
    const participation = params.participationData[index];
    if (
      uid === null ||
      uid === params.excludeUid ||
      cohortAtOffer === null ||
      (status !== "active" && status !== "accepted") ||
      expiresAtMillis === null ||
      expiresAtMillis <= params.nowMillis ||
      participation?.status !== "waitlisted"
    ) {
      return;
    }
    totalBooked += 1;
    bookedCountsByCohort = incrementCount(bookedCountsByCohort, cohortAtOffer);
  });

  return {
    ...params.baseRoster,
    bookedCountsByCohort,
    totalBooked,
  };
}

function timestampLikeMillis(value: unknown): number | null {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as {toMillis?: unknown}).toMillis === "function"
  ) {
    return (value as {toMillis: () => number}).toMillis();
  }
  if (
    value instanceof Date &&
    Number.isFinite(value.getTime())
  ) {
    return value.getTime();
  }
  return null;
}

function normalizeCrossPathsPairInventory(
  value: EventPolicyBundleDocument["admission"]["crossPathsPairInventory"],
  capacityLimit: number
): NonNullable<
  EventPolicyBundleDocument["admission"]["crossPathsPairInventory"]
> {
  const reservedPairCapacity = Math.min(
    capacityLimit,
    Math.max(0, Math.trunc(value?.reservedPairCapacity ?? 0))
  );
  return {
    enabled: value?.enabled === true && reservedPairCapacity > 0,
    reservedPairCapacity,
    holdDurationMinutes: Math.min(
      30,
      Math.max(5, Math.trunc(value?.holdDurationMinutes ?? 15))
    ),
  };
}
