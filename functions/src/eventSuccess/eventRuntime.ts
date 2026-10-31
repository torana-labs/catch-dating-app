import {createHash} from "crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {
  appCheckCallableOptions,
  appCheckCallableOptionsWithSecrets,
} from "../shared/callableOptions";
import type {
  EventAttendeeDocument,
  EventDocument,
  EventLivePositionDocument,
  EventRuntimeClaimRequestDocument,
  EventRuntimeParticipantDocument,
  EventSuccessCompatibilityResponseDocument,
  EventSuccessPlanDocument,
  OrganizerEventSuccessLayoutDocument,
  OnboardingDraftDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ApproveEventRuntimeClaimCallablePayload} from
  "../shared/generated/approveEventRuntimeClaimCallablePayload";
import type {ApproveEventRuntimeClaimCallableResponse} from
  "../shared/generated/approveEventRuntimeClaimCallableResponse";
import type {ClaimEventRuntimeAccessCallablePayload} from
  "../shared/generated/claimEventRuntimeAccessCallablePayload";
import type {ClaimEventRuntimeAccessCallableResponse} from
  "../shared/generated/claimEventRuntimeAccessCallableResponse";
import type {CheckInEventRuntimeCallablePayload} from
  "../shared/generated/checkInEventRuntimeCallablePayload";
import type {CheckInEventRuntimeCallableResponse} from
  "../shared/generated/checkInEventRuntimeCallableResponse";
import type {GetEventRuntimeBootstrapCallablePayload} from
  "../shared/generated/getEventRuntimeBootstrapCallablePayload";
import type {GetEventRuntimeBootstrapCallableResponse} from
  "../shared/generated/getEventRuntimeBootstrapCallableResponse";
import type {SubmitEventRuntimeProfileCallablePayload} from
  "../shared/generated/submitEventRuntimeProfileCallablePayload";
import type {SubmitEventRuntimeProfileCallableResponse} from
  "../shared/generated/submitEventRuntimeProfileCallableResponse";
import {
  validateApproveEventRuntimeClaimCallablePayload,
} from "../shared/generated/validators/approveEventRuntimeClaimInput";
import {
  validateClaimEventRuntimeAccessCallablePayload,
} from "../shared/generated/validators/claimEventRuntimeAccessInput";
import {
  validateCheckInEventRuntimeCallablePayload,
} from "../shared/generated/validators/checkInEventRuntimeInput";
import {
  validateGetEventRuntimeBootstrapCallablePayload,
} from "../shared/generated/validators/getEventRuntimeBootstrapInput";
import {
  validateSubmitEventRuntimeProfileCallablePayload,
} from
  "../shared/generated/validators/submitEventRuntimeProfileInput";
import {
  eventOrganizerRef,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {requireEventOperatorPermission} from
  "../shared/eventOperatorAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  eventAttendeeId,
  normalizeRosterPhone,
  onboardingDraftSeed,
} from "../events/eventAttendees";
import {resolveInviteAttributionToken} from "../events/inviteLinks";
import {readSeatMigrationWriterFence} from
  "../events/seatMigrationPaged";
import {FirestoreSeatIdentityAuthority, prepareCatchUidSeatIdentity,
  prepareVerifiedUidAttendeeEnrollment, seatIdentityAliasId,
  seatIdentityValueHash} from "../events/seatIdentityAuthority";
import {applyFirestoreSeat, assertCurrentReadySeatSnapshot,
  FirestoreSeatTransaction,
  prepareFirestoreSeat} from "../events/seatAuthority/firestoreAdapter";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {requireRuntimeVenueEvent,
  type RuntimeVenueEventDocument} from "../events/configuredEvent";
import {
  assertEventCheckInWindow,
  eventVenueSessionRedemptionDocument,
  eventVenueSessionRedemptionId,
  eventVenueSessionSigningKey,
  rejectVenueSessionReplay,
  requireEventVenueSessionDocument,
  verifyEventVenueSessionToken,
} from "../events/venueSessions";
import {eventSuccessPrimitivesFor} from "./formatPrimitives";
import {
  organizerEventSuccessLayoutDocumentId,
  publicEventSuccessLayout,
} from "./spatialLayout";
import {
  completedRuntimeFieldIds,
  optionalRuntimeFieldIds,
  preEventRuntimeFieldId,
  requiredRuntimeFieldIds,
  runtimeAccessStatus,
  type RuntimeFieldId,
  type RuntimeProfile,
} from "./runtimeProfile";
import {readRuntimeDataRequestProjection, reconcileRuntimeDataRequest} from
  "./operations/runtimeRequiredDataStore";
export {
  completedRuntimeFieldIds,
  optionalRuntimeFieldIds,
  preEventRuntimeFieldId,
  requiredRuntimeFieldIds,
} from "./runtimeProfile";

interface EventRuntimeDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  timestamp: () => FirebaseFirestore.Timestamp;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  verifyVenueSessionToken?: typeof verifyEventVenueSessionToken;
}

const defaultDeps: EventRuntimeDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  timestamp: () => admin.firestore.Timestamp.now(),
  timestampFromMillis: (millis) =>
    admin.firestore.Timestamp.fromMillis(millis),
  verifyVenueSessionToken: verifyEventVenueSessionToken,
};

