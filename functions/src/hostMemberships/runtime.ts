import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {razorpayCollectionRoutingDefaults} from
  "../payments/razorpayCollectionRouting";
import type {RazorpayPlatformPaymentConfig} from
  "../payments/razorpayPlatformPaymentConfig";
import {readReadyRouteAccount} from
  "../payments/formPayments/razorpayRouteFormAuthority";
import type {HostMembershipBillingProvider} from "./billingProvider";
import {RazorpaySubscriptionProvider} from "./razorpaySubscriptionProvider";

/** Injectable payment environment shared by every membership entry point. */
export interface HostMembershipRuntime {
  db: () => FirebaseFirestore.Firestore;
  nowMillis: () => number;
  catchProject: () => string;
  /** Throws failed-precondition when the pinned platform profile is absent. */
  config: () => Promise<RazorpayPlatformPaymentConfig>;
  provider: (config: RazorpayPlatformPaymentConfig) =>
    HostMembershipBillingProvider;
  readyRouteAccount: typeof readReadyRouteAccount;
}

export function membershipsUnavailable(): never {
  throw new HttpsError("failed-precondition",
    "Memberships are not available for this organizer yet.");
}

/** Fee basis points for memberships; absent configuration fails closed. */
export function hostMembershipFeeBasisPoints(
  config: RazorpayPlatformPaymentConfig): number {
  const fee = config.feeBasisPoints.hostMembership;
  if (typeof fee !== "number" || !Number.isSafeInteger(fee) || fee < 0 ||
      fee >= 10000) membershipsUnavailable();
  return fee;
}

export const defaultHostMembershipRuntime: HostMembershipRuntime = {
  db: () => admin.firestore(),
  nowMillis: Date.now,
  catchProject: () => admin.app().options.projectId ??
    process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "",
  config: async () => {
    const version = razorpayCollectionRoutingDefaults.platformVersion();
    if (!version) membershipsUnavailable();
    return razorpayCollectionRoutingDefaults.platform(version);
  },
  provider: (config) => new RazorpaySubscriptionProvider({
    keyId: config.keyId, keySecret: config.keySecret,
    webhookSecret: config.webhookSecret, mode: config.mode}),
  readyRouteAccount: readReadyRouteAccount,
};
