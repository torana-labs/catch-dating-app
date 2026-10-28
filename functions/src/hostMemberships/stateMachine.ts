import type {HostMembershipDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {ProviderSubscriptionSnapshot} from "./billingProvider";

export type MembershipIntent =
  | "memberPause"
  | "memberResume"
  | "memberCancel"
  | "hostPause"
  | "hostResume";

export interface MembershipSeed {
  organizerId: string;
  uid: string;
  planId: string;
  planName: string;
  interval: HostMembershipDocument["interval"];
  priceInPaise: number;
  checkoutId: string;
}

export interface MembershipTransition {
  next: HostMembershipDocument | null;
  changed: boolean;
  /** -1, 0 or 1 change to the plan/program non-expired member counts. */
  countDelta: number;
  outcome: "applied" | "stale" | "ignored";
}

/** Statuses that accrue tenure; a host pause keeps the member's standing. */
function accruesTenure(status: HostMembershipDocument["status"],
  pause: HostMembershipDocument["pause"]): boolean {
  if (status === "paused") return pause?.initiator === "host";
  return status !== "expired";
}

const trialSkewMillis = 60_000;

function mappedStatus(params: {
  current: HostMembershipDocument | null;
  snapshot: ProviderSubscriptionSnapshot;
  observedAtMillis: number;
  intent: MembershipIntent | null;
}): {status: HostMembershipDocument["status"];
  reason: HostMembershipDocument["statusReason"]} | null {
  const {current, snapshot, intent} = params;
  const cancelAtPeriodEnd = intent === "memberCancel" ||
    current?.cancelAtPeriodEnd === true && intent !== "memberResume";
  switch (snapshot.status) {
  case "created":
    return null;
  case "authenticated":
    // A trial starts when the mandate is authorized; an immediate start
    // grants nothing until the first charge activates the subscription.
    if (snapshot.startAtMillis !== null &&
        snapshot.startAtMillis > params.observedAtMillis + trialSkewMillis) {
      return {status: cancelAtPeriodEnd ? "canceling" : "trialing",
        reason: null};
    }
    return current ? {status: current.status, reason: current.statusReason} :
      null;
  case "active":
    return {status: cancelAtPeriodEnd ? "canceling" : "active", reason: null};
  case "pending":
    return {status: "past_due", reason: null};
  case "halted":
    return {status: "expired", reason: "paymentFailed"};
  case "paused": {
    const initiator = intent === "hostPause" ? "host" :
      intent === "memberPause" ? "member" :
        current?.pause?.initiator ?? "member";
    return {status: "paused",
      reason: initiator === "host" ? "hostPaused" : "memberPaused"};
  }
  case "cancelled":
    return {status: "expired", reason: current?.cancelAtPeriodEnd ?
      "memberCanceled" : "providerCanceled"};
  case "completed":
  case "expired":
    return {status: "expired", reason: "planCompleted"};
  }
}

function materialFields(doc: HostMembershipDocument): string {
  const {revision, updatedAtMillis, providerEventAtMillis, ...rest} = doc;
  void revision; void updatedAtMillis; void providerEventAtMillis;
  return JSON.stringify(rest);
}

/**
 * Pure membership transition from one provider snapshot, optionally
 * annotated with the local intent that caused it. Out-of-order provider
 * evidence never overwrites newer state; a local intent always applies
 * because it carries the provider response it just received.
 */
export function nextMembershipState(params: {
  current: HostMembershipDocument | null;
  snapshot: ProviderSubscriptionSnapshot;
  observedAtMillis: number;
  nowMillis: number;
  intent?: MembershipIntent | null;
  seed: MembershipSeed | null;
}): MembershipTransition {
  const {current, snapshot, nowMillis} = params;
  const intent = params.intent ?? null;
  const unchanged = (outcome: MembershipTransition["outcome"]) =>
    ({next: current, changed: false, countDelta: 0, outcome});

  if (current && intent === null &&
      params.observedAtMillis < current.providerEventAtMillis) {
    return unchanged("stale");
  }
  const sameSubscription = current?.providerSubscriptionId === snapshot.id;
  // A rejoin replaces an expired membership; evidence about any other
  // subscription never touches a current one.
  const replacing = current !== null && !sameSubscription &&
    current.status === "expired";
  if (current && !sameSubscription && !replacing) return unchanged("ignored");
  const base = sameSubscription ? current : null;
  if (!base && !params.seed) return unchanged("ignored");

  const mapped = mappedStatus({current: base, snapshot,
    observedAtMillis: params.observedAtMillis, intent});
  if (!mapped) return unchanged("ignored");

  const seed = params.seed;
  const previous = current;
  const fresh = base === null;
  const status = mapped.status;
  const cancelAtPeriodEnd = status === "canceling" ||
    (status === "trialing" || status === "past_due" || status === "paused") &&
      (intent === "memberCancel" ||
        base?.cancelAtPeriodEnd === true && intent !== "memberResume");
  const pause = status === "paused" ? {
    initiator: mapped.reason === "hostPaused" ? "host" as const :
      "member" as const,
    pausedAtMillis: base?.pause?.pausedAtMillis ?? nowMillis,
  } : null;
  const trialEndsAtMillis = status === "trialing" ?
    snapshot.startAtMillis : fresh ? null : base!.trialEndsAtMillis;
  const currentPeriodEndMillis = snapshot.currentEndMillis ??
    (status === "trialing" ? snapshot.startAtMillis :
      fresh ? null : base!.currentPeriodEndMillis);
  const currentPeriodStartMillis = snapshot.currentStartMillis ??
    (fresh ? null : base!.currentPeriodStartMillis);

  // Tenure accumulates across stretches and survives a rejoin.
  const priorTenure = previous?.tenure ??
    {accumulatedMillis: 0, stretchStartedAtMillis: null};
  const wasAccruing = previous !== null &&
    accruesTenure(previous.status, previous.pause) &&
    priorTenure.stretchStartedAtMillis !== null;
  const accrues = accruesTenure(status, pause);
  let tenure = priorTenure;
  if (accrues && !wasAccruing) {
    tenure = {accumulatedMillis: priorTenure.accumulatedMillis,
      stretchStartedAtMillis: nowMillis};
  } else if (!accrues && wasAccruing) {
    tenure = {accumulatedMillis: priorTenure.accumulatedMillis +
      Math.max(0, nowMillis - priorTenure.stretchStartedAtMillis!),
    stretchStartedAtMillis: null};
  }
  const memberSinceMillis = previous?.memberSinceMillis ??
    (accrues ? nowMillis : null);

  const next: HostMembershipDocument = {
    schemaVersion: 1,
    organizerId: fresh ? seed!.organizerId : base!.organizerId,
    uid: fresh ? seed!.uid : base!.uid,
    planId: fresh ? seed!.planId : base!.planId,
    planName: fresh ? seed!.planName : base!.planName,
    interval: fresh ? seed!.interval : base!.interval,
    status,
    statusReason: mapped.reason,
    priceInPaise: fresh ? seed!.priceInPaise : base!.priceInPaise,
    currency: "INR",
    currentPeriodStartMillis,
    currentPeriodEndMillis,
    trialEndsAtMillis,
    cancelAtPeriodEnd,
    pause,
    pastDueSinceMillis: status === "past_due" ?
      base?.pastDueSinceMillis ?? nowMillis : null,
    memberSinceMillis,
    tenure,
    provider: "razorpay",
    providerSubscriptionId: snapshot.id,
    providerPlanId: snapshot.planId,
    providerEventAtMillis: Math.max(previous?.providerEventAtMillis ?? 0,
      params.observedAtMillis),
    lastCheckoutId: fresh ? seed!.checkoutId : base!.lastCheckoutId,
    revision: (previous?.revision ?? 0) + 1,
    createdAtMillis: previous?.createdAtMillis ?? nowMillis,
    updatedAtMillis: nowMillis,
  };
  if (previous && materialFields(previous) === materialFields(next)) {
    return {next: {...previous,
      providerEventAtMillis: next.providerEventAtMillis},
    changed: false, countDelta: 0, outcome: "applied"};
  }
  const counted = (doc: HostMembershipDocument | null) =>
    doc !== null && doc.status !== "expired" ? 1 : 0;
  return {next, changed: true, countDelta: counted(next) - counted(previous),
    outcome: "applied"};
}

/** Tenure in milliseconds at a point in time. */
export function tenureMillis(membership: Pick<HostMembershipDocument,
  "tenure">, nowMillis: number): number {
  const {accumulatedMillis, stretchStartedAtMillis} = membership.tenure;
  return accumulatedMillis + (stretchStartedAtMillis === null ? 0 :
    Math.max(0, nowMillis - stretchStartedAtMillis));
}