/** Returns the bounded public event projection and the caller's own state. */
export async function getEventRuntimeBootstrapHandler(
  request: CallableRequest<unknown>,
  deps: EventRuntimeDeps = defaultDeps
): Promise<GetEventRuntimeBootstrapCallableResponse> {
  const payload = validateCallableWithAjv<
    GetEventRuntimeBootstrapCallablePayload
  >(
    request,
    validateGetEventRuntimeBootstrapCallablePayload,
    normalizeRuntimeIdPayload
  );
  const db = deps.firestore();
  const rateLimitIdentity = request.auth?.uid ??
    `runtime_${sha256(payload.publicRuntimeId).slice(0, 40)}`;
  await deps.checkRateLimit(
    db,
    rateLimitIdentity,
    "getEventRuntimeBootstrap",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  const resolved = await resolveRuntimeEvent(db, payload.publicRuntimeId);
  const participantRef = request.auth ? db
    .collection("eventRuntimeParticipants")
    .doc(eventRuntimeParticipantId(resolved.eventId, request.auth.uid)) : null;
  const now = deps.timestamp();
  const [participantSnap, planSnap, livePositions] = await Promise.all([
    participantRef ? participantRef.get() : Promise.resolve(null),
    db.collection("eventSuccessPlans").doc(resolved.eventId).get(),
    publicLivePositions(db, resolved.event, resolved.eventId, now),
  ]);
  const plan = planSnap.exists ? requireDoc<EventSuccessPlanDocument>(
    planSnap,
    "EventSuccessPlanDocument"
  ) : null;
  let participant = participantSnap?.exists ?
    requireRuntimeParticipant(
      participantSnap,
      resolved.eventId,
      request.auth!.uid
    ) : null;
  if (participant && participantRef) {
    participant = await reconcileRuntimeParticipantRequirements({
      participant,
      participantRef,
      requiredFieldIds: requiredRuntimeFieldIds(resolved.event, plan),
      now,
    });
  }
  const requiredDataRequest = participant?.eventAttendeeId ?
    await readRuntimeDataRequestProjection({db,
      context: {mode: "live", eventId: resolved.eventId,
        organizerId: resolved.event.organizerId},
      attendeeId: participant.eventAttendeeId, uid: participant.uid,
      completedFieldIds: participant.completedFieldIds,
      now: now.toMillis()}) : null;
  let attendeeStatus: EventAttendeeDocument["status"] | null = null;
  if (participant?.eventAttendeeId) {
    const attendeeSnap = await db
      .collection("eventAttendees")
      .doc(participant.eventAttendeeId)
      .get();
    if (attendeeSnap.exists) {
      const attendee = requireDoc<EventAttendeeDocument>(
        attendeeSnap,
        "EventAttendeeDocument"
      );
      if (attendee.eventId === resolved.eventId) {
        attendeeStatus = attendee.status;
      }
    }
  }
  const layout = participant?.accessStatus === "ready" ?
    await runtimeSpatialLayout(db, resolved.event, plan) : null;
  return {
    event: publicRuntimeEventProjection(
      resolved.event,
      resolved.eventId,
      payload.publicRuntimeId,
      plan,
      layout,
      participant?.accessStatus === "ready" ? livePositions : [],
      now.toMillis()
    ),
    participant: participant ? {
      eventAttendeeId: participant.eventAttendeeId,
      accessStatus: participant.accessStatus,
      attendanceStatus: attendeeStatus,
      eventId: resolved.eventId,
      organizerId: participant.organizerId,
      requiredFieldIds: participant.requiredFieldIds,
      completedFieldIds: participant.completedFieldIds,
      requiredDataRequest: requiredDataRequest ? {
        revision: requiredDataRequest.revision,
        fieldIds: requiredDataRequest.fieldIds,
        completedFieldIds: requiredDataRequest.completedFieldIds,
        status: requiredDataRequest.status,
        requestedAtMillis: requiredDataRequest.requestedAt,
        expiresAtMillis: requiredDataRequest.expiresAt,
        completedAtMillis: requiredDataRequest.completedAt,
      } : null,
      runtimeProfile: runtimeProfileResponse(participant.runtimeProfile),
    } : null,
  };
}

/** Claims a matching roster row, or opens the configured walk-in flow. */
export async function claimEventRuntimeAccessHandler(
  request: CallableRequest<unknown>,
  deps: EventRuntimeDeps = defaultDeps
): Promise<ClaimEventRuntimeAccessCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<
    ClaimEventRuntimeAccessCallablePayload
  >(
    request,
    validateClaimEventRuntimeAccessCallablePayload,
    normalizeClaimPayload
  );
  const phone = verifiedPhone(request);
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "claimEventRuntimeAccess", {
    maxRequests: 10, windowMs: 60 * 60 * 1000,
  });
  const resolved = await resolveRuntimeEvent(db, payload.publicRuntimeId);
  const inviteAttribution = await resolveInviteAttributionToken({
    db,
    eventId: resolved.eventId,
    inviteToken: payload.inviteToken,
  });
  requireRuntimeTerms(resolved.event, payload.runtimeTermsVersion);

  const participantRef = db.collection("eventRuntimeParticipants")
    .doc(eventRuntimeParticipantId(resolved.eventId, uid));
  const requestRef = db.collection("eventRuntimeClaimRequests")
    .doc(eventRuntimeParticipantId(resolved.eventId, uid));
  const exactAttendeeId = eventAttendeeId(
    resolved.eventId,
    `phone:${phone}`
  );
  const attendeeRef = db.collection("eventAttendees").doc(exactAttendeeId);
  const planRef = db.collection("eventSuccessPlans").doc(resolved.eventId);
  const eventRef = db.collection("events").doc(resolved.eventId);

  return db.runTransaction(async (tx) => {
    const [eventSnap, participantSnap, planSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(participantRef),
      tx.get(planRef),
    ]);
    const currentEvent = requireRuntimeVenueEvent(
      requireDoc<EventDocument>(eventSnap, "EventDocument"));
    if (currentEvent.status !== "active" ||
        currentEvent.runtimeAccess?.enabled !== true ||
        currentEvent.runtimeAccess.publicRuntimeId !==
          payload.publicRuntimeId) {
      throw new HttpsError("failed-precondition",
        "Event runtime access changed.");
    }
    requireRuntimeTerms(currentEvent, payload.runtimeTermsVersion);
    const seatMode = await readSeatMigrationWriterFence({db, tx,
      eventId: resolved.eventId});
    const phoneMatches = seatMode === "ready" ? await tx.get(db
      .collection("eventAttendees")
      .where("eventId", "==", resolved.eventId)
      .where("phoneE164", "==", phone).limit(2)) : null;
    if (phoneMatches && phoneMatches.size > 1) {
      throw new HttpsError("failed-precondition",
        "Verified phone matches multiple guest records.");
    }
    const selectedAttendeeRef = phoneMatches?.docs[0]?.ref ?? attendeeRef;
    const attendeeSnap = await tx.get(selectedAttendeeRef);
    if (participantSnap.exists) {
      const participant = requireRuntimeParticipant(
        participantSnap,
        resolved.eventId,
        uid
      );
      if (participant.accessStatus !== "revoked") {
        if (seatMode === "ready" &&
            participant.accessStatus !== "pendingApproval") {
          if (!participant.eventAttendeeId) {
            throw new HttpsError("failed-precondition",
              "Runtime guest seat is unavailable.");
          }
          const currentAttendee = (await tx.get(db
            .collection("eventAttendees")
            .doc(participant.eventAttendeeId))).data();
          const checked = await prepareCatchUidSeatIdentity({db, tx,
            eventId: resolved.eventId,
            organizerId: currentEvent.organizerId,
            uid, currentAuthPhoneNumber: phone});
          const seats = new FirestoreSeatTransaction(db, tx);
          const [ledger, reservation] = await Promise.all([
            seats.ledger(resolved.eventId),
            seats.reservation(resolved.eventId, checked.identity.key),
          ]);
          requireRuntimeSeatSnapshot({event: currentEvent,
            eventId: resolved.eventId,
            organizerId: currentEvent.organizerId,
            identity: checked.identity, ledger, reservation,
            expectedActive: true});
          if (!currentAttendee || currentAttendee.eventId !==
              resolved.eventId || currentAttendee.linkedUid !== uid ||
              !["registered", "checkedIn"].includes(
                currentAttendee.status)) {
            throw new HttpsError("failed-precondition",
              "Runtime guest seat is unavailable.");
          }
        }
        return claimResponse(participant);
      }
    }

    const plan = planSnap.exists ? requireDoc<EventSuccessPlanDocument>(
      planSnap,
      "EventSuccessPlanDocument"
    ) : null;
    const requiredFieldIds = requiredRuntimeFieldIds(currentEvent, plan);
    const now = deps.timestamp();
    let attendee = attendeeSnap.exists ? requireDoc<EventAttendeeDocument>(
      attendeeSnap,
      "EventAttendeeDocument"
    ) : null;
    if (attendee && attendee.eventId !== resolved.eventId) {
      throw new HttpsError("internal", "Roster identity is inconsistent.");
    }
    if (attendee?.linkedUid && attendee.linkedUid !== uid) {
      throw new HttpsError(
        "permission-denied",
        "This ticket has already been claimed. Ask the Host for help."
      );
    }
    if (attendee?.status === "cancelled") {
      throw new HttpsError(
        "failed-precondition",
        "This attendee registration is cancelled."
      );
    }

    const walkInPolicy = currentEvent.runtimeAccess!.walkInPolicy;
    if (!attendee && walkInPolicy === "deny") {
      const currentParticipation = seatMode === "ready" ? await tx.get(db
        .collection("eventParticipations")
        .doc(eventParticipationId(resolved.eventId, uid))) : null;
      const current = currentParticipation?.data();
      const organizerId = currentEvent.organizerId;
      if (!current || current.eventId !== resolved.eventId ||
          current.uid !== uid ||
          (current.organizerId) !== organizerId ||
          current.organizerId !== undefined &&
              current.organizerId !== organizerId ||
          current.organizerId !== undefined &&
            current.organizerId !== organizerId ||
          current.status !== "signedUp" &&
          current.status !== "attended") {
        throw new HttpsError(
          "permission-denied",
          "We could not match this verified number to the Host's guest list."
        );
      }
    }

    let applyIdentity: () => void = () => undefined;
    let applySeat: () => void = () => undefined;
    let nextBookedCount: number | null = null;
    let createAttendeeAlias: (() => void) | null = null;
    let seatAlreadyActive = false;
    if (seatMode === "ready") {
      const organizerId = currentEvent.organizerId;
      const enrolled = attendee && attendee.source !== "catchBooking" ?
        await prepareVerifiedUidAttendeeEnrollment({db, tx,
          eventId: resolved.eventId, organizerId,
          attendeeId: selectedAttendeeRef.id, uid,
          authTokenPhoneNumber: phone, now}) :
        await prepareCatchUidSeatIdentity({db, tx,
          eventId: resolved.eventId, organizerId, uid,
          currentAuthPhoneNumber: phone});
      const identity = enrolled.identity;
      applyIdentity = enrolled.apply;
      const seats = new FirestoreSeatTransaction(db, tx);
      const [ledger, reservation] = await Promise.all([
        seats.ledger(resolved.eventId),
        seats.reservation(resolved.eventId, identity.key),
      ]);
      requireRuntimeSeatSnapshot({event: currentEvent,
        eventId: resolved.eventId, organizerId, identity, ledger,
        reservation});
      seatAlreadyActive = reservation?.active === true;
      if (attendee && (reservation?.active === true) !==
            (attendee.status === "registered" ||
              attendee.status === "checkedIn")) {
        throw new HttpsError("failed-precondition",
          "Runtime guest and seat authority disagree.");
      }
      if (!attendee) {
        const aliasRef = db.collection("eventSeatIdentityAliases")
          .doc(seatIdentityAliasId(resolved.eventId, "attendee",
            exactAttendeeId));
        const aliasSnap = await tx.get(aliasRef);
        if (aliasSnap.exists) {
          throw new HttpsError("failed-precondition",
            "Runtime guest identity already exists.");
        }
        createAttendeeAlias = () => tx.create(aliasRef, {
          eventId: resolved.eventId, organizerId, kind: "attendee",
          valueHash: seatIdentityValueHash("attendee", exactAttendeeId),
          canonicalKey: identity.key, identityRevision: identity.revision,
          migrationRevision: ledger!.migrationRevision, state: "ready",
        });
      }
      const shouldReserve = walkInPolicy === "autoCreate" &&
        (!attendee || attendee.status === "invited" ||
          attendee.status === "waitlisted");
      if (shouldReserve && !reservation?.active) {
        const prepared = await prepareFirestoreSeat({db, tx,
          identityAuthority: {resolve: async () => identity},
          command: {eventId: resolved.eventId,
            subject: {kind: "verifiedUid", uid}, operation: "reserve",
            requestId: `runtime_${sha256(`${uid}_${
              reservation?.revision ?? 0}`).slice(0, 48)}`,
            expectedLedgerRevision: ledger!.revision,
            expectedCapacityRevision: ledger!.capacityRevision,
            expectedMigrationRevision: ledger!.migrationRevision,
            expectedReservationRevision: reservation?.revision ?? 0,
            nowMillis: now.toMillis()},
        });
        applySeat = () => {
          applyFirestoreSeat(prepared);
        };
        nextBookedCount = prepared.plan.ledger!.occupied;
      } else if (!attendee && reservation?.active) {
        const participation = await tx.get(db.collection("eventParticipations")
          .doc(eventParticipationId(resolved.eventId, uid)));
        const current = participation.data();
        if (!current || current.eventId !== resolved.eventId ||
            current.uid !== uid ||
            (current.organizerId) !== organizerId ||
            current.organizerId !== undefined &&
                current.organizerId !== organizerId ||
            current.organizerId !== undefined &&
              current.organizerId !== organizerId ||
            current.status !== "signedUp" &&
            current.status !== "attended") {
          throw new HttpsError("failed-precondition",
            "Existing seat has no current Catch participation.");
        }
      }
    }
    applyIdentity();
    createAttendeeAlias?.();
    applySeat();
    if (nextBookedCount !== null) {
      tx.update(eventRef, {bookedCount: nextBookedCount, updatedAt: now});
    }
    if (!attendee) {
      attendee = runtimeAttendeeDocument({
        event: currentEvent,
        eventId: resolved.eventId,
        uid: seatMode === "ready" || walkInPolicy === "autoCreate" ?
          uid : null,
        displayName: payload.displayName,
        phone,
        source: seatAlreadyActive ? "catchBooking" : "webOtp",
        status: walkInPolicy === "autoCreate" || seatAlreadyActive ?
          "registered" : "invited",
        inviteLinkId: inviteAttribution?.inviteLinkId ?? null,
        now,
      });
      tx.create(selectedAttendeeRef, attendee);
    } else {
      tx.update(selectedAttendeeRef, {
        linkedUid: uid,
        linkedAt: attendee.linkedAt ?? now,
        ...(seatMode === "ready" && walkInPolicy === "autoCreate" &&
          (attendee.status === "invited" ||
            attendee.status === "waitlisted") ? {
            status: "registered", registeredAt: attendee.registeredAt ?? now,
          } : {}),
        ...(attendee.inviteLinkId || !inviteAttribution ? {} : {
          inviteLinkId: inviteAttribution.inviteLinkId,
          inviteCapturedAt: now,
        }),
        updatedAt: now,
      });
      attendee = {...attendee, linkedUid: uid};
    }

    const needsApproval = walkInPolicy === "hostApproval" &&
      !seatAlreadyActive && (!attendeeSnap.exists ||
        seatMode === "ready" && (attendee.status === "invited" ||
          attendee.status === "waitlisted"));
    const profile = emptyRuntimeProfile(payload.displayName);
    const completedFieldIds = completedRuntimeFieldIds(profile);
    const accessStatus = needsApproval ? "pendingApproval" :
      runtimeAccessStatus(requiredFieldIds, completedFieldIds);
    const participant: EventRuntimeParticipantDocument = {
      eventId: resolved.eventId,
      organizerId: resolved.event.organizerId,
      uid,
      eventAttendeeId: selectedAttendeeRef.id,
      identityVersion: 1,
      claimMethod: "verifiedPhone",
      accessStatus,
      requiredFieldIds,
      completedFieldIds,
      profileRevision: 0,
      runtimeProfile: profile,
      consents: {
        runtimeTermsVersion: payload.runtimeTermsVersion,
        sensitiveDataTermsVersion: null,
        saveAsCatchPrefill: false,
      },
      claimedAt: now,
      readyAt: accessStatus === "ready" ? now : null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    tx.set(participantRef, participant);
    if (needsApproval) {
      const claimRequest: EventRuntimeClaimRequestDocument = {
        eventId: resolved.eventId,
        organizerId: resolved.event.organizerId,
        uid,
        displayName: payload.displayName,
        phoneLastFour: phone.slice(-4),
        candidateAttendeeIds: [selectedAttendeeRef.id],
        status: "pending",
        reviewedBy: null,
        reviewReason: null,
        createdAt: now,
        updatedAt: now,
        reviewedAt: null,
      };
      tx.set(requestRef, claimRequest);
    }
    return claimResponse(participant);
  });
}

