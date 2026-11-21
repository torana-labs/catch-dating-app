import {createHash} from "node:crypto";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {requireAdminRole, adminRolesFromToken} from "../admin/adminAuth";
import {assertOutboundContentAllowed} from
  "../communications/outboundContentPolicy";
import type {CatchWhatsappReplyStore} from "./whatsappReplyStore";

export const CATCH_SUPPORT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const CATCH_SUPPORT_PURPOSE = "serviceSupport" as const;

/** Trusted configuration; both sending and ingress default to disabled. */
export interface CatchReplyConfig {
  enabled?: boolean;
  atomicStopIngressReady?: boolean;
  wabaId: string;
  phoneNumberId: string;
  actorUid: string;
  recipientUid: string;
  recipientE164: string;
  credentialVersionResource: string;
  graphVersion: string;
  readinessEvidenceHash: string;
}
export type {CatchWhatsappReplyOperationDocument as CatchReplyOperation}
  from "../shared/generated/catchWhatsappReplyOperationDocument";
export type {CatchWhatsappEndpointStopDocument as CatchEndpointStop}
  from "../shared/generated/catchWhatsappEndpointStopDocument";
import type {AdminSendCatchWhatsappReplyCallablePayload}
  from "../shared/generated/adminSendCatchWhatsappReplyCallablePayload";
/** The controlled trial's payload: one reviewed inbound message. */
export type CatchReplyInput = Extract<
  AdminSendCatchWhatsappReplyCallablePayload, {purpose: "serviceSupport"}>;
import type {CatchWhatsappReplyOperationDocument as CatchReplyOperation}
  from "../shared/generated/catchWhatsappReplyOperationDocument";
import {validateAdminSendCatchWhatsappReplyCallablePayload} from
  "../shared/generated/validators/adminSendCatchWhatsappReplyInput";
export interface CatchAuthUser {
  disabled: boolean;
  phoneNumber?: string;
  customClaims?: Record<string, unknown>;
  tokensValidAfterTime?: string;
}
export type CatchGetUser = (uid: string) => Promise<CatchAuthUser>;
export interface PreparedCatchReply {
  send(body: string, deadlineMillis: number): Promise<string>;
}

export const catchReplyHash = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const catchEndpointHash = (e164: string): string =>
  catchReplyHash(["catch-whatsapp-endpoint/v1", e164]);
export const catchStopId = (scope: Pick<CatchReplyConfig,
  "wabaId" | "phoneNumberId">, endpointHash: string): string =>
  "cwstop_" + catchReplyHash([scope.wabaId, scope.phoneNumberId, endpointHash]);
/** One reply per inbound, regardless of caller request IDs or changed text. */
export const catchReplyId = (scope: Pick<CatchReplyConfig,
  "wabaId" | "phoneNumberId">, inboundMessageId: string): string =>
  "cwreply_" + catchReplyHash([scope.wabaId, scope.phoneNumberId,
    inboundMessageId]);
export const safeMillis = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
export const validProviderId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 240 &&
    !/[\s\p{Cc}]/u.test(value);
export const validHash = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);

export function assertCatchReplyEnabled(config: CatchReplyConfig): void {
  if (config.enabled !== true || config.atomicStopIngressReady !== true) {
    throw new HttpsError("failed-precondition", "Catch replies are disabled.");
  }
  if (!/^[0-9]{1,32}$/u.test(config.wabaId) ||
      !/^[0-9]{1,32}$/u.test(config.phoneNumberId) ||
      !/^\+[1-9][0-9]{6,14}$/u.test(config.recipientE164) ||
      !/^[A-Za-z0-9_-]{1,128}$/u.test(config.actorUid) ||
      !/^[A-Za-z0-9_-]{1,128}$/u.test(config.recipientUid) ||
      !validHash(config.readinessEvidenceHash)) {
    throw new HttpsError("failed-precondition", "Invalid controlled scope.");
  }
}

