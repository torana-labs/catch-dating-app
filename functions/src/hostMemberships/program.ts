import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import type {HostMembershipProgramDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {ManageHostMembershipProgramCallablePayload as Payload} from
  "../shared/generated/manageHostMembershipProgramCallablePayload";
import type {ManageHostMembershipProgramCallableResponse as Response} from
  "../shared/generated/manageHostMembershipProgramCallableResponse";
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
import {collections, readProgram} from "./membershipStore";
import {hostMembershipFeeBasisPoints} from "./runtime";

async function readiness(deps: HostMembershipCallableDeps,
  organizerId: string) {
  const db = deps.db();
  const account = await deps.readyRouteAccount({db, organizerId})
    .catch(() => null);
  const config = await deps.config().catch(() => null);
  let feeConfigured = false;
  if (config) {
    try {
      hostMembershipFeeBasisPoints(config);
      feeConfigured = true;
    } catch {
      feeConfigured = false;
    }
  }
  return {account, config, feeConfigured};
}

function view(program: HostMembershipProgramDocument | null):
  Response["program"] {
  return program ? {state: program.state, provider: program.payment.provider,
    mode: program.payment.mode, billingPauseState: program.billingPause.state,
    memberCount: program.memberCount, revision: program.revision} : null;
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
  const {account, config, feeConfigured} =
    await readiness(deps, data.organizerId);
  const ref = db.collection(collections.programs).doc(data.organizerId);
  const nowMillis = deps.nowMillis();

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
        if (!account || !config || !feeConfigured) {
          throw new HttpsError("failed-precondition",
            "Finish payout setup before selling memberships.");
        }
        const payment = {provider: "razorpay" as const,
          providerAccountId: account.account.providerAccountId,
          bindingId: account.bindingId, mode: config.mode};
        if (current && current.memberCount > 0 &&
            current.payment.providerAccountId !== payment.providerAccountId) {
          throw new HttpsError("failed-precondition",
            "Your payout account changed while members are active. " +
            "Contact Catch support to move them.");
        }
        next = current ? bump({...current, state: "enabled", payment}) : {
          schemaVersion: 1, organizerId: data.organizerId, state: "enabled",
          payment, billingPause: {state: "active", requestedAtMillis: null,
            requestedBy: null, processedCount: 0, cursor: null},
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
  const response: Response = {organizerId: data.organizerId,
    program: view(program), routeAccountReady: account !== null,
    feeConfigured};
  if (!validateManageHostMembershipProgramCallableResponse(response)) {
    throw new HttpsError("internal", "Invalid membership program.");
  }
  return response;
}

export const manageHostMembershipProgram = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60,
    maxInstances: 20}),
  (request) => manageHostMembershipProgramHandler(request));