/** Saves the plan-derived event profile and optional private prefill. */
export async function submitEventRuntimeProfileHandler(
  request: CallableRequest<unknown>,
  deps: EventRuntimeDeps = defaultDeps
): Promise<SubmitEventRuntimeProfileCallableResponse> {
  const uid = requireAuth(request);
  const phone = verifiedPhone(request);
  const payload = validateCallableWithAjv<
    SubmitEventRuntimeProfileCallablePayload
  >(
    request,
    validateSubmitEventRuntimeProfileCallablePayload,
    normalizeProfilePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "submitEventRuntimeProfile", {
    maxRequests: 30, windowMs: 60 * 60 * 1000,
  });
  const resolved = await resolveRuntimeEvent(db, payload.publicRuntimeId);
  requireRuntimeTerms(resolved.event, payload.runtimeTermsVersion);
  const participantRef = db.collection("eventRuntimeParticipants")
    .doc(eventRuntimeParticipantId(resolved.eventId, uid));
  const planRef = db.collection("eventSuccessPlans").doc(resolved.eventId);
  const draftRef = db.collection("onboarding_drafts").doc(uid);
  const userRef = db.collection("users").doc(uid);

  return db.runTransaction(async (tx) => {
    const [participantSnap, planSnap, draftSnap, userSnap] = await Promise.all([
      tx.get(participantRef),
      tx.get(planRef),
      tx.get(draftRef),
      tx.get(userRef),
    ]);
    const participant = requireRuntimeParticipant(
      participantSnap,
      resolved.eventId,
      uid
    );
    if (participant.accessStatus === "pendingApproval") {
      throw new HttpsError(
        "failed-precondition",
        "The Host must approve this guest-list request first."
      );
    }
    if (participant.accessStatus === "revoked") {
      throw new HttpsError("permission-denied", "Runtime access was revoked.");
    }
    const plan = planSnap.exists ? requireDoc<EventSuccessPlanDocument>(
      planSnap,
      "EventSuccessPlanDocument"
    ) : null;
    const requiredFieldIds = requiredRuntimeFieldIds(resolved.event, plan);
    assertFormatProfilePayload(resolved.event, payload.fields);
    const profile = mergeRuntimeProfile(
      participant.runtimeProfile,
      payload.fields,
      deps.timestampFromMillis
    );
    const completedFieldIds = completedRuntimeFieldIds(profile);
    const accessStatus = runtimeAccessStatus(
      requiredFieldIds,
      completedFieldIds
    );
    if (completedFieldIds.some((field) =>
      isSensitiveRuntimeField(field)) &&
      !payload.sensitiveDataTermsVersion &&
      !participant.consents.sensitiveDataTermsVersion) {
      throw new HttpsError(
        "failed-precondition",
        "Accept the sensitive-data notice before submitting these answers."
      );
    }
    const now = deps.timestamp();
    if (participant.eventAttendeeId) {
      await reconcileRuntimeDataRequest({db, tx,
        context: {mode: "live", eventId: resolved.eventId,
          organizerId: resolved.event.organizerId},
        attendeeId: participant.eventAttendeeId, uid,
        completedFieldIds, now});
    }
    if (profile.questionnaireAnswerIds.length > 0) {
      const responseRef = db.collection("eventSuccessCompatibilityResponses")
        .doc(eventRuntimeParticipantId(resolved.eventId, uid));
      const response: EventSuccessCompatibilityResponseDocument = {
        eventId: resolved.eventId,
        organizerId: participant.organizerId,
        uid,
        answerIds: profile.questionnaireAnswerIds,
        createdAt: participant.claimedAt,
        updatedAt: now,
      };
      tx.set(responseRef, response, {merge: true});
    }
    if (profile.teamName && participant.eventAttendeeId) {
      tx.update(db.collection("eventAttendees").doc(
        participant.eventAttendeeId
      ), {
        arrivalGroup: profile.teamName,
        updatedAt: now,
      });
    }
    tx.update(participantRef, {
      requiredFieldIds,
      completedFieldIds,
      profileRevision: (participant.profileRevision ?? 0) + 1,
      runtimeProfile: profile,
      accessStatus,
      consents: {
        runtimeTermsVersion: payload.runtimeTermsVersion,
        sensitiveDataTermsVersion: payload.sensitiveDataTermsVersion ??
          participant.consents.sensitiveDataTermsVersion,
        saveAsCatchPrefill: payload.saveAsCatchPrefill,
      },
      readyAt: accessStatus === "ready" ? participant.readyAt ?? now : null,
      updatedAt: now,
    });
    if (payload.saveAsCatchPrefill && !userSnap.exists) {
      const existingDraft = draftSnap.exists ?
        draftSnap.data() as OnboardingDraftDocument : null;
      tx.set(
        draftRef,
        onboardingPrefillPatch(existingDraft, profile, phone),
        {merge: true}
      );
    }
    return {status: accessStatus, requiredFieldIds, completedFieldIds};
  });
}

