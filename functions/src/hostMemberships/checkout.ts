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
  membershipUnavailable,
  readReadyMembershipConnection,
  requireMembershipTerms,
  resolveMembershipMode,
} from "./paymentMode";
import {priceAccountFor, priceOnAccount} from "./plans";
import {
  bindingOf,
  providerFor,
  sameBinding,
  type MembershipPaymentBinding,
} from "./runtime";
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

/**
 * New members may only join while the program's binding is still the
 * organizer's effective mode, its account is still ready, and Catch's terms
 * resolve. Each fails closed with the host-facing reason.
 */
async function requireCurrentBinding(params: {
  db: FirebaseFirestore.Firestore; tx: FirebaseFirestore.Transaction;
  organizerId: string; binding: MembershipPaymentBinding; nowMillis: number;
}): Promise<void> {
  const {db, tx, organizerId, binding, nowMillis} = params;
  const mode = await resolveMembershipMode({db, tx, organizerId});
  if (mode.moneyFlow !== binding.moneyFlow || mode.mode !== binding.mode) {
    unavailable("This organizer is not taking new members right now.");
  }
  if (binding.moneyFlow === "hostCollected") {
    const {connectionId, connection} = await readReadyMembershipConnection({
      db, tx, organizerId, mode: binding.mode, nowMillis});
    if (connectionId !== binding.bindingId ||
        connection.accountId !== binding.providerAccountId) {
      membershipUnavailable("razorpayNeedsAttention");
    }
  }
  await requireMembershipTerms({db, tx, organizerId,
    moneyFlow: binding.moneyFlow, nowMillis});
}

async function prepare(deps: HostMembershipCallableDeps, uid: string,
  data: Prepare): Promise<Response> {
  const db = deps.db();
  const nowMillis = deps.nowMillis();
  // The program's binding decides which account owns the subscription. It
  // is read first so the price account can be resolved, then rechecked
  // inside the reservation transaction.
  const bound = await db.runTransaction((tx) =>
    readProgram(db, tx, data.organizerId));
  if (!bound) {
    unavailable("This organizer is not taking new members right now.");
  }
  const binding = bindingOf(bound.payment);
  const priceAccount = await priceAccountFor(deps, binding)
    .catch(() => membershipUnavailable("providerUnavailable"));
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
        program.billingPause.state !== "active" ||
        !sameBinding(bindingOf(program.payment), binding)) {
      unavailable("This organizer is not taking new members right now.");
    }
    await requireCurrentBinding({db, tx, organizerId: data.organizerId,
      binding, nowMillis});
    if (!plan || plan.organizerId !== data.organizerId ||
        plan.status !== "published") {
      unavailable("This plan is not available.");
    }
    const price = plan.prices[data.interval];
    if (!price?.providerPriceIds.razorpay ||
        !priceOnAccount(price, binding, priceAccount)) {
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
      payment: {...binding},
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
    const provider = await providerFor(deps, data.organizerId, binding);
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
  const program = checkout.payment ? null : await db.runTransaction((tx) =>
    readProgram(db, tx, checkout.organizerId));
  const payment = checkout.payment ?? program?.payment;
  if (!payment) throw new HttpsError("not-found", "Checkout not found.");
  const provider = await providerFor(deps, checkout.organizerId,
    bindingOf(payment));
  const snapshot = await provider.fetchSubscription(
    checkout.providerSubscriptionId);
  const nowMillis = deps.nowMillis();
  const applied = await applySubscriptionSnapshot({db, snapshot,
    observedAtMillis: nowMillis, nowMillis,
    catchProject: deps.catchProject(), deliveredBy: bindingOf(payment)});
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
