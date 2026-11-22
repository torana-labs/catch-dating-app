import {SecretVersionReferenceGuard} from
  "../shared/secretVersionReference";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import type {GuestLinkSigningKeys} from
  "./guestLinkSigningKeys";

const schema = "catch.event-assistance-guest-keys/v1";
const unavailable = () => new Error("Guest response signing keys unavailable");

/** Retained keys regenerate existing grants after signing-key rotation. */
export function parseGuestLinkKeys(value: unknown): GuestLinkSigningKeys {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw unavailable();
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "currentKeyId,keys,schema" ||
      record.schema !== schema || typeof record.currentKeyId !== "string" ||
      !Array.isArray(record.keys) || record.keys.length < 1 ||
      record.keys.length > 10) throw unavailable();
  const keys = new Map<string, Buffer>();
  for (const entry of record.keys) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) ||
        Object.keys(entry).sort().join(",") !== "key,keyId" ||
        typeof entry.keyId !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(entry.keyId) ||
        keys.has(entry.keyId) || typeof entry.key !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(entry.key)) throw unavailable();
    const key = Buffer.from(entry.key, "base64url");
    if (key.length !== 32 || key.toString("base64url") !== entry.key) {
      throw unavailable();
    }
    keys.set(entry.keyId, key);
  }
  if (!keys.has(record.currentKeyId)) throw unavailable();
  return {currentKeyId: record.currentKeyId, keyFor: (id) => {
    const key = keys.get(id);
    if (!key) throw unavailable();
    return Buffer.from(key);
  }};
}

export class GuestLinkKeyStore {
  constructor(private readonly versionResource = (
    process.env.EVENT_ASSISTANCE_GUEST_KEY_VERSION ?? ""),
  private readonly client = new SecretManagerServiceClient(),
  private readonly references = new SecretVersionReferenceGuard()) {}

  async access(): Promise<GuestLinkSigningKeys> {
    try {
      await this.references.assert(this.versionResource,
        "EVENT_ASSISTANCE_GUEST_KEYS");
      const [response] = await this.client.accessSecretVersion({
        name: this.versionResource});
      const data = response.payload?.data;
      if (!data || data.length > 8192) throw unavailable();
      return parseGuestLinkKeys(JSON.parse(data.toString("utf8")));
    } catch {
      // Secret bytes and provider error details cannot reach work receipts.
      throw unavailable();
    }
  }
}
