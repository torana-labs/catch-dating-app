import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  OrganizerFormResponseDraftDocument as Draft,
  OrganizerFormVersionDocument as Version,
  FormCommunicationConsentIntentDocument as Intent,
} from "../shared/generated/firestoreAdminTypes";
import type {SaveOrganizerFormResponseDraftCallablePayload} from
  "../shared/generated/saveOrganizerFormResponseDraftCallablePayload";
import type {ContactPermissionReceipt, ContactSender} from
  "../shared/contactPermissions";
import {grantFromReceipt, nextContactPermission,
  readContactPermissionState, writeContactPermissionState} from
  "../messaging/contactPermissions";

type Choices = NonNullable<
  SaveOrganizerFormResponseDraftCallablePayload["messagingChoices"]>;
type Decision = NonNullable<Draft["messagingDecision"]>;
type Definition = Version["definition"];

// The server supplies the exact reviewed copy shown beside each unchecked
// choice. Changing either string requires a new version.
export const formMessagingTerms = {
  termsVersion: "form-whatsapp-v1" as const,
  purposeTermsVersion: "form-whatsapp-v2" as const,
  organizerWhatsapp: "Send me event announcements and updates from this " +
    "organizer on WhatsApp. Optional. I can opt out at any time.",
  catchWhatsapp: "Send me event recommendations and Catch updates from " +
    "Catch on WhatsApp. Optional. I can opt out at any time.",
  organizerOperationsWhatsapp: "Send me WhatsApp updates from this " +
    "organizer about this application or event, including payment links " +
    "and reminders. Optional.",
  organizerMarketingWhatsapp: "Send me WhatsApp messages from this " +
    "organizer about future events and offers. Optional.",
  catchMarketingWhatsapp: "Send me WhatsApp messages from Catch about " +
    "upcoming experiences and offers. Optional.",
};

export function formMessagingOffer(definition: Definition) {
  if (hasPurposeChoices(definition)) {
    return {
      termsVersion: formMessagingTerms.purposeTermsVersion,
      organizerWhatsapp: null, catchWhatsapp: null,
      organizerOperationsWhatsapp:
        definition.messagingConsent?.organizerOperationsWhatsapp ?
          formMessagingTerms.organizerOperationsWhatsapp : null,
      organizerMarketingWhatsapp:
        definition.messagingConsent?.organizerMarketingWhatsapp ?
          formMessagingTerms.organizerMarketingWhatsapp : null,
      catchMarketingWhatsapp:
        definition.messagingConsent?.catchMarketingWhatsapp ?
          formMessagingTerms.catchMarketingWhatsapp : null,
    };
  }
  return {termsVersion: formMessagingTerms.termsVersion,
    organizerWhatsapp: definition.messagingConsent?.organizerWhatsapp ?
      formMessagingTerms.organizerWhatsapp : null,
    catchWhatsapp: definition.messagingConsent?.catchWhatsapp ?
      formMessagingTerms.catchWhatsapp : null};
}

export function hasPurposeChoices(definition: Definition): boolean {
  return definition.messagingConsent?.organizerOperationsWhatsapp !==
      undefined ||
    definition.messagingConsent?.organizerMarketingWhatsapp !== undefined ||
    definition.messagingConsent?.catchMarketingWhatsapp !== undefined;
}

