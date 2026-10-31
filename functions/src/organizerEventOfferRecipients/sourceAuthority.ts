import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument, OrganizerDocument,
  OrganizerFormResponseDocument, OrganizerFormVersionDocument,
  OrganizerContactOriginDocument, OrganizerContactDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateOrganizerFormResponseDocument} from
  "../shared/generated/validators/organizerFormResponseDocument";
import {validateOrganizerFormVersionDocument} from
  "../shared/generated/validators/organizerFormVersionDocument";
import {parseStoredEventOffer} from
  "../organizerEventOffers/eventOfferFirestoreRepository";
import {eventOfferId} from "../organizerEventOffers/eventOfferDomain";
import {organizerContactOriginId} from "../shared/organizerContactOrigins";
import {formConversionReceiptId} from
  "../organizers/organizerFormAdmissionIdentity";
import {readApplicationAdmissionApproval} from
  "../organizerFormAdmission/applicationAuthority";

export function recipientUnavailable(): never {
  // Do not reveal whether a guessed link exists or which phone it needs.
  throw new HttpsError("failed-precondition", "This offer is unavailable.");
}
export function recipientId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$/u.test(value);
}
export function recipientPhoneHash(phone: string): string {
  if (!/^\+[1-9]\d{7,14}$/u.test(phone)) recipientUnavailable();
  return createHash("sha256").update(`offer-recipient-phone\u001f${phone}`)
    .digest("hex");
}
export interface OfferRecipientScope {
  organizerId: string; eventId: string; offerId: string; responseId: string;
}

/** Current source authority, read inside issuance, claim and payment txs.
 * A link or OTP proves neither application approval nor event eligibility.
 */
export async function readOfferRecipientSource(params: {
  db: FirebaseFirestore.Firestore; tx: FirebaseFirestore.Transaction;
  scope: OfferRecipientScope; nowMillis: number;
}) {
  const {db, tx, scope, nowMillis} = params;
  if (![scope.organizerId, scope.eventId, scope.offerId, scope.responseId]
    .every(recipientId) || !Number.isSafeInteger(nowMillis) || nowMillis <= 0) {
    recipientUnavailable();
  }
  const read = async (collection: string, id: string) =>
    (await tx.get(db.collection(collection).doc(id))).data();
  const [organizerRaw, eventRaw, offerRaw, responseRaw] =
    await Promise.all([
      read("organizers", scope.organizerId), read("events", scope.eventId),
      read("organizerEventOffers", scope.offerId),
      read("organizerFormResponses", scope.responseId),
    ]);
  const organizer = organizerRaw as OrganizerDocument | undefined;
  const event = eventRaw as EventDocument | undefined;
  const response = responseRaw as OrganizerFormResponseDocument | undefined;
  if (!organizer || organizer.status !== "active" || organizer.archived ||
      !event || event.status !== "active" ||
      event.organizerId !== scope.organizerId ||
      event.organizerId !== undefined &&
        event.organizerId !== scope.organizerId ||
      !event.startTime || event.startTime.toMillis() <= nowMillis ||
      !response || !validateOrganizerFormResponseDocument(responseRaw) ||
      response.organizerId !== scope.organizerId ||
      response.status !== "submitted" || response.withdrawnAt !== null ||
      !recipientId(response.formId) || !recipientId(response.versionId) ||
      !offerRaw) recipientUnavailable();
  const offer = parseStoredEventOffer(offerRaw, scope.offerId);
  if (offer.organizerId !== scope.organizerId ||
      offer.eventId !== scope.eventId || offer.status !== "offered" ||
      offer.offeredAtMillis === null || offer.offeredAtMillis > nowMillis ||
      offer.expiresAtMillis <= nowMillis ||
      offer.expiresAtMillis > event.startTime.toMillis() ||
      eventOfferId(offer) !== scope.offerId) recipientUnavailable();
  // Issued offers retain their frozen terms after Host defaults change.
  // parseStoredEventOffer validates that saved snapshot and its expiry.
  const originId = organizerContactOriginId({organizerId: scope.organizerId,
    sourceKind: "hostForm", sourceEntityKind: "hostFormResponse",
    sourceEntityId: scope.responseId});
  const [form, versionRaw, originRaw, contactRaw, conversion] =
    await Promise.all([
      read("organizerForms", response.formId),
      read("organizerFormVersions", response.versionId),
      read("organizerContactOrigins", originId),
      read("organizerContacts", offer.contactId),
      read("organizerFormConversionReceipts",
        formConversionReceiptId(scope.responseId, "crmContact")),
    ]);
  const version = versionRaw as OrganizerFormVersionDocument | undefined;
  const origin = originRaw as OrganizerContactOriginDocument | undefined;
  const contact = contactRaw as OrganizerContactDocument | undefined;
  if (!form || form.organizerId !== scope.organizerId || !version ||
      !validateOrganizerFormVersionDocument(versionRaw) ||
      version.organizerId !== scope.organizerId ||
      version.formId !== response.formId ||
      form.purpose !== version.definition.purpose || !origin ||
      origin.organizerId !== scope.organizerId || origin.eventId !== null ||
      origin.sourceKind !== "hostForm" ||
      origin.sourceEntityKind !== "hostFormResponse" ||
      origin.sourceEntityId !== scope.responseId ||
      origin.responseId !== scope.responseId ||
      origin.formId !== response.formId ||
      origin.currentContactId !== offer.contactId || !contact ||
      contact.organizerId !== scope.organizerId ||
      contact.deletedAt !== null || contact.hiddenAt != null ||
      contact.mergedIntoContactId !== null ||
      !["unlinked", "verified"].includes(contact.identityState) ||
      !Array.isArray(contact.ambiguousCandidateContactIds) ||
      contact.ambiguousCandidateContactIds.length > 0 ||
      typeof contact.phoneE164 !== "string" ||
      !/^\+[1-9]\d{7,14}$/u.test(contact.phoneE164) ||
      contact.linkedUid !== null &&
        (!recipientId(contact.linkedUid) ||
          contact.identityState !== "verified")) recipientUnavailable();
  const target = version.definition;
  if (!(target.defaultTargetKind === "organizer" &&
        target.defaultTargetId === null ||
        target.defaultTargetKind === "event" &&
        target.defaultTargetId === scope.eventId)) recipientUnavailable();
  let applicationApproval = null;
  if ((offer.sourceKind ?? "application") === "application") {
    applicationApproval = await readApplicationAdmissionApproval({
      db, tx, response,
      responseId: scope.responseId, version, origin, offer, nowMillis});
  } else if (!["registration", "intake"].includes(target.purpose) ||
      offer.applicationId !== scope.responseId || !conversion ||
      conversion.organizerId !== scope.organizerId ||
      conversion.responseId !== scope.responseId ||
      conversion.formId !== response.formId ||
      conversion.kind !== "crmContact" || conversion.status !== "completed" ||
      conversion.resultId !== origin.originContactId) recipientUnavailable();
  return {organizer, event, offer, response, version, origin, contact,
    originId, applicationApproval, phoneE164: contact.phoneE164,
    phoneHash: recipientPhoneHash(contact.phoneE164)};
}
