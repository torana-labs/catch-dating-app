import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {HttpsError, onCall, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {formMessagingTerms} from "./organizerFormMessagingConsent";
import {grantFromReceipt, nextContactPermission,
  readContactPermissionState, writeContactPermissionState} from
  "../messaging/contactPermissions";
import {
  contactPermissionReceiptRef,
  type ContactGrant,
  type ContactGrantKey,
  type ContactPermissionReceipt,
} from "../shared/contactPermissions";
import type {FormCommunicationConsentIntentDocument as Intent,
  OrganizerFormResponseDocument as Response} from
  "../shared/generated/firestoreAdminTypes";
import {validatePromoteFormCommunicationIntentCallablePayload} from
  "../shared/generated/validators/promoteFormCommunicationIntentInput";
import type {PromoteFormCommunicationIntentCallableResponse as Result} from
  "../shared/generated/promoteFormCommunicationIntentCallableResponse";

interface Deps {
  db: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  rateLimit: typeof checkRateLimit;
}
const defaults: Deps = {db: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(), rateLimit: checkRateLimit};
const phonePattern = /^\+[1-9][0-9]{6,14}$/u;
const sha256 = (value: string) => createHash("sha256").update(value)
  .digest("hex");
const purposeKey = (principal: string, purpose: string) =>
  `${principal}:${purpose}`;

/** Promotion proves both source control and present control of its exact phone.
 * Pending form choices are never themselves a sender grant. */
export async function promoteFormCommunicationIntentHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults
): Promise<Result> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validatePromoteFormCommunicationIntentCallablePayload);
  const phone = request.auth?.token.phone_number;
  if (typeof phone !== "string" || !phonePattern.test(phone)) {
    throw new HttpsError("failed-precondition", "Verify this phone first.");
  }
  const db = deps.db();
  await deps.rateLimit(db, uid, "promoteFormCommunicationIntent", {
    maxRequests: 10, windowMs: 60 * 60 * 1000,
  });
  return db.runTransaction(async (tx) => {
    const [responseSnap, intentSnap, deleted] = await Promise.all([
      tx.get(db.collection("organizerFormResponses").doc(data.responseId)),
      tx.get(db.collection("formCommunicationConsentIntents")
        .doc(data.responseId)),
      tx.get(db.collection("deletedUsers").doc(uid)),
    ]);
    if (deleted.exists || !responseSnap.exists || !intentSnap.exists) {
      throw unavailable();
    }
    const response = requireDoc<Response>(responseSnap,
      "OrganizerFormResponseDocument");
    const intent = requireDoc<Intent>(intentSnap,
      "FormCommunicationConsentIntentDocument");
    if (response.status !== "submitted" || response.withdrawnAt !== null ||
        response.identity.phoneE164 !== phone ||
        intent.endpointE164 !== phone ||
        intent.responseId !== data.responseId ||
        intent.organizerId !== response.organizerId ||
        intent.formId !== response.formId ||
        intent.versionId !== response.versionId ||
        intent.termsVersion !== "form-whatsapp-v2") {
      throw unavailable();
    }
    const ownsSource = response.respondentUid === uid ||
      (response.respondentUid === null &&
        typeof data.withdrawalToken === "string" &&
        sha256(data.withdrawalToken) === response.withdrawalTokenHash);
    if (!ownsSource) throw unavailable();
    const now = deps.now();
    if (intent.createdAt.toMillis() > now.toMillis() ||
        intent.createdAt.toMillis() > response.submittedAt.toMillis()) {
      throw unavailable();
    }
    const reviewedCopy = {
      "organizer:eventOperations":
        formMessagingTerms.organizerOperationsWhatsapp,
      "organizer:marketing": formMessagingTerms.organizerMarketingWhatsapp,
      "catch:marketing": formMessagingTerms.catchMarketingWhatsapp,
    } as const;
    const seen = new Set<string>();
    const evidence = intent.decisions.map((decision) => {
      const key = purposeKey(decision.principal, decision.purpose);
      if (seen.has(key) ||
          (decision.principal === "catch" &&
            decision.purpose !== "marketing")) throw unavailable();
      const copy = reviewedCopy[key as keyof typeof reviewedCopy];
      if (!copy ||
          decision.decidedAt.toMillis() > intent.createdAt.toMillis() ||
          decision.copyHash !== sha256([
            intent.termsVersion, decision.principal, decision.purpose, copy,
          ].join("|"))) throw unavailable();
      seen.add(key);
      const receiptId = "fcpr2_" + sha256([
        data.responseId, uid, key,
      ].join("|")).slice(0, 48);
      return {decision, key, receiptId,
        receiptRef: contactPermissionReceiptRef(db, receiptId)};
    });
    const receiptSnaps = await Promise.all(evidence.map((entry) =>
      tx.get(entry.receiptRef)));
    const asks = (principal: "organizer" | "catch") =>
      evidence.some((entry) => entry.decision.principal === principal);
    const [organizerContact, catchContact] = await Promise.all([
      asks("organizer") ? readContactPermissionState(db, tx, {uid,
        sender: {kind: "organizer", organizerId: response.organizerId}}) :
        null,
      asks("catch") ? readContactPermissionState(db, tx, {uid,
        sender: {kind: "catch"}}) : null,
    ]);
    const changes: Record<"organizer" | "catch", {
      grants: Partial<Record<ContactGrantKey, ContactGrant>>;
      receipts: Array<{id: string; document: ContactPermissionReceipt}>;
    }> = {organizer: {grants: {}, receipts: []},
      catch: {grants: {}, receipts: []}};
    const promotedPurposes: Result["promotedPurposes"] = [];
    let replayed = true;
    for (let i = 0; i < evidence.length; i++) {
      const {decision, key, receiptId} = evidence[i];
      const scope = decision.principal;
      if (receiptSnaps[i].exists) {
        const old = receiptSnaps[i].data() as ContactPermissionReceipt;
        if (old.uid !== uid || old.sourceResponseId !== data.responseId ||
            old.senderKind !== scope ||
            old.decision !== "optedIn" || old.purpose !== decision.purpose ||
            old.endpointE164 !== phone ||
            old.sourceFormId !== response.formId ||
            old.sourceVersionId !== response.versionId ||
            old.consentCopyHash !== decision.copyHash ||
            old.termsVersion !== intent.termsVersion ||
            old.actorUid !== uid ||
            (scope === "organizer" ? old.senderId !== response.organizerId :
              old.sourceOrganizerId !== response.organizerId)) {
          throw unavailable();
        }
        continue;
      }
      const contact = scope === "organizer" ? organizerContact! :
        catchContact!;
      const grantKey = `whatsapp:${decision.purpose}` as ContactGrantKey;
      const previous = contact.existing?.grants[grantKey];
      // A later STOP/settings decision fences an older form choice, including
      // delayed payment finalization and a late verification callback.
      if (previous &&
          previous.updatedAt.toMillis() >= decision.decidedAt.toMillis()) {
        continue;
      }
      const receipt: ContactPermissionReceipt = {
        senderKind: scope,
        senderId: scope === "catch" ? "catch" : response.organizerId,
        ...(scope === "catch" ? {sourceOrganizerId: response.organizerId} :
          {}),
        uid, channel: "whatsapp", purpose: decision.purpose,
        endpointE164: phone, sourceVersionId: response.versionId,
        sourceDecidedAt: decision.decidedAt, decision: "optedIn",
        evidenceStatus: "complete", termsVersion: intent.termsVersion,
        consentCopyHash: decision.copyHash, source: "hostFormResponse",
        sourceEventId: null, sourceFormId: response.formId,
        sourceResponseId: data.responseId, sourceProviderEventId: null,
        actorClass: "participant", actorUid: uid,
        identityStrength: "phoneVerified", grantedAt: now, revokedAt: null,
        supersedesReceiptId: previous?.receiptId ?? null, createdAt: now};
      changes[scope].grants[grantKey] = grantFromReceipt(receipt, receiptId,
        decision.decidedAt);
      changes[scope].receipts.push({id: receiptId, document: receipt});
      promotedPurposes.push(key as Result["promotedPurposes"][number]);
      replayed = false;
    }
    for (const [scope, contact] of [["organizer", organizerContact],
      ["catch", catchContact]] as const) {
      if (!contact || changes[scope].receipts.length === 0) continue;
      writeContactPermissionState(tx, contact, {
        next: nextContactPermission(contact, changes[scope].grants, now),
        receipts: changes[scope].receipts});
    }
    return {responseId: data.responseId, promotedPurposes, replayed};
  });
}

function unavailable(): HttpsError {
  return new HttpsError("permission-denied",
    "This form communication choice is unavailable.");
}
export const promoteFormCommunicationIntent = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => promoteFormCommunicationIntentHandler(request));