export function parseCatchReplyInput(value: unknown): CatchReplyInput {
  if (!validateAdminSendCatchWhatsappReplyCallablePayload(value) ||
      value.purpose !== "serviceSupport" || !value.body.trim()) {
    throw new HttpsError("invalid-argument", "Invalid Catch support reply.");
  }
  const data = value;
  assertOutboundContentAllowed([data.body], "Reply content is not allowed.");
  return {purpose: data.purpose, inboundEventId: data.inboundEventId,
    reviewedInboundTextHash: data.reviewedInboundTextHash,
    confirmSupportRequest: true, body: data.body};
}

/** Current support role/session and exact verified recipient. */
export async function authorizeCatchReply(request: CallableRequest<unknown>,
  config: CatchReplyConfig, getUser: CatchGetUser): Promise<void> {
  assertCatchReplyEnabled(config);
  const actor = requireAdminRole(request, ["support", "adminOwner"]);
  if (actor.uid !== config.actorUid) {
    throw new HttpsError("permission-denied",
      "Outside controlled reply scope.");
  }
  const [user, recipient] = await Promise.all([
    getUser(actor.uid), getUser(config.recipientUid),
  ]);
  const roles = adminRolesFromToken(user.customClaims);
  const authTime = request.auth?.token.auth_time;
  const validAfter = user.tokensValidAfterTime ?
    Date.parse(user.tokensValidAfterTime) : 0;
  if (user.disabled || (!roles.includes("support") &&
      !roles.includes("adminOwner")) || typeof authTime !== "number" ||
      !Number.isFinite(authTime) || !Number.isFinite(validAfter) ||
      authTime * 1000 < validAfter || recipient.disabled ||
      recipient.phoneNumber !== config.recipientE164) {
    throw new HttpsError("permission-denied",
      "Current reply authority required.");
  }
}

/**
 * Offline source owner; intentionally not exported as a deployed callable.
 * Callable composition supplies App Check and rate limits. All dependencies
 * are mandatory; there is no default credential loader or provider sender.
 */
export async function sendCatchWhatsappReply(request: CallableRequest<unknown>,
  deps: {
    config: () => CatchReplyConfig;
    getUser: CatchGetUser;
    store: CatchWhatsappReplyStore;
    prepare: (config: CatchReplyConfig) => Promise<PreparedCatchReply>;
  }): Promise<{operationId: string; providerMessageId: string;
    deliveryStatus: CatchReplyOperation["deliveryStatus"]; replayed: boolean}> {
  const config = {...deps.config()};
  const input = parseCatchReplyInput(request.data);
  await authorizeCatchReply(request, config, deps.getUser);
  // Resolve credentials before the final claim. The claim rechecks all current
  // authority, scope, withdrawal, STOP and time facts after this await.
  let prepared: PreparedCatchReply;
  try {
    prepared = await deps.prepare(config);
  } catch {
    throw new HttpsError("unavailable",
      "Catch sender credentials unavailable.");
  }
  const claim = await deps.store.claim(request, input, config);
  if (claim.replayed) return replyResult(claim.operation, true);
  let messageId: string;
  try {
    messageId = await prepared.send(input.body, claim.operation.deadlineMillis);
    if (!validProviderId(messageId)) throw new Error("Invalid provider result");
  } catch {
    // Even explicit provider errors do not release the consumed inbound claim.
    // This intentionally favors no duplicate over automatic retry/recovery.
    await deps.store.markUnknown(claim.operation).catch(() => undefined);
    throw new HttpsError("unavailable",
      "Reply outcome requires reconciliation.");
  }
  try {
    const saved = await deps.store.complete(claim.operation, messageId);
    return replyResult(saved, false);
  } catch {
    await deps.store.markUnknown(claim.operation).catch(() => undefined);
    throw new HttpsError("unavailable",
      "Reply outcome requires reconciliation.");
  }
}

function replyResult(operation: CatchReplyOperation, replayed: boolean) {
  if (!operation.providerMessageId) throw new Error("Missing saved message id");
  return {operationId: operation.operationId,
    providerMessageId: operation.providerMessageId,
    deliveryStatus: operation.deliveryStatus, replayed};
}
