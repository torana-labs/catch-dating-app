import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {FieldPath, Timestamp} from "firebase-admin/firestore";
import {HttpsError, onCall, type CallableRequest} from
  "firebase-functions/v2/https";
import {runAssistanceTransaction as transact} from
  "../eventSuccess/operations/transactionCallback";
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
import type {ListParticipantMessagingPreferencesCallableResponse as Page} from
  "../shared/generated/listParticipantMessagingPreferencesCallableResponse";
import type {WithdrawParticipantMessagingPermissionCallableResponse as Result}
  from
  "../shared/generated/withdrawParticipantMessagingPermissionCallableResponse";
import {validateListParticipantMessagingPreferencesCallablePayload} from
  "../shared/generated/validators/listParticipantMessagingPreferencesInput";
import {validateWithdrawParticipantMessagingPermissionCallablePayload} from
  "../shared/generated/validators/withdrawParticipantMessagingPermissionInput";

type Preference = CatchPreference | OrganizerPreference;
type Scope = "catch" | "organizer";
interface Deps {
  db: () => FirebaseFirestore.Firestore;
  now: () => Timestamp;
  rateLimit: typeof checkRateLimit;
}
const defaults: Deps = {db: () => admin.firestore(), now: () => Timestamp.now(),
  rateLimit: checkRateLimit};

