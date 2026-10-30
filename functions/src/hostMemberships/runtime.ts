import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  HostMembershipProgramDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {MoneyFlow} from "../commercialTerms/terms";
import {razorpayCollectionRoutingDefaults} from
  "../payments/razorpayCollectionRouting";
import type {RazorpayPlatformPaymentConfig} from
  "../payments/razorpayPlatformPaymentConfig";
import {formPaymentRuntime} from "../payments/formPayments/formPaymentRuntime";
import {readReadyRouteAccount} from
  "../payments/formPayments/razorpayRouteFormAuthority";
import type {HostMembershipBillingProvider} from "./billingProvider";
import {RazorpaySubscriptionProvider} from "./razorpaySubscriptionProvider";

/** The account a membership's subscription lives on; see the contract. */
export interface MembershipPaymentBinding {
  provider: "razorpay";
  moneyFlow: MoneyFlow;
  providerAccountId: string;
  bindingId: string;
  mode: "test" | "live";
}

/** The OAuth connection a hostCollected binding uses on the merchant side. */
export interface MerchantConnectionBinding {
  organizerId: string;
  connectionId: string;
  accountId: string;
  mode: "test" | "live";
}

/** Injectable payment environment shared by every membership entry point. */
export interface HostMembershipRuntime {
  db: () => FirebaseFirestore.Firestore;
  nowMillis: () => number;
  catchProject: () => string;
  /** Catch's platform credentials; only the platformSplit mode uses them. */
  platformConfig: () => Promise<RazorpayPlatformPaymentConfig>;
  /** A provider on Catch's platform account (platformSplit). */
  platformProvider: () => Promise<HostMembershipBillingProvider>;
  /** A provider on the organizer's own merchant account (hostCollected). */
  merchantProvider: (binding: MerchantConnectionBinding) =>
    Promise<HostMembershipBillingProvider>;
  /** The membership webhook URL Catch registers on a merchant account. */
  merchantWebhookUrl: (connectionId: string) => string;
  readyRouteAccount: typeof readReadyRouteAccount;
}

export function membershipsUnavailable(): never {
  throw new HttpsError("failed-precondition",
    "Memberships are not available for this organizer yet.");
}

/** Programs and memberships from before money flows were platformSplit. */
export function bindingOf(payment: HostMembershipProgramDocument["payment"] &
  {moneyFlow?: MoneyFlow}): MembershipPaymentBinding {
  return {provider: payment.provider,
    moneyFlow: payment.moneyFlow ?? "platformSplit",
    providerAccountId: payment.providerAccountId,
    bindingId: payment.bindingId, mode: payment.mode};
}

export function sameBinding(left: MembershipPaymentBinding,
  right: MembershipPaymentBinding): boolean {
  return left.provider === right.provider &&
    left.moneyFlow === right.moneyFlow &&
    left.providerAccountId === right.providerAccountId &&
    left.bindingId === right.bindingId && left.mode === right.mode;
}

/** The provider for the account that owns a binding's subscriptions. */
export function providerFor(runtime: Pick<HostMembershipRuntime,
  "platformProvider" | "merchantProvider">, organizerId: string,
binding: MembershipPaymentBinding): Promise<HostMembershipBillingProvider> {
  return binding.moneyFlow === "hostCollected" ?
    runtime.merchantProvider({organizerId, connectionId: binding.bindingId,
      accountId: binding.providerAccountId, mode: binding.mode}) :
    runtime.platformProvider();
}

function projectId(): string {
  return admin.app().options.projectId ??
    process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "";
}

async function platformConfig(): Promise<RazorpayPlatformPaymentConfig> {
  const version = razorpayCollectionRoutingDefaults.platformVersion();
  if (!version) membershipsUnavailable();
  return razorpayCollectionRoutingDefaults.platform(version);
}

export const defaultHostMembershipRuntime: HostMembershipRuntime = {
  db: () => admin.firestore(),
  nowMillis: Date.now,
  catchProject: projectId,
  platformConfig,
  platformProvider: async () => {
    const config = await platformConfig();
    return new RazorpaySubscriptionProvider({keyId: config.keyId,
      keySecret: config.keySecret, webhookSecret: config.webhookSecret,
      mode: config.mode});
  },
  merchantProvider: async (binding) => {
    // The same partner runtime, credential vault and refresh lease that
    // ticketing and form fees use for this organizer's connection.
    const oauth = await formPaymentRuntime();
    if (oauth.mode !== binding.mode) membershipsUnavailable();
    const credential = await oauth.credentials.access(binding);
    return new RazorpaySubscriptionProvider({
      accessToken: credential.token.accessToken,
      accountId: credential.accountId,
      webhookSecret: credential.webhookSecret, mode: binding.mode});
  },
  merchantWebhookUrl: (connectionId) => {
    const url = new URL(`https://asia-south1-${projectId()}` +
      ".cloudfunctions.net/hostMembershipRazorpayWebhook");
    url.searchParams.set("connectionId", connectionId);
    return url.href;
  },
  readyRouteAccount: readReadyRouteAccount,
};
