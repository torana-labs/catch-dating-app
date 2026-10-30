import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import type {ManageMyHostMembershipCallablePayload as Payload} from
  "../shared/generated/manageMyHostMembershipCallablePayload";
import type {ManageMyHostMembershipCallableResponse as Response} from
  "../shared/generated/manageMyHostMembershipCallableResponse";
import {validateManageMyHostMembershipCallablePayload} from
  "../shared/generated/validators/manageMyHostMembershipInput";
import {validateManageMyHostMembershipCallableResponse} from
  "../shared/generated/validators/manageMyHostMembershipOutput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {
  defaultHostMembershipCallableDeps,
  type HostMembershipCallableDeps,
} from "./callableDeps";
import {applySubscriptionSnapshot, readMembership, readProgram} from
  "./membershipStore";
import {bindingOf, membershipsUnavailable, providerFor} from "./runtime";
import type {MembershipIntent} from "./stateMachine";

const allowed: Record<Payload["action"], readonly string[]> = {
  pause: ["active"],
  resume: ["paused"],
  cancelAtPeriodEnd: ["active", "trialing", "past_due"],
};

/** Member self-serve pause, resume and cancel-at-period-end. */
export async function manageMyHostMembershipHandler(
  request: CallableRequest<unknown>,
  deps: HostMembershipCallableDeps = defaultHostMembershipCallableDeps,
): Promise<Response> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<Payload>(request,
    validateManageMyHostMembershipCallablePayload);
  const db = deps.db();
  await deps.checkRateLimit(db, uid, "manageMyHostMembership", {
    maxRequests: 10, windowMs: 60 * 1000});
  const {membership, program} = await db.runTransaction(async (tx) => {
    const membership = await readMembership(db, tx, data.membershipId);
    const program = membership ?
      await readProgram(db, tx, membership.organizerId) : null;
    return {membership, program};
  });
  if (!membership || membership.uid !== uid) {
    throw new HttpsError("not-found", "Membership not found.");
  }
  if (!allowed[data.action].includes(membership.status)) {
    throw new HttpsError("failed-precondition",
      "This membership cannot be changed that way right now.");
  }
  if (data.action === "resume" && (membership.pause?.initiator !== "member" ||
      program?.billingPause.state !== "active")) {
    throw new HttpsError("failed-precondition",
      "Your organizer has paused billing. It resumes when they restart it.");
  }
  if (data.action === "cancelAtPeriodEnd" && membership.cancelAtPeriodEnd) {
    return respond(data.membershipId, membership);
  }
  if (!program) membershipsUnavailable();
  const binding = bindingOf(membership.payment ?? program.payment);
  const provider = await providerFor(deps, membership.organizerId, binding);
  const id = membership.providerSubscriptionId;
  const snapshot = data.action === "pause" ? await provider.pause(id) :
    data.action === "resume" ? await provider.resume(id) :
      await provider.cancelAtPeriodEnd(id);
  const intent: MembershipIntent = data.action === "pause" ? "memberPause" :
    data.action === "resume" ? "memberResume" : "memberCancel";
  const nowMillis = deps.nowMillis();
  const applied = await applySubscriptionSnapshot({db, snapshot,
    observedAtMillis: nowMillis, nowMillis, intent,
    catchProject: deps.catchProject(),
    expectedMembershipId: data.membershipId, deliveredBy: binding});
  if (!applied.membership) {
    throw new HttpsError("internal", "Membership could not be updated.");
  }
  return respond(data.membershipId, applied.membership);
}

function respond(membershipId: string, membership: {
  status: Response["status"]; cancelAtPeriodEnd: boolean;
  currentPeriodEndMillis: number | null}): Response {
  const response: Response = {membershipId, status: membership.status,
    cancelAtPeriodEnd: membership.cancelAtPeriodEnd,
    currentPeriodEndMillis: membership.currentPeriodEndMillis};
  if (!validateManageMyHostMembershipCallableResponse(response)) {
    throw new HttpsError("internal", "Invalid membership.");
  }
  return response;
}

export const manageMyHostMembership = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60,
    maxInstances: 20}),
  (request) => manageMyHostMembershipHandler(request));
