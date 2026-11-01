import {randomUUID} from "node:crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAdminRole} from "../admin/adminAuth";
import {
  setAdminAuditLogInTransaction,
  writeAdminAuditLog,
} from "../admin/adminAudit";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  SupportConversationDocument,
  SupportConversationMessageDocument,
  SupportSavedReplyDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminListSupportConversationsCallablePayload} from
  "../shared/generated/adminListSupportConversationsCallablePayload";
import type {AdminListSupportConversationsCallableResponse} from
  "../shared/generated/adminListSupportConversationsCallableResponse";
import type {AdminGetSupportConversationCallablePayload} from
  "../shared/generated/adminGetSupportConversationCallablePayload";
import type {AdminGetSupportConversationCallableResponse} from
  "../shared/generated/adminGetSupportConversationCallableResponse";
import type {AdminUpdateSupportConversationCallablePayload} from
  "../shared/generated/adminUpdateSupportConversationCallablePayload";
import type {AdminUpdateSupportConversationCallableResponse} from
  "../shared/generated/adminUpdateSupportConversationCallableResponse";
import type {AdminRecordSupportMessageCallablePayload} from
  "../shared/generated/adminRecordSupportMessageCallablePayload";
import type {AdminRecordSupportMessageCallableResponse} from
  "../shared/generated/adminRecordSupportMessageCallableResponse";
import type {AdminListSupportSavedRepliesCallableResponse} from
  "../shared/generated/adminListSupportSavedRepliesCallableResponse";
import type {AdminUpsertSupportSavedReplyCallablePayload} from
  "../shared/generated/adminUpsertSupportSavedReplyCallablePayload";
import type {AdminUpsertSupportSavedReplyCallableResponse} from
  "../shared/generated/adminUpsertSupportSavedReplyCallableResponse";
import {validateAdminListSupportConversationsCallablePayload} from
  "../shared/generated/validators/adminListSupportConversationsInput";
import {validateAdminGetSupportConversationCallablePayload} from
  "../shared/generated/validators/adminGetSupportConversationInput";
import {validateAdminUpdateSupportConversationCallablePayload} from
  "../shared/generated/validators/adminUpdateSupportConversationInput";
import {validateAdminRecordSupportMessageCallablePayload} from
  "../shared/generated/validators/adminRecordSupportMessageInput";
import {validateAdminListSupportSavedRepliesCallablePayload} from
  "../shared/generated/validators/adminListSupportSavedRepliesInput";
import {validateAdminUpsertSupportSavedReplyCallablePayload} from
  "../shared/generated/validators/adminUpsertSupportSavedReplyInput";
import {
  SUPPORT_CONVERSATIONS,
  SUPPORT_SAVED_REPLIES,
  SupportInboxDeps,
  defaultSupportInboxDeps,
  recordSupportMessage,
} from "./conversations";

/** Ops and support run the inbox; the owner can too. */
export const SUPPORT_ROLES = [
  "admin",
  "adminOwner",
  "safetyReviewer",
  "support",
] as const;

type Conversation = SupportConversationDocument;
type Message = SupportConversationMessageDocument;