/** Checks a ready runtime identity into its linked operational attendee. */
export async function checkInEventRuntimeHandler(
  request: CallableRequest<unknown>,
  deps: EventRuntimeDeps = defaultDeps
): Promise<CheckInEventRuntimeCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<CheckInEventRuntimeCallablePayload>(
    request,
    validateCheckInEventRuntimeCallablePayload,
    normalizeRuntimeIdPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "checkInEventRuntime", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const resolved = await resolveRuntimeEvent(db, payload.publicRuntimeId);
  const now = deps.timestamp();
  const claims = (deps.verifyVenueSessionToken ??
    verifyEventVenueSessionToken)({
    token: payload.venueSessionToken,
    eventId: resolved.eventId,
    nowMillis: now.toMillis(),
  });
  const participantRef = db.collection("eventRuntimeParticipants")
    .doc(eventRuntimeParticipantId(resolved.eventId, uid));
  const eventRef = db.collection("events").doc(resolved.eventId);
  const sessionRef = db.collection("eventVenueSessions")
    .doc(claims.sessionId);
  const redemptionRef = db.collection("eventVenueSessionRedemptions")
    .doc(eventVenueSessionRedemptionId({
      eventId: resolved.eventId,
      sessionId: claims.sessionId,
      uid,
    }));

  return db.runTransaction(async (tx) => {
    const [participantSnap, eventSnap, sessionSnap, redemptionSnap] =
      await Promise.all([
        tx.get(participantRef),
        tx.get(eventRef),
        tx.get(sessionRef),
        tx.get(redemptionRef),
      ]);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = requireRuntimeVenueEvent(
      requireDoc<EventDocument>(eventSnap, "EventDocument"));
    const seatMode = await readSeatMigrationWriterFence({db, tx,
      eventId: resolved.eventId});
    const participant = requireRuntimeParticipant(
      participantSnap,
      resolved.eventId,
      uid
    );
    if (participant.accessStatus !== "ready" || !participant.eventAttendeeId) {
      throw new HttpsError(
        "failed-precondition",
        "Finish the event profile before checking in."
      );
    }
    const attendeeRef = db.collection("eventAttendees")
      .doc(participant.eventAttendeeId);
    const attendeeSnap = await tx.get(attendeeRef);
    if (!attendeeSnap.exists) {
      throw new HttpsError("not-found", "Guest-list entry not found.");
    }
    const attendee = requireDoc<EventAttendeeDocument>(
      attendeeSnap,
      "EventAttendeeDocument"
    );
    if (
      attendee.eventId !== resolved.eventId ||
      attendee.linkedUid !== uid ||
      (attendee.status !== "registered" &&
        attendee.status !== "checkedIn")
    ) {
      throw new HttpsError(
        "failed-precondition",
        "This guest-list entry cannot be checked in."
      );
    }
    if (seatMode === "ready") {
      const identity = await new FirestoreSeatIdentityAuthority().resolve({
        db, tx, eventId: resolved.eventId,
        organizerId: event.organizerId,
        subject: attendee.source === "catchBooking" ?
          {kind: "verifiedUid", uid} :
          {kind: "importAttendee",
            attendeeId: participant.eventAttendeeId},
      });
      if (!identity) {
        throw new HttpsError("failed-precondition",
          "Guest check-in has no current reserved seat.");
      }
      const seats = new FirestoreSeatTransaction(db, tx);
      const [ledger, reservation] = await Promise.all([
        seats.ledger(resolved.eventId),
        seats.reservation(resolved.eventId, identity.key),
      ]);
      requireRuntimeSeatSnapshot({event, eventId: resolved.eventId,
        organizerId: event.organizerId, identity,
        ledger, reservation, expectedActive: true});
    }
    rejectVenueSessionReplay(redemptionSnap);
    if (attendee.status === "checkedIn") {
      return {status: "checkedIn", alreadyCheckedIn: true};
    }
    assertEventCheckInWindow(event, now.toMillis());
    requireEventVenueSessionDocument(sessionSnap, claims, now.toMillis());
    tx.create(redemptionRef, eventVenueSessionRedemptionDocument({
      claims,
      uid,
      purpose: "attendance",
      now,
      retentionBaseMillis: now.toMillis(),
    }));
    tx.update(attendeeRef, {
      status: "checkedIn",
      checkedInAt: now,
      checkedInBy: uid,
      attendanceRevision: (attendee.attendanceRevision ?? 0) + 1,
      preCheckInStatus: attendee.status,
      updatedAt: now,
    });
    tx.update(eventRef, {
      checkedInCount: admin.firestore.FieldValue.increment(1),
      updatedAt: now,
    });
    return {status: "checkedIn", alreadyCheckedIn: false};
  });
}

