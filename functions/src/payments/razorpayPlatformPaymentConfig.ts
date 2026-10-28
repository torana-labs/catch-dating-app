import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {defineString} from "firebase-functions/params";
import {HttpsError} from "firebase-functions/v2/https";

export const razorpayPlatformPaymentConfigVersion = defineString(
  "RAZORPAY_PLATFORM_PAYMENT_CONFIG_VERSION", {default: ""});

export interface RazorpayPlatformPaymentConfig {
  schema: "catch.razorpay-platform-payments/v1";
  mode: "test" | "live";
  platformAccountId: string;
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  /** `hostMembership` is optional; memberships stay unavailable without it. */
  feeBasisPoints: {formFee: number; eventAdmission: number;
    hostMembership?: number};
}

/** A pinned platform profile is independent of Technology Partner approval.
 * Retain old versions while their payments require reconciliation/refunds.
 */
export class RazorpayPlatformPaymentConfigLoader {
  private cached = new Map<string, {until: number;
    value: Promise<RazorpayPlatformPaymentConfig>}>();

  constructor(private readonly projectId: string,
    private readonly readSecret: (version: string) => Promise<string> =
    readGoogleSecret,
    private readonly now: () => number = Date.now) {
    if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/u.test(projectId)) unavailable();
  }

  async load(version: string): Promise<RazorpayPlatformPaymentConfig> {
    const prefix = `projects/${this.projectId}/secrets/`;
    if (!version.startsWith(prefix) ||
        !/^[A-Za-z0-9_-]{1,255}\/versions\/[1-9][0-9]*$/u
          .test(version.slice(prefix.length))) unavailable();
    const cached = this.cached.get(version);
    if (cached && cached.until > this.now()) return cached.value;
    if (this.cached.size >= 10) this.cached.clear();
    const value = this.readSecret(version).then(parseConfig)
      .catch(() => unavailable());
    this.cached.set(version, {until: this.now() + 60_000, value});
    try {
      return await value;
    } catch {
      if (this.cached.get(version)?.value === value) {
        this.cached.delete(version);
      }
      unavailable();
    }
  }
}

function parseConfig(raw: string): RazorpayPlatformPaymentConfig {
  if (Buffer.byteLength(raw, "utf8") > 32 * 1024) unavailable();
  const value: unknown = JSON.parse(raw);
  if (!record(value) || Object.keys(value).sort().join(",") !==
      ["feeBasisPoints", "keyId", "keySecret", "mode", "platformAccountId",
        "schema", "webhookSecret"].join(",") ||
      value.schema !== "catch.razorpay-platform-payments/v1" ||
      value.mode !== "test" && value.mode !== "live" ||
      typeof value.platformAccountId !== "string" ||
      !/^acc_[A-Za-z0-9]+$/u.test(value.platformAccountId) ||
      typeof value.keyId !== "string" ||
      !new RegExp(`^rzp_${value.mode}_[A-Za-z0-9]+$`, "u").test(value.keyId) ||
      !secret(value.keySecret) || !secret(value.webhookSecret) ||
      !record(value.feeBasisPoints) ||
      !["eventAdmission,formFee", "eventAdmission,formFee,hostMembership"]
        .includes(Object.keys(value.feeBasisPoints).sort().join(",")) ||
      !Object.values(value.feeBasisPoints).every((fee) =>
        typeof fee === "number" && Number.isSafeInteger(fee) &&
        fee >= 0 && fee < 10000)) unavailable();
  return value as unknown as RazorpayPlatformPaymentConfig;
}

async function readGoogleSecret(version: string): Promise<string> {
  const [value] = await new SecretManagerServiceClient()
    .accessSecretVersion({name: version});
  if (!value.payload?.data) unavailable();
  return Buffer.from(value.payload.data).toString("utf8");
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function secret(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 &&
    value.length < 16_384 && !/\s/u.test(value);
}
function unavailable(): never {
  throw new HttpsError("failed-precondition",
    "Catch payment collection is not configured for this environment.");
}
