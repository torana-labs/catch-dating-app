import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {HttpsError} from "firebase-functions/v2/https";
import {RazorpayCredentialVault} from "./razorpayCredentialVault";
import {RazorpayFormProvider, type RazorpayPartnerConfig} from
  "./razorpayFormProvider";

// The current partner config is this secret's newest version, read at
// runtime, so storing a new version takes effect without a deploy. Records keep
// the exact version they were created under and keep reading that one. With no
// version stored, form payments stay unavailable.
export const formRazorpayPartnerSecret = "FORM_RAZORPAY_PARTNER_CONFIG";

interface PartnerSecret {
  schema: "catch.form-razorpay-partner/v1";
  clientId: string;
  clientSecret: string;
  mode: "test" | "live";
  credentialSecretId: string;
}

export interface FormPaymentRuntime {
  /** The exact version read, in projects/<id>/secrets/<name>/versions/<n>. */
  version: string;
  provider: RazorpayFormProvider;
  vault: RazorpayCredentialVault;
  mode: "test" | "live";
  webhookBaseUrl: string;
  callbackUrl: string;
}

interface SecretVersion {name: string; data: string}
interface LoadedSecret {version: string; config: PartnerSecret}

/**
 * Reads the newest partner config version, or a version a record pinned, in
 * the deployment project.
 */
export class FormPaymentRuntimeConfig {
  private readonly cached = new Map<string, {until: number;
    secret: Promise<LoadedSecret>}>();

  constructor(private readonly projectId: string,
    private readonly readSecret: (name: string) => Promise<SecretVersion> =
    readGoogleSecret,
    private readonly now: () => number = Date.now) {
    if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/u.test(projectId)) unavailable();
  }

  /** Whether a usable partner config version is stored. */
  async configured(): Promise<boolean> {
    try {
      await this.loadSecret();
      return true;
    } catch {
      return false;
    }
  }

  /** Loads the newest version, or exactly `version` when a record pins one. */
  async load(version?: string): Promise<FormPaymentRuntime> {
    const {version: resolved, config} = await this.loadSecret(version);
    // These endpoints are owned by this deployment, not supplied by a browser
    // or by the connecting organizer. Production OAuth requires HTTPS.
    const origin = `https://asia-south1-${this.projectId}.cloudfunctions.net`;
    const callbackUrl = `${origin}/organizerFormPaymentOauthCallback`;
    const webhookBaseUrl = `${origin}/organizerFormPaymentWebhook`;
    const providerConfig: RazorpayPartnerConfig = {
      clientId: config.clientId, clientSecret: config.clientSecret,
      mode: config.mode, redirectUri: callbackUrl,
    };
    return {version: resolved,
      provider: new RazorpayFormProvider(providerConfig),
      vault: new RazorpayCredentialVault(this.projectId,
        config.credentialSecretId), mode: config.mode,
      webhookBaseUrl, callbackUrl};
  }

  private async loadSecret(version?: string): Promise<LoadedSecret> {
    if (version !== undefined && !this.pinned(version)) unavailable();
    const key = version ?? "latest";
    const hit = this.cached.get(key);
    if (hit && hit.until > this.now()) return hit.secret;
    const name = version ?? `projects/${this.projectId}/secrets/` +
      `${formRazorpayPartnerSecret}/versions/latest`;
    const secret = this.readSecret(name).then((read) => {
      const resolved = this.resolvedVersion(read.name);
      if (resolved !== (version ?? resolved) || version === undefined &&
          !resolved.includes(`/secrets/${formRazorpayPartnerSecret}/`)) {
        unavailable();
      }
      return {version: resolved, config: parsePartnerSecret(read.data)};
    }).catch(() => unavailable());
    this.cached.set(key, {until: this.now() + 60_000, secret});
    try {
      return await secret;
    } catch {
      if (this.cached.get(key)?.secret === secret) this.cached.delete(key);
      unavailable();
    }
  }

  private pinned(version: string): boolean {
    const prefix = `projects/${this.projectId}/secrets/`;
    return version.startsWith(prefix) &&
      /^[A-Za-z0-9_-]{1,255}\/versions\/[1-9][0-9]*$/u
        .test(version.slice(prefix.length));
  }

  // Secret Manager names the version it read with the project number; records
  // keep the project-id form, so rebuild it from the secret and version.
  private resolvedVersion(name: string): string {
    const match = new RegExp("^projects/[a-z0-9-]+/secrets/" +
      "([A-Za-z0-9_-]{1,255})/versions/([1-9][0-9]*)$", "u").exec(name);
    if (!match) unavailable();
    const version =
      `projects/${this.projectId}/secrets/${match[1]}/versions/${match[2]}`;
    if (!this.pinned(version)) unavailable();
    return version;
  }
}

function parsePartnerSecret(raw: string): PartnerSecret {
  if (Buffer.byteLength(raw, "utf8") > 32 * 1024) unavailable();
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    unavailable();
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !==
      "clientId,clientSecret,credentialSecretId,mode,schema" ||
      record.schema !== "catch.form-razorpay-partner/v1" ||
      (record.mode !== "test" && record.mode !== "live") ||
      !secret(record.clientId) || !secret(record.clientSecret) ||
      typeof record.credentialSecretId !== "string" ||
      !/^[A-Za-z0-9_-]{1,255}$/u.test(record.credentialSecretId)) unavailable();
  return record as unknown as PartnerSecret;
}

async function readGoogleSecret(name: string): Promise<SecretVersion> {
  const [value] = await new SecretManagerServiceClient()
    .accessSecretVersion({name});
  if (!value.name || !value.payload?.data) unavailable();
  return {name: value.name,
    data: Buffer.from(value.payload.data).toString("utf8")};
}

function secret(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 &&
    value.length < 16_384 && !/\s/u.test(value);
}

function unavailable(): never {
  throw new HttpsError("failed-precondition",
    "Form payments are not configured. Complete the Razorpay partner setup.");
}