/** Lets an organizer manager approve or reject a pending claim. */
export async function approveEventRuntimeClaimHandler(
  request: CallableRequest<unknown>,
  deps: EventRuntimeDeps = defaultDeps
): Promise<ApproveEventRuntimeClaimCallableResponse> {
  const hostUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    ApproveEventRuntimeClaimCallablePayload
  >(
    request,
    validateApproveEventRuntimeClaimCallablePayload,
    normalizeApprovalPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, hostUid, "approveEventRuntimeClaim", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const eventRef = db.collection("events").doc(payload.eventId);
  const participantId = eventRuntimeParticipantId(payload.eventId, payload.uid);
  const participantRef = db.collection("eventRuntimeParticipants")
    .doc(participantId);
  const claimRef = db.collection("eventRuntimeClaimRequests")
    .doc(participantId);

  return db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = requireRuntimeVenueEvent(
      requireDoc<EventDocument>(eventSnap, "EventDocument"));
    const organizerSnap = await tx.get(eventOrganizerRef(db, event));
    const organizer = requireEventOrganizer(organizerSnap, event);
    await requireEventOperatorPermission({
      db,
      organizer,
      event,
      eventId: payload.eventId,
      actorUid: hostUid,
      permission: "reviewRuntimeClaims",
      now: deps.timestamp(),
      transaction: tx,
    });
    const [participantSnap, claimSnap] = await Promise.all([
      tx.get(participantRef),
      tx.get(claimRef),
    ]);
    const participant = requireRuntimeParticipant(
      participantSnap,
      payload.eventId,
      payload.uid
    );
    if (!claimSnap.exists) {
      throw new HttpsError("not-found", "Runtime claim not found.");
    }
    const claim = requireDoc<EventRuntimeClaimRequestDocument>(
      claimSnap,
      "EventRuntimeClaimRequestDocument"
    );
    if (claim.status !== "pending" ||
        participant.accessStatus !== "pendingApproval") {
      throw new HttpsError(
        "failed-precondition",
        "This runtime claim has already been reviewed."
      );
    }
    const seatMode = await readSeatMigrationWriterFence({db, tx,
      eventId: payload.eventId});
    const now = deps.timestamp();
    if (payload.decision === "reject") {
      tx.update(claimRef, {
        status: "rejected",
        reviewedBy: hostUid,
        reviewReason: payload.reason ?? null,
        reviewedAt: now,
        updatedAt: now,
      });
      tx.update(participantRef, {
        accessStatus: "revoked",
        revokedAt: now,
        updatedAt: now,
      });
      return {status: "rejected"};
    }

    const attendeeId = payload.attendeeId ?? participant.eventAttendeeId;
    if (!attendeeId || !claim.candidateAttendeeIds.includes(attendeeId)) {
      throw new HttpsError(
        "invalid-argument",
        "Choose one of this claim's event-scoped attendee records."
      );
    }
    const attendeeRef = db.collection("eventAttendees").doc(attendeeId);
    const attendeeSnap = await tx.get(attendeeRef);
    if (!attendeeSnap.exists) {
      throw new HttpsError("not-found", "Attendee not found.");
    }
    const attendee = requireDoc<EventAttendeeDocument>(
      attendeeSnap,
      "EventAttendeeDocument"
    );
    if (attendee.eventId !== payload.eventId ||
        attendee.status === "cancelled" ||
        (attendee.linkedUid && attendee.linkedUid !== payload.uid)) {
      throw new HttpsError(
        "failed-precondition",
        "This attendee cannot be linked to the claim."
      );
    }
    const accessStatus = runtimeAccessStatus(
      participant.requiredFieldIds,
      participant.completedFieldIds
    );
    let applySeat: () => void = () => undefined;
    let nextBookedCount: number | null = null;
    if (seatMode === "ready") {
      const organizerId = event.organizerId;
      const identities = new FirestoreSeatIdentityAuthority();
      const [verified, imported] = await Promise.all([
        identities.resolve({db, tx, eventId: payload.eventId,
          organizerId, subject: {kind: "verifiedUid", uid: payload.uid}}),
        identities.resolve({db, tx, eventId: payload.eventId,
          organizerId, subject: {kind: "importAttendee", attendeeId}}),
      ]);
      if (!verified || !imported || verified.key !== imported.key ||
          verified.revision !== imported.revision) {
        throw new HttpsError("failed-precondition",
          "Claim identity and guest seat disagree.");
      }
      const seats = new FirestoreSeatTransaction(db, tx);
      const [ledger, reservation] = await Promise.all([
        seats.ledger(payload.eventId),
        seats.reservation(payload.eventId, verified.key),
      ]);
      const wasActive = attendee.status === "registered" ||
        attendee.status === "checkedIn";
      requireRuntimeSeatSnapshot({event, eventId: payload.eventId,
        organizerId, identity: verified, ledger, reservation,
        expectedActive: wasActive});
      if (!wasActive) {
        const prepared = await prepareFirestoreSeat({db, tx,
          identityAuthority: {resolve: async () => verified},
          command: {eventId: payload.eventId,
            subject: {kind: "verifiedUid", uid: payload.uid},
            operation: "reserve",
            requestId: `runtime_approve_${sha256(`${payload.uid}_${
              attendeeId}_${reservation?.revision ?? 0}`).slice(0, 48)}`,
            expectedLedgerRevision: ledger!.revision,
            expectedCapacityRevision: ledger!.capacityRevision,
            expectedMigrationRevision: ledger!.migrationRevision,
            expectedReservationRevision: reservation?.revision ?? 0,
            nowMillis: now.toMillis()},
        });
        applySeat = () => {
          applyFirestoreSeat(prepared);
        };
        nextBookedCount = prepared.plan.ledger!.occupied;
      }
    }
    applySeat();
    if (nextBookedCount !== null) {
      tx.update(eventRef, {bookedCount: nextBookedCount, updatedAt: now});
    }
    tx.update(attendeeRef, {
      linkedUid: payload.uid,
      linkedAt: attendee.linkedAt ?? now,
      status: attendee.status === "invited" ||
        seatMode === "ready" && attendee.status === "waitlisted" ?
        "registered" : attendee.status,
      registeredAt: attendee.registeredAt ?? now,
      attendanceRevision: attendee.attendanceRevision ?? 0,
      preCheckInStatus: attendee.preCheckInStatus ?? null,
      updatedAt: now,
    });
    tx.update(participantRef, {
      eventAttendeeId: attendeeId,
      claimMethod: "hostApproval",
      accessStatus,
      readyAt: accessStatus === "ready" ? now : null,
      updatedAt: now,
    });
    tx.update(claimRef, {
      status: "approved",
      reviewedBy: hostUid,
      reviewReason: payload.reason ?? null,
      reviewedAt: now,
      updatedAt: now,
    });
    return {status: "approved"};
  });
}

