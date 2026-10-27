import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {HttpsError, onCall, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {formMessagingTerms} from "./organizerFormMessagingConsent";
import {organizerCommunicationPreferenceId,
  unknownOrganizerCommunicationChannel} from
  "../shared/organizerCommunicationPreferences";
import type {FormCommunicationConsentIntentDocument as Intent,
  OrganizerFormResponseDocument as Response,
  OrganizerCommunicationPreferenceDocument as OrganizerPreference,
  CatchCommunicationPreferenceDocument as CatchPreference,
  OrganizerCommunicationPermissionReceiptDocument as OrganizerReceipt,
  CatchCommunicationPermissionReceiptDocument as CatchReceipt} from
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
    const organizerRef = db.collection("organizerCommunicationPreferences")
      .doc(organizerCommunicationPreferenceId(response.organizerId, uid));
    const catchRef = db.collection("catchCommunicationPreferences").doc(uid);
    const [organizerSnap, catchSnap] = await Promise.all([
      tx.get(organizerRef), tx.get(catchRef),
    ]);
    const organizer = organizerSnap.exists ? requireDoc<OrganizerPreference>(
      organizerSnap, "OrganizerCommunicationPreferenceDocument") : null;
    const catchPreference = catchSnap.exists ? requireDoc<CatchPreference>(
      catchSnap, "CatchCommunicationPreferenceDocument") : null;
    if ((organizer && (organizer.organizerId !== response.organizerId ||
          organizer.uid !== uid)) ||
        (catchPreference && catchPreference.uid !== uid)) throw unavailable();
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
      const collection = decision.principal === "organizer" ?
        "organizerCommunicationPermissionReceipts" :
        "catchCommunicationPermissionReceipts";
      return {decision, key, receiptId,
        receiptRef: db.collection(collection).doc(receiptId)};
    });
    const receiptSnaps = await Promise.all(evidence.map((entry) =>
      tx.get(entry.receiptRef)));
    const genericUnknown = unknownOrganizerCommunicationChannel();
    const orgNext: OrganizerPreference = organizer ?? {
      organizerId: response.organizerId, uid, whatsapp: genericUnknown,
      sms: genericUnknown, createdAt: now, updatedAt: now,
    };
    const catchNext: CatchPreference = catchPreference ?? {
      uid, whatsapp: genericUnknown, createdAt: now, updatedAt: now,
    };
    const promotedPurposes: Result["promotedPurposes"] = [];
    let replayed = true;
    for (let i = 0; i < evidence.length; i++) {
      const {decision, key, receiptId, receiptRef} = evidence[i];
      if (receiptSnaps[i].exists) {
        const old = receiptSnaps[i].data() as OrganizerReceipt | CatchReceipt;
        if (old.uid !== uid || old.sourceResponseId !== data.responseId ||
            old.decision !== "optedIn" || old.purpose !== decision.purpose ||
            old.endpointE164 !== phone ||
            old.sourceFormId !== response.formId ||
            old.sourceVersionId !== response.versionId ||
            old.consentCopyHash !== decision.copyHash ||
            old.termsVersion !== intent.termsVersion ||
            old.actorUid !== uid ||
            (decision.principal === "organizer" ?
              (old as OrganizerReceipt).organizerId !== response.organizerId :
              (old as CatchReceipt).sourceOrganizerId !==
                response.organizerId)) throw unavailable();
        continue;
      }
      const preference = decision.principal === "organizer" ? orgNext :
        catchNext;
      const previous = preference.whatsappPurposes?.[decision.purpose];
      const broad = preference.whatsapp;
      // A later STOP/settings decision fences an older form choice, including
      // delayed payment finalization and a late verification callback.
      if ((broad.status === "optedOut" && broad.updatedAt &&
            broad.updatedAt.toMillis() >= decision.decidedAt.toMillis()) ||
          (previous?.status === "optedOut" && previous.updatedAt &&
            previous.updatedAt.toMillis() >= decision.decidedAt.toMillis()) ||
          (previous?.updatedAt && previous.updatedAt.toMillis() >=
            decision.decidedAt.toMillis())) continue;
      const channel = {status: "optedIn" as const,
        evidenceStatus: "complete" as const, currentReceiptId: receiptId,
        termsVersion: intent.termsVersion,
        source: "hostFormResponse" as const, sourceEventId: null,
        sourceResponseId: data.responseId, endpointE164: phone,
        updatedAt: decision.decidedAt};
      preference.whatsappPurposes = {...preference.whatsappPurposes,
        [decision.purpose]: channel};
      preference.updatedAt = now;
      const shared = {uid, channel: "whatsapp" as const,
        purpose: decision.purpose, endpointE164: phone,
        sourceVersionId: response.versionId,
        sourceDecidedAt: decision.decidedAt, decision: "optedIn" as const,
        evidenceStatus: "complete" as const,
        termsVersion: intent.termsVersion, consentCopyHash: decision.copyHash,
        source: "hostFormResponse" as const, sourceEventId: null,
        sourceFormId: response.formId, sourceResponseId: data.responseId,
        sourceProviderEventId: null, actorClass: "participant" as const,
        actorUid: uid, identityStrength: "phoneVerified" as const,
        grantedAt: now, revokedAt: null,
        supersedesReceiptId: previous?.currentReceiptId ?? null,
        createdAt: now};
      if (decision.principal === "organizer") {
        tx.create(receiptRef, {organizerId: response.organizerId,
          ...shared} satisfies OrganizerReceipt);
      } else {
        tx.create(receiptRef, {sourceOrganizerId: response.organizerId,
          ...shared} satisfies CatchReceipt);
      }
      promotedPurposes.push(key as Result["promotedPurposes"][number]);
      replayed = false;
    }
    if (promotedPurposes.some((key) => key.startsWith("organizer:"))) {
      tx.set(organizerRef, orgNext);
    }
    if (promotedPurposes.some((key) => key.startsWith("catch:"))) {
      tx.set(catchRef, catchNext);
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
