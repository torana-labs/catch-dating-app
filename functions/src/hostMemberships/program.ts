import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import type {HostMembershipProgramDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {ManageHostMembershipProgramCallablePayload as Payload} from
  "../shared/generated/manageHostMembershipProgramCallablePayload";
import type {ManageHostMembershipProgramCallableResponse as Response} from
  "../shared/generated/manageHostMembershipProgramCallableResponse";
import {validateHostMembershipPlanDocument} from
  "../shared/generated/validators/hostMembershipPlanDocument";
import {validateManageHostMembershipProgramCallablePayload} from
  "../shared/generated/validators/manageHostMembershipProgramInput";
import {validateManageHostMembershipProgramCallableResponse} from
  "../shared/generated/validators/manageHostMembershipProgramOutput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {
  defaultHostMembershipCallableDeps,
  type HostMembershipCallableDeps,
} from "./callableDeps";
import {HostMembershipProviderError} from "./billingProvider";
import {maxPlansPerOrganizer} from "./entitlementReader";
import {collections, readProgram} from "./membershipStore";
import {
  HostMembershipUnavailableError,
  membershipReadiness,
  membershipUnavailable,
  type MembershipReadiness,
} from "./paymentMode";
import {ensureProviderPrices} from "./plans";
import {
  bindingOf,
  providerFor,
  sameBinding,
  type MembershipPaymentBinding,
} from "./runtime";

function view(program: HostMembershipProgramDocument | null):
  Response["program"] {
  return program ? {state: program.state, provider: program.payment.provider,
    mode: program.payment.mode, billingPauseState: program.billingPause.state,
    memberCount: program.memberCount, revision: program.revision} : null;
}

/**
 * Proves the account can run memberships before the program is enabled:
 * hostCollected probes Subscriptions on the organizer's own Razorpay account
 * and registers the membership webhook there.
 */
async function prepareBinding(deps: HostMembershipCallableDeps,
  organizerId: string, readiness: MembershipReadiness):
  Promise<HostMembershipProgramDocument["payment"]> {
  if (readiness.reason || !readiness.binding) {
    membershipUnavailable(readiness.reason ?? "providerUnavailable");
  }
  const binding = readiness.binding;
  if (binding.moneyFlow === "platformSplit") return {...binding};
  try {
    const provider = await providerFor(deps, organizerId, binding);
    if (await provider.probeSubscriptions() !== "enabled") {
      membershipUnavailable("subscriptionsNotEnabled");
    }
    const {webhookId} = await provider.ensureMerchantWebhook({
      url: deps.merchantWebhookUrl(binding.bindingId)});
    return {...binding, webhookId};
  } catch (error) {
    if (error instanceof HostMembershipUnavailableError) throw error;
    if (error instanceof HttpsError) {
      // The connection's credential is unavailable or being refreshed.
      membershipUnavailable("razorpayNeedsAttention");
    }
    if (error instanceof HostMembershipProviderError &&
        error.httpStatus === 401) {
      membershipUnavailable("razorpayNeedsAttention");
    }
    membershipUnavailable("providerUnavailable");
  }
}

/** Provider prices follow the program onto a newly bound account. */
async function moveProviderPrices(deps: HostMembershipCallableDeps,
  organizerId: string): Promise<void> {
  const plans = await deps.db().collection(collections.plans)
    .where("organizerId", "==", organizerId)
    .limit(maxPlansPerOrganizer).get();
  for (const doc of plans.docs) {
    const plan = doc.data();
    if (!validateHostMembershipPlanDocument(plan) ||
        plan.status !== "published") continue;
    // Best effort: a failed price leaves that plan unavailable at checkout
    // until the host publishes it again.
    await ensureProviderPrices(deps, doc.id).catch(() => undefined);
  }
}

