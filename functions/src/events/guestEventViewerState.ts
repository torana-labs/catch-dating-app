import {assertUnpartitionedAdmission} from
  "../organizerFormAdmission/admissionEligibility";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {validateEventParticipationDocument} from
  "../shared/generated/validators/eventParticipationDocument";
import type {GetEventViewerStateCallableResponse} from
  "../shared/generated/getEventViewerStateCallableResponse";
import type {EventAttendeeDocument, EventParticipationDocument,
  OrganizerApplicationDocument,
  OrganizerFormDocument, OrganizerFormVersionDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateEventAttendeeDocument} from
  "../shared/generated/validators/eventAttendeeDocument";
import {validateOrganizerApplicationDocument} from
  "../shared/generated/validators/organizerApplicationDocument";
import {validateOrganizerFormVersionDocument} from
  "../shared/generated/validators/organizerFormVersionDocument";
import {organizerApplicationAccess} from
  "../organizers/organizerApplicationAccess";
import {readVerifiedOfferRecipient, type LoadRecipientAuth} from
  "../organizerEventOfferRecipients/recipientGrant";
import {assertCurrentPublicGuest, readPublicEventSource} from
  "./publicRegistration/authority";
import {assertPublicRegistrationPolicy, publicRegistrationMode} from
  "./publicRegistration/policy";
import {projectPublicPayment} from "./publicRegistration/projection";
import {PUBLIC_PAYMENT_COLLECTION} from "./publicRegistration/paymentLedger";
import {isEventPubliclyAccessible} from "./eventPublicationAccess";
import {readCommunityMembership} from
  "../memberships/communityMembershipAuthority";
import type {EventViewerStateSource} from "./eventViewerStateSource";
import {HttpsError} from "firebase-functions/v2/https";

type Guest =
  NonNullable<GetEventViewerStateCallableResponse["viewer"]["guest"]>;

/**
 * Only account-owned status, never CRM notes, answers, phone or invitation
 * tokens.
 * This read does not grant access or reserve inventory. Each destination
 * retains its current-source mutation authority and eligibility guards.
 */
