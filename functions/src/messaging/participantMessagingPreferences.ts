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
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {organizerCommunicationPreferenceId,
  unknownOrganizerCommunicationChannel} from
  "../shared/organizerCommunicationPreferences";
import type {CatchCommunicationPreferenceDocument as CatchPreference,
  OrganizerCommunicationPreferenceDocument as OrganizerPreference,
  CatchCommunicationPermissionReceiptDocument as CatchReceipt,
  OrganizerCommunicationPermissionReceiptDocument as OrganizerReceipt} from
  "../shared/generated/firestoreAdminTypes";
import type {WithdrawParticipantMessagingPermissionCallableResponse as Result}
  from
  "../shared/generated/withdrawParticipantMessagingPermissionCallableResponse";
import {validateWithdrawParticipantMessagingPermissionCallablePayload} from
  "../shared/generated/validators/withdrawParticipantMessagingPermissionInput";
import {summarize} from "./guestMessagingPermissionStore";
import {readContactPermissionState, writeContactPermissionState} from
  "./contactPermissions";

export type Preference = CatchPreference | OrganizerPreference;
export type Scope = "catch" | "organizer";
interface Deps {
  db: () => FirebaseFirestore.Firestore;
  now: () => Timestamp;
  rateLimit: typeof checkRateLimit;
}
const defaults: Deps = {db: () => admin.firestore(), now: () => Timestamp.now(),
  rateLimit: checkRateLimit};