/** Missing choices from legacy clients never manufacture permission. */
export function normalizeFormMessagingDecision(params: {
  choices: Choices | undefined; previous: Decision | undefined;
  definition: Definition; phoneVerified: boolean;
  now: FirebaseFirestore.Timestamp;
}): Decision | undefined {
  const {choices, previous, definition, phoneVerified, now} = params;
  if (!choices) return previous;
  if (hasPurposeChoices(definition)) {
    if (choices.termsVersion !== formMessagingTerms.purposeTermsVersion ||
        choices.organizerWhatsapp || choices.catchWhatsapp ||
        (choices.organizerOperationsWhatsapp &&
          !definition.messagingConsent?.organizerOperationsWhatsapp) ||
        (choices.organizerMarketingWhatsapp &&
          !definition.messagingConsent?.organizerMarketingWhatsapp) ||
        (choices.catchMarketingWhatsapp &&
          !definition.messagingConsent?.catchMarketingWhatsapp)) {
      throw new HttpsError("invalid-argument",
        "These messaging choices are not offered by this form.");
    }
    const keys = [
      ["organizerOperationsWhatsapp", "organizerOperationsDecidedAt"],
      ["organizerMarketingWhatsapp", "organizerMarketingDecidedAt"],
      ["catchMarketingWhatsapp", "catchMarketingDecidedAt"],
    ] as const;
    const decision: Decision = {
      ...choices,
      organizerDecidedAt: previous?.organizerDecidedAt ?? now,
      catchDecidedAt: previous?.catchDecidedAt ?? now,
    };
    for (const [key, dateKey] of keys) {
      if (typeof choices[key] !== "boolean") {
        throw new HttpsError("invalid-argument",
          "Review each optional messaging choice.");
      }
      decision[dateKey] = previous?.termsVersion === choices.termsVersion &&
        previous[key] === choices[key] ? previous[dateKey] ?? now : now;
    }
    if (previous && keys.every(([key]) => previous[key] === choices[key]) &&
        previous.termsVersion === choices.termsVersion) return previous;
    return decision;
  }
  if (choices.termsVersion !== formMessagingTerms.termsVersion ||
      (choices.organizerWhatsapp &&
        !definition.messagingConsent?.organizerWhatsapp) ||
      (choices.catchWhatsapp && !definition.messagingConsent?.catchWhatsapp)) {
    throw new HttpsError("invalid-argument",
      "These messaging choices are not offered by this form.");
  }
  if ((choices.organizerWhatsapp || choices.catchWhatsapp) && !phoneVerified) {
    throw new HttpsError("failed-precondition",
      "Verify your phone before choosing WhatsApp updates.");
  }
  if (previous && previous.termsVersion === choices.termsVersion &&
      previous.organizerWhatsapp === choices.organizerWhatsapp &&
      previous.catchWhatsapp === choices.catchWhatsapp) return previous;
  return {...choices,
    organizerDecidedAt: previous?.termsVersion === choices.termsVersion &&
      previous.organizerWhatsapp === choices.organizerWhatsapp ?
      previous.organizerDecidedAt : now,
    catchDecidedAt: previous?.termsVersion === choices.termsVersion &&
      previous.catchWhatsapp === choices.catchWhatsapp ?
      previous.catchDecidedAt : now};
}

export function formMessagingChoices(decision: Decision | undefined):
  Choices | undefined {
  if (!decision) return undefined;
  const {termsVersion, organizerWhatsapp, catchWhatsapp} = decision;
  return termsVersion === formMessagingTerms.purposeTermsVersion ?
    {termsVersion, organizerWhatsapp, catchWhatsapp,
      organizerOperationsWhatsapp: decision.organizerOperationsWhatsapp,
      organizerMarketingWhatsapp: decision.organizerMarketingWhatsapp,
      catchMarketingWhatsapp: decision.catchMarketingWhatsapp} :
    {termsVersion, organizerWhatsapp, catchWhatsapp};
}

/** A submitted v2 choice remains private pending evidence. No dispatcher
 * reads this collection; only the verified promotion command can grant it. */
export function prepareFormCommunicationIntent(params: {
  tx: FirebaseFirestore.Transaction; db: FirebaseFirestore.Firestore;
  draft: Draft; definition: Definition; responseId: string;
  endpointE164: string | null; now: FirebaseFirestore.Timestamp;
}): () => void {
  const {tx, db, draft, definition, responseId, endpointE164, now} = params;
  const decision = draft.messagingDecision;
  if (!decision ||
      decision.termsVersion !== formMessagingTerms.purposeTermsVersion) {
    return () => undefined;
  }
  const choices = [
    ["organizer", "eventOperations", "organizerOperationsWhatsapp",
      "organizerOperationsDecidedAt"],
    ["organizer", "marketing", "organizerMarketingWhatsapp",
      "organizerMarketingDecidedAt"],
    ["catch", "marketing", "catchMarketingWhatsapp",
      "catchMarketingDecidedAt"],
  ] as const;
  const selected = choices.filter(([, , key]) => decision[key] === true);
  if (!selected.length) return () => undefined;
  if (!endpointE164 || !/^\+[1-9][0-9]{6,14}$/u.test(endpointE164)) {
    throw new HttpsError("failed-precondition",
      "Enter the WhatsApp phone number for your optional updates.");
  }
  const offered = formMessagingOffer(definition);
  if (offered.termsVersion !== decision.termsVersion) {
    throw new HttpsError("failed-precondition",
      "Review the current messaging choices.");
  }
  const decisions: Intent["decisions"] = selected.map(
    ([principal, purpose, key, dateKey]) => {
      const copy = offered[key];
      const decidedAt = decision[dateKey];
      if (!copy || !decidedAt || decidedAt.toMillis() > now.toMillis()) {
        throw new HttpsError("failed-precondition",
          "Review the current messaging choices.");
      }
      return {principal, purpose, decidedAt,
        copyHash: sha256([decision.termsVersion, principal, purpose, copy]
          .join("|"))};
    });
  const intent: Intent = {organizerId: draft.organizerId,
    formId: draft.formId, versionId: draft.versionId, responseId,
    endpointE164, termsVersion: formMessagingTerms.purposeTermsVersion,
    decisions, createdAt: now};
  return () => tx.create(db.collection("formCommunicationConsentIntents")
    .doc(responseId), intent);
}

