import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {getApp} from "firebase-admin/app";
import {defineString} from "firebase-functions/params";
import {MetaWhatsappProvider} from "../organizers/organizerWhatsappProvider";
import type {CatchTextSender} from "./autoReply";
import {
  isCatchSenderCredentialVersion,
  parseCatchSenderCredential,
} from "./whatsappReplyProvider";

const SEND_TIMEOUT_MS = 10_000;

// A pinned CATCH_WHATSAPP_ACCESS_TOKEN version. Blank keeps replies off
// while routing still works.
export const autoReplyCredentialVersion = defineString(
  "CATCH_WHATSAPP_AUTOREPLY_CREDENTIAL_VERSION", {default: ""});

/**
 * A text sender for Catch's own WhatsApp number, from a pinned version of
 * the Catch sender token. Null when this environment names no credential
 * version, so routing still works and replies are skipped.
 */
export async function catchTextSender(config: {
  credentialVersion: string;
  graphVersion: string;
  wabaId: string;
  phoneNumberId: string;
}, deps: {
  readSecret?: (version: string) => Promise<string>;
  fetch?: typeof fetch;
  now?: () => number;
} = {}): Promise<CatchTextSender | null> {
  const version = config.credentialVersion.trim();
  if (!version) return null;
  if (!isCatchSenderCredentialVersion(version) ||
      !/^v[1-9][0-9]*\.[0-9]+$/u.test(config.graphVersion)) {
    throw new Error("Catch auto-reply credential is misconfigured.");
  }
  const raw = await (deps.readSecret ?? readPinnedSecret)(version);
  const accessToken = parseCatchSenderCredential(raw, config);
  const now = deps.now ?? Date.now;
  const provider = new MetaWhatsappProvider({appId: "", appSecret: "",
    configId: "", graphVersion: config.graphVersion},
  deps.fetch ?? ((...args) => fetch(...args)), now);
  return async (toE164, body) => (await provider.sendText({accessToken,
    phoneNumberId: config.phoneNumberId, toE164, body,
    deadline: now() + SEND_TIMEOUT_MS})).providerMessageId;
}

async function readPinnedSecret(version: string): Promise<string> {
  const project = getApp().options.projectId || process.env.GCLOUD_PROJECT;
  if (!project || !version.startsWith(`projects/${project}/secrets/`)) {
    throw new Error("Catch credential project mismatch");
  }
  const [value] = await new SecretManagerServiceClient()
    .accessSecretVersion({name: version});
  const data = value.payload?.data;
  if (!data) throw new Error("Catch credential unavailable");
  return typeof data === "string" ? data : Buffer.from(data).toString("utf8");
}
