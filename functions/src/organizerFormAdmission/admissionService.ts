import {readVerifiedOfferRecipient} from
  "../organizerEventOfferRecipients/recipientGrant";
import {assertUnpartitionedAdmission} from "./admissionEligibility";
import {newFormAttendee} from "./admissionRoster";
import {heldSeatCount} from "../events/seatAuthority/seatAuthority";
import {createHash} from "node:crypto";
import {rosterWithReservedWaitlistOffersInTransaction} from
  "../events/eventPolicy";
import {eventSourceRevision} from "../events/eventSourceRevision";
import * as admin from "firebase-admin";
import type {PreviewOrganizerFormAdmissionCallablePayload} from
  "../shared/generated/previewOrganizerFormAdmissionCallablePayload";
import type {PreviewOrganizerFormAdmissionCallableResponse} from
  "../shared/generated/previewOrganizerFormAdmissionCallableResponse";
import type {CommitOrganizerFormAdmissionCallablePayload} from
  "../shared/generated/commitOrganizerFormAdmissionCallablePayload";
import type {CommitOrganizerFormAdmissionCallableResponse} from
  "../shared/generated/commitOrganizerFormAdmissionCallableResponse";
import type {
  EventAttendeeDocument, EventDocument, EventParticipationDocument,
  OrganizerContactDocument, OrganizerContactOriginDocument,
  OrganizerDocument, OrganizerFormConversionReceiptDocument,
  OrganizerFormDocument, OrganizerFormResponseDocument,
  OrganizerFormVersionDocument, PublicProfileDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {validateOrganizerFormResponseDocument} from
  "../shared/generated/validators/organizerFormResponseDocument";
import {validateOrganizerFormVersionDocument} from
  "../shared/generated/validators/organizerFormVersionDocument";
import {validateEventAttendeeDocument} from
  "../shared/generated/validators/eventAttendeeDocument";
import {validateCommitOrganizerFormAdmissionCallableResponse} from
  "../shared/generated/validators/commitOrganizerFormAdmissionOutput";
import {validateOrganizerFormAdmissionDocument} from
  "../shared/generated/validators/organizerFormAdmissionDocument";
import {validateOrganizerFormAdmissionReceiptDocument} from
  "../shared/generated/validators/organizerFormAdmissionReceiptDocument";
import {isOrganizerManager} from "../shared/organizerHosts";
import {organizerContactOriginId} from
  "../shared/organizerContactOrigins";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {eventAttendeeId, normalizeRosterPhone} from
  "../events/eventAttendees";
import {readSeatMigrationWriterFence} from
  "../events/seatMigrationPaged";
import {prepareCrmOriginSeatIdentity,
  FirestoreSeatIdentityAuthority, seatIdentityAliasId,
  seatIdentityValueHash} from "../events/seatIdentityAuthority";
import {applyFirestoreSeat, assertCurrentReadySeatSnapshot,
  deriveEventSeatPolicy,
  FirestoreSeatTransaction, prepareFirestoreSeat} from
  "../events/seatAuthority/firestoreAdapter";
import {formConversionReceiptId} from
  "../organizers/organizerFormAdmissionIdentity";
import {eventOfferId, EventOffer} from
  "../organizerEventOffers/eventOfferDomain";
import {parseStoredEventOffer} from
  "../organizerEventOffers/eventOfferFirestoreRepository";
import {AdmissionCommand, AdmissionFacts, AdmissionOwnership,
  AdmissionPolicyError, AdmissionReceipt, decideFormAdmission} from
  "./admissionPolicy";

import {ApplicationAdmissionApproval, readApplicationAdmissionApproval} from
  "./applicationAuthority";

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$/u;
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$/u;
const key = (...parts: string[]) => createHash("sha256")
  .update(parts.join("\u001f")).digest("hex");
function unavailable(message: string): never {
  throw new AdmissionPolicyError("unavailable", message);
}
function conflict(message: string): never {
  throw new AdmissionPolicyError("conflict", message);
}
const read = async (db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, collection: string, id: string) =>
  (await tx.get(db.collection(collection).doc(id))).data();

/** IDs are server-owned; neither request nor response can choose a marker. */
export function formAdmissionOwnershipId(organizerId: string,
  eventId: string, responseId: string): string {
  return key(organizerId, eventId, responseId);
}
export function formAdmissionReceiptId(organizerId: string,
  requestId: string): string {
  return key(organizerId, requestId);
}

export interface FormAdmissionServiceDeps {
  db: FirebaseFirestore.Firestore;
  actorUid: string;
  /** Server-only recipient proof, never a manager callable input. */
  recipientGrantId?: string;
  payload: CommitOrganizerFormAdmissionCallablePayload;
  nowMillis?: () => number;
  /** Server-only test seam. Production resolves the current Admin Auth user. */
  loadCurrentAuthUser?: (uid: string) => Promise<{
    uid: string; phoneNumber?: string | null}>;
}

/** Historical replay still requires current manager and account authority. */
function publicReceipt(receipt: AdmissionReceipt, replayed: boolean):
  CommitOrganizerFormAdmissionCallableResponse {
  const result: CommitOrganizerFormAdmissionCallableResponse = {
    receiptId: receipt.receiptId, organizerId: receipt.organizerId,
    eventId: receipt.eventId, responseId: receipt.responseId,
    contactId: receipt.contactId, offerId: receipt.offerId,
    attendeeId: receipt.attendeeId,
    canonicalSeatKey: receipt.canonicalSeatKey,
    requestId: receipt.requestId, requestHash: receipt.requestHash,
    resultingLedgerRevision: receipt.resultingLedgerRevision,
    admittedAtMillis: receipt.admittedAtMillis,
    seatAlreadyOccupied: receipt.seatAlreadyOccupied, replayed};
  if (!validateCommitOrganizerFormAdmissionCallableResponse(result)) {
    conflict("Prepared public admission receipt is invalid.");
  }
  return result;
}

function sourceFacts(response: OrganizerFormResponseDocument,
  version: OrganizerFormVersionDocument,
  conversion: OrganizerFormConversionReceiptDocument | undefined,
  responseId: string,
  applicationApproval: ApplicationAdmissionApproval | null):
  AdmissionFacts["source"] {
  return {organizerId: response.organizerId, responseId,
    formId: response.formId, versionId: response.versionId,
    status: response.status, withdrawn: response.withdrawnAt !== null,
    submittedVersionValid: true,
    purpose: version.definition.purpose,
    targetKind: version.definition.defaultTargetKind,
    targetId: version.definition.defaultTargetId,
    crmReceiptCompleted: conversion?.status === "completed",
    crmReceiptContactId: conversion?.resultId ?? null, applicationApproval};
}

/** No fabricated phone/email may leak from users/{uid} or Admin Auth. */
function catchAttendee(eventId: string, organizerId: string, uid: string,
  participation: EventParticipationDocument,
  profile: PublicProfileDocument | undefined,
  now: FirebaseFirestore.Timestamp): EventAttendeeDocument {
  const displayName = profile?.name?.trim() || uid;
  const checkedIn = participation.status === "attended";
  return {eventId, organizerId,
    displayName, searchName: displayName.toLocaleLowerCase("en"),
    source: "catchBooking", status: checkedIn ? "checkedIn" : "registered",
    linkedUid: uid, phoneE164: null, email: null,
    externalReference: null, arrivalGroup: null, ticketType: null,
    importId: null, sourceRowId: null,
    createdAt: participation.createdAt, updatedAt: now,
    registeredAt: participation.signedUpAt ?? participation.createdAt,
    waitlistedAt: null,
    checkedInAt: checkedIn ? participation.attendedAt ?? now : null,
    cancelledAt: null, checkedInBy: null,
    linkedAt: participation.createdAt,
    inviteLinkId: participation.inviteLinkId ?? null,
    inviteCapturedAt: participation.inviteCapturedAt ?? null,
    attendanceRevision: 0,
    preCheckInStatus: checkedIn ? "registered" : null};
}

/**
 * Revenue fact asserted by an offer's attested manual payment, when one is
 * present. The fact lands on the operational attendee so the rebuildable
 * contact-event edge projects it into customer revenue history.
 */
function attestedRevenueFields(offer: EventOffer):
  Pick<EventAttendeeDocument, "revenueAmountMinor" | "revenueCurrency" |
    "revenueSource" | "revenueAllocation" | "revenueOrderReference" |
    "revenueOrderAmountMinor"> | null {
  const manual = offer.manualPayment;
  const amount = manual.attestedAmountMinor;
  if (manual.status !== "hostAttestedReceived" || amount === null ||
      !Number.isSafeInteger(amount) || amount <= 0 ||
      manual.attestedCurrency === null ||
      !/^[A-Z]{3}$/u.test(manual.attestedCurrency)) {
    return null;
  }
  return {revenueAmountMinor: amount,
    revenueCurrency: manual.attestedCurrency,
    revenueSource: "hostAttested", revenueAllocation: "perAttendee",
    revenueOrderReference: null, revenueOrderAmountMinor: null};
}

/** Commits only after re-reading the complete admission authority chain. */
export async function commitOrganizerFormAdmission(
  params: FormAdmissionServiceDeps
): Promise<CommitOrganizerFormAdmissionCallableResponse> {
  const result = await executeAdmission(params, true);
  if ("canCommit" in result) conflict("Admission result changed.");
  return result;
}

/** Runs the same preparation without applying any of its staged writes. */
export async function previewOrganizerFormAdmission(
  params: Omit<FormAdmissionServiceDeps, "payload"> & {
    payload: PreviewOrganizerFormAdmissionCallablePayload;
  }
): Promise<PreviewOrganizerFormAdmissionCallableResponse> {
  const result = await executeAdmission(params, false);
  if (!("canCommit" in result)) conflict("Admission preview changed.");
  return result;
}

async function executeAdmission(
  params: Omit<FormAdmissionServiceDeps, "payload"> & {
    payload: PreviewOrganizerFormAdmissionCallablePayload |
      CommitOrganizerFormAdmissionCallablePayload;
  }, commit: boolean
): Promise<CommitOrganizerFormAdmissionCallableResponse |
  PreviewOrganizerFormAdmissionCallableResponse> {
  const {db, payload, actorUid} = params;
  const reviewed = commit ? payload as
    CommitOrganizerFormAdmissionCallablePayload : null;
  if (![actorUid, payload.organizerId, payload.eventId,
    payload.responseId, payload.contactId, payload.offerId]
    .every((value) => typeof value === "string" && ID.test(value)) ||
    reviewed && (!REQUEST_ID.test(reviewed.requestId) ||
      ![reviewed.expectedOfferRevision, reviewed.expectedOfferGeneration,
        reviewed.expectedLedgerRevision].every((value) =>
        Number.isSafeInteger(value) && value > 0))) {
    throw new AdmissionPolicyError("invalid", "Invalid admission scope.");
  }
  const ownershipId = formAdmissionOwnershipId(payload.organizerId,
    payload.eventId, payload.responseId);
  const receiptId = formAdmissionReceiptId(payload.organizerId,
    reviewed?.requestId ?? "preview_admission");
  const nowMillis = params.nowMillis ?? Date.now;
  const loadAuth = params.loadCurrentAuthUser ?? (async (uid: string) => {
    const user = await admin.auth().getUser(uid);
    return {uid: user.uid, phoneNumber: user.phoneNumber ?? null};
  });
  return db.runTransaction(async (tx) => {
    const doc = (collection: string, id: string) => db.collection(collection)
      .doc(id);
    const [organizerRaw, actorRaw, deletedActorRaw, receiptRaw,
      ownershipRaw] = await Promise.all([
      read(db, tx, "organizers", payload.organizerId),
      read(db, tx, "users", actorUid),
      read(db, tx, "deletedUsers", actorUid),
      reviewed ? read(db, tx, "organizerFormAdmissionReceipts", receiptId) :
        Promise.resolve(undefined),
      read(db, tx, "organizerFormAdmissions", ownershipId),
    ]);
    const organizer = organizerRaw as OrganizerDocument | undefined;
    const actor = actorRaw as UserProfileDocument | undefined;
    const now = nowMillis();
    if (!Number.isSafeInteger(now) || now <= 0) {
      throw new AdmissionPolicyError("invalid", "Server time is unavailable.");
    }
    const recipient = params.recipientGrantId ?
      await readVerifiedOfferRecipient({db, tx,
        grantId: params.recipientGrantId, uid: actorUid, nowMillis: now,
        loadCurrentAuthUser: params.loadCurrentAuthUser}) : null;
    if (recipient && (recipient.grant.organizerId !== payload.organizerId ||
        recipient.grant.eventId !== payload.eventId ||
        recipient.grant.responseId !== payload.responseId ||
        recipient.grant.offerId !== payload.offerId ||
        recipient.grant.contactId !== payload.contactId ||
        recipient.source.offer.paymentSnapshot.expectedAmountMinor !== 0 ||
        recipient.source.offer.manualPayment.status !== "none")) {
      unavailable("Current free invitation authority is required.");
    }
    const manager: AdmissionFacts["manager"] = {
      organizerId: payload.organizerId, actorUid,
      authorized: !!recipient ||
        !!organizer && isOrganizerManager(organizer, actorUid),
      accountDeleted: !!deletedActorRaw || !recipient && !actor ||
        actor?.deleted === true || actor?.deletedAt != null,
      organizerActive: !!organizer && organizer.archived !== true &&
        organizer.status === "active",
    };
    if (!manager.authorized || manager.accountDeleted ||
        !manager.organizerActive) {
      throw new AdmissionPolicyError("denied",
        "Current admission authority is required.");
    }
    const priorReceipt = receiptRaw as AdmissionReceipt | undefined;
    const sourceAdmission = ownershipRaw as AdmissionOwnership | undefined;
    if (receiptRaw && !validateOrganizerFormAdmissionReceiptDocument(
      receiptRaw) || ownershipRaw &&
        !validateOrganizerFormAdmissionDocument(ownershipRaw) ||
        priorReceipt && priorReceipt.receiptId !== receiptId) {
      conflict("Stored admission identity is malformed.");
    }
    if (priorReceipt) {
      // The pure policy inspects manager/receipt/ownership before source facts.
      const replayFacts = {manager, receipt: priorReceipt,
        sourceAdmission: sourceAdmission ?? null, nowMillis: now} as
        AdmissionFacts;
      const decision = decideFormAdmission({...reviewed!, actorUid},
        replayFacts);
      if (decision.kind !== "replay") conflict("Admission replay changed.");
      return publicReceipt(decision.receipt, true);
    }
    // New commands must not consume a different request's ownership marker.
    if (sourceAdmission) conflict("Response is already admitted.");
    const [responseRaw, eventSnap, offerRaw, conversionRaw,
      legacyAdmissionRaw] =
      await Promise.all([
        read(db, tx, "organizerFormResponses", payload.responseId),
        tx.get(db.collection("events").doc(payload.eventId)),
        read(db, tx, "organizerEventOffers", payload.offerId),
        read(db, tx, "organizerFormConversionReceipts",
          formConversionReceiptId(payload.responseId, "crmContact")),
        read(db, tx, "organizerFormConversionReceipts",
          formConversionReceiptId(payload.responseId,
            "eventAttendeeProposal", payload.eventId)),
      ]);
    // Legacy proposal receipts predate the ownership marker. Their source
    // must be reconciled, never admitted a second time under a new ID.
    if (legacyAdmissionRaw) {
      conflict("Legacy admission needs explicit reconciliation.");
    }
    const response = responseRaw as OrganizerFormResponseDocument | undefined;
    const eventRaw = eventSnap.data();
    const event = eventRaw as EventDocument | undefined;
    const conversion = conversionRaw as
      OrganizerFormConversionReceiptDocument | undefined;
    if (!response || !event || !offerRaw ||
        !validateOrganizerFormResponseDocument(responseRaw) ||
        response.organizerId !== payload.organizerId ||
        !ID.test(response.formId) || !ID.test(response.versionId) ||
        !["submitted", "withdrawn"].includes(response.status) ||
        !["anonymous", "emailVerified", "phoneVerified",
          "catchAccount"].includes(response.identityKind) ||
        !response.identity ||
        typeof response.identity !== "object" ||
        !(response.respondentUid === null ||
          typeof response.respondentUid === "string" &&
          ID.test(response.respondentUid)) ||
        (["phoneVerified", "catchAccount"].includes(response.identityKind) &&
          !response.respondentUid) ||
        event.organizerId !== payload.organizerId ||
        event.organizerId !== undefined &&
          event.organizerId !== payload.organizerId) {
      unavailable("Current form, CRM or event source is unavailable.");
    }
    const expectedOfferId = eventOfferId({organizerId: payload.organizerId,
      eventId: payload.eventId, contactId: payload.contactId});
    if (payload.offerId !== expectedOfferId) {
      conflict("Offer identity does not match this contact and event.");
    }
    const offer = parseStoredEventOffer(offerRaw, payload.offerId);
    const applicationSource = (offer.sourceKind ?? "application") ===
      "application";
    if (!applicationSource && (offer.applicationId !== payload.responseId ||
        !conversion || conversion.organizerId !== payload.organizerId ||
        conversion.responseId !== payload.responseId ||
        conversion.formId !== response.formId ||
        conversion.kind !== "crmContact" || conversion.status !== "completed" ||
        !ID.test(conversion.resultId ?? ""))) {
      unavailable("Issued offer or CRM conversion has a different source.");
    }
    const [formRaw, versionRaw, originRaw] = await Promise.all([
      read(db, tx, "organizerForms", response.formId),
      read(db, tx, "organizerFormVersions", response.versionId),
      read(db, tx, "organizerContactOrigins",
        organizerContactOriginId({organizerId: payload.organizerId,
          sourceKind: "hostForm", sourceEntityKind: "hostFormResponse",
          sourceEntityId: payload.responseId})),
    ]);
    const form = formRaw as OrganizerFormDocument | undefined;
    const version = versionRaw as OrganizerFormVersionDocument | undefined;
    const origin = originRaw as OrganizerContactOriginDocument | undefined;
    if (!form || !version || !origin ||
        !validateOrganizerFormVersionDocument(versionRaw) ||
        form.organizerId !== payload.organizerId ||
        version.organizerId !== payload.organizerId ||
        version.formId !== response.formId ||
        !version.definition ||
        !["registration", "intake", "application"]
          .includes(version.definition.purpose) ||
        !["event", "organizer", "campaign"].includes(
          version.definition.defaultTargetKind) ||
        form.purpose !== version.definition.purpose ||
        origin.organizerId !== payload.organizerId ||
        origin.sourceKind !== "hostForm" ||
        origin.sourceEntityKind !== "hostFormResponse" ||
        origin.sourceEntityId !== payload.responseId ||
        origin.responseId !== payload.responseId ||
        origin.formId !== response.formId ||
        origin.eventId !== null ||
        !applicationSource &&
          origin.originContactId !== conversion?.resultId ||
        origin.currentContactId !== payload.contactId) {
      unavailable("Immutable form version or CRM origin is unavailable.");
    }
    const applicationApproval = applicationSource ?
      await readApplicationAdmissionApproval({db, tx, response,
        responseId: payload.responseId, version, origin, offer,
        nowMillis: now}) : null;
    const contactRaw = await read(db, tx, "organizerContacts",
      payload.contactId);
    const contact = contactRaw as OrganizerContactDocument | undefined;
    if (!contact || contact.organizerId !== payload.organizerId ||
        !["unlinked", "verified"].includes(contact.identityState) ||
        typeof contact.displayName !== "string" ||
        !(contact.displayNameOverride == null ||
          typeof contact.displayNameOverride === "string") ||
        !(contact.phoneE164 === null ||
          typeof contact.phoneE164 === "string") ||
        !(contact.email === null || typeof contact.email === "string") ||
        contact.deletedAt !== null || contact.hiddenAt != null ||
        contact.mergedIntoContactId !== null ||
        !Array.isArray(contact.ambiguousCandidateContactIds) ||
        contact.ambiguousCandidateContactIds.length > 0) {
      unavailable("Current CRM survivor is unavailable.");
    }
    const currentAuth = response.respondentUid &&
      ["phoneVerified", "catchAccount"].includes(response.identityKind) ?
      await loadAuth(response.respondentUid) : null;
    if (response.respondentUid &&
        ["phoneVerified", "catchAccount"].includes(response.identityKind) &&
        (!currentAuth || currentAuth.uid !== response.respondentUid)) {
      unavailable("Current respondent Auth identity is unavailable.");
    }
    const verifiedPhone = response.identityKind === "phoneVerified" ?
      normalizeRosterPhone(currentAuth?.phoneNumber ?? null).value : null;
    if (response.identityKind === "phoneVerified" &&
        (!response.respondentUid || !verifiedPhone ||
          response.identity.phoneE164 !== verifiedPhone)) {
      unavailable("Verified respondent phone changed.");
    }
    // App-free CRM provenance does not establish a cohort or pair-hold right.
    // Keep these policies closed until their shared reservation path is wired.
    assertUnpartitionedAdmission(event);
    const fence = await readSeatMigrationWriterFence({db, tx,
      eventId: payload.eventId});
    if (fence !== "ready") unavailable("Seat migration is not ready.");
    const identity = await prepareCrmOriginSeatIdentity({db, tx,
      eventId: payload.eventId, organizerId: payload.organizerId,
      originId: organizerContactOriginId({organizerId: payload.organizerId,
        sourceKind: "hostForm", sourceEntityKind: "hostFormResponse",
        sourceEntityId: payload.responseId}),
      responseId: payload.responseId,
      verifiedOfferRecipient: recipient ? {grantId: params.recipientGrantId!,
        uid: actorUid, now: admin.firestore.Timestamp.fromMillis(now),
        loadCurrentAuthUser: params.loadCurrentAuthUser} : undefined,
      verifiedRespondent: !recipient && verifiedPhone &&
        response.respondentUid ?
        {uid: response.respondentUid, currentAuthPhoneNumber: verifiedPhone,
          now: admin.firestore.Timestamp.fromMillis(now)} : undefined});
    const seatTx = new FirestoreSeatTransaction(db, tx);
    const ledger = await seatTx.ledger(payload.eventId);
    const reservation = await seatTx.reservation(payload.eventId,
      identity.identity.key);
    const capacity = deriveEventSeatPolicy(event);
    assertCurrentReadySeatSnapshot({event, eventId: payload.eventId,
      organizerId: payload.organizerId, identity: identity.identity,
      ledger, reservation});
    if (!ledger || ledger.eventId !== payload.eventId ||
        ledger.state !== "ready" || ledger.capacity !== capacity.capacity ||
        ledger.policyHash !== capacity.policyHash ||
        ledger.policyVersion !== capacity.policyVersion ||
        ledger.migrationRevision < 1 || ledger.capacityRevision < 1 ||
        ledger.revision < 1 ||
        identity.seatAlreadyOccupied !== (reservation?.active === true) ||
        reservation && (reservation.eventId !== payload.eventId ||
          reservation.canonicalKey !== identity.identity.key ||
          reservation.identityRevision !== identity.identity.revision)) {
      unavailable("Canonical event seat authority is unavailable.");
    }
    const sourceRevision = eventSourceRevision(event, eventSnap);
    if (sourceRevision === null) {
      unavailable("Event has no stable source revision.");
    }
    const startsAtMillis = event.startTime?.toMillis();
    let occupancySource: AdmissionFacts["seat"]["occupancySource"] = "none";
    let rosterTarget: AdmissionFacts["seat"]["rosterTarget"] = "absent";
    let catchParticipation: AdmissionFacts["seat"]["catchParticipation"] =
      null;
    let participation: EventParticipationDocument | null = null;
    let publicProfile: PublicProfileDocument | undefined;
    let attendeeId: string;
    let attendeeRaw: EventAttendeeDocument | undefined;
    if (reservation?.active && identity.sourceAttendeeId) {
      occupancySource = "imported";
      attendeeId = identity.sourceAttendeeId;
      attendeeRaw = await read(db, tx, "eventAttendees", attendeeId) as
        EventAttendeeDocument | undefined;
      rosterTarget = attendeeRaw &&
        attendeeRaw.eventId === payload.eventId &&
        attendeeRaw.organizerId === payload.organizerId &&
        ["hostImport", "hostManual", "providerSync"].includes(
          attendeeRaw.source) &&
        ["registered", "checkedIn"].includes(attendeeRaw.status) ?
        "sameImported" : "foreign";
    } else if (reservation?.active) {
      occupancySource = "catch";
      const uid = response.respondentUid;
      if (uid && currentAuth?.uid === uid) {
        const [participationRaw, uidIdentity] = await Promise.all([
          read(db, tx, "eventParticipations",
            eventParticipationId(payload.eventId, uid)),
          new FirestoreSeatIdentityAuthority().resolve({db, tx,
            eventId: payload.eventId, organizerId: payload.organizerId,
            subject: {kind: "verifiedUid", uid}}),
        ]);
        const part = participationRaw as
          EventParticipationDocument | undefined;
        if (part && part.eventId === payload.eventId &&
            part.organizerId === payload.organizerId &&
            (part.organizerId === undefined ||
              part.organizerId === payload.organizerId) &&
            ["signedUp", "attended"].includes(part.status) &&
            uidIdentity?.key === identity.identity.key &&
            uidIdentity.revision === identity.identity.revision) {
          participation = part;
          catchParticipation = {eventId: payload.eventId, uid,
            status: part.status as "signedUp" | "attended",
            canonicalKey: identity.identity.key, verifiedResponseUid: uid};
        }
      }
      const authPhone = normalizeRosterPhone(
        currentAuth?.phoneNumber ?? null).value;
      attendeeId = eventAttendeeId(payload.eventId,
        authPhone ? `phone:${authPhone}` : `uid:${uid ?? "unknown"}`);
      attendeeRaw = await read(db, tx, "eventAttendees", attendeeId) as
        EventAttendeeDocument | undefined;
      if (attendeeRaw) {
        rosterTarget = attendeeRaw.eventId === payload.eventId &&
          attendeeRaw.organizerId === payload.organizerId &&
          attendeeRaw.linkedUid === uid &&
          attendeeRaw.source === "catchBooking" &&
          ["registered", "checkedIn"].includes(attendeeRaw.status) ?
          "sameCatch" : "foreign";
      } else if (participation) {
        publicProfile = await read(db, tx, "publicProfiles", uid!) as
          PublicProfileDocument | undefined;
      }
    } else {
      attendeeId = eventAttendeeId(payload.eventId,
        `external:form-admission:${payload.responseId}`);
      attendeeRaw = await read(db, tx, "eventAttendees", attendeeId) as
        EventAttendeeDocument | undefined;
      if (attendeeRaw) rosterTarget = "foreign";
    }
    const facts: AdmissionFacts = {manager,
      source: sourceFacts(response, version, conversion,
        payload.responseId, applicationApproval),
      origin: {organizerId: origin.organizerId,
        responseId: payload.responseId, formId: response.formId,
        originContactId: origin.originContactId,
        currentContactId: origin.currentContactId},
      contact: {organizerId: contact.organizerId,
        contactId: payload.contactId, available: true, ambiguous: false},
      event: {organizerId: payload.organizerId, eventId: payload.eventId,
        active: event.status === "active" && capacity.status === "active",
        startsAtMillis: startsAtMillis ?? 0,
        sourceRevision: sourceRevision ?? 0},
      offer: {offerId: offer.offerId, organizerId: offer.organizerId,
        eventId: offer.eventId, contactId: offer.contactId,
        responseId: payload.responseId,
        sourceKind: offer.sourceKind ?? "application",
        status: offer.status, generation: offer.generation,
        revision: offer.revision,
        expiresAtMillis: offer.expiresAtMillis,
        payment: offer.paymentSnapshot,
        manual: offer.manualPayment},
      seat: {ready: true, ledgerRevision: ledger.revision,
        capacityRevision: ledger.capacityRevision,
        migrationRevision: ledger.migrationRevision,
        canonicalKey: identity.identity.key,
        identityRevision: identity.identity.revision,
        occupancySource, seatAlreadyOccupied: reservation?.active === true,
        sourceAttendeeId: identity.sourceAttendeeId,
        rosterTarget, catchParticipation},
      receipt: null, sourceAdmission: null, nowMillis: now};
    // Preview expectations come from this transaction, never from the client.
    const command: AdmissionCommand = reviewed ? {...reviewed, actorUid} :
      {...payload, actorUid, requestId: "preview_admission",
        expectedOfferRevision: offer.revision,
        expectedOfferGeneration: offer.generation,
        expectedLedgerRevision: ledger.revision};
    const decision = decideFormAdmission(command, facts);
    if (decision.kind !== "commit") conflict("Admission decision changed.");
    if (decision.seatAction === "reserve") {
      const withOffers = await rosterWithReservedWaitlistOffersInTransaction(
        tx, db, payload.eventId, {bookedCountsByCohort: {},
          waitlistedCountsByCohort: {},
          totalBooked: ledger.occupied + heldSeatCount(ledger)},
        {nowMillis: now});
      if (withOffers.totalBooked >= ledger.capacity) {
        unavailable("Available seats are reserved by current waitlist offers.");
      }
    }
    // A reserve preparation may perform more reads and cannot stage writes.
    const preparedSeat = decision.seatAction === "reserve" ?
      await prepareFirestoreSeat({db, tx,
        command: {eventId: payload.eventId, subject: identity.identity,
          operation: "reserve", requestId: `admission_${receiptId}`,
          expectedLedgerRevision: ledger.revision,
          expectedCapacityRevision: ledger.capacityRevision,
          expectedMigrationRevision: ledger.migrationRevision,
          expectedReservationRevision: reservation?.revision ?? 0,
          nowMillis: now},
        identityAuthority: {resolve: async () => identity.identity}}) : null;
    const timestamp = admin.firestore.Timestamp.fromMillis(now);
    const attestedRevenue = attestedRevenueFields(offer);
    const operationalAttendee = decision.rosterAction === "create" ?
      newFormAttendee(payload.eventId, payload.organizerId,
        payload.responseId, contact, response, verifiedPhone, timestamp) :
      decision.rosterAction === "preserveCatch" && !attendeeRaw &&
        participation ? catchAttendee(payload.eventId, payload.organizerId,
          participation.uid, participation, publicProfile,
          timestamp) : null;
    if (operationalAttendee && recipient) {
      Object.assign(operationalAttendee, {linkedUid: actorUid,
        linkedAt: timestamp, phoneE164: recipient.source.phoneE164});
    }
    if (operationalAttendee && attestedRevenue) {
      Object.assign(operationalAttendee, attestedRevenue);
    }
    if (decision.rosterAction === "preserveCatch" && !attendeeRaw &&
        !operationalAttendee) {
      unavailable("Catch roster source is unavailable.");
    }
    if (operationalAttendee &&
        !validateEventAttendeeDocument(operationalAttendee)) {
      conflict("Prepared operational attendee is invalid.");
    }
    // The attendance resolver requires an attendee alias and, when the row
    // records its source response, an external alias. Unverified CRM phones
    // stay off this row so their quarantined alias is never promoted.
    const attendeeAliasRef = decision.rosterAction === "linkExisting" ?
      null : doc("eventSeatIdentityAliases", seatIdentityAliasId(
        payload.eventId, "attendee", attendeeId));
    const externalKey = decision.rosterAction === "create" ?
      payload.responseId.trim().toLowerCase() : null;
    const externalAliasRef = externalKey === null ? null :
      doc("eventSeatIdentityAliases", seatIdentityAliasId(
        payload.eventId, "external", externalKey));
    const [attendeeAliasRaw, externalAliasRaw] = await Promise.all([
      attendeeAliasRef ? tx.get(attendeeAliasRef).then((snap) => snap.data()) :
        Promise.resolve(undefined),
      externalAliasRef ? tx.get(externalAliasRef).then((snap) => snap.data()) :
        Promise.resolve(undefined),
    ]);
    const aliasBase = {eventId: payload.eventId,
      organizerId: payload.organizerId,
      canonicalKey: identity.identity.key,
      identityRevision: identity.identity.revision,
      migrationRevision: ledger.migrationRevision, state: "ready"};
    if (decision.rosterAction === "create" &&
        (attendeeAliasRaw || externalAliasRaw)) {
      conflict("Form response already owns a roster identity.");
    }
    if (attendeeAliasRaw && (attendeeAliasRaw.eventId !== payload.eventId ||
        attendeeAliasRaw.organizerId !== payload.organizerId ||
        attendeeAliasRaw.kind !== "attendee" ||
        attendeeAliasRaw.valueHash !== seatIdentityValueHash(
          "attendee", attendeeId) ||
        attendeeAliasRaw.canonicalKey !== identity.identity.key ||
        attendeeAliasRaw.identityRevision !== identity.identity.revision ||
        attendeeAliasRaw.migrationRevision !== ledger.migrationRevision ||
        attendeeAliasRaw.state !== "ready")) {
      conflict("Existing Catch roster alias is not current.");
    }
    if (!reviewed) {
      return {organizerId: payload.organizerId, eventId: payload.eventId,
        responseId: payload.responseId, contactId: payload.contactId,
        offerId: payload.offerId, canCommit: true,
        expectedOfferRevision: offer.revision,
        expectedOfferGeneration: offer.generation,
        expectedLedgerRevision: ledger.revision,
        seatAlreadyOccupied: decision.seatAction === "retain",
        paymentAuthority: decision.paymentAuthority, blocker: null};
    }
    const resultingLedgerRevision = preparedSeat ?
      preparedSeat.plan.result.receipt.appliedLedgerRevision :
      identity.resultingLedgerRevision;
    const receipt: AdmissionReceipt = {organizerId: payload.organizerId,
      eventId: payload.eventId, responseId: payload.responseId,
      contactId: payload.contactId, offerId: payload.offerId,
      requestId: reviewed.requestId, receiptId,
      requestHash: decision.requestHash,
      expectedOfferRevision: reviewed.expectedOfferRevision,
      expectedOfferGeneration: reviewed.expectedOfferGeneration,
      expectedLedgerRevision: reviewed.expectedLedgerRevision,
      attendeeId, canonicalSeatKey: identity.identity.key,
      resultingLedgerRevision, admittedAtMillis: now,
      seatAlreadyOccupied: decision.seatAction === "retain", actorUid};
    const ownership: AdmissionOwnership = {
      organizerId: payload.organizerId, eventId: payload.eventId,
      responseId: payload.responseId, receiptId, attendeeId,
      canonicalSeatKey: identity.identity.key, offerId: payload.offerId,
      offerRevision: reviewed.expectedOfferRevision,
      offerGeneration: reviewed.expectedOfferGeneration};
    const storedReceipt = {...receipt,
      paymentSnapshot: offer.paymentSnapshot,
      manualPayment: offer.manualPayment, applicationApproval};
    if (!validateOrganizerFormAdmissionReceiptDocument(storedReceipt) ||
        !validateOrganizerFormAdmissionDocument(ownership)) {
      conflict("Prepared admission receipt is invalid.");
    }
    // Every write below is ordered after the final read above. Firestore
    // retries this entire callback; deterministic create-only IDs fence races.
    identity.apply();
    if (preparedSeat) applyFirestoreSeat(preparedSeat);
    tx.update(doc("events", payload.eventId),
      {bookedCount: ledger.occupied + (preparedSeat ? 1 : 0)});
    if (operationalAttendee) {
      tx.create(doc("eventAttendees", attendeeId), operationalAttendee);
    }
    // A linked roster row carries the attested manual revenue the same way a
    // freshly created attendee does; the edge projection reads it verbatim.
    if (decision.rosterAction === "linkExisting" && attendeeRaw &&
        attestedRevenue) {
      tx.update(doc("eventAttendees", attendeeId), {...attestedRevenue,
        updatedAt: timestamp});
    }
    if (attendeeAliasRef && !attendeeAliasRaw) {
      tx.create(attendeeAliasRef, {...aliasBase, kind: "attendee",
        valueHash: seatIdentityValueHash("attendee", attendeeId)});
    }
    if (externalAliasRef && externalKey) {
      tx.create(externalAliasRef, {...aliasBase, kind: "external",
        valueHash: seatIdentityValueHash("external", externalKey)});
    }
    tx.create(doc("organizerFormAdmissions", ownershipId), ownership);
    tx.create(doc("organizerFormAdmissionReceipts", receiptId),
      storedReceipt);
    return publicReceipt(receipt, false);
  });
}
