import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {getApp} from "firebase-admin/app";
import {defineString} from "firebase-functions/params";
import {MetaWhatsappProvider} from
  "../platform/delivery/organizerWhatsappProvider";
import type {CatchTextSender} from "./autoReply";
import {CATCH_TEMPLATES, type CatchTemplateName} from "./catchTemplates";
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

/** One approved-template send to one WhatsApp number; returns its id. */
export type CatchTemplateSender = (toE164: string,
  template: CatchTemplateName, variables: Record<string, string>) =>
  Promise<string>;

/**
 * A template sender for Catch's own number, from the same pinned sender
 * token as catchTextSender. Null when no credential version is named.
 * @param {object} config Credential version, Graph version and the number.
 * @param {object} deps Secret reader, transport and clock, for tests.
 * @return {Promise<CatchTemplateSender | null>} The sender.
 */
export async function catchTemplateSender(config: {
  credentialVersion: string;
  graphVersion: string;
  wabaId: string;
  phoneNumberId: string;
}, deps: {
  readSecret?: (version: string) => Promise<string>;
  fetch?: typeof fetch;
  now?: () => number;
} = {}): Promise<CatchTemplateSender | null> {
  const version = config.credentialVersion.trim();
  if (!version) return null;
  if (!isCatchSenderCredentialVersion(version) ||
      !/^v[1-9][0-9]*\.[0-9]+$/u.test(config.graphVersion)) {
    throw new Error("Catch template credential is misconfigured.");
  }
  const raw = await (deps.readSecret ?? readPinnedSecret)(version);
  const accessToken = parseCatchSenderCredential(raw, config);
  const now = deps.now ?? Date.now;
  const provider = new MetaWhatsappProvider({appId: "", appSecret: "",
    configId: "", graphVersion: config.graphVersion},
  deps.fetch ?? ((...args) => fetch(...args)), now);
  return async (toE164, template, variables) => (await provider.sendTemplate({
    accessToken, phoneNumberId: config.phoneNumberId, toE164,
    template: CATCH_TEMPLATES[template].snapshot, variables,
    deadline: now() + SEND_TIMEOUT_MS})).providerMessageId;
}

const replyCredential = defineString(
  "CATCH_WHATSAPP_REPLY_CREDENTIAL_VERSION", {default: ""});
const replyGraph = defineString("CATCH_WHATSAPP_REPLY_GRAPH_VERSION",
  {default: ""});

// Template sends use the Support reply sender's pinned token and Graph
// version; one sender per credential version per instance.
let cachedReplyTemplateSender: {key: string;
  sender: Promise<CatchTemplateSender | null>} | null = null;

/**
 * Catch's template sender from the reply credential, cached per version.
 * @param {object} scope Catch's WhatsApp account and number.
 * @return {Promise<CatchTemplateSender | null>} The sender, or null.
 */
export function catchReplyTemplateSender(
  scope: {wabaId: string; phoneNumberId: string}
): Promise<CatchTemplateSender | null> {
  const version = replyCredential.value().trim();
  const graphVersion = replyGraph.value().trim();
  const key = JSON.stringify([version, graphVersion, scope.wabaId,
    scope.phoneNumberId]);
  if (cachedReplyTemplateSender?.key !== key) {
    const sender = catchTemplateSender({credentialVersion: version,
      graphVersion, wabaId: scope.wabaId,
      phoneNumberId: scope.phoneNumberId}).catch((error: unknown) => {
      cachedReplyTemplateSender = null;
      throw error;
    });
    cachedReplyTemplateSender = {key, sender};
  }
  return cachedReplyTemplateSender.sender;
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