/** Read first; the returned writer joins the atomic response transaction. */
export async function prepareFormMessagingGrants(params: {
  tx: FirebaseFirestore.Transaction; db: FirebaseFirestore.Firestore;
  draft: Draft; definition: Definition; responseId: string;
  now: FirebaseFirestore.Timestamp;
}): Promise<() => void> {
  const {tx, db, draft, definition, responseId, now} = params;
  const decision = draft.messagingDecision;
  if (!decision || (!decision.organizerWhatsapp && !decision.catchWhatsapp)) {
    return () => undefined;
  }
  normalizeFormMessagingDecision({choices: decision, previous: decision,
    definition, phoneVerified: draft.identityKind === "phoneVerified",
    now});
  const uid = draft.respondentUid;
  if (!uid || decision.organizerDecidedAt.toMillis() > now.toMillis() ||
      decision.catchDecidedAt.toMillis() > now.toMillis()) {
    throw new HttpsError("failed-precondition",
      "Messaging permission requires a verified participant decision.");
  }
  const scopes = (["organizer", "catch"] as const).filter((scope) =>
    scope === "organizer" ? decision.organizerWhatsapp :
      decision.catchWhatsapp);
  const senders: Record<typeof scopes[number], ContactSender> = {
    organizer: {kind: "organizer", organizerId: draft.organizerId},
    catch: {kind: "catch"},
  };
  const [deleted, ...contacts] = await Promise.all([
    tx.get(db.collection("deletedUsers").doc(uid)),
    ...scopes.map((scope) => readContactPermissionState(db, tx,
      {uid, sender: senders[scope]})),
  ]);
  // A delayed checkout cannot re-enable communication after account deletion.
  if (deleted.exists) return () => undefined;
  const writes: Array<() => void> = [];
  scopes.forEach((scope, index) => {
    const contact = contacts[index];
    const previous = contact.existing?.grants["whatsapp:marketing"];
    const decidedAt = scope === "organizer" ? decision.organizerDecidedAt :
      decision.catchDecidedAt;
    // Grant time is when the applicant chose it, not when a delayed webhook
    // finalized payment. A later STOP/settings decision always wins.
    if (previous && previous.updatedAt.toMillis() >= decidedAt.toMillis()) {
      return;
    }
    const receiptId = "fcpr_" + sha256(
      [scope, uid, draft.organizerId, responseId].join("|")).slice(0, 48);
    const copy = scope === "organizer" ? formMessagingTerms.organizerWhatsapp :
      formMessagingTerms.catchWhatsapp;
    // The first form copy named no purpose. It is recorded as a marketing
    // answer the send gate does not honour (contactGrantIsEffective).
    const receipt: ContactPermissionReceipt = {
      senderKind: scope, senderId: scope === "catch" ? "catch" :
        draft.organizerId,
      ...(scope === "catch" ? {sourceOrganizerId: draft.organizerId} : {}),
      uid, channel: "whatsapp", decision: "optedIn",
      evidenceStatus: "complete", termsVersion: decision.termsVersion,
      consentCopyHash: sha256([decision.termsVersion, scope, copy].join("|")),
      source: "hostFormResponse", sourceEventId: null,
      sourceFormId: draft.formId, sourceResponseId: responseId,
      sourceProviderEventId: null, actorClass: "participant",
      actorUid: uid, identityStrength: "phoneVerified",
      grantedAt: decidedAt, revokedAt: null,
      supersedesReceiptId: previous?.receiptId ?? null, createdAt: now,
    };
    // Ambiguous first-form copy is kept as evidence but never reverses a
    // marketing withdrawal; only an expressly reviewed opt-in can.
    const keepsWithdrawal = previous?.status === "optedOut";
    writes.push(() => writeContactPermissionState(tx, contact, {
      next: nextContactPermission(contact, keepsWithdrawal ? {} : {
        "whatsapp:marketing": grantFromReceipt(receipt, receiptId, decidedAt),
      }, now),
      receipts: [{id: receiptId, document: receipt}]}));
  });
  return () => {
    for (const write of writes) write();
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