export function readPreference(
  snap: FirebaseFirestore.DocumentSnapshot, uid: string,
  scope: Scope, organizerId: string | null): Preference | null {
  if (!snap.exists) return null;
  const value = scope === "catch" ?
    requireDoc<CatchPreference>(snap, "CatchCommunicationPreferenceDocument") :
    requireDoc<OrganizerPreference>(snap,
      "OrganizerCommunicationPreferenceDocument");
  if (value.uid !== uid || (scope === "organizer" &&
      (value as OrganizerPreference).organizerId !== organizerId)) {
    throw new HttpsError("failed-precondition",
      "Messaging permission ownership is inconsistent.");
  }
  return value;
}

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
  const preferenceRef = scope === "catch" ?
    db.collection("catchCommunicationPreferences").doc(uid) :
    db.collection("organizerCommunicationPreferences").doc(
      organizerCommunicationPreferenceId(data.organizerId!, uid));
  const receiptRef = db.collection(scope === "catch" ?
    "catchCommunicationPermissionReceipts" :
    "organizerCommunicationPermissionReceipts").doc(receiptId);
  return transact(db, async (tx) => {
    await assertActiveAccount(db, tx, uid);
    const [snap, replay] = await Promise.all([
      tx.get(preferenceRef), tx.get(receiptRef),
    ]);
    const previous = readPreference(snap, uid, scope, data.organizerId);
    if (replay.exists) {
      const receipt = replay.data() as CatchReceipt | OrganizerReceipt;
      if (receipt.uid !== uid || receipt.source !== "participantSettings" ||
          receipt.decision !== "optedOut" ||
          (receipt.purpose ?? null) !== purpose ||
          receipt.supersedesReceiptId !== data.expectedReceiptId) {
        throw new HttpsError("already-exists",
          "This request was used with different messaging settings.");
      }
      return {preference: await summarize(db, tx, previous, scope), replayed:
        true};
    }
    const currentIds = purpose ?
      [previous?.whatsappPurposes?.[purpose]?.currentReceiptId ?? null] :
      [previous?.whatsapp.currentReceiptId ?? null,
        ...(scope === "organizer" ?
          [previous?.whatsappPurposes?.eventOperations?.currentReceiptId ??
            null,
          (previous as OrganizerPreference | null)?.whatsappPurposes
            ?.followerUpdates?.currentReceiptId ?? null] : []),
        previous?.whatsappPurposes?.marketing?.currentReceiptId ?? null];
    if (!currentIds.includes(data.expectedReceiptId) ||
        (data.expectedReceiptId === null &&
          currentIds.some((id) => id !== null))) {
      throw new HttpsError("aborted",
        "Your messaging settings changed. Review them again.");
    }
    if (scope === "organizer" && !previous && !(await tx.get(
      db.collection("organizers").doc(data.organizerId!))).exists) {
      throw new HttpsError("not-found", "This organizer is unavailable.");
    }
    const contact = await readContactPermissionState(db, tx, {uid, previous,
      sender: scope === "catch" ? {kind: "catch"} :
        {kind: "organizer", organizerId: data.organizerId!}});
    const now = deps.now();
    // Server ordering, including same-millisecond decisions, fences old drafts.
    const decidedAt = Timestamp.fromMillis(Math.max(now.toMillis(),
      (previous?.whatsapp.updatedAt?.toMillis() ?? -1) + 1,
      (previous?.whatsappPurposes?.eventOperations?.updatedAt?.toMillis() ??
        -1) + 1,
      (previous?.whatsappPurposes?.marketing?.updatedAt?.toMillis() ??
        -1) + 1,
      ((previous as OrganizerPreference | null)?.whatsappPurposes
        ?.followerUpdates?.updatedAt?.toMillis() ?? -1) + 1));
    const channel: CatchPreference["whatsapp"] = {
      status: "optedOut", evidenceStatus: "complete", currentReceiptId:
        receiptId,
      termsVersion: null, source: "participantSettings", sourceEventId: null,
      updatedAt: decidedAt,
    };
    const receipt = {uid, channel: "whatsapp" as const,
      ...(purpose ? {purpose} : {}),
      decision: "optedOut" as const, evidenceStatus: "complete" as const,
      termsVersion: null, consentCopyHash: null, source:
        "participantSettings" as const,
      sourceEventId: null, sourceFormId: null, sourceResponseId: null,
      sourceProviderEventId: null, actorClass: "participant" as const,
      actorUid: uid, identityStrength: "catchAccount" as const, grantedAt: null,
      revokedAt: decidedAt, supersedesReceiptId: data.expectedReceiptId,
      createdAt: now};
    if (scope === "catch") {
      const document: CatchPreference = {uid,
        whatsapp: purpose ? previous?.whatsapp ??
          unknownOrganizerCommunicationChannel() : channel,
        whatsappPurposes: purpose ? {
          ...(previous?.whatsappPurposes ?? {}), [purpose]: channel,
        } : {marketing: channel},
        createdAt: previous?.createdAt ?? now, updatedAt: now};
      const projected = await summarize(db, tx, document, scope);
      const evidence: CatchReceipt = {...receipt, sourceOrganizerId: null};
      tx.create(receiptRef, evidence);
      tx.set(preferenceRef, document);
      writeContactPermissionState(tx, contact, {next: document, now,
        receipts: [{id: receiptId, document: evidence, created: true}]});
      return {preference: projected, replayed: false};
    } else {
      const document: OrganizerPreference = {uid, organizerId:
        data.organizerId!,
      whatsapp: purpose ? previous?.whatsapp ??
        unknownOrganizerCommunicationChannel() : channel,
      whatsappPurposes: purpose ? {
        ...(previous?.whatsappPurposes ?? {}), [purpose]: channel,
      } : {eventOperations: channel, marketing: channel,
        ...(previous?.whatsappPurposes?.followerUpdates ?
          {followerUpdates: channel} : {})},
      sms: (previous as OrganizerPreference | null)?.sms ??
          unknownOrganizerCommunicationChannel(), createdAt:
            previous?.createdAt ?? now,
      updatedAt: now};
      const projected = await summarize(db, tx, document, scope);
      const evidence: OrganizerReceipt = {...receipt, organizerId:
        data.organizerId!};
      tx.create(receiptRef, evidence);
      tx.set(preferenceRef, document);
      writeContactPermissionState(tx, contact, {next: document, now,
        receipts: [{id: receiptId, document: evidence, created: true}]});
      return {preference: projected, replayed: false};
    }
  });
}

export const withdrawParticipantMessagingPermission = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => withdrawParticipantMessagingPermissionHandler(request));
