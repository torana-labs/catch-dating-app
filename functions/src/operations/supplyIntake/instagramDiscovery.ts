import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {getApp} from "firebase-admin/app";
import {defineString} from "firebase-functions/params";
import {
  catchInstagramAccountId,
  catchInstagramGraphVersion,
} from "../../organizers/organizerClaimVerification";

// Supply Intake reads an organizer's Instagram through Meta's Business
// Discovery API (operations/.../instagram-discovery.mjs), as Catch's own
// account. That API is on the Instagram API with Facebook Login, so its
// token is a Torana Business Manager system-user token, separate from the
// Instagram Login token the webhook uses. A pinned version of
// CATCH_INSTAGRAM_DISCOVERY_TOKEN names it; blank keeps discovery off.
export const instagramDiscoveryCredentialVersion = defineString(
  "CATCH_INSTAGRAM_DISCOVERY_CREDENTIAL_VERSION", {default: ""});

export interface InstagramDiscoveryConfig {
  accountId: string;
  accessToken: string;
  graphVersion: string;
}

let cached: {version: string; token: Promise<string>} | null = null;

/** The discovery settings, or null while this environment names no token. */
export async function instagramDiscoveryConfig(
  readSecret: (version: string) => Promise<string> = readDiscoveryToken
): Promise<InstagramDiscoveryConfig | null> {
  const version = instagramDiscoveryCredentialVersion.value().trim();
  const accountId = catchInstagramAccountId.value().trim();
  if (!version || !/^[0-9]{1,32}$/.test(accountId)) return null;
  if (cached?.version !== version) {
    const token = readSecret(version).then((value) => value.trim());
    // A failed read is retried by the next request.
    token.catch(() => {
      if (cached?.token === token) cached = null;
    });
    cached = {version, token};
  }
  return {accountId, accessToken: await cached.token,
    graphVersion: catchInstagramGraphVersion.value().trim() || "v26.0"};
}

async function readDiscoveryToken(version: string): Promise<string> {
  const project = getApp().options.projectId || process.env.GCLOUD_PROJECT;
  if (!project || !version.startsWith(
    `projects/${project}/secrets/CATCH_INSTAGRAM_DISCOVERY_TOKEN/versions/`)) {
    throw new Error("Instagram discovery credential project mismatch");
  }
  const [value] = await new SecretManagerServiceClient()
    .accessSecretVersion({name: version});
  const data = value.payload?.data;
  if (!data) throw new Error("Instagram discovery credential unavailable");
  return typeof data === "string" ? data :
    Buffer.from(data).toString("utf8");
}
