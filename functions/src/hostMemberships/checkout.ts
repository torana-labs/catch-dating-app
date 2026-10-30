import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import type {HostMembershipCheckoutDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {ManageHostMembershipCheckoutCallablePayload as Payload} from
  "../shared/generated/manageHostMembershipCheckoutCallablePayload";
import type {ManageHostMembershipCheckoutCallableResponse as Response} from
  "../shared/generated/manageHostMembershipCheckoutCallableResponse";
import {validateHostMembershipCheckoutDocument} from
  "../shared/generated/validators/hostMembershipCheckoutDocument";
import {validateManageHostMembershipCheckoutCallablePayload} from
  "../shared/generated/validators/manageHostMembershipCheckoutInput";
import {validateManageHostMembershipCheckoutCallableResponse} from
  "../shared/generated/validators/manageHostMembershipCheckoutOutput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {
  defaultHostMembershipCallableDeps,
  type HostMembershipCallableDeps,
} from "./callableDeps";
import {hostMembershipId, newHostMembershipCheckoutId} from "./ids";
import {
  applySubscriptionSnapshot,
  collections,
  readCheckout,
  readMembership,
  readPlan,
  readProgram,
} from "./membershipStore";

export const checkoutWindowMillis = 30 * 60 * 1000;
const dayMillis = 24 * 60 * 60 * 1000;

function unavailable(message: string): never {
  throw new HttpsError("failed-precondition", message);
}

function responseFor(checkoutId: string,
  checkout: HostMembershipCheckoutDocument,
  membership: {id: string; status: Response["membershipStatus"]} | null):
  Response {
  const response: Response = {checkoutId, state: checkout.state,
    authorizationUrl: checkout.state === "open" ?
      checkout.authorizationUrl : null,
    expiresAtMillis: checkout.expiresAtMillis,
    membershipId: membership?.id ?? null,
    membershipStatus: membership?.status ?? null};
  if (!validateManageHostMembershipCheckoutCallableResponse(response)) {
    throw new HttpsError("internal", "Invalid membership checkout.");
  }
  return response;
}

type Prepare = Extract<Payload, {action: "prepare"}>;

async function prepare(deps: HostMembershipCallableDeps, uid: string,
  data: Prepare): Promise<Response> {
  const db = deps.db();
  const nowMillis = deps.nowMillis();
  const reserved = await db.runTransaction(async (tx) => {
    const membershipId = hostMembershipId(data.organizerId, uid);
    const [program, plan, membership, deleted, mine] = await Promise.all([
      readProgram(db, tx, data.organizerId),
      readPlan(db, tx, data.planId),
      readMembership(db, tx, membershipId),
      tx.get(db.collection("deletedUsers").doc(uid)),
      tx.get(db.collection(collections.checkouts).where("uid", "==", uid)
        .where("state", "in", ["creating", "open"]).limit(20)),
    ]);
    if (deleted.exists) unavailable("Account is unavailable.");
    if (!program || program.state !== "enabled" ||
        program.billingPause.state !== "active") {
      unavailable("This organizer is not taking new members right now.");
    }
    if (!plan || plan.organizerId !== data.organizerId ||
        plan.status !== "published") {
      unavailable("This plan is not available.");
    }
    const price = plan.prices[data.interval];
    if (!price?.providerPriceIds.razorpay) {
      unavailable("This plan is not available.");
    }
    if (membership && membership.status !== "expired") {
      throw new HttpsError("already-exists",
        "You already have a membership with this organizer.");
    }
    for (const doc of mine.docs) {
      const existing = doc.data();
      if (validateHostMembershipCheckoutDocument(existing) &&
          existing.organizerId === data.organizerId &&
          existing.planId === data.planId &&
          existing.interval === data.interval &&
          existing.expiresAtMillis > nowMillis &&
          existing.state === "open") {
        return {checkoutId: doc.id, checkout: existing, create: false};
      }
    }
    if (plan.memberCap !== null) {
      const open = await tx.get(db.collection(collections.checkouts)
        .where("planId", "==", data.planId)
        .where("state", "in", ["creating", "open"])
        .where("expiresAtMillis", ">", nowMillis)
        .limit(plan.memberCap + 1));
      if (plan.activeMemberCount + open.size >= plan.memberCap) {
        unavailable("This plan is full.");
      }
    }
    const checkoutId = newHostMembershipCheckoutId();
    const checkout: HostMembershipCheckoutDocument = {schemaVersion: 1,
      organizerId: data.organizerId, planId: data.planId, uid,
      interval: data.interval, priceInPaise: price.amountPaise,
      state: "creating", provider: "razorpay", providerSubscriptionId: null,
      authorizationUrl: null, expiresAtMillis: nowMillis + checkoutWindowMillis,
      createdAtMillis: nowMillis, updatedAtMillis: nowMillis};
    tx.create(db.collection(collections.checkouts).doc(checkoutId), checkout);
    return {checkoutId, checkout, create: true,
      providerPriceId: price.providerPriceIds.razorpay,
      trialDays: plan.trialDays};
  });
  if (!reserved.create) {
    return responseFor(reserved.checkoutId, reserved.checkout, null);
  }
  const ref = db.collection(collections.checkouts).doc(reserved.checkoutId);
  try {
    const config = await deps.config();
    const provider = deps.provider(config);
    const created = await provider.createSubscription({
      providerPriceId: reserved.providerPriceId!, interval: data.interval,
      startAtMillis: reserved.trialDays ?
        nowMillis + reserved.trialDays! * dayMillis : null,
      notes: {catchProject: deps.catchProject(),
        catchCheckoutId: reserved.checkoutId, organizerId: data.organizerId,
        planId: data.planId, uid}});
    const opened: HostMembershipCheckoutDocument = {...reserved.checkout,
      state: "open", providerSubscriptionId: created.providerSubscriptionId,
      authorizationUrl: created.authorizationUrl,
      updatedAtMillis: deps.nowMillis()};
    await ref.set(opened);
    return responseFor(reserved.checkoutId, opened, null);
  } catch (error) {
    await ref.update({state: "failed", updatedAtMillis: deps.nowMillis()});
    if (error instanceof HttpsError) throw error;
    unavailable("Membership checkout could not start. Please try again.");
  }
}

