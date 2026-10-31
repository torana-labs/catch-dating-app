import {createHash} from "node:crypto";
import type {EventPaymentTerms} from
  "../events/eventSetupPreferences/types";
import {eventPaymentTermsHash, validateEventPaymentTerms} from
  "../events/eventSetupPreferences/resolve";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  EventDocument, OrganizerApplicationDocument,
  OrganizerContactDocument, OrganizerContactOriginDocument,
  OrganizerFormResponseDocument, OrganizerFormVersionDocument,
  OrganizerFormConversionReceiptDocument,
  OrganizerCommunicationPreferenceDocument,
  OrganizerContactChannelStateDocument,
} from "../shared/generated/firestoreAdminTypes";
import {effectiveOrganizerWhatsappPurposeStatus,
  organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {organizerContactChannelStateId, hashEndpoint} from
  "../organizers/organizerCampaignModel";
import {whatsappStopId} from "../shared/organizerWhatsappStops";
import {resolveIndividualCommunicationPlan} from
  "../communications/organizerCommunicationPlan";
import {projectEventPreferences} from
  "../events/progressiveSetup/preferences";
import {eventSourceRevision} from "../events/eventSourceRevision";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {organizerContactOriginId} from
  "../shared/organizerContactOrigins";
import {organizerApplicationAccess, genericFormApplicationId} from
  "../organizers/organizerApplicationAccess";
import {formConversionReceiptId} from
  "../organizers/organizerFormAdmissionIdentity";
import {EventOffer, OfferActionReceipt, OfferDomainError, eventOfferId} from
  "./eventOfferDomain";
import {
  OfferApplication, OfferAuditEntry, OfferBatchReceipt, OfferContact,
  OfferEvent, OfferOrigin, OfferRepository, OfferSourceState,
  OfferTransaction,
} from "./eventOfferService";

/**
 * Server-only storage adapter, intentionally not registered as a callable.
 * New collection contracts, rules/indexes, rate limits and API schemas must
 * be reviewed with the shared-contract owner before endpoint registration.
 * The new collections remain client-denied by the Firestore default rule.
 */
const collections = {
  offers: "organizerEventOffers",
  actions: "organizerEventOfferActionReceipts",
  batches: "organizerEventOfferBatchReceipts",
  audit: "organizerEventOfferAudits",
} as const;

function key(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u001f"))
    .digest("hex");
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" &&
    !Array.isArray(value);
}

export function parseStoredEventOffer(value: unknown, id: string): EventOffer {
  if (!object(value) || value.offerId !== id ||
      typeof value.organizerId !== "string" ||
      typeof value.eventId !== "string" ||
      typeof value.contactId !== "string" ||
      typeof value.applicationId !== "string" ||
      !["application", "formResponse"].includes(
        String(value.sourceKind ?? "application")) ||
      !["draft", "offered", "withdrawn", "expired"].includes(
        String(value.status)) ||
      !Number.isSafeInteger(value.generation) ||
      Number(value.generation) < 1 ||
      !Number.isSafeInteger(value.revision) ||
      Number(value.revision) < 1 ||
      !Number.isSafeInteger(value.expiresAtMillis) ||
      !object(value.paymentSnapshot) ||
      !Number.isSafeInteger(value.paymentSnapshot.eventPaymentRevision) ||
      Number(value.paymentSnapshot.eventPaymentRevision) < 1 ||
      typeof value.paymentSnapshot.eventPaymentHash !== "string" ||
      !/^[a-f0-9]{64}$/u.test(value.paymentSnapshot.eventPaymentHash) ||
      !Number.isSafeInteger(value.paymentSnapshot.expectedAmountMinor) ||
      Number(value.paymentSnapshot.expectedAmountMinor) < 0 ||
      !["manualInstructions", "reusablePage", "personalRequest",
        "catchCheckout", null].includes(
        value.paymentSnapshot.collectionMode as string | null) ||
      !(value.paymentSnapshot.currency === null ||
        typeof value.paymentSnapshot.currency === "string") ||
      (Number(value.paymentSnapshot.expectedAmountMinor) > 0 &&
        (typeof value.paymentSnapshot.currency !== "string" ||
          value.paymentSnapshot.currency.length !== 3)) ||
      !(value.paymentSnapshot.reusablePaymentPageUrl === null ||
        typeof value.paymentSnapshot.reusablePaymentPageUrl === "string") ||
      !(value.paymentSnapshot.paymentInstructions === null ||
        typeof value.paymentSnapshot.paymentInstructions === "string") ||
      !(value.paymentSnapshot.messageTemplate === null ||
        typeof value.paymentSnapshot.messageTemplate === "string") ||
      !(value.paymentSnapshot.personalPaymentLink === null ||
        typeof value.paymentSnapshot.personalPaymentLink === "string") ||
      value.paymentSnapshot.personalPaymentLink !==
        value.organizerPaymentLink ||
      (value.paymentSnapshot.collectionMode !== "personalRequest" &&
        value.paymentSnapshot.personalPaymentLink !== null) ||
      (value.paymentSnapshot.collectionMode === "personalRequest" &&
        value.paymentSnapshot.personalPaymentLink === null) ||
      value.paymentSnapshot.expiresAtMillis !== value.expiresAtMillis ||
      !Number.isSafeInteger(value.createdAtMillis) ||
      !Number.isSafeInteger(value.updatedAtMillis) ||
      !(value.offeredAtMillis === null ||
        Number.isSafeInteger(value.offeredAtMillis)) ||
      !(value.organizerPaymentLink === null ||
        typeof value.organizerPaymentLink === "string") ||
      !object(value.manualPayment) ||
      !["none", "evidenceSubmitted", "hostAttestedReceived",
        "rejected"].includes(String(value.manualPayment.status)) ||
      !(value.manualPayment.evidenceReference === null ||
        typeof value.manualPayment.evidenceReference === "string") ||
      !(value.manualPayment.evidenceRecordedAtMillis === null ||
        Number.isSafeInteger(value.manualPayment.evidenceRecordedAtMillis)) ||
      !(value.manualPayment.reviewedByUid === null ||
        typeof value.manualPayment.reviewedByUid === "string") ||
      !(value.manualPayment.reviewedAtMillis === null ||
        Number.isSafeInteger(value.manualPayment.reviewedAtMillis)) ||
      !(value.manualPayment.reviewNote === null ||
        typeof value.manualPayment.reviewNote === "string") ||
      typeof value.manualPayment.bankReceiptChecked !== "boolean" ||
      !(value.manualPayment.attestedAmountMinor === null ||
        (Number.isSafeInteger(value.manualPayment.attestedAmountMinor) &&
          Number(value.manualPayment.attestedAmountMinor) >= 0)) ||
      !(value.manualPayment.attestedCurrency === null ||
        typeof value.manualPayment.attestedCurrency === "string") ||
      !(value.manualPayment.attestedEventPaymentRevision === null ||
        (Number.isSafeInteger(
          value.manualPayment.attestedEventPaymentRevision) &&
          Number(value.manualPayment.attestedEventPaymentRevision) > 0)) ||
      !(value.manualPayment.attestedEventPaymentHash === null ||
        (typeof value.manualPayment.attestedEventPaymentHash === "string" &&
          /^[a-f0-9]{64}$/u.test(
            value.manualPayment.attestedEventPaymentHash))) ||
      (value.status === "offered" && value.offeredAtMillis === null) ||
      (value.status === "draft" && value.offeredAtMillis !== null) ||
      (value.manualPayment.status === "none" &&
        (value.manualPayment.evidenceReference !== null ||
          value.manualPayment.evidenceRecordedAtMillis !== null ||
          value.manualPayment.reviewedByUid !== null ||
          value.manualPayment.reviewedAtMillis !== null)) ||
      (value.manualPayment.status !== "none" &&
        (value.offeredAtMillis === null ||
          value.manualPayment.evidenceReference === null ||
          value.manualPayment.evidenceRecordedAtMillis === null)) ||
      (value.manualPayment.status === "hostAttestedReceived" &&
        value.manualPayment.bankReceiptChecked !== true) ||
      (["hostAttestedReceived", "rejected"].includes(
        String(value.manualPayment.status)) &&
        (value.manualPayment.reviewedByUid === null ||
          value.manualPayment.reviewedAtMillis === null ||
          typeof value.manualPayment.reviewNote !== "string" ||
          value.manualPayment.reviewNote.trim().length < 3)) ||
      (value.manualPayment.status === "hostAttestedReceived" &&
        (value.manualPayment.attestedAmountMinor !==
          value.paymentSnapshot.expectedAmountMinor ||
          value.manualPayment.attestedCurrency !==
            value.paymentSnapshot.currency ||
          value.manualPayment.attestedEventPaymentRevision !==
            value.paymentSnapshot.eventPaymentRevision ||
          value.manualPayment.attestedEventPaymentHash !==
            value.paymentSnapshot.eventPaymentHash))) {
    throw new OfferDomainError("conflict", "Stored offer is malformed.");
  }
  try {
    if (eventOfferId({organizerId: value.organizerId as string,
      eventId: value.eventId as string,
      contactId: value.contactId as string}) !== id) {
      throw new Error("identity mismatch");
    }
  } catch {
    throw new OfferDomainError("conflict", "Stored offer identity changed.");
  }
  return value as unknown as EventOffer;
}

function storedActionReceipt(value: unknown, offerId: string,
  requestId: string): OfferActionReceipt {
  if (!object(value) || value.offerId !== offerId ||
      value.requestId !== requestId ||
      typeof value.requestHash !== "string" ||
      !Number.isSafeInteger(value.resultingGeneration) ||
      Number(value.resultingGeneration) < 1 ||
      !Number.isSafeInteger(value.resultingRevision) ||
      Number(value.resultingRevision) < 1) {
    throw new OfferDomainError("conflict",
      "Stored action receipt is malformed.");
  }
  return value as unknown as OfferActionReceipt;
}

function storedBatchReceipt(value: unknown, organizerId: string,
  requestId: string): OfferBatchReceipt {
  if (!object(value) || value.organizerId !== organizerId ||
      value.requestId !== requestId ||
      typeof value.eventId !== "string" ||
      typeof value.requestHash !== "string" ||
      !Array.isArray(value.results) ||
      !value.results.every((row) => object(row) &&
        typeof row.offerId === "string" &&
        Number.isSafeInteger(row.revision) &&
        Number(row.revision) > 0 &&
        Number.isSafeInteger(row.generation) &&
        Number(row.generation) > 0)) {
    throw new OfferDomainError("conflict",
      "Stored batch receipt is malformed.");
  }
  return value as unknown as OfferBatchReceipt;
}

export class FirestoreEventOfferRepository implements OfferRepository {
  constructor(private readonly db: FirebaseFirestore.Firestore,
    private readonly serverClock: () => number = Date.now) {}

  transaction<T>(callback: (tx: OfferTransaction) => Promise<T>): Promise<T> {
    return this.db.runTransaction(async (firestoreTx) => {
      const applications = new Map<string, OrganizerApplicationDocument>();
      const formResponses = new Map<string, OrganizerFormResponseDocument>();
      const pendingOffers = new Map<string, EventOffer>();
      const actionReceipts: OfferActionReceipt[] = [];
      const batchReceipts: OfferBatchReceipt[] = [];
      const audits: OfferAuditEntry[] = [];
      const read = async (collection: string, id: string) =>
        (await firestoreTx.get(this.db.collection(collection).doc(id)))
          .data();
      const readPreferences = async (eventId: string) => {
        const data = await read("eventSetupPreferences", eventId);
        if (!data) return null;
        if (!object(data) || data.eventId !== eventId ||
              typeof data.organizerId !== "string") {
          throw new OfferDomainError("conflict",
            "Stored event payment terms are malformed.");
        }
        const event = await read("events", eventId) as
            EventDocument | undefined;
        if (!event || data.organizerId !==
            (event.organizerId)) {
          throw new OfferDomainError("conflict",
            "Event payment terms have a foreign organizer.");
        }
        try {
          const projected = projectEventPreferences(data,
            data.organizerId, eventId);
          if (!projected) throw new Error("missing preferences");
          const terms = projected.paymentTerms as EventPaymentTerms;
          validateEventPaymentTerms(terms);
          eventPaymentTermsHash(terms);
          return projected;
        } catch {
          throw new OfferDomainError("conflict",
            "Stored event payment terms are invalid.");
        }
      };
      const tx: OfferTransaction = {
        nowMillis: () => this.serverClock(),
        managerAuthorized: async (organizerId, actorUid) => {
          try {
            await requireOrganizerManager({db: this.db, organizerId,
              actorUid, transaction: firestoreTx});
            return true;
          } catch (error) {
            if (error instanceof HttpsError &&
                ["permission-denied", "not-found"].includes(error.code)) {
              return false;
            }
            throw error;
          }
        },
        application: async (applicationId, sourceKind):
          Promise<OfferApplication | null> => {
          if (sourceKind === "formResponse") {
            const response = await read("organizerFormResponses",
              applicationId) as OrganizerFormResponseDocument | undefined;
            if (!response) return null;
            const version = await read("organizerFormVersions",
              response.versionId) as OrganizerFormVersionDocument | undefined;
            const conversion = await read("organizerFormConversionReceipts",
              formConversionReceiptId(applicationId, "crmContact")) as
              OrganizerFormConversionReceiptDocument | undefined;
            if (!version || response.status !== "submitted" ||
                !["registration", "intake"].includes(
                  version.definition.purpose) ||
                version.organizerId !== response.organizerId ||
                version.formId !== response.formId ||
                !conversion || conversion.status !== "completed" ||
                conversion.kind !== "crmContact" ||
                conversion.organizerId !== response.organizerId ||
                conversion.formId !== response.formId ||
                conversion.responseId !== applicationId ||
                !conversion.resultId ||
                !["organizer", "event", "campaign"].includes(
                  version.definition.defaultTargetKind)) {
              return null;
            }
            formResponses.set(applicationId, response);
            return {sourceKind, organizerId: response.organizerId,
              applicationId, contactId: null,
              latestResponseId: applicationId,
              conversionContactId: conversion.resultId,
              conversionStatus: conversion.status,
              reviewStatus: response.status,
              revision: version.version,
              targetKind: version.definition.defaultTargetKind,
              targetId: version.definition.defaultTargetId};
          }
          const data = await read("organizerApplications", applicationId) as
            OrganizerApplicationDocument | undefined;
          if (!data) return null;
          if (typeof data.organizerId !== "string" ||
              typeof data.latestResponseId !== "string" ||
              !Number.isSafeInteger(data.revision) ||
              !["organizer", "event", "campaign"].includes(
                data.targetKind)) {
            throw new OfferDomainError("conflict",
              "Stored application is malformed.");
          }
          applications.set(applicationId, data);
          return {sourceKind, organizerId: data.organizerId, applicationId,
            contactId: data.contactId, latestResponseId: data.latestResponseId,
            reviewStatus: data.reviewStatus, revision: data.revision,
            targetKind: data.targetKind, targetId: data.targetId};
        },
        sourceState: async (applicationId): Promise<OfferSourceState> => {
          if (formResponses.has(applicationId)) {
            return "submittedFormResponse";
          }
          const application = applications.get(applicationId);
          if (!application) {
            throw new OfferDomainError("conflict",
              "Application must be read before its source.");
          }
          const access = await organizerApplicationAccess({db: this.db,
            applicationId, application, transaction: firestoreTx});
          return access.accessState;
        },
        contact: async (contactId): Promise<OfferContact | null> => {
          const data = await read("organizerContacts", contactId) as
            OrganizerContactDocument | undefined;
          if (!data) return null;
          if (typeof data.organizerId !== "string" ||
              !Number.isSafeInteger(data.revision)) {
            throw new OfferDomainError("conflict",
              "Stored CRM contact is malformed.");
          }
          return {organizerId: data.organizerId, contactId,
            deleted: data.deletedAt !== null,
            hidden: data.hiddenAt != null,
            mergedIntoContactId: data.mergedIntoContactId,
            revision: data.revision};
        },
        origin: async (applicationId, responseId):
          Promise<OfferOrigin | null> => {
          const application = applications.get(applicationId);
          const form = formResponses.get(applicationId);
          if (!application && !form ||
              application && application.latestResponseId !== responseId ||
              form && applicationId !== responseId) {
            return null;
          }
          const generic = !!form || application!.source.kind === "native" &&
            applicationId === genericFormApplicationId(responseId);
          const id = organizerContactOriginId({
            organizerId: form?.organizerId ?? application!.organizerId,
            sourceKind: "hostForm",
            sourceEntityKind: generic ? "hostFormResponse" :
              "hostApplicationResponse", sourceEntityId: responseId,
          });
          const data = await read("organizerContactOrigins", id) as
            OrganizerContactOriginDocument | undefined;
          if (!data) return null;
          if (typeof data.currentContactId !== "string" ||
              data.sourceEntityId !== responseId) {
            throw new OfferDomainError("conflict",
              "Stored CRM origin is malformed.");
          }
          return {organizerId: data.organizerId,
            sourceResponseId: data.sourceEntityId,
            currentContactId: data.currentContactId,
            originContactId: data.originContactId};
        },
        event: async (eventId): Promise<OfferEvent | null> => {
          const eventSnap = await firestoreTx.get(
            this.db.collection("events").doc(eventId));
          const data = eventSnap.data() as EventDocument | undefined;
          if (!data) return null;
          const sourceRevision = eventSourceRevision(data, eventSnap);
          const startsAtMillis = data.startTime?.toMillis();
          if (!Number.isSafeInteger(startsAtMillis) ||
              startsAtMillis! <= 0 ||
              typeof data.organizerId !== "string" ||
              data.organizerId !== undefined &&
                data.organizerId !== data.organizerId ||
              !["active", "cancelled"].includes(data.status) ||
              !Number.isSafeInteger(sourceRevision) ||
              sourceRevision! < 1) {
            throw new OfferDomainError("conflict",
              "Stored event is malformed.");
          }
          return {organizerId: data.organizerId,
            eventId, startsAtMillis: startsAtMillis!,
            cancelled: data.status === "cancelled",
            sourceRevision: sourceRevision!};
        },
        eventPaymentTerms: async (eventId) =>
          (await readPreferences(eventId))?.paymentTerms ?? null,
        eventPreferences: readPreferences,
        handoffPresentation: async (offer, sourceResponseId) => {
          const [eventData, contactData] = await Promise.all([
            read("events", offer.eventId),
            read("organizerContacts", offer.contactId),
          ]);
          const event = eventData as EventDocument | undefined;
          const contact = contactData as OrganizerContactDocument | undefined;
          if (!event || !contact ||
              (event.organizerId) !== offer.organizerId ||
              contact.organizerId !== offer.organizerId) {
            throw new OfferDomainError("denied",
              "Offer event or contact is unavailable.");
          }
          const phone = contact.phoneE164;
          const [preferenceData, channelData, stopData] = await Promise.all([
            contact.linkedUid ? read("organizerCommunicationPreferences",
              organizerCommunicationPreferenceId(offer.organizerId,
                contact.linkedUid)) : Promise.resolve(undefined),
            read("organizerContactChannelStates",
              organizerContactChannelStateId(offer.organizerId,
                offer.contactId)),
            phone ? read("organizerWhatsappEndpointStops",
              whatsappStopId(offer.organizerId, hashEndpoint(phone))) :
              Promise.resolve(undefined),
          ]);
          const preference = preferenceData as
            OrganizerCommunicationPreferenceDocument | undefined;
          const channel = channelData as
            OrganizerContactChannelStateDocument | undefined;
          if (preference && (preference.organizerId !== offer.organizerId ||
              preference.uid !== contact.linkedUid)) {
            throw new OfferDomainError("conflict",
              "Stored contact permission has a foreign owner.");
          }
          if (channel && (channel.organizerId !== offer.organizerId ||
              channel.contactId !== offer.contactId)) {
            throw new OfferDomainError("conflict",
              "Stored contact channel has a foreign owner.");
          }
          const purposeStatus = effectiveOrganizerWhatsappPurposeStatus(
            preference, "eventOperations", phone, sourceResponseId);
          const optedOut = contact.whatsappStatus === "optedOut" ||
            purposeStatus === "optedOut";
          const suppressed = channel?.adminSuppressed === true ||
            channel?.suppressionStatus !== undefined &&
              channel.suppressionStatus !== "none" ||
            !!phone && channel?.endpointHash !== undefined &&
              channel.endpointHash !== hashEndpoint(phone) ||
            !!stopData;
          const plan = resolveIndividualCommunicationPlan({
            contactId: offer.contactId,
            displayName: contact.displayNameOverride?.trim() ||
              contact.displayName,
            linkedUid: contact.linkedUid,
            identityState: contact.identityState === "merged" ?
              "ambiguous" : contact.identityState,
            ambiguousCandidateCount:
              contact.ambiguousCandidateContactIds?.length ?? 0,
            phoneE164: phone,
            email: contact.email ?? null,
            whatsappStatus: optedOut ? "optedOut" : contact.whatsappStatus,
            whatsappAdminSuppressed: suppressed,
          });
          const handoff = plan.routes.find((route) =>
            route.routeId === "personalWhatsappHandoff");
          return {event: {eventId: offer.eventId,
            title: event.name ?? "", startsAtMillis:
              event.startTime?.toMillis() ?? 0,
            timeZone: event.eventTimezone ?? "",
            lifecycle: event.status === "cancelled" ? "canceled" as const :
              "current" as const},
          recipient: {contactId: offer.contactId,
            displayName: contact.displayNameOverride?.trim() ||
              contact.displayName,
            phoneE164: phone,
            whatsappPermission: optedOut ?
              "optedOut" as const :
              handoff?.availability === "available" ?
                "available" as const : "unavailable" as const,
            sourceCurrent: true,
            contactCurrent: contact.deletedAt === null &&
              contact.hiddenAt == null &&
              contact.mergedIntoContactId === null &&
              contact.identityState !== "merged" &&
              contact.identityState !== "ambiguous"}};
        },
        offer: async (offerId) => {
          const data = await read(collections.offers, offerId);
          return data ? parseStoredEventOffer(data, offerId) : null;
        },
        actionReceipt: async (offerId, requestId) => {
          const data = await read(collections.actions,
            key(offerId, requestId));
          return data ? storedActionReceipt(data, offerId, requestId) : null;
        },
        batchReceipt: async (organizerId, requestId) => {
          const data = await read(collections.batches,
            key(organizerId, requestId));
          return data ? storedBatchReceipt(data, organizerId,
            requestId) : null;
        },
        listOffers: async (organizerId, eventId, afterOfferId, limit) => {
          let query = this.db.collection(collections.offers)
            .where("organizerId", "==", organizerId)
            .where("eventId", "==", eventId)
            .orderBy(admin.firestore.FieldPath.documentId())
            .limit(limit);
          if (afterOfferId) query = query.startAfter(afterOfferId);
          const snapshot = await firestoreTx.get(query);
          return snapshot.docs.map((doc) =>
            parseStoredEventOffer(doc.data(), doc.id));
        },
        hasMergedContactOffer: async (organizerId, eventId,
          canonicalContactId) => {
          const query = this.db.collection("organizerContactOrigins")
            .where("organizerId", "==", organizerId)
            .where("currentContactId", "==", canonicalContactId)
            .limit(51);
          const origins = await firestoreTx.get(query);
          if (origins.size > 50) {
            throw new OfferDomainError("conflict",
              "Too many CRM origins; reconcile before offering.");
          }
          for (const doc of origins.docs) {
            const origin = doc.data() as OrganizerContactOriginDocument;
            if (origin.organizerId !== organizerId ||
                origin.currentContactId !== canonicalContactId ||
                typeof origin.originContactId !== "string") {
              throw new OfferDomainError("conflict",
                "Stored CRM origin is malformed.");
            }
            const priorId = eventOfferId({organizerId, eventId,
              contactId: origin.originContactId});
            if (priorId !== eventOfferId({organizerId, eventId,
              contactId: canonicalContactId}) &&
                await firestoreTx.get(this.db.collection(collections.offers)
                  .doc(priorId)).then((snapshot) => snapshot.exists)) {
              return true;
            }
          }
          return false;
        },
        putOffer: (offer) => {
          pendingOffers.set(offer.offerId, offer);
        },
        createActionReceipt: (receipt) => {
          actionReceipts.push(receipt);
        },
        createBatchReceipt: (receipt) => {
          batchReceipts.push(receipt);
        },
        appendAudit: (entry) => {
          audits.push(entry);
        },
      };
      const result = await callback(tx);
      // The service has completed all reads. Collapse draft->offered writes
      // to one final document while retaining both immutable action receipts.
      for (const offer of pendingOffers.values()) {
        firestoreTx.set(this.db.collection(collections.offers)
          .doc(offer.offerId), offer);
      }
      for (const receipt of actionReceipts) {
        firestoreTx.create(this.db.collection(collections.actions)
          .doc(key(receipt.offerId, receipt.requestId)), receipt);
      }
      for (const receipt of batchReceipts) {
        firestoreTx.create(this.db.collection(collections.batches)
          .doc(key(receipt.organizerId, receipt.requestId)), receipt);
      }
      for (const entry of audits) {
        firestoreTx.create(this.db.collection(collections.audit)
          .doc(key(entry.offerId, entry.requestId)), entry);
      }
      return result;
    });
  }
}
