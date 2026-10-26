import {HttpsError, onCall, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {blockDocId} from "../safety/blocking";
import {readEventChatAccount, requireEventChatActor,
  requireEventChatMember} from "./eventChatAccess";
import {chatHash, chatIdentityReader, messageDefaults, messageUnavailable,
  readableChatMessage, type EventChatMessageDeps} from
  "./eventChatMessageShared";
import type {EventChatMessageDocument as Message,
  EventChatAccessReceiptDocument as Receipt, ReportDocument, BlockDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateActOnEventChatMessageCallablePayload} from
  "../shared/generated/validators/actOnEventChatMessageInput";
import type {ActOnEventChatMessageCallableResponse as Result} from
  "../shared/generated/actOnEventChatMessageCallableResponse";

/** Safety actions bind the reviewed account and immutable room message.
 * Targets never come from the client; retries never restore a block. */
export async function actOnEventChatMessageHandler(
  request: CallableRequest<unknown>,
  deps: EventChatMessageDeps = messageDefaults,
): Promise<Result> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateActOnEventChatMessageCallablePayload);
  requireEventChatActor(uid, data.expectedUid);
  if ((data.action === "report") !== (data.reasonCode !== null)) {
    throw new HttpsError("invalid-argument", "Choose a reason for the report.");
  }
  const db = deps.db();
  await deps.rateLimit(db, uid, "actOnEventChatMessage", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const receiptRef = db.collection("eventChatAccessReceipts")
    .doc(chatHash(["messageAction", uid, data.requestId]));
  const payloadHash = chatHash([data.eventId, data.messageId,
    data.action, data.reasonCode]);
  return db.runTransaction(async (tx) => {
    await readEventChatAccount(db, tx, uid);
    const receiptSnap = await tx.get(receiptRef);
    if (receiptSnap.exists) {
      const receipt = requireDoc<Receipt>(receiptSnap,
        "EventChatAccessReceiptDocument");
      if (receipt.uid !== uid || receipt.eventId !== data.eventId ||
          receipt.payloadHash !== payloadHash) {
        throw new HttpsError("already-exists",
          "This request was already used.");
      }
      return {applied: true, replayed: true};
    }
    const access = await requireEventChatMember(db, tx, data.eventId, uid);
    const messageRef = db.collection("eventChatMessages").doc(data.messageId);
    const snap = await tx.get(messageRef);
    const message = snap.exists ? requireDoc<Message>(snap,
      "EventChatMessageDocument") : null;
    if (!message || !await readableChatMessage(message, data.eventId,
      access.view.organizerId, chatIdentityReader(db, tx, uid))) {
      throw messageUnavailable();
    }
    const targetUid = message.uid!;
    if (data.action === "remove" ?
      targetUid !== uid && !access.view.canManage : targetUid === uid) {
      throw new HttpsError("permission-denied", "This action is unavailable.");
    }
    const blockRef = db.collection("blocks").doc(blockDocId(uid, targetUid));
    const existingBlock = data.action === "block" ?
      await tx.get(blockRef) : null;
    const now = deps.now();
    if (data.action === "report") {
      tx.create(db.collection("reports").doc(receiptRef.id), {
        reporterUserId: uid, targetUserId: targetUid,
        createdAt: now, source: "chat", status: "open",
        reasonCode: data.reasonCode!, contextId: messageRef.path,
      } satisfies ReportDocument);
    } else if (data.action === "block") {
      if (!existingBlock?.exists) {
        tx.create(blockRef, {blockerUserId: uid, blockedUserId: targetUid,
          createdAt: now, source: "chat"} satisfies BlockDocument);
      }
      // The existing onBlockCreated trigger closes dating matches as well.
      // All event readers check the block edge immediately on their next read.
    } else {
      // Retain server-only evidence for safety review; every participant reader
      // and reply resolver redacts it. Account deletion later anonymizes it.
      tx.update(messageRef, {status: "removed", removedAt: now});
    }
    tx.create(receiptRef, {eventId: data.eventId, uid, payloadHash, revision: 1,
      createdAt: now} satisfies Receipt);
    return {applied: true, replayed: false};
  });
}

export const actOnEventChatMessage = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => actOnEventChatMessageHandler(request),
);