function readPreference(snap: FirebaseFirestore.DocumentSnapshot, uid: string,
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

async function summarize(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, value: Preference | null, scope: Scope):
  Promise<Page["catchPreference"]> {
  const channel = value?.whatsapp;
  const receiptId = channel?.currentReceiptId ?? null;
  const purposes: NonNullable<Page["catchPreference"]["purposes"]> = {};
  for (const purpose of ["eventOperations", "marketing"] as const) {
    if (scope === "catch" && purpose === "eventOperations") continue;
    const scoped = value?.whatsappPurposes?.[purpose];
    if (!scoped) continue;
    const scopedReceiptId = scoped.currentReceiptId;
    if (scoped.status === "optedOut" ||
        (channel?.status === "optedOut" && channel.updatedAt &&
          (!scoped.updatedAt ||
            channel.updatedAt.toMillis() >= scoped.updatedAt.toMillis()))) {
      purposes[purpose] = {status: "optedOut", receiptId: scopedReceiptId};
      continue;
    }
    const scopedReceipt = scopedReceiptId ?
      (await tx.get(db.collection(scope === "catch" ?
        "catchCommunicationPermissionReceipts" :
        "organizerCommunicationPermissionReceipts")
        .doc(scopedReceiptId))).data() as CatchReceipt | OrganizerReceipt |
          undefined : undefined;
    purposes[purpose] = {status:
      scoped.status === "optedIn" && scoped.evidenceStatus === "complete" &&
      scopedReceipt?.uid === value?.uid &&
      scopedReceipt?.purpose === purpose &&
      scopedReceipt?.endpointE164 === scoped.endpointE164 &&
      scopedReceipt?.sourceResponseId === scoped.sourceResponseId &&
      scopedReceipt?.decision === "optedIn" &&
      scopedReceipt?.evidenceStatus === "complete" &&
      typeof scopedReceipt?.consentCopyHash === "string" &&
      /^[a-f0-9]{64}$/u.test(scopedReceipt.consentCopyHash) &&
      scopedReceipt?.revokedAt === null &&
      (scope === "catch" || (scopedReceipt as OrganizerReceipt)
        .organizerId === (value as OrganizerPreference).organizerId) ?
        "optedIn" : "unknown", receiptId: scopedReceiptId};
  }
  const firstActive = purposes.eventOperations?.status === "optedIn" ?
    purposes.eventOperations : purposes.marketing?.status === "optedIn" ?
      purposes.marketing : null;
  if (firstActive) {
    return {status: "optedIn", receiptId: firstActive.receiptId, purposes};
  }
  if (channel?.status === "optedOut") {
    return {status: "optedOut", receiptId, purposes};
  }
  if (!value || channel?.status !== "optedIn" ||
      channel.evidenceStatus !== "complete" || !receiptId) {
    return {status: "unknown", receiptId, purposes};
  }
  const receipt = (await tx.get(db.collection(scope === "catch" ?
    "catchCommunicationPermissionReceipts" :
    "organizerCommunicationPermissionReceipts").doc(receiptId)))
    .data() as CatchReceipt | OrganizerReceipt | undefined;
  const complete = receipt?.uid === value.uid &&
    receipt.channel === "whatsapp" && receipt.decision === "optedIn" &&
    receipt.evidenceStatus === "complete" &&
    receipt.termsVersion === channel.termsVersion &&
    typeof receipt.consentCopyHash === "string" &&
    /^[a-f0-9]{64}$/u.test(receipt.consentCopyHash) &&
    receipt.grantedAt != null && receipt.revokedAt === null &&
    (scope === "catch" || (receipt as OrganizerReceipt).organizerId ===
      (value as OrganizerPreference).organizerId);
  return {status: complete ? "optedIn" : "unknown", receiptId, purposes};
}

async function assertActiveAccount(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, uid: string): Promise<void> {
  if ((await tx.get(db.collection("deletedUsers").doc(uid))).exists) {
    throw new HttpsError("not-found",
      "These messaging settings are unavailable.");
  }
}

export async function listParticipantMessagingPreferencesHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults): Promise<Page> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateListParticipantMessagingPreferencesCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "listParticipantMessagingPreferences", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const catchPreference = await transact(db, async (tx) => {
    await assertActiveAccount(db, tx, uid);
    const value = readPreference(await tx.get(db.collection(
      "catchCommunicationPreferences").doc(uid)), uid, "catch", null);
    return summarize(db, tx, value, "catch");
  });
  let query = db.collection("organizerCommunicationPreferences")
    .where("uid", "==", uid).orderBy(FieldPath.documentId())
    .limit(data.limit + 1);
  if (data.cursor) query = query.startAfter(data.cursor);
  const result = await query.get();
  const page = result.docs.slice(0, data.limit);
  const organizers: Page["organizers"] = [];
  for (const row of page) {
    const projected = await transact(db, async (tx) => {
      await assertActiveAccount(db, tx, uid);
      const snap = await tx.get(row.ref);
      if (!snap.exists) return null;
      const organizerId = snap.data()?.organizerId;
      if (typeof organizerId !== "string" || row.id !==
          organizerCommunicationPreferenceId(organizerId, uid)) {
        throw new HttpsError("failed-precondition",
          "Messaging permission ownership is inconsistent.");
      }
      const value = readPreference(snap, uid, "organizer", organizerId)!;
      const organizer = await
      tx.get(db.collection("organizers").doc(organizerId));
      const name = organizer.data()?.name;
      return {organizerId, organizerName: typeof name === "string" ? name :
        null,
      preference: await summarize(db, tx, value, "organizer")};
    });
    if (projected) organizers.push(projected);
  }
  return {catchPreference, organizers, nextCursor:
    result.docs.length > data.limit ? page.at(-1)!.id : null};
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
            null] : []),
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
    const now = deps.now();
    // Server ordering, including same-millisecond decisions, fences old drafts.
    const decidedAt = Timestamp.fromMillis(Math.max(now.toMillis(),
      (previous?.whatsapp.updatedAt?.toMillis() ?? -1) + 1,
      (previous?.whatsappPurposes?.eventOperations?.updatedAt?.toMillis() ??
        -1) + 1,
      (previous?.whatsappPurposes?.marketing?.updatedAt?.toMillis() ??
        -1) + 1));
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
      return {preference: projected, replayed: false};
    } else {
      const document: OrganizerPreference = {uid, organizerId:
        data.organizerId!,
      whatsapp: purpose ? previous?.whatsapp ??
        unknownOrganizerCommunicationChannel() : channel,
      whatsappPurposes: purpose ? {
        ...(previous?.whatsappPurposes ?? {}), [purpose]: channel,
      } : {eventOperations: channel, marketing: channel},
      sms: (previous as OrganizerPreference | null)?.sms ??
          unknownOrganizerCommunicationChannel(), createdAt:
            previous?.createdAt ?? now,
      updatedAt: now};
      const projected = await summarize(db, tx, document, scope);
      const evidence: OrganizerReceipt = {...receipt, organizerId:
        data.organizerId!};
      tx.create(receiptRef, evidence);
      tx.set(preferenceRef, document);
      return {preference: projected, replayed: false};
    }
  });
}

export const listParticipantMessagingPreferences = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => listParticipantMessagingPreferencesHandler(request));
export const withdrawParticipantMessagingPermission = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => withdrawParticipantMessagingPermissionHandler(request));