export interface AdminSupportDeps extends SupportInboxDeps {
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: AdminSupportDeps = {
  ...defaultSupportInboxDeps,
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

function millis(value: FirebaseFirestore.Timestamp | null | undefined):
  number | null {
  return value ? value.toMillis() : null;
}

function summary(conversation: Conversation) {
  return {
    conversationId: conversation.conversationId,
    channel: conversation.channel,
    contactLabel: conversation.contactLabel,
    displayName: conversation.displayName,
    audience: conversation.audience,
    subject: conversation.subject,
    status: conversation.status,
    ownerUid: conversation.ownerUid,
    waitingSinceMillis: millis(conversation.waitingSince),
    lastMessageAtMillis: millis(conversation.lastMessageAt) ?? 0,
    lastMessagePreview: conversation.lastMessagePreview,
    linkCount: conversation.links.length,
  };
}

/**
 * Lists the Support inbox. Open conversations show the longest waiting
 * first; the others most recent first.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AdminSupportDeps} deps Dependencies.
 * @return {Promise<AdminListSupportConversationsCallableResponse>} Items.
 */
export async function adminListSupportConversationsHandler(
  request: CallableRequest<unknown>,
  deps: AdminSupportDeps = defaultDeps
): Promise<AdminListSupportConversationsCallableResponse> {
  const context = requireAdminRole(request, SUPPORT_ROLES);
  const payload = validateCallableWithAjv<
    AdminListSupportConversationsCallablePayload>(request,
      validateAdminListSupportConversationsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid, "adminListSupportConversations",
    {maxRequests: 60, windowMs: 60_000});
  const collection = db.collection(SUPPORT_CONVERSATIONS);
  const [open, waiting, closed] = await Promise.all([
    collection.where("status", "==", "open").limit(500).get(),
    collection.where("status", "==", "waitingOnThem").limit(500).get(),
    payload.view === "closed" ?
      collection.where("status", "==", "closed").limit(500).get() :
      Promise.resolve(null),
  ]);
  const openItems = open.docs.map((doc) => doc.data() as Conversation);
  const waitingItems = waiting.docs.map((doc) => doc.data() as Conversation);
  const mine = openItems.filter((item) => item.ownerUid === context.uid);
  let items: Conversation[];
  if (payload.view === "open") items = openItems;
  else if (payload.view === "mine") items = mine;
  else if (payload.view === "waitingOnThem") items = waitingItems;
  else items = (closed?.docs ?? []).map((doc) => doc.data() as Conversation);
  if (payload.audience) {
    items = items.filter((item) => item.audience === payload.audience);
  }
  const waitingFirst = payload.view === "open" || payload.view === "mine";
  items.sort((a, b) => waitingFirst ?
    (millis(a.waitingSince) ?? Number.MAX_SAFE_INTEGER) -
      (millis(b.waitingSince) ?? Number.MAX_SAFE_INTEGER) :
    (millis(b.lastMessageAt) ?? 0) - (millis(a.lastMessageAt) ?? 0));
  return {
    items: items.slice(0, payload.limit).map(summary),
    counts: {
      open: openItems.length,
      mine: mine.length,
      waitingOnThem: waitingItems.length,
    },
  };
}

/**
 * Opens one conversation; the full address makes it an audited read.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AdminSupportDeps} deps Dependencies.
 * @return {Promise<AdminGetSupportConversationCallableResponse>} Detail.
 */
export async function adminGetSupportConversationHandler(
  request: CallableRequest<unknown>,
  deps: AdminSupportDeps = defaultDeps
): Promise<AdminGetSupportConversationCallableResponse> {
  const context = requireAdminRole(request, SUPPORT_ROLES);
  const payload = validateCallableWithAjv<
    AdminGetSupportConversationCallablePayload>(request,
      validateAdminGetSupportConversationCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid, "adminGetSupportConversation",
    {maxRequests: 60, windowMs: 60_000});
  const snap = await db.collection(SUPPORT_CONVERSATIONS)
    .doc(payload.conversationId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Conversation not found.");
  }
  const conversation = snap.data() as Conversation;
  const messages = (await db.collection(
    `${SUPPORT_CONVERSATIONS}/${payload.conversationId}/messages`)
    .orderBy("at", "desc").limit(200).get())
    .docs.map((doc) => doc.data() as Message).reverse();
  await writeAdminAuditLog(db, context, {
    action: "adminGetSupportConversation",
    targetPath: `${SUPPORT_CONVERSATIONS}/${payload.conversationId}`,
    request,
    serverTimestamp: deps.serverTimestamp,
  });
  return {
    conversation: {
      ...summary(conversation),
      contactAddress: conversation.contactAddress,
      uid: conversation.uid,
      organizerId: conversation.organizerId,
      links: conversation.links,
    },
    messages: messages.map((message) => ({
      messageId: message.messageId,
      direction: message.direction,
      text: message.text,
      authorUid: message.authorUid,
      atMillis: millis(message.at) ?? 0,
      deliveryState: message.deliveryState,
    })),
  };
}

/**
 * Sets owner, status and links.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AdminSupportDeps} deps Dependencies.
 * @return {Promise<AdminUpdateSupportConversationCallableResponse>} Result.
 */
export async function adminUpdateSupportConversationHandler(
  request: CallableRequest<unknown>,
  deps: AdminSupportDeps = defaultDeps
): Promise<AdminUpdateSupportConversationCallableResponse> {
  const context = requireAdminRole(request, SUPPORT_ROLES);
  const payload = validateCallableWithAjv<
    AdminUpdateSupportConversationCallablePayload>(request,
      validateAdminUpdateSupportConversationCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid,
    "adminUpdateSupportConversation", {maxRequests: 30, windowMs: 60_000});
  const paths = payload.links.map((link) => link.path);
  if (new Set(paths).size !== paths.length) {
    throw new HttpsError("invalid-argument", "Each link appears once.");
  }
  const ref = db.collection(SUPPORT_CONVERSATIONS).doc(payload.conversationId);
  await db.runTransaction(async (tx) => {
    const [snap, ...linked] = await Promise.all([
      tx.get(ref),
      ...paths.map((path) => tx.get(db.doc(path))),
    ]);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Conversation not found.");
    }
    const missing = linked.findIndex((doc) => !doc.exists);
    if (missing >= 0) {
      throw new HttpsError("not-found",
        `Linked record not found: ${paths[missing]}.`);
    }
    const before = snap.data() as Conversation;
    tx.update(ref, {
      ownerUid: payload.ownerUid,
      status: payload.status,
      links: payload.links,
      ...(payload.status === "closed" ? {waitingSince: null} : {}),
      updatedAt: deps.now(),
    });
    setAdminAuditLogInTransaction(tx, db, context, {
      action: "adminUpdateSupportConversation",
      targetPath: ref.path,
      request,
      before: {status: before.status, ownerUid: before.ownerUid,
        links: before.links.length},
      after: {status: payload.status, ownerUid: payload.ownerUid,
        links: payload.links.length},
      serverTimestamp: deps.serverTimestamp,
    });
  });
  return {
    conversationId: payload.conversationId,
    status: payload.status,
    ownerUid: payload.ownerUid,
    linkCount: payload.links.length,
  };
}

/**
 * Records a reply, a logged email or a note.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AdminSupportDeps} deps Dependencies.
 * @return {Promise<AdminRecordSupportMessageCallableResponse>} Ids.
 */
export async function adminRecordSupportMessageHandler(
  request: CallableRequest<unknown>,
  deps: AdminSupportDeps = defaultDeps
): Promise<AdminRecordSupportMessageCallableResponse> {
  const context = requireAdminRole(request, SUPPORT_ROLES);
  const payload = validateCallableWithAjv<
    AdminRecordSupportMessageCallablePayload>(request,
      validateAdminRecordSupportMessageCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid, "adminRecordSupportMessage",
    {maxRequests: 30, windowMs: 60_000});
  let contactAddress = payload.contactAddress;
  if (payload.conversationId) {
    const snap = await db.collection(SUPPORT_CONVERSATIONS)
      .doc(payload.conversationId).get();
    const conversation = snap.data() as Conversation | undefined;
    if (!conversation || conversation.channel !== payload.channel) {
      throw new HttpsError("not-found", "Conversation not found.");
    }
    contactAddress = conversation.contactAddress;
  } else if (payload.channel !== "email" || payload.direction !== "inbound") {
    throw new HttpsError("invalid-argument",
      "Only a logged email can start a conversation.");
  }
  if (!contactAddress ||
      (payload.channel === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u
        .test(contactAddress.trim()))) {
    throw new HttpsError("invalid-argument", "A contact address is needed.");
  }
  if (payload.savedReplyId) {
    const reply = await db.collection(SUPPORT_SAVED_REPLIES)
      .doc(payload.savedReplyId).get();
    if (!reply.exists) {
      throw new HttpsError("not-found", "Saved reply not found.");
    }
  }
  const result = await recordSupportMessage(deps, {
    channel: payload.channel,
    contactAddress,
    displayName: payload.displayName,
    direction: payload.direction,
    text: payload.text,
    authorUid: context.uid,
    sourceEventId: null,
    savedReplyId: payload.savedReplyId,
    deliveryState: payload.direction === "inbound" ? "received" : "recorded",
  });
  await writeAdminAuditLog(db, context, {
    action: "adminRecordSupportMessage",
    targetPath: `${SUPPORT_CONVERSATIONS}/${result.conversationId}`,
    request,
    after: {direction: payload.direction, messageId: result.messageId},
    serverTimestamp: deps.serverTimestamp,
  });
  return result;
}

/**
 * Lists saved replies.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AdminSupportDeps} deps Dependencies.
 * @return {Promise<AdminListSupportSavedRepliesCallableResponse>} Items.
 */
export async function adminListSupportSavedRepliesHandler(
  request: CallableRequest<unknown>,
  deps: AdminSupportDeps = defaultDeps
): Promise<AdminListSupportSavedRepliesCallableResponse> {
  requireAdminRole(request, SUPPORT_ROLES);
  validateCallableWithAjv(request,
    validateAdminListSupportSavedRepliesCallablePayload,
    (data) => data ?? {});
  const snap = await deps.firestore().collection(SUPPORT_SAVED_REPLIES)
    .limit(200).get();
  return {
    items: snap.docs.map((doc) => doc.data() as SupportSavedReplyDocument)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((reply) => ({
        replyId: reply.replyId,
        title: reply.title,
        body: reply.body,
        active: reply.active,
        updatedAtMillis: millis(reply.updatedAt) ?? 0,
      })),
  };
}

/**
 * Adds or edits a saved reply.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AdminSupportDeps} deps Dependencies.
 * @return {Promise<AdminUpsertSupportSavedReplyCallableResponse>} Id.
 */
export async function adminUpsertSupportSavedReplyHandler(
  request: CallableRequest<unknown>,
  deps: AdminSupportDeps = defaultDeps
): Promise<AdminUpsertSupportSavedReplyCallableResponse> {
  const context = requireAdminRole(request, SUPPORT_ROLES);
  const payload = validateCallableWithAjv<
    AdminUpsertSupportSavedReplyCallablePayload>(request,
      validateAdminUpsertSupportSavedReplyCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid, "adminUpsertSupportSavedReply",
    {maxRequests: 30, windowMs: 60_000});
  const replyId = payload.replyId ?? randomUUID().replace(/-/gu, "");
  const ref = db.collection(SUPPORT_SAVED_REPLIES).doc(replyId);
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (payload.replyId && !existing.exists) {
      throw new HttpsError("not-found", "Saved reply not found.");
    }
    tx.set(ref, {
      schemaVersion: 1,
      replyId,
      title: payload.title.trim(),
      body: payload.body.trim(),
      active: payload.active,
      updatedAt: deps.now(),
      updatedByUid: context.uid,
    } satisfies SupportSavedReplyDocument);
    setAdminAuditLogInTransaction(tx, db, context, {
      action: "adminUpsertSupportSavedReply",
      targetPath: ref.path,
      request,
      after: {title: payload.title.trim(), active: payload.active},
      serverTimestamp: deps.serverTimestamp,
    });
  });
  return {replyId};
}

export const adminListSupportConversations = onCall(appCheckCallableOptions,
  (request) => adminListSupportConversationsHandler(request));
export const adminGetSupportConversation = onCall(appCheckCallableOptions,
  (request) => adminGetSupportConversationHandler(request));
export const adminUpdateSupportConversation = onCall(appCheckCallableOptions,
  (request) => adminUpdateSupportConversationHandler(request));
export const adminRecordSupportMessage = onCall(appCheckCallableOptions,
  (request) => adminRecordSupportMessageHandler(request));
export const adminListSupportSavedReplies = onCall(appCheckCallableOptions,
  (request) => adminListSupportSavedRepliesHandler(request));
export const adminUpsertSupportSavedReply = onCall(appCheckCallableOptions,
  (request) => adminUpsertSupportSavedReplyHandler(request));