export async function readGuestEventViewerState(params: {
  db: FirebaseFirestore.Firestore; uid: string; eventId: string;
  phoneE164: string; nowMillis: number;
  loadCurrentAuthUser?: LoadRecipientAuth;
}): Promise<(EventViewerStateSource & {guest: Guest}) | null> {
  const {db, uid, eventId, nowMillis} = params;
  return db.runTransaction(async (tx) => {
    await assertCurrentPublicGuest({...params, tx});
    const {event, organizer} = await readPublicEventSource({db, tx, eventId});
    const publicEvent = isEventPubliclyAccessible(event);
    const organizerId = event.organizerId;
    const guest: Guest = {action: "unavailable", publicFormId: null,
      applicationStatus: null, offerGrantId: null, publicPaymentId: null,
      offerPaymentId: null,
      runtimeId: null, attendeeId: null, expiresAtMillis: nowMillis + 30_000};
    const viewer: EventViewerStateSource & {guest: Guest} = {eventId,
      organizerId, observedAtMillis: nowMillis, guest,
      membership: {state: event.eventPolicy?.admission.membershipRequired ||
        event.eventPolicy?.admission.format === "membersOnly" ?
        "none" : "notRequired", revision: null, decisionId: null},
      review: "none", admission: "none", attendance: "notRecorded",
      waitlisted: false, payment: "notRead",
      futureBooking: {allowed: false, reason: "unsupportedRoute"},
      route: null, quotedPriceInPaise: null,
      basis: {policyHash: null, inventoryRevision: null,
        capacityRevision: null, migrationRevision: null}};
    const membership = await readCommunityMembership({db, tx, organizerId,
      uid, nowMillis});
    if (membership) {
      viewer.membership = {state: membership.state,
        revision: membership.revision, decisionId: membership.lastDecisionId};
    }
    const [attendees, payments, applications, grants, forms, native,
      offerPayments] = await Promise.all([
      tx.get(db.collection("eventAttendees").where("eventId", "==", eventId)
        .where("linkedUid", "==", uid).limit(2)),
      tx.get(db.collection(PUBLIC_PAYMENT_COLLECTION)
        .where("eventId", "==", eventId).where("recipientUid", "==", uid)
        .orderBy("createdAt", "desc").limit(1)),
      tx.get(db.collection("organizerApplications")
        .where("linkedUid", "==", uid).where("targetId", "==", eventId)
        .orderBy("submittedAt", "desc").limit(1)),
      tx.get(db.collection("organizerEventOfferRecipients")
        .where("recipientUid", "==", uid).where("eventId", "==", eventId)
        .limit(21)),
      tx.get(db.collection("organizerForms")
        .where("defaultTargetId", "==", eventId)
        .where("purpose", "==", "application")
        .where("status", "==", "published").limit(2)),
      tx.get(db.collection("eventParticipations")
        .doc(eventParticipationId(eventId, uid))),
      tx.get(db.collection("organizerEventOfferPayments")
        .where("eventId", "==", eventId).where("recipientUid", "==", uid)
        .orderBy("createdAt", "desc").limit(1)),
    ]);
    const participation = native.data() as EventParticipationDocument |
      undefined;
    if (participation && validateEventParticipationDocument(participation) &&
        participation.eventId === eventId && participation.uid === uid &&
        participation.organizerId === event.organizerId &&
        (participation.organizerId === undefined ||
          participation.organizerId === organizerId) &&
        ["signedUp", "attended"].includes(participation.status)) {
      viewer.admission = "nativeParticipation";
      guest.action = "registered";
      viewer.attendance = participation.status === "attended" &&
        typeof participation.attendedAt?.toMillis === "function" &&
        participation.attendedAt.toMillis() <= nowMillis ?
        "attended" : "notRecorded";
    }
    if (offerPayments.docs[0]) {
      guest.offerPaymentId = offerPayments.docs[0].id;
      if (guest.action !== "registered") guest.action = "offer";
    }
    if (attendees.size > 1 || grants.size > 20) return viewer;
    const attendee = attendees.docs[0]?.data() as EventAttendeeDocument |
      undefined;
    if (attendee && (!validateEventAttendeeDocument(attendee) ||
        attendee.eventId !== eventId || attendee.linkedUid !== uid ||
        (attendee.organizerId) !== organizerId)) {
      return viewer;
    }
    if (attendee) {
      guest.attendeeId = attendees.docs[0].id;
      viewer.waitlisted = attendee.status === "waitlisted";
      if (["registered", "checkedIn"].includes(attendee.status)) {
        guest.action = "registered";
        viewer.admission = "guestRoster";
        viewer.attendance = attendee.status === "checkedIn" ? "attended" :
          "notRecorded";
        // The guest source is explicit; do not label an imported/free
        // roster row as native participation or proof of payment.
        guest.runtimeId = event.runtimeAccess?.enabled === true ?
          event.runtimeAccess.publicRuntimeId ?? null : null;
      } else if (viewer.waitlisted) guest.action = "seatWaitlisted";
    }
    if (payments.docs[0]) {
      const paid = await projectPublicPayment({db, tx, uid, eventId,
        organizerId, paymentId: payments.docs[0].id, nowMillis,
        includeCheckout: false});
      guest.publicPaymentId = payments.docs[0].id;
      viewer.payment = paid.payment?.status ?? "notRead";
      if (paid.admission) {
        viewer.admission = "publicPaidRoster";
        guest.action = "registered";
      } else if (guest.action !== "registered" && paid.payment &&
          !["expired", "failed", "cancelled", "refunded"].includes(
            paid.payment.status)) guest.action = "recoverPayment";
    }
    if (guest.action === "registered") {
      guest.runtimeId = event.runtimeAccess?.enabled === true ?
        event.runtimeAccess.publicRuntimeId ?? null : null;
    }
    if (["registered", "recoverPayment", "seatWaitlisted"].includes(
      guest.action)) return viewer;
    if (!publicEvent) {
      if (!guest.publicPaymentId && !guest.offerPaymentId) return null;
      guest.action = "closed";
      return viewer;
    }
    if (event.status !== "active" || event.startTime.toMillis() <= nowMillis) {
      guest.action = "closed";
      return viewer;
    }
    // A public form link is produced only from one current published event form
    // and its immutable version. An arbitrary host URL cannot become authority.
    if (forms.size === 1) {
      const form = forms.docs[0].data() as OrganizerFormDocument;
      const version = form.activeVersionId ? (await tx.get(db
        .collection("organizerFormVersions").doc(form.activeVersionId)))
        .data() as OrganizerFormVersionDocument | undefined : undefined;
      if (version && validateOrganizerFormVersionDocument(version) &&
          form.organizerId === organizerId &&
            form.defaultTargetKind === "event" &&
          version.organizerId === organizerId &&
            version.formId === forms.docs[0].id &&
          version.definition.purpose === "application" &&
          version.definition.defaultTargetKind === "event" &&
          version.definition.defaultTargetId === eventId &&
          ["phoneVerified", "catchAccount"].includes(
            version.definition.identityPolicy)) {
        guest.publicFormId = form.publicFormId;
      }
    }
    const application = applications.docs[0]?.data() as
      OrganizerApplicationDocument | undefined;
    if (application && validateOrganizerApplicationDocument(application) &&
        application.organizerId === organizerId &&
        application.targetKind === "event" &&
          application.targetId === eventId &&
        application.linkedUid === uid) {
      const access = await organizerApplicationAccess({db, transaction: tx,
        applicationId: applications.docs[0].id, application});
      guest.applicationStatus =
        access.accessState === "revokedParticipantGrant" ?
          "withdrawn" : application.reviewStatus;
      viewer.review = guest.applicationStatus === "approved" ? "approved" :
        ["submitted", "inReview"].includes(guest.applicationStatus) ?
          "pending" : "none";
    }
    // Claimed grants are recoverable without retaining secret invitation URLs.
    // An unclaimed grant still requires the original recipient-bound handoff.
    let offerScope: string | null = null;
    let issuedAt = -1;
    let ambiguousOffer = false;
    for (const row of grants.docs) {
      try {
        const current = await readVerifiedOfferRecipient({db, tx, uid,
          grantId: row.id, nowMillis,
          loadCurrentAuthUser: params.loadCurrentAuthUser});
        if (current.source.offer.paymentSnapshot.expectedAmountMinor !== 0 &&
            current.source.offer.paymentSnapshot.collectionMode !==
              "catchCheckout") continue;
        const key = [current.grant.offerId, current.grant.offerGeneration,
          current.grant.offerRevision].join(":");
        if (offerScope && offerScope !== key) {
          ambiguousOffer = true; guest.offerGrantId = null; break;
        }
        offerScope = key;
        if (current.grant.issuedAtMillis > issuedAt) {
          issuedAt = current.grant.issuedAtMillis;
          guest.offerGrantId = row.id;
        }
      } catch (error) {
        if (!(error instanceof HttpsError) ||
            error.code !== "failed-precondition") throw error;
      }
    }
    if (guest.offerGrantId || guest.offerPaymentId) {
      try {
        assertUnpartitionedAdmission(event);
        guest.action = "offer";
      } catch {
        guest.action = guest.offerPaymentId ? "offer" : "unsupported";
      }
    } else if (ambiguousOffer) {
      guest.action = "unsupported";
    } else if (["submitted",
      "inReview"].includes(guest.applicationStatus ?? "")) {
      guest.action = "applicationPending";
    } else if (guest.applicationStatus === "waitlisted") {
      guest.action = "applicationWaitlisted";
    } else if (guest.applicationStatus === "declined") {
      guest.action = "declined";
    } else if (guest.applicationStatus === "approved") {
      guest.action = "awaitingOffer";
    } else {
      const mode = publicRegistrationMode(event);
      try {
        if (mode === "closed") {
          throw new HttpsError("failed-precondition",
            "Closed");
        }
        assertPublicRegistrationPolicy(event, organizer, mode, nowMillis,
          membership?.state === "active");
        guest.action = mode === "free" ? "registerFree" : "bookPaid";
      } catch (error) {
        if (!(error instanceof HttpsError) ||
          error.code !== "failed-precondition") throw error;
        guest.action = guest.publicFormId ? "apply" : "unsupported";
      }
    }
    return viewer;
  });
}