export function eventRuntimeParticipantId(
  eventId: string,
  uid: string
): string {
  return `${eventId}_${uid}`;
}

function requireRuntimeSeatSnapshot(
  params: Parameters<typeof assertCurrentReadySeatSnapshot>[0]
): void {
  try {
    assertCurrentReadySeatSnapshot(params);
  } catch {
    throw new HttpsError("failed-precondition",
      "Runtime guest and seat authority disagree.");
  }
}

async function resolveRuntimeEvent(
  db: FirebaseFirestore.Firestore,
  publicRuntimeId: string
): Promise<{eventId: string; event: RuntimeVenueEventDocument}> {
  const snapshot = await db.collection("events")
    .where("runtimeAccess.publicRuntimeId", "==", publicRuntimeId)
    .limit(2)
    .get();
  if (snapshot.empty) {
    throw new HttpsError("not-found", "Event runtime not found.");
  }
  if (snapshot.size !== 1) {
    throw new HttpsError("internal", "Event runtime identity is not unique.");
  }
  const eventSnap = snapshot.docs[0];
  const event = requireRuntimeVenueEvent(
    requireDoc<EventDocument>(eventSnap, "EventDocument"));
  if (
    event.status === "cancelled" ||
    event.runtimeAccess?.enabled !== true ||
    event.runtimeAccess.publicRuntimeId !== publicRuntimeId
  ) {
    throw new HttpsError("not-found", "Event runtime not found.");
  }
  return {eventId: eventSnap.id, event};
}

function verifiedPhone(request: CallableRequest<unknown>): string {
  const rawPhone = request.auth?.token.phone_number;
  const result = normalizeRosterPhone(
    typeof rawPhone === "string" ? rawPhone : null
  );
  if (!result.value) {
    throw new HttpsError(
      "failed-precondition",
      "Verify a phone number before joining this event."
    );
  }
  return result.value;
}

function requireRuntimeTerms(event: EventDocument, termsVersion: string): void {
  if (event.runtimeAccess?.termsVersion !== termsVersion) {
    throw new HttpsError(
      "failed-precondition",
      "Review the latest Event Success runtime terms."
    );
  }
}

function requireRuntimeParticipant(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  eventId: string,
  uid: string
): EventRuntimeParticipantDocument {
  if (!snapshot.exists) {
    throw new HttpsError(
      "failed-precondition",
      "Claim this event before continuing."
    );
  }
  const participant = requireDoc<EventRuntimeParticipantDocument>(
    snapshot,
    "EventRuntimeParticipantDocument"
  );
  if (participant.eventId !== eventId || participant.uid !== uid) {
    throw new HttpsError("permission-denied", "Runtime identity mismatch.");
  }
  return participant;
}

function publicRuntimeEventProjection(
  event: RuntimeVenueEventDocument,
  eventId: string,
  publicRuntimeId: string,
  plan: EventSuccessPlanDocument | null,
  layout: GetEventRuntimeBootstrapCallableResponse["event"]["layout"],
  livePositions:
    GetEventRuntimeBootstrapCallableResponse["event"]["livePositions"],
  serverTimeMillis: number
): GetEventRuntimeBootstrapCallableResponse["event"] {
  const customLabel = event.eventFormat.customActivityLabel?.trim();
  const primitives = eventSuccessPrimitivesFor(event.eventFormat);
  return {
    eventId,
    publicRuntimeId,
    title: event.name?.trim() || customLabel ||
      activityTitle(event.eventFormat.activityKind),
    startTimeMillis: event.startTime.toMillis(),
    endTimeMillis: event.endTime.toMillis(),
    serverTimeMillis,
    locationName: event.meetingLocation.name || event.meetingPoint,
    checkedInCount: event.checkedInCount ?? 0,
    runtimeTermsVersion: event.runtimeAccess!.termsVersion,
    moduleIds: plan?.selectedModuleIds ?? [],
    interactionModel: primitives.interactionModel,
    itinerary: event.itinerary ?? [],
    routePlan: event.eventFormat.activityDetails?.routePlan ?? null,
    livePositions,
    layout,
    requiredFieldIds: requiredRuntimeFieldIds(event, plan),
    optionalFieldIds: optionalRuntimeFieldIds(event, plan),
    questionnaireConfig: plan?.questionnaireConfig ?? null,
  };
}