/** Organizer managers read and control the paid membership program. */
export async function manageHostMembershipProgramHandler(
  request: CallableRequest<unknown>,
  deps: HostMembershipCallableDeps = defaultHostMembershipCallableDeps,
): Promise<Response> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<Payload>(request,
    validateManageHostMembershipProgramCallablePayload);
  const db = deps.db();
  await deps.checkRateLimit(db, uid, "manageHostMembershipProgram", {
    maxRequests: 30, windowMs: 60 * 1000});
  await deps.requireManager({db, organizerId: data.organizerId,
    actorUid: uid});
  const readiness = await membershipReadiness(deps, data.organizerId);
  const payment = data.action === "enable" ?
    await prepareBinding(deps, data.organizerId, readiness) : null;
  const ref = db.collection(collections.programs).doc(data.organizerId);
  const nowMillis = deps.nowMillis();
  let moved = false;

  let program: HostMembershipProgramDocument | null;
  if (data.action === "get") {
    program = await db.runTransaction((tx) =>
      readProgram(db, tx, data.organizerId));
  } else {
    program = await db.runTransaction(async (tx) => {
      const current = await readProgram(db, tx, data.organizerId);
      const bump = (next: HostMembershipProgramDocument) => ({...next,
        revision: next.revision + 1, updatedAtMillis: nowMillis});
      let next: HostMembershipProgramDocument;
      switch (data.action) {
      case "enable": {
        const binding: MembershipPaymentBinding = bindingOf(payment!);
        if (current && current.memberCount > 0 &&
            !sameBinding(bindingOf(current.payment), binding)) {
          // Existing subscriptions cannot move between Razorpay accounts.
          throw new HttpsError("failed-precondition",
            "Your payment account changed while members are active. " +
            "Contact Catch support to move them.");
        }
        moved = !current || !sameBinding(bindingOf(current.payment), binding);
        next = current ? bump({...current, state: "enabled",
          payment: payment!}) : {
          schemaVersion: 1, organizerId: data.organizerId, state: "enabled",
          payment: payment!, billingPause: {state: "active",
            requestedAtMillis: null, requestedBy: null, processedCount: 0,
            cursor: null},
          memberCount: 0, revision: 1, createdAtMillis: nowMillis,
          updatedAtMillis: nowMillis};
        break;
      }
      case "disable":
        if (!current) return null;
        next = bump({...current, state: "disabled"});
        break;
      case "pauseBilling":
      case "resumeBilling": {
        if (!current || current.state !== "enabled") {
          throw new HttpsError("failed-precondition",
            "Enable memberships first.");
        }
        const pausing = data.action === "pauseBilling";
        const state = current.billingPause.state;
        if (pausing ? state === "pausing" || state === "paused" :
          state === "active" || state === "resuming") return current;
        next = bump({...current, billingPause: {
          state: pausing ? "pausing" : "resuming",
          requestedAtMillis: nowMillis, requestedBy: uid, processedCount: 0,
          cursor: null}});
        break;
      }
      default:
        return current;
      }
      tx.set(ref, next);
      return next;
    });
  }
  if (moved) await moveProviderPrices(deps, data.organizerId);
  // A program enabled on another binding than today's needs re-enabling
  // before new members can join; existing members are unaffected.
  const bindingCurrent = !program || !readiness.binding ||
    sameBinding(bindingOf(program.payment), readiness.binding);
  const unavailableReason = readiness.reason ??
    (program?.state === "enabled" && !bindingCurrent ?
      "razorpayNeedsAttention" : null);
  const response: Response = {organizerId: data.organizerId,
    program: view(program), routeAccountReady: readiness.accountReady,
    feeConfigured: readiness.termsConfigured,
    paymentMode: readiness.moneyFlow, unavailableReason};
  if (!validateManageHostMembershipProgramCallableResponse(response)) {
    throw new HttpsError("internal", "Invalid membership program.");
  }
  return response;
}

export const manageHostMembershipProgram = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60,
    maxInstances: 20}),
  (request) => manageHostMembershipProgramHandler(request));
