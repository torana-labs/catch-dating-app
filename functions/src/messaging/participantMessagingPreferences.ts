import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError, onCall, type CallableRequest} from
  "firebase-functions/v2/https";
import {runAssistanceTransaction as transact} from
  "../platform/transactionCallback";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {WithdrawParticipantMessagingPermissionCallableResponse as Result}
  from
  "../shared/generated/withdrawParticipantMessagingPermissionCallableResponse";
import {validateWithdrawParticipantMessagingPermissionCallablePayload} from
  "../shared/generated/validators/withdrawParticipantMessagingPermissionInput";
import {
  contactPermissionReceiptRef,
  organizerWhatsappKeys,
  type ContactGrantKey,
  type ContactPermissionReceipt,
  type ContactSender,
} from "../shared/contactPermissions";
import {guestPermissionSummary} from "./guestMessagingPermissionStore";
import {grantFromReceipt, nextContactPermission,
  readContactPermissionState, writeContactPermissionState} from
  "./contactPermissions";

export type Scope = "catch" | "organizer";
interface Deps {
  db: () => FirebaseFirestore.Firestore;
  now: () => Timestamp;
  rateLimit: typeof checkRateLimit;
}
const defaults: Deps = {db: () => admin.firestore(), now: () => Timestamp.now(),
  rateLimit: checkRateLimit};


async function assertActiveAccount(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, uid: string): Promise<void> {
  if ((await tx.get(db.collection("deletedUsers").doc(uid))).exists) {
    throw new HttpsError("not-found",
      "These messaging settings are unavailable.");
  }
}

export async function withdrawParticipantMessagingPermissionHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults): Promise<Result> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateWithdrawParticipantMessagingPermissionCallablePayload);
  if ((data.scope === "catch") !== (data.organizerId === null)) {
    throw new HttpsError("invalid-argument", "Choose one messaging sender.");
  }
  if (data.scope === "catch" && data.purpose === "eventOperations") {
    throw new HttpsError("invalid-argument",
      "Catch has no event-operations permission here.");
  }
  const db = deps.db();
  await deps.rateLimit(db, uid, "withdrawParticipantMessagingPermission", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const scope = data.scope;
  const purpose = data.purpose ?? null;
  const receiptIdentity = purpose ?
    ["purpose-v1", uid, scope, data.organizerId, purpose, data.requestId] :
    [uid, scope, data.organizerId, data.requestId];
  const receiptId = "pmpr_" + createHash("sha256")
    .update(JSON.stringify(receiptIdentity))
    .digest("hex").slice(0, 48);
  const sender: ContactSender = scope === "catch" ? {kind: "catch"} :
    {kind: "organizer", organizerId: data.organizerId!};
  const receiptRef = contactPermissionReceiptRef(db, receiptId);
  // A purpose withdrawal stops that purpose; a sender-wide one stops every
  // WhatsApp purpose the sender may hold.
  const keys: readonly ContactGrantKey[] = purpose ?
    [`whatsapp:${purpose}` as ContactGrantKey] :
    scope === "catch" ? ["whatsapp:marketing"] : organizerWhatsappKeys;
  return transact(db, async (tx) => {
    await assertActiveAccount(db, tx, uid);
    const [contact, replay] = await Promise.all([
      readContactPermissionState(db, tx, {uid, sender}), tx.get(receiptRef),
    ]);
    const grants = contact.existing?.grants ?? {};
    if (replay.exists) {
      const receipt = replay.data() as ContactPermissionReceipt;
      if (receipt.uid !== uid || receipt.source !== "participantSettings" ||
          receipt.senderKind !== sender.kind ||
          receipt.decision !== "optedOut" ||
          (receipt.purpose ?? null) !== purpose ||
          receipt.supersedesReceiptId !== data.expectedReceiptId) {
        throw new HttpsError("already-exists",
          "This request was used with different messaging settings.");
      }
      return {preference: guestPermissionSummary(contact.existing, scope),
        replayed: true};
    }
    const currentIds = keys.map((key) => grants[key]?.receiptId ?? null);
    if (!currentIds.includes(data.expectedReceiptId) ||
        (data.expectedReceiptId === null &&
          currentIds.some((id) => id !== null))) {
      throw new HttpsError("aborted",
        "Your messaging settings changed. Review them again.");
    }
    if (scope === "organizer" && !contact.existing && !(await tx.get(
      db.collection("organizers").doc(data.organizerId!))).exists) {
      throw new HttpsError("not-found", "This organizer is unavailable.");
    }
    const now = deps.now();
    // Server ordering, including same-millisecond decisions, fences old drafts.
    const decidedAt = Timestamp.fromMillis(Math.max(now.toMillis(),
      ...Object.values(grants).map((grant) =>
        (grant?.updatedAt.toMillis() ?? -1) + 1)));
    const receipt: ContactPermissionReceipt = {
      senderKind: sender.kind,
      senderId: scope === "catch" ? "catch" : data.organizerId!,
      uid, channel: "whatsapp", ...(purpose ? {purpose} : {}),
      decision: "optedOut", evidenceStatus: "complete",
      termsVersion: null, consentCopyHash: null, source: "participantSettings",
      sourceEventId: null, sourceFormId: null, sourceResponseId: null,
      ...(scope === "catch" ? {sourceOrganizerId: null} : {}),
      sourceProviderEventId: null, actorClass: "participant",
      actorUid: uid, identityStrength: "catchAccount", grantedAt: null,
      revokedAt: decidedAt, supersedesReceiptId: data.expectedReceiptId,
      createdAt: now};
    const withdrawal = grantFromReceipt(receipt, receiptId, decidedAt);
    const row = writeContactPermissionState(tx, contact, {
      next: nextContactPermission(contact, Object.fromEntries(
        keys.map((key) => [key, withdrawal])), now),
      receipts: [{id: receiptId, document: receipt}]});
    return {preference: row.preference, replayed: false};
  });
}

export const withdrawParticipantMessagingPermission = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => withdrawParticipantMessagingPermissionHandler(request));