async function publicLivePositions(
  db: FirebaseFirestore.Firestore,
  event: RuntimeVenueEventDocument,
  eventId: string,
  now: FirebaseFirestore.Timestamp
): Promise<GetEventRuntimeBootstrapCallableResponse["event"]["livePositions"]> {
  const routePlan = event.eventFormat.activityDetails?.routePlan;
  const policy = routePlan?.version === 2 ? routePlan.liveTrackingPolicy : null;
  if (!policy || policy.mode === "disabled") return [];
  const snapshot = await db.collection("eventLivePositions")
    .where("eventId", "==", eventId)
    .limit(20)
    .get();
  const nowMillis = now.toMillis();
  return snapshot.docs.flatMap((doc) => {
    const position = doc.data() as EventLivePositionDocument;
    const recordedAtMillis = position.recordedAt?.toMillis?.();
    const expiresAtMillis = position.expiresAt?.toMillis?.();
    const staleAtMillis = typeof recordedAtMillis === "number" ?
      recordedAtMillis + policy.staleAfterSeconds * 1000 : null;
    if (position.eventId !== eventId ||
        typeof recordedAtMillis !== "number" ||
        typeof expiresAtMillis !== "number" ||
        staleAtMillis === null ||
        staleAtMillis <= nowMillis || expiresAtMillis <= nowMillis) {
      return [];
    }
    return [{
      role: position.role,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMeters: position.accuracyMeters,
      headingDegrees: position.headingDegrees,
      recordedAtMillis,
      staleAtMillis,
    }];
  }).sort((left, right) =>
    left.role.localeCompare(right.role) ||
    right.recordedAtMillis - left.recordedAtMillis
  );
}

async function runtimeSpatialLayout(
  db: FirebaseFirestore.Firestore,
  event: EventDocument,
  plan: EventSuccessPlanDocument | null
): Promise<GetEventRuntimeBootstrapCallableResponse["event"]["layout"]> {
  if (!plan?.layoutId || plan.structureConfig?.unitKind === "wholeGroup") {
    return null;
  }
  const organizerId = event.organizerId;
  const snap = await db.collection("organizerEventSuccessLayouts").doc(
    organizerEventSuccessLayoutDocumentId(organizerId, plan.layoutId)
  ).get();
  const layout = requireDoc<OrganizerEventSuccessLayoutDocument>(
    snap,
    "OrganizerEventSuccessLayoutDocument"
  );
  if (layout.organizerId !== organizerId || layout.layoutId !== plan.layoutId) {
    throw new HttpsError("failed-precondition", "Selected layout mismatch.");
  }
  return publicEventSuccessLayout(layout);
}