async function refresh(deps: HostMembershipCallableDeps, uid: string,
  checkoutId: string): Promise<Response> {
  const db = deps.db();
  const checkout = await db.runTransaction((tx) =>
    readCheckout(db, tx, checkoutId));
  if (!checkout || checkout.uid !== uid) {
    throw new HttpsError("not-found", "Checkout not found.");
  }
  if (!checkout.providerSubscriptionId ||
      !["open", "authorized"].includes(checkout.state)) {
    return responseFor(checkoutId, checkout, null);
  }
  const config = await deps.config();
  const provider = deps.provider(config);
  const snapshot = await provider.fetchSubscription(
    checkout.providerSubscriptionId);
  const nowMillis = deps.nowMillis();
  const applied = await applySubscriptionSnapshot({db, snapshot,
    observedAtMillis: nowMillis, nowMillis,
    catchProject: deps.catchProject()});
  let current = await db.runTransaction((tx) =>
    readCheckout(db, tx, checkoutId));
  if (current && current.state === "open" &&
      current.expiresAtMillis <= nowMillis && snapshot.status === "created") {
    await db.collection(collections.checkouts).doc(checkoutId)
      .update({state: "expired", updatedAtMillis: nowMillis});
    current = {...current, state: "expired"};
  }
  const membership = applied.membership &&
    applied.membership.providerSubscriptionId === snapshot.id ?
    {id: applied.membershipId!, status: applied.membership.status} : null;
  return responseFor(checkoutId, current ?? checkout, membership);
}

/** Starts or refreshes a member's subscription purchase. */
export async function manageHostMembershipCheckoutHandler(
  request: CallableRequest<unknown>,
  deps: HostMembershipCallableDeps = defaultHostMembershipCallableDeps,
): Promise<Response> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<Payload>(request,
    validateManageHostMembershipCheckoutCallablePayload);
  await deps.checkRateLimit(deps.db(), uid, "manageHostMembershipCheckout", {
    maxRequests: 20, windowMs: 60 * 1000});
  return data.action === "prepare" ? prepare(deps, uid, data) :
    refresh(deps, uid, data.checkoutId);
}

export const manageHostMembershipCheckout = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60,
    maxInstances: 20}),
  (request) => manageHostMembershipCheckoutHandler(request));
