import {HttpsError} from "firebase-functions/v2/https";
import type {OrganizerPaymentConnectionDocument as Connection} from
  "../shared/generated/firestoreAdminTypes";
import {validateOrganizerPaymentConnectionDocument} from
  "../shared/generated/validators/organizerPaymentConnectionDocument";
import {
  CommercialTermsUnavailableError,
  resolveCommercialTerms,
} from "../commercialTerms/resolver";
import {moneyFlowForRoute, type MoneyFlow} from "../commercialTerms/terms";
import {readPaymentRoute} from "../payments/paymentRouting";
import {requireReadyFormPaymentConnection} from
  "../payments/formPayments/formPaymentConnectionPolicy";
import type {HostMembershipRuntime, MembershipPaymentBinding} from
  "./runtime";

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

/** The first reason an organizer's effective membership mode cannot run. */
export type MembershipUnavailableReason =
  | "notOffered"
  | "termsNotConfigured"
  | "razorpayNotConnected"
  | "razorpayNeedsAttention"
  | "subscriptionsNotEnabled"
  | "payoutAccountNotReady"
  | "providerUnavailable";

const hostMessages: Record<MembershipUnavailableReason, string> = {
  notOffered: "Catch hasn't turned on memberships for this club yet.",
  termsNotConfigured:
    "Memberships aren't available yet. Catch is finishing your terms.",
  razorpayNotConnected:
    "Connect your Razorpay account in Payments to sell memberships.",
  razorpayNeedsAttention:
    "Your Razorpay connection needs attention. Reconnect it in Payments.",
  subscriptionsNotEnabled:
    "Turn on Subscriptions in your Razorpay account, then try again.",
  payoutAccountNotReady: "Finish payout setup before selling memberships.",
  providerUnavailable:
    "Razorpay couldn't be reached. Try again in a few minutes.",
};

/** Fails closed with a reason the host can act on. */
export class HostMembershipUnavailableError extends HttpsError {
  constructor(readonly reason: MembershipUnavailableReason) {
    super("failed-precondition", hostMessages[reason], {reason});
    this.name = "HostMembershipUnavailableError";
  }
}

export function membershipUnavailable(
  reason: MembershipUnavailableReason): never {
  throw new HostMembershipUnavailableError(reason);
}

/**
 * The membership money flow is the routing policy's hostMembership route,
 * with the same app default and organizer override as tickets and forms.
 * Absent or disabled means Catch has not offered memberships here.
 */
export async function resolveMembershipMode(params: {
  db: Db; tx?: Tx; organizerId: string;
}): Promise<{moneyFlow: MoneyFlow; mode: "test" | "live"}> {
  let selected;
  try {
    selected = await readPaymentRoute({...params, purpose: "hostMembership"});
  } catch {
    membershipUnavailable("notOffered");
  }
  const {route, currency, merchantCountry} = selected.selection;
  const moneyFlow = moneyFlowForRoute(route);
  // Only Razorpay in India is implemented; Stripe routes stay unavailable.
  if (!moneyFlow || !route.startsWith("razorpay") || currency !== "INR" ||
      merchantCountry !== "IN") membershipUnavailable("notOffered");
  return {moneyFlow, mode: selected.selection.mode};
}

/**
 * The organizer's one ready OAuth connection in this mode. Two ready
 * merchants need the host to disconnect one; Catch never guesses.
 */
export async function readReadyMembershipConnection(params: {
  db: Db; tx?: Tx; organizerId: string; mode: "test" | "live";
  nowMillis: number;
}): Promise<{connectionId: string; connection: Connection}> {
  const {db, tx, organizerId, mode} = params;
  const query = db.collection("organizerPaymentConnections")
    .where("organizerId", "==", organizerId).where("mode", "==", mode)
    .limit(10);
  const snap = tx ? await tx.get(query) : await query.get();
  const connections = snap.docs.map((doc) => ({connectionId: doc.id,
    connection: doc.data()}))
    .filter((entry): entry is {connectionId: string; connection: Connection} =>
      validateOrganizerPaymentConnectionDocument(entry.connection) &&
      entry.connection.status !== "disconnected");
  const ready = connections.filter((entry) => {
    try {
      requireReadyFormPaymentConnection(entry.connection, organizerId,
        params.nowMillis);
      return true;
    } catch {
      return false;
    }
  });
  if (ready.length === 1) return ready[0];
  membershipUnavailable(ready.length > 1 || connections.length > 0 ?
    "razorpayNeedsAttention" : "razorpayNotConnected");
}

/** Throws termsNotConfigured unless Catch's terms resolve for memberships. */
export async function requireMembershipTerms(params: {
  db: Db; tx?: Tx; organizerId: string; moneyFlow: MoneyFlow;
  nowMillis: number;
}) {
  try {
    return await resolveCommercialTerms({...params,
      purpose: "hostMembership"});
  } catch (error) {
    if (error instanceof CommercialTermsUnavailableError) {
      membershipUnavailable("termsNotConfigured");
    }
    throw error;
  }
}

export interface MembershipReadiness {
  moneyFlow: MoneyFlow | null;
  binding: MembershipPaymentBinding | null;
  termsConfigured: boolean;
  accountReady: boolean;
  reason: MembershipUnavailableReason | null;
}

/**
 * Everything checkable without calling the provider: the effective mode, its
 * account, and Catch's terms. Enabling additionally probes Subscriptions on
 * the account and registers the webhook.
 */
export async function membershipReadiness(runtime: Pick<
  HostMembershipRuntime, "db" | "nowMillis" | "platformConfig" |
  "readyRouteAccount">, organizerId: string): Promise<MembershipReadiness> {
  const db = runtime.db();
  const nowMillis = runtime.nowMillis();
  const result: MembershipReadiness = {moneyFlow: null, binding: null,
    termsConfigured: false, accountReady: false, reason: null};
  const reason = (error: unknown): MembershipUnavailableReason => {
    if (error instanceof HostMembershipUnavailableError) return error.reason;
    return "providerUnavailable";
  };
  let mode: "test" | "live";
  try {
    ({moneyFlow: result.moneyFlow, mode} =
      await resolveMembershipMode({db, organizerId}));
  } catch (error) {
    return {...result, reason: reason(error)};
  }
  const moneyFlow = result.moneyFlow!;
  // The account comes first: it is the blocker the host can fix.
  try {
    if (moneyFlow === "hostCollected") {
      const {connectionId, connection} = await readReadyMembershipConnection({
        db, organizerId, mode, nowMillis});
      result.binding = {provider: "razorpay", moneyFlow,
        providerAccountId: connection.accountId!, bindingId: connectionId,
        mode};
    } else {
      const config = await runtime.platformConfig()
        .catch(() => membershipUnavailable("payoutAccountNotReady"));
      if (config.mode !== mode) membershipUnavailable("payoutAccountNotReady");
      const {bindingId, account} = await runtime.readyRouteAccount({db,
        organizerId}).catch(() =>
        membershipUnavailable("payoutAccountNotReady"));
      result.binding = {provider: "razorpay", moneyFlow,
        providerAccountId: account.providerAccountId, bindingId, mode};
    }
    result.accountReady = true;
  } catch (error) {
    result.reason = reason(error);
  }
  try {
    await requireMembershipTerms({db, organizerId, moneyFlow, nowMillis});
    result.termsConfigured = true;
  } catch (error) {
    result.reason ??= reason(error);
  }
  return result;
}