async function reconcileRuntimeParticipantRequirements(params: {
  participant: EventRuntimeParticipantDocument;
  participantRef: FirebaseFirestore.DocumentReference;
  requiredFieldIds: RuntimeFieldId[];
  now: FirebaseFirestore.Timestamp;
}): Promise<EventRuntimeParticipantDocument> {
  const {participant, participantRef, requiredFieldIds, now} = params;
  const completedFieldIds = completedRuntimeFieldIds(
    participant.runtimeProfile
  );
  const accessStatus = participant.accessStatus === "pendingApproval" ||
      participant.accessStatus === "revoked" ||
      participant.accessStatus === "optedOut" ?
    participant.accessStatus :
    runtimeAccessStatus(requiredFieldIds, completedFieldIds);
  const unchanged = arraysEqual(
    participant.requiredFieldIds,
    requiredFieldIds
  ) && arraysEqual(participant.completedFieldIds, completedFieldIds) &&
    participant.accessStatus === accessStatus;
  if (unchanged) return participant;
  const readyAt = accessStatus === "ready" ? participant.readyAt ?? now : null;
  await participantRef.update({
    requiredFieldIds,
    completedFieldIds,
    accessStatus,
    readyAt,
    updatedAt: now,
  });
  return {
    ...participant,
    requiredFieldIds,
    completedFieldIds,
    accessStatus,
    readyAt,
    updatedAt: now,
  };
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function activityTitle(
  activityKind: RuntimeVenueEventDocument["eventFormat"]["activityKind"]
): string {
  const titles: Record<typeof activityKind, string> = {
    socialRun: "Social run",
    running: "Run",
    walking: "Walk",
    pickleball: "Pickleball social",
    padel: "Padel social",
    tennis: "Tennis social",
    badminton: "Badminton social",
    cycling: "Cycling social",
    spinClass: "Spin class",
    yoga: "Yoga social",
    strengthTraining: "Strength session",
    pubQuiz: "Pub quiz",
    barCrawl: "Bar crawl",
    dinner: "Dinner",
    singlesMixer: "Singles mixer",
    openActivity: "Hosted event",
  };
  return titles[activityKind];
}

function emptyRuntimeProfile(displayName: string): RuntimeProfile {
  return {
    displayName,
    gender: null,
    interestedInGenders: [],
    relationshipGoal: null,
    dateOfBirth: null,
    paceBand: null,
    skillBand: null,
    dietaryAndSeatingNotes: null,
    questionnaireAnswerIds: [],
    teamName: null,
  };
}

function mergeRuntimeProfile(
  existing: RuntimeProfile,
  fields: SubmitEventRuntimeProfileCallablePayload["fields"],
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp
): RuntimeProfile {
  return {
    displayName: fields.displayName ?? existing.displayName,
    gender: fields.gender === undefined ? existing.gender : fields.gender,
    interestedInGenders: fields.interestedInGenders ??
      existing.interestedInGenders,
    relationshipGoal: fields.relationshipGoal === undefined ?
      existing.relationshipGoal : fields.relationshipGoal,
    dateOfBirth: fields.dateOfBirthMillis === undefined ?
      existing.dateOfBirth :
      fields.dateOfBirthMillis === null ? null :
        timestampFromMillis(fields.dateOfBirthMillis),
    paceBand: fields.paceBand === undefined ?
      existing.paceBand ?? null : fields.paceBand,
    skillBand: fields.skillBand === undefined ?
      existing.skillBand ?? null : fields.skillBand,
    dietaryAndSeatingNotes: fields.dietaryAndSeatingNotes === undefined ?
      existing.dietaryAndSeatingNotes ?? null : fields.dietaryAndSeatingNotes,
    questionnaireAnswerIds: fields.questionnaireAnswerIds ??
      existing.questionnaireAnswerIds ?? [],
    teamName: fields.teamName === undefined ?
      existing.teamName ?? null : fields.teamName,
  };
}

function onboardingPrefillPatch(
  existing: OnboardingDraftDocument | null,
  profile: RuntimeProfile,
  phoneE164: string
): OnboardingDraftDocument {
  const identitySeed = onboardingDraftSeed({
    displayName: profile.displayName,
    phoneE164,
  });
  const base = existing ?? {step: 1};
  const patch: OnboardingDraftDocument = {
    step: existing?.step ?? 1,
    draftVersion: existing?.draftVersion ?? 2,
  };
  if (!base.firstName) patch.firstName = profile.displayName.slice(0, 80);
  if (!base.phoneNumber) patch.phoneNumber = identitySeed.phoneNumber;
  if (!base.countryCode) patch.countryCode = identitySeed.countryCode;
  if (base.gender == null && profile.gender !== null) {
    patch.gender = profile.gender;
  }
  if (
    (!base.interestedInGenders || base.interestedInGenders.length === 0) &&
    profile.interestedInGenders.length > 0
  ) {
    patch.interestedInGenders = profile.interestedInGenders;
  }
  if (base.dateOfBirth == null && profile.dateOfBirth !== null) {
    patch.dateOfBirth = profile.dateOfBirth;
  }
  if (!base.relationshipGoal && profile.relationshipGoal !== null) {
    patch.relationshipGoal = profile.relationshipGoal;
  }
  patch.eventRuntimePrefill = {
    consented: true,
    source: "eventSuccessRuntime",
  };
  return patch;
}

function runtimeAttendeeDocument(params: {
  event: EventDocument;
  eventId: string;
  uid: string | null;
  displayName: string;
  phone: string;
  source?: EventAttendeeDocument["source"];
  status: "invited" | "registered";
  inviteLinkId: string | null;
  now: FirebaseFirestore.Timestamp;
}): EventAttendeeDocument {
  return {
    eventId: params.eventId,
    organizerId: params.event.organizerId,
    displayName: params.displayName,
    searchName: params.displayName.toLocaleLowerCase("en"),
    source: params.source ?? "webOtp",
    status: params.status,
    linkedUid: params.uid,
    phoneE164: params.source === "catchBooking" ? null : params.phone,
    email: null,
    externalReference: null,
    arrivalGroup: null,
    ticketType: null,
    importId: null,
    sourceRowId: null,
    createdAt: params.now,
    updatedAt: params.now,
    registeredAt: params.status === "registered" ? params.now : null,
    waitlistedAt: null,
    checkedInAt: null,
    cancelledAt: null,
    checkedInBy: null,
    linkedAt: params.uid ? params.now : null,
    inviteLinkId: params.inviteLinkId,
    inviteCapturedAt: params.inviteLinkId ? params.now : null,
    attendanceRevision: 0,
    preCheckInStatus: null,
  };
}

function runtimeProfileResponse(
  profile: RuntimeProfile
): NonNullable<
  GetEventRuntimeBootstrapCallableResponse["participant"]
>["runtimeProfile"] {
  return {
    displayName: profile.displayName,
    gender: profile.gender,
    interestedInGenders: profile.interestedInGenders,
    relationshipGoal: profile.relationshipGoal,
    dateOfBirthMillis: profile.dateOfBirth?.toMillis() ?? null,
    paceBand: profile.paceBand ?? null,
    skillBand: profile.skillBand ?? null,
    dietaryAndSeatingNotes: profile.dietaryAndSeatingNotes ?? null,
    questionnaireAnswerIds: profile.questionnaireAnswerIds ?? [],
    teamName: profile.teamName ?? null,
  };
}

function claimResponse(
  participant: EventRuntimeParticipantDocument
): ClaimEventRuntimeAccessCallableResponse {
  const status = participant.accessStatus;
  if (status !== "pendingApproval" &&
      status !== "needsInput" &&
      status !== "ready") {
    throw new HttpsError(
      "failed-precondition",
      "This runtime claim is no longer active."
    );
  }
  return {
    status,
    attendeeId: participant.eventAttendeeId,
    requiredFieldIds: participant.requiredFieldIds,
    completedFieldIds: participant.completedFieldIds,
  };
}

function isSensitiveRuntimeField(field: RuntimeFieldId): boolean {
  return field !== "displayName";
}

function normalizeRuntimeIdPayload(data: unknown): unknown {
  return normalizeStringFields(data, ["publicRuntimeId"]);
}

function normalizeClaimPayload(data: unknown): unknown {
  return normalizeStringFields(data, [
    "publicRuntimeId",
    "displayName",
    "runtimeTermsVersion",
    "attendeeToken",
    "inviteToken",
  ]);
}

function normalizeProfilePayload(data: unknown): unknown {
  const normalized = normalizeStringFields(data, [
    "publicRuntimeId",
    "runtimeTermsVersion",
    "sensitiveDataTermsVersion",
  ]);
  if (!isRecord(normalized)) return normalized;
  if (isRecord(normalized.fields)) {
    normalized.fields = normalizeStringFields(normalized.fields, [
      "displayName",
      "dietaryAndSeatingNotes",
      "teamName",
    ]);
  }
  return normalized;
}

function normalizeApprovalPayload(data: unknown): unknown {
  return normalizeStringFields(data, [
    "eventId",
    "uid",
    "attendeeId",
    "reason",
  ]);
}

function normalizeStringFields(
  data: unknown,
  fields: string[]
): unknown {
  if (!isRecord(data)) return data;
  const normalized = {...data};
  for (const field of fields) {
    if (typeof normalized[field] === "string") {
      const trimmed = normalized[field].trim();
      normalized[field] = field === "displayName" || field === "teamName" ?
        trimmed.replace(/\s+/g, " ") : trimmed;
    }
  }
  return normalized;
}

function assertFormatProfilePayload(
  event: EventDocument,
  fields: SubmitEventRuntimeProfileCallablePayload["fields"]
): void {
  const selected = preEventRuntimeFieldId(event);
  const candidates = [
    "paceBand",
    "skillBand",
    "dietaryAndSeatingNotes",
    "questionnaireAnswerIds",
    "teamName",
  ] as const;
  for (const field of candidates) {
    if (field !== selected && fields[field] !== undefined) {
      throw new HttpsError(
        "invalid-argument",
        `The ${field} answer does not belong to this event format.`
      );
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const getEventRuntimeBootstrap = onCall(
  appCheckCallableOptions,
  (request) => getEventRuntimeBootstrapHandler(request)
);

export const claimEventRuntimeAccess = onCall(
  appCheckCallableOptions,
  (request) => claimEventRuntimeAccessHandler(request)
);

export const submitEventRuntimeProfile = onCall(
  appCheckCallableOptions,
  (request) => submitEventRuntimeProfileHandler(request)
);

export const checkInEventRuntime = onCall(
  appCheckCallableOptionsWithSecrets([eventVenueSessionSigningKey]),
  (request) => checkInEventRuntimeHandler(request)
);

export const approveEventRuntimeClaim = onCall(
  appCheckCallableOptions,
  (request) => approveEventRuntimeClaimHandler(request)
);
