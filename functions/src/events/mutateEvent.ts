import {normalizeEventItinerary, assertValidEventItinerary} from
  "./event_itinerary";
import {eventDistanceLabel, eventTitleLabel} from "../shared/eventLabels";
import {assertPublicRegistrationTerms} from "./publicRegistration/policy";
import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import {randomBytes} from "crypto";
import {isDeepStrictEqual} from "node:util";
import {publishedEventEditPatch} from "./progressiveSetup/publishedEdit";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  appCheckCallableOptions,
} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import type {
  OrganizerDocument,
  EventDocument,
  EventPlanChangeDocument,
  EventConstraints,
  EventFormatSnapshot,
  EventSuccessFormatPrimitives,
  EventMeetingLocation,
  OrganizerEventSuccessLayoutDocument,
  OrganizerEventVenueDocument,
} from "../shared/generated/firestoreAdminTypes";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import type {CancelEventCallablePayload} from
  "../shared/generated/cancelEventCallablePayload";
import type {CreateEventCallablePayload} from
  "../shared/generated/createEventCallablePayload";
import type {DeleteEventCallablePayload} from
  "../shared/generated/deleteEventCallablePayload";
import {
  validateCancelEventCallablePayload,
} from "../shared/generated/validators/cancelEventInput";
import {
  validateCreateEventCallablePayload,
} from "../shared/generated/validators/createEventInput";
import {
  validateDeleteEventCallablePayload,
} from "../shared/generated/validators/deleteEventInput";
import {
  validateUpdateEventCallablePayload,
} from "../shared/generated/validators/updateEventInput";
import type {UpdateEventCallablePayload} from
  "../shared/generated/updateEventCallablePayload";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  allowsPushPreference,
  activityNotificationId,
  eventActivityNotificationCopy,
  sendFcmNotification,
  setActivityNotification,
} from "../shared/notifications";
import {
  eventParticipationsByStatusInTransaction,
} from "../shared/relationshipDocuments";
import {
  assertValidEventTimeRange,
  claimClubScheduleInTransaction,
  releaseClubScheduleInTransaction,
  releaseUserEventScheduleInTransaction,
  replaceClubScheduleInTransaction,
} from "./scheduleConflicts";
import {refreshOrganizerNextEvent as defaultRefreshOrganizerNextEvent} from
  "../organizers/syncOrganizerNextEvent";
import {
  normalizeCancelEventPayload,
  normalizeCreateEventPayload,
  normalizeEventIdPayload,
  normalizeUpdateEventPayload,
} from "./eventPayloadNormalization";
import {
  EventPolicyBundleDocument,
  normalizeInviteCode,
  normalizePolicy,
} from "./eventPolicy";
import {requireScheduledEvent} from
  "./configuredEvent";
import {eventDiscoveryProjection} from "./eventDiscoveryProjection";
import {isOrganizerManager} from "../shared/organizerHosts";
import {
  normalizeUploadedPhotosForFirestore,
} from "../shared/uploadedPhotoNormalization";
import {
  deleteMediaStoragePaths,
  removedMediaStoragePaths,
} from "../shared/mediaStorageLifecycle";
import {
  effectiveInteractionModelFor,
  eventSuccessPrimitivesFor,
  isEventSuccessAssignmentAlgorithm,
  isEventSuccessCompatibilityPolicy,
  isEventSuccessDurationShape,
  isEventSuccessMatchingObjective,
  isEventSuccessPhoneAvailability,
  isEventSuccessRotationSuitability,
  isEventSuccessUnitOutcome,
  ResolvedEventSuccessPrimitives,
} from "../eventSuccess/formatPrimitives";
import {organizerEventSuccessLayoutDocumentId} from
  "../eventSuccess/spatialLayout";
import {
  assertOrganizerEventVenueSource,
  organizerEventVenueDocumentId,
} from "./organizerEventVenues";
import {stageCancelledEventRefunds} from
  "../payments/legacyRefunds/recovery";
import {validateEventPlanChangeDocument} from
  "../shared/generated/validators/eventPlanChangeDocument";
import {readSeatMigrationWriterFence} from "./seatMigrationPaged";
import {prepareEventMutationLedger} from "./eventPolicyMutation";
import {EVENT_PLAN_CHANGES, eventPlanChangeFields,
  eventPlanChangeSourceId} from "./planChangeRecords";
import {updateEventMediaRecovery, EventMediaRecoveryReceipt} from
  "./eventMediaRecovery";

interface EventMutationDeps {
  firestore: () => FirebaseFirestore.Firestore;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  nowTimestamp?: () => FirebaseFirestore.Timestamp;
  serverTimestamp?: () => FirebaseFirestore.FieldValue;
  sendNotification?: typeof sendFcmNotification;
  checkRateLimit?: typeof defaultCheckRateLimit;
  refreshOrganizerNextEvent?: (
    organizerId: string,
    deps?: {
      firestore: () => FirebaseFirestore.Firestore;
      nowTimestamp: () => FirebaseFirestore.Timestamp;
    }
  ) => Promise<void>;
  prepareCancellationRefunds?: typeof stageCancelledEventRefunds;
  runtimePublicId?: () => string;
  deleteStoragePaths?: (paths: string[]) => Promise<void>;
}

/** Rich legacy edits cannot promote or fill a progressive private event. */
function assertLegacyMutationTarget(data: unknown,
  allowPublishedProgressive = false): void {
  if (!data || typeof data !== "object") return;
  const event = data as Record<string, unknown>;
  if ((!allowPublishedProgressive &&
      Object.prototype.hasOwnProperty.call(event, "setupRevision")) ||
      (Object.prototype.hasOwnProperty.call(event, "publicationState") &&
        event.publicationState !== "published")) {
    throw new HttpsError("failed-precondition",
      "Use progressive event setup for this event.");
  }
}

type ParsedEventConstraints = NonNullable<
  CreateEventCallablePayload["constraints"]
>;
type EventSuccessDefaultsPayload = NonNullable<
  CreateEventCallablePayload["eventSuccessDefaults"]
>;
type EventSuccessStructureConfigPayload = NonNullable<
  EventSuccessDefaultsPayload["structureConfig"]
>;
type MeetingLocationInput = {
  name: unknown;
  address?: unknown;
  placeId?: unknown;
  latitude: unknown;
  longitude: unknown;
  notes?: unknown;
};
type CreateEventPayloadWithPolicy = CreateEventCallablePayload & {
  eventPolicy?: EventPolicyBundleDocument;
  eventFormat?: EventFormatSnapshot;
  privateAccess?: {
    inviteCode?: string | null;
  };
};
type EventHostUpdateFields = UpdateEventCallablePayload["fields"];
type EventDiscoveryField =
  "discoveryMarketId" |
  "discoveryCityName" |
  "discoveryActivityKind" |
  "discoveryGeoCell" |
  "discoveryHasOpenSpots" |
  "discoveryAvailability" |
  "discoveryOpenCohorts" |
  "discoveryWaitlistCohorts" |
  "discoveryInviteRequired" |
  "discoveryMembershipRequired" |
  "discoveryManualApprovalRequired" |
  "discoveryMinAge" |
  "discoveryMaxAge";
type EventDocumentBeforeDiscovery = Omit<EventDocument, EventDiscoveryField>;

type NotificationUserDocument = {
  fcmToken?: string;
  prefsEventReminders?: boolean;
  prefsRunStatusUpdates?: boolean;
  prefsClubUpdates?: boolean;
};

type ClubMembershipNotificationDocument = {
  uid?: string;
  pushNotificationsEnabled?: boolean;
};

const defaultDeps: EventMutationDeps = {
  firestore: () => admin.firestore(),
  timestampFromMillis: (millis) =>
    admin.firestore.Timestamp.fromMillis(millis),
  nowTimestamp: () => admin.firestore.Timestamp.now(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  sendNotification: sendFcmNotification,
  checkRateLimit: defaultCheckRateLimit,
  refreshOrganizerNextEvent: defaultRefreshOrganizerNextEvent,
  prepareCancellationRefunds: stageCancelledEventRefunds,
  runtimePublicId: () => randomBytes(24).toString("base64url"),
  deleteStoragePaths: deleteMediaStoragePaths,
};

/**
 * Creates an event for a club hosted by the signed-in user.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventMutationDeps} deps Injectable dependencies for tests.
 * @return {Promise<{eventId: string}>} Created event id.
 */
export async function createEventHandler(
  request: CallableRequest<unknown>,
  deps: EventMutationDeps = defaultDeps
): Promise<{eventId: string}> {
  const hostUserId = requireAuth(request);
  const data = validateCallableWithAjv<CreateEventCallablePayload>(
    request,
    validateCreateEventCallablePayload,
    normalizeCreateEventPayload
  );
  assertValidEventTimeRange(data.startTimeMillis, data.endTimeMillis);
  assertValidEventConstraints(data.constraints);
  assertValidEventItinerary({
    itinerary: data.itinerary,
    startTimeMillis: data.startTimeMillis,
    endTimeMillis: data.endTimeMillis,
    eventFormat: data.eventFormat,
  });
  if (data.externalOrigin && data.eventSuccessDefaults?.enabled !== true) {
    throw new HttpsError(
      "failed-precondition",
      "External companion events must enable Event Success."
    );
  }

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, hostUserId, "createEvent", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  const organizerId = data.organizerId ?? data.clubId;

  const eventRef = data.eventId ?
    db.collection("events").doc(data.eventId) :
    db.collection("events").doc();
  const privateAccessRef = db.collection("eventPrivateAccess").doc(eventRef.id);
  const eventSuccessPlanRef = db
    .collection("eventSuccessPlans")
    .doc(eventRef.id);
  const organizerRef = db.collection("organizers").doc(organizerId);
  const deletedUserRef = db.collection("deletedUsers").doc(hostUserId);
  const selectedLayoutId = data.eventSuccessDefaults?.enabled === true ?
    data.eventSuccessDefaults.layoutId ?? null : null;
  const selectedLayoutRef = selectedLayoutId ?
    db.collection("organizerEventSuccessLayouts").doc(
      organizerEventSuccessLayoutDocumentId(organizerId, selectedLayoutId)
    ) : null;
  const sourceVenueId = data.sourceVenueId ?? null;
  const sourceVenueRef = sourceVenueId ?
    db.collection("organizerEventVenues").doc(
      organizerEventVenueDocumentId(organizerId, sourceVenueId)
    ) : null;

  let createdEvent: EventDocument | null = null;
  let organizerName = "Your organizer";
  const useLegacyFollowerProjection = false;

  await db.runTransaction(async (tx) => {
    const [
      eventSnap,
      organizerSnap,
      deletedUserSnap,
      selectedLayoutSnap,
      sourceVenueSnap,
    ] = await Promise.all([
      tx.get(eventRef),
      tx.get(organizerRef),
      tx.get(deletedUserRef),
      selectedLayoutRef ? tx.get(selectedLayoutRef) : Promise.resolve(null),
      sourceVenueRef ? tx.get(sourceVenueRef) : Promise.resolve(null),
    ]);

    if (eventSnap.exists) {
      throw new HttpsError("already-exists", "Event already exists.");
    }
    const organizer = assertCanMutateOrganizerEntity(
      organizerSnap,
      deletedUserSnap,
      hostUserId
    );
    if (selectedLayoutId) {
      if (!selectedLayoutSnap?.exists) {
        throw new HttpsError(
          "failed-precondition",
          "The selected room layout no longer exists."
        );
      }
      const layout = requireDoc<OrganizerEventSuccessLayoutDocument>(
        selectedLayoutSnap,
        "OrganizerEventSuccessLayoutDocument"
      );
      if (
        layout.organizerId !== organizerId ||
        layout.layoutId !== selectedLayoutId
      ) {
        throw new HttpsError(
          "permission-denied",
          "The selected room layout belongs to another organizer."
        );
      }
    }
    if (sourceVenueId) {
      assertValidSourceVenue({
        snapshot: sourceVenueSnap,
        organizerId,
        sourceVenueId,
        meetingLocation: normalizeMeetingLocationForCreate(data),
      });
    }
    organizerName = organizer.name;
    const eventBase: EventDocumentBeforeDiscovery = {
      ...buildCreateEventDoc(data, deps, hostUserId),
      clubId: organizerId,
      organizerId,
      bookedCount: 0,
      crossPathsPairHeldCount: 0,
      crossPathsPairConfirmedCount: 0,
      crossPathsPairHeldCohortCounts: {},
      checkedInCount: 0,
      waitlistedCount: 0,
      status: "active" as const,
      cancelledAt: null,
      cancellationReason: null,
      genderCounts: {},
    };
    const event: EventDocument = {
      ...eventBase,
      ...eventDiscoveryProjection({
        event: eventBase,
        clubLocation: organizer.location,
        clubLocationMarketId: organizer.locationMarketId,
      }),
    };
    const eventPolicy = event.eventPolicy;
    if (!eventPolicy) {
      throw new HttpsError("internal", "Event policy was not normalized.");
    }
    const inviteCode = normalizedInviteCodeForCreate(data, eventPolicy);
    const eventSuccessPlan = buildCreateEventSuccessPlanDoc({
      data,
      eventId: eventRef.id,
      event,
      serverTimestamp: deps.serverTimestamp,
    });
    const [privateAccessSnap, eventSuccessPlanSnap] = await Promise.all([
      tx.get(privateAccessRef),
      eventSuccessPlan ? tx.get(eventSuccessPlanRef) : Promise.resolve(null),
    ]);
    if (privateAccessSnap.exists) {
      throw new HttpsError(
        "already-exists",
        "Event private access already exists."
      );
    }
    if (eventSuccessPlanSnap?.exists) {
      throw new HttpsError(
        "already-exists",
        "Event success plan already exists."
      );
    }

    await claimClubScheduleInTransaction(tx, db, {
      clubId: organizerId,
      organizerId,
      eventId: eventRef.id,
      startTimeMillis: data.startTimeMillis,
      endTimeMillis: data.endTimeMillis,
    });
    tx.create(eventRef, event);
    if (inviteCode) {
      tx.create(privateAccessRef, {
        eventId: eventRef.id,
        clubId: organizerId,
        organizerId,
        inviteCode,
        createdAt: deps.serverTimestamp?.() ??
          admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    if (eventSuccessPlan) {
      tx.create(eventSuccessPlanRef, eventSuccessPlan);
    }
    createdEvent = event;
  });

  if (createdEvent) {
    await deps.refreshOrganizerNextEvent?.(organizerId, {
      firestore: deps.firestore,
      nowTimestamp: () => admin.firestore.Timestamp.now(),
    });
    await notifyClubMembersForNewEvent({
      db,
      deps,
      eventId: eventRef.id,
      clubId: organizerId,
      organizerId,
      useLegacyFollowerProjection,
      hostUserId,
      clubName: organizerName,
      event: createdEvent,
    });
  }

  return {eventId: eventRef.id};
}

/**
 * Updates host-editable schedule/descriptive fields for an event.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventMutationDeps} deps Injectable dependencies for tests.
 * @return {Promise<{updated: boolean}>} Whether the update completed.
 */
export async function updateEventHandler(
  request: CallableRequest<unknown>,
  deps: EventMutationDeps = defaultDeps
): Promise<{updated: boolean; receipt?: EventMediaRecoveryReceipt}> {
  const hostUserId = requireAuth(request);
  const data = validateCallableWithAjv<UpdateEventCallablePayload>(
    request,
    validateUpdateEventCallablePayload,
    normalizeUpdateEventPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, hostUserId, "updateEvent", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

  if ("mediaRecovery" in data) {
    return updateEventMediaRecovery({
      db, actorUid: hostUserId, eventId: data.eventId,
      identity: data.mediaRecovery, fields: data.fields,
      serverTimestamp: deps.serverTimestamp ??
        (() => admin.firestore.FieldValue.serverTimestamp()),
    });
  }

  const eventRef = db.collection("events").doc(data.eventId);
  const privateAccessRef = db
    .collection("eventPrivateAccess")
    .doc(data.eventId);
  const deletedUserRef = db.collection("deletedUsers").doc(hostUserId);
  let updatedEvent: EventDocument | null = null;
  let affectedClubId: string | null = null;
  let shouldNotifyParticipants = false;
  let removedStoragePaths: string[] = [];

  await db.runTransaction(async (tx) => {
    const [eventSnap, deletedUserSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(deletedUserRef),
    ]);

    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    assertLegacyMutationTarget(eventSnap.data(), true);

    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    if (event.status === "cancelled") {
      throw new HttpsError(
        "failed-precondition",
        "Cancelled events cannot be edited."
      );
    }
    const organizerId = requireOrganizerId(event);
    const organizerRef = db.collection("organizers").doc(organizerId);
    const [
      organizerSnap,
      activeParticipations,
      privateAccessSnap,
      attendeeSnap,
      offerSnap,
      seatMode,
    ] =
      await Promise.all([
        tx.get(organizerRef),
        eventParticipationsByStatusInTransaction(tx, db, data.eventId, [
          "signedUp",
          "waitlisted",
          "attended",
        ]),
        tx.get(privateAccessRef),
        tx.get(db.collection("eventAttendees")
          .where("eventId", "==", data.eventId).limit(1)),
        tx.get(db.collection("organizerEventOffers")
          .where("eventId", "==", data.eventId).limit(1)),
        readSeatMigrationWriterFence({db, tx, eventId: data.eventId}),
      ]);
    const organizer = assertCanMutateOrganizerEntity(
      organizerSnap,
      deletedUserSnap,
      hostUserId
    );
    assertValidMergedRunUpdate(event, data.fields);
    assertValidEventConstraints(data.fields.constraints);
    let patch = buildUpdateEventPatch(event, data.fields, deps);
    patch = {...patch, ...publishedEventEditPatch(event,
      data.expectedSetupRevision, fieldsStartTimeMillis(event, data.fields))};
    const scheduleChanged = hasScheduleTimeChange(event, data.fields);
    const policyChanged = hasPolicyChange(event, patch, data.fields,
      privateAccessSnap.data());
    const hasGuestHistory = activeParticipations.length > 0 ||
      !attendeeSnap.empty || !offerSnap.empty;
    if (scheduleChanged && hasGuestHistory) {
      throw new HttpsError(
        "failed-precondition",
        "Events with participants or waitlisted users cannot be rescheduled."
      );
    }
    if (policyChanged && hasGuestHistory) {
      throw new HttpsError(
        "failed-precondition",
        "Events with participants or waitlisted users cannot change policy."
      );
    }

    patch = {
      ...patch,
      ...eventDiscoveryProjection({
        event: {...event, ...patch},
        clubLocation: organizer.location,
        clubLocationMarketId: organizer.locationMarketId,
      }),
    };
    const nextEvent = {...event, ...patch};
    const seatState = seatMode === "ready" ?
      await prepareEventMutationLedger(db, tx, data.eventId, event,
        nextEvent) : null;
    if (seatState && seatState.reserved > 0 &&
        (scheduleChanged || policyChanged)) {
      throw new HttpsError("failed-precondition",
        "Events with reserved seats cannot change schedule or policy.");
    }
    const nextEndTime = requiredEventEndTime(nextEvent);
    const changedFields = eventPlanChangeFields(event, nextEvent);
    const occurredAt = deps.nowTimestamp?.() ??
      admin.firestore.Timestamp.now();
    let planChange: EventPlanChangeDocument | null = null;
    if (changedFields.length > 0 &&
        occurredAt.toMillis() < nextEndTime.toMillis()) {
      const revision = (event.planChangeRevision ?? 0) + 1;
      if (revision > 2147483647) {
        throw new HttpsError(
          "resource-exhausted",
          "The event plan change revision limit has been reached."
        );
      }
      const sourceId = eventPlanChangeSourceId(data.eventId, revision);
      const source: EventPlanChangeDocument = {
        schemaVersion: 1,
        sourceId,
        eventId: data.eventId,
        organizerId,
        revision,
        changedFields,
        eventTitle: nextEvent.name?.trim() || "Your event",
        startTime: nextEvent.startTime,
        endTime: nextEndTime,
        meetingPoint: effectiveMeetingLocation(nextEvent).name,
        itineraryStopCount: nextEvent.itinerary?.length ?? 0,
        occurredAt,
        validUntil: nextEndTime,
        createdBy: hostUserId,
      };
      if (!validateEventPlanChangeDocument(source)) {
        throw new HttpsError("internal", "Invalid event plan change source.");
      }
      patch.planChangeRevision = revision;
      planChange = source;
    }
    const nextPolicy = patch.eventPolicy ?? event.eventPolicy ?? null;
    if (scheduleChanged) {
      await replaceClubScheduleInTransaction(tx, db, {
        clubId: organizerId,
        eventId: data.eventId,
        previousStartTimeMillis: event.startTime.toMillis(),
        previousEndTimeMillis: requiredEventEndTime(event).toMillis(),
        startTimeMillis: fieldsStartTimeMillis(event, data.fields),
        endTimeMillis: fieldsEndTimeMillis(event, data.fields),
      });
    }
    if (planChange) {
      tx.create(db.collection(EVENT_PLAN_CHANGES)
        .doc(planChange.sourceId), planChange);
    }
    if (seatState?.update) {
      tx.set(db.collection("eventSeatLedgers").doc(data.eventId),
        seatState.update);
    }
    tx.update(eventRef, patch);
    removedStoragePaths = removedMediaStoragePaths({
      before: event,
      after: {...event, ...patch},
      owner: {kind: "event", id: data.eventId},
    });
    if (policyChanged && nextPolicy) {
      syncPrivateAccessForPolicyUpdate({
        tx,
        privateAccessRef,
        privateAccessSnap,
        eventId: data.eventId,
        clubId: organizerId,
        fields: data.fields,
        eventPolicy: nextPolicy,
        serverTimestamp: deps.serverTimestamp,
      });
    }
    updatedEvent = {...event, ...patch};
    affectedClubId = organizerId;
    shouldNotifyParticipants = changedFields.length > 0;
  });

  await cleanupRemovedEventMedia(deps, data.eventId, removedStoragePaths);

  if (updatedEvent && shouldNotifyParticipants) {
    await notifyEventParticipants({
      db,
      deps,
      eventId: data.eventId,
      event: updatedEvent,
      type: "eventUpdated",
    });
  }
  if (affectedClubId) {
    await deps.refreshOrganizerNextEvent?.(affectedClubId, {
      firestore: deps.firestore,
      nowTimestamp: () => admin.firestore.Timestamp.now(),
    });
  }

  return {updated: true};
}

/**
 * Cancels an event and notifies signed-up/waitlisted participants.
 *
 * Published progressive events use the same cancellation, roster and refund
 * path. Minimal private drafts remain on their manager-only lifecycle.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventMutationDeps} deps Injectable dependencies for tests.
 * @return {Promise<{cancelled: boolean}>} Whether the event is cancelled.
 */
export async function cancelEventHandler(
  request: CallableRequest<unknown>,
  deps: EventMutationDeps = defaultDeps
): Promise<{cancelled: boolean}> {
  const hostUserId = requireAuth(request);
  const data = validateCallableWithAjv<CancelEventCallablePayload>(
    request,
    validateCancelEventCallablePayload,
    normalizeCancelEventPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, hostUserId, "cancelEvent", {
    maxRequests: 10, windowMs: 60 * 1000,
  });

  const eventRef = db.collection("events").doc(data.eventId);
  const deletedUserRef = db.collection("deletedUsers").doc(hostUserId);
  const committed = await db.runTransaction(async (tx) => {
    const [eventSnap, deletedUserSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(deletedUserRef),
    ]);

    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    assertLegacyMutationTarget(eventSnap.data(), true);

    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    const organizerId = requireOrganizerId(event);
    const organizerRef = db.collection("organizers").doc(organizerId);
    const [organizerSnap, participantEdges] =
      await Promise.all([
        tx.get(organizerRef),
        eventParticipationsByStatusInTransaction(tx, db, data.eventId, [
          "signedUp",
          "waitlisted",
        ]),
      ]);
    const organizer = assertCanMutateOrganizerEntity(
      organizerSnap,
      deletedUserSnap,
      hostUserId
    );

    await readSeatMigrationWriterFence({db, tx, eventId: data.eventId});

    if (event.status === "cancelled") {
      return {event, organizerId, notifyParticipants: false};
    }

    const cancelledAt = deps.serverTimestamp?.() ??
      admin.firestore.FieldValue.serverTimestamp();
    const cancelledPatch = {
      ...publishedEventEditPatch(event, event.setupRevision,
        event.startTime.toMillis()),
      status: "cancelled",
      cancelledAt,
      cancellationReason: data.reason ?? null,
    };
    tx.update(eventRef, {
      ...cancelledPatch,
      ...eventDiscoveryProjection({
        event: {...event, status: "cancelled" as const},
        clubLocation: organizer.location,
      }),
    });
    releaseClubScheduleInTransaction(tx, db, {
      clubId: organizerId,
      eventId: data.eventId,
      startTimeMillis: event.startTime.toMillis(),
      endTimeMillis: requiredEventEndTime(event).toMillis(),
    });
    for (const edge of participantEdges) {
      releaseUserEventScheduleInTransaction(tx, db, {
        uid: edge.data.uid,
        eventId: data.eventId,
        startTimeMillis: event.startTime.toMillis(),
        endTimeMillis: requiredEventEndTime(event).toMillis(),
      });
    }
    return {organizerId, notifyParticipants: true, event: {
      ...event,
      status: "cancelled" as const,
      cancelledAt: event.cancelledAt,
      cancellationReason: data.reason ?? null,
    }};
  });

  // Replays resume staging even if the first call committed cancellation and
  // then stopped. The event trigger independently retries the same authority.
  try {
    await deps.prepareCancellationRefunds?.({db, eventId: data.eventId});
  } catch {
    logger.error("Cancelled event refund staging needs recovery", {
      eventId: data.eventId});
  }
  if (committed.notifyParticipants) {
    await notifyEventParticipants({db, deps, eventId: data.eventId,
      event: committed.event, type: "eventCancelled"});
  }
  await deps.refreshOrganizerNextEvent?.(committed.organizerId, {
    firestore: deps.firestore,
    nowTimestamp: () => admin.firestore.Timestamp.now(),
  });
  return {cancelled: true};
}

/**
 * Hard-deletes an unused event.
 *
 * Events with any user activity are cancelled, not deleted, so payments,
 * notifications, reviews, and attendance history keep a stable audit trail.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventMutationDeps} deps Injectable dependencies for tests.
 * @return {Promise<{deleted: boolean}>} Whether the event was deleted.
 */
export async function deleteEventHandler(
  request: CallableRequest<unknown>,
  deps: EventMutationDeps = defaultDeps
): Promise<{deleted: boolean}> {
  const hostUserId = requireAuth(request);
  const data = validateCallableWithAjv<DeleteEventCallablePayload>(
    request,
    validateDeleteEventCallablePayload,
    normalizeEventIdPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, hostUserId, "deleteEvent", {
    maxRequests: 10, windowMs: 60 * 1000,
  });

  const eventRef = db.collection("events").doc(data.eventId);
  const deletedUserRef = db.collection("deletedUsers").doc(hostUserId);
  let deletedClubId: string | null = null;
  let removedStoragePaths: string[] = [];

  await db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    assertLegacyMutationTarget(eventSnap.data());

    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    const organizerId = requireOrganizerId(event);
    const organizerRef = db.collection("organizers").doc(organizerId);
    const [
      organizerSnap,
      deletedUserSnap,
      participationSnap,
      paymentSnap,
      reviewSnap,
      attendeeSnap,
      offerSnap,
      admissionSnap,
      seatMode,
    ] = await Promise.all([
      tx.get(organizerRef),
      tx.get(deletedUserRef),
      tx.get(db.collection("eventParticipations")
        .where("eventId", "==", data.eventId)
        .limit(1)),
      tx.get(db.collection("payments")
        .where("eventId", "==", data.eventId)
        .limit(1)),
      tx.get(db.collection("reviews")
        .where("eventId", "==", data.eventId)
        .limit(1)),
      tx.get(db.collection("eventAttendees")
        .where("eventId", "==", data.eventId).limit(1)),
      tx.get(db.collection("organizerEventOffers")
        .where("eventId", "==", data.eventId).limit(1)),
      tx.get(db.collection("organizerFormAdmissions")
        .where("eventId", "==", data.eventId).limit(1)),
      readSeatMigrationWriterFence({db, tx, eventId: data.eventId}),
    ]);
    assertCanMutateOrganizerEntity(
      organizerSnap,
      deletedUserSnap,
      hostUserId
    );
    if (
      !participationSnap.empty ||
      !paymentSnap.empty ||
      !reviewSnap.empty || !attendeeSnap.empty || !offerSnap.empty ||
      !admissionSnap.empty || seatMode === "ready"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Events with guest, offer, seat, payment or review history " +
        "must be cancelled."
      );
    }

    tx.delete(eventRef);
    removedStoragePaths = removedMediaStoragePaths({
      before: event,
      after: {},
      owner: {kind: "event", id: data.eventId},
    });
    deletedClubId = organizerId;
    releaseClubScheduleInTransaction(tx, db, {
      clubId: organizerId,
      eventId: data.eventId,
      startTimeMillis: event.startTime.toMillis(),
      endTimeMillis: requiredEventEndTime(event).toMillis(),
    });
  });

  await cleanupRemovedEventMedia(deps, data.eventId, removedStoragePaths);

  if (deletedClubId) {
    await deps.refreshOrganizerNextEvent?.(deletedClubId, {
      firestore: deps.firestore,
      nowTimestamp: () => admin.firestore.Timestamp.now(),
    });
  }

  return {deleted: true};
}


async function cleanupRemovedEventMedia(
  deps: EventMutationDeps,
  eventId: string,
  paths: string[]
) {
  if (paths.length === 0) return;
  try {
    await deps.deleteStoragePaths?.(paths);
  } catch (error) {
    logger.error("Event media cleanup failed", {eventId, paths, error});
  }
}

/**
 * Builds the immutable initial event document controlled by the create
 * callable.
 * @param {CreateEventCallablePayload} data Validated callable data.
 * @param {EventMutationDeps} deps Injectable dependencies.
 * @return {object} Event fields except ownership/booking aggregates.
 */
function buildCreateEventDoc(
  data: CreateEventCallablePayload,
  deps: EventMutationDeps,
  hostUserId: string
): Omit<EventDocument, "clubId" | "genderCounts" |
  "status" | "cancelledAt" | "cancellationReason" | EventDiscoveryField> {
  const eventPhotos = normalizeUploadedPhotosForFirestore(data.eventPhotos);
  const meetingLocation = normalizeMeetingLocationForCreate(data);
  const maxMen = data.constraints?.maxMen;
  const maxWomen = data.constraints?.maxWomen;
  const hasLegacyCaps = maxMen != null || maxWomen != null;
  const normalizedPolicy = normalizePolicy(
    (data as CreateEventPayloadWithPolicy).eventPolicy ?? {
      version: 1,
      admission: {
        format: hasLegacyCaps ? "fixedCohortCaps" : "open",
        capacityLimit: data.capacityLimit,
        waitlistPolicy: {mode: "rankedOffer", offerWindowMinutes: 20},
        inviteRequired: false,
        membershipRequired: false,
        manualApprovalRequired: false,
        privateAccessPolicy: {
          mode: "none",
          inviteCodeHint: null,
          privateLinkEnabled: false,
        },
        cohortCapacityLimits: {
          ...(maxMen != null ? {menInterestedInWomen: maxMen} : {}),
          ...(maxWomen != null ? {womenInterestedInMen: maxWomen} : {}),
        },
      },
      pricing: {
        basePriceInPaise: data.priceInPaise,
      },
      cancellation: {
        policyId: data.priceInPaise === 0 ? "notApplicable" : "standard",
      },
      settlement: {hostPayoutTiming: "afterEventCompletion"},
    }
  );
  // External companion events may charge on their booking provider, but Catch
  // never owns that price, payment, refund, or cancellation policy.
  const eventPolicy = data.externalOrigin ? normalizePolicy({
    ...normalizedPolicy,
    pricing: {
      ...normalizedPolicy.pricing,
      basePriceInPaise: 0,
    },
  }) : normalizedPolicy;
  return {
    name: data.name.trim(),
    publicationState: "published",
    ...(data.sourceVenueId ? {sourceVenueId: data.sourceVenueId} : {}),
    eventOrigin: data.externalOrigin ? {
      mode: "externalCompanion",
      bookingAuthority: "external",
      rosterAuthority: "hostImport",
      provider: data.externalOrigin.provider,
      externalEventId: data.externalOrigin.externalEventId ?? null,
      externalEventUrl: data.externalOrigin.externalEventUrl ?? null,
      sourceExternalEventId:
        data.externalOrigin.sourceExternalEventId ?? null,
      adapterVersion: data.externalOrigin.adapterVersion ?? null,
      connectedAt: (deps.nowTimestamp?.() ??
        admin.firestore.Timestamp.now()) as unknown as NonNullable<
          EventDocument["eventOrigin"]
        >["connectedAt"],
      connectedBy: hostUserId,
    } : {
      mode: "catchNative",
      bookingAuthority: "catch",
      rosterAuthority: "catchProjection",
      provider: "catch",
      externalEventId: null,
      externalEventUrl: null,
      sourceExternalEventId: null,
      adapterVersion: null,
      connectedAt: null,
      connectedBy: null,
    },
    runtimeAccess: {
      enabled: data.eventSuccessDefaults?.enabled === true ||
        data.externalOrigin !== undefined,
      publicRuntimeId: data.eventSuccessDefaults?.enabled === true ||
        data.externalOrigin !== undefined ?
        (deps.runtimePublicId?.() ?? randomBytes(24).toString("base64url")) :
        null,
      walkInPolicy: data.runtimeWalkInPolicy ??
        (data.externalOrigin ? "hostApproval" : "deny"),
      termsVersion: "event-runtime-v1",
    },
    startTime: deps.timestampFromMillis(data.startTimeMillis),
    endTime: deps.timestampFromMillis(data.endTimeMillis),
    meetingPoint: meetingLocation.name,
    meetingLocation,
    startingPointLat: meetingLocation.latitude,
    startingPointLng: meetingLocation.longitude,
    locationDetails: meetingLocation.notes ?? null,
    itinerary: normalizeEventItinerary(data.itinerary),
    photoUrl: primaryPhotoUrl(eventPhotos) ?? data.photoUrl ?? null,
    eventPhotos,
    eventFormat: normalizeEventFormat(
      (data as CreateEventPayloadWithPolicy).eventFormat
    ),
    distanceKm: data.distanceKm,
    pace: data.pace,
    capacityLimit: eventPolicy.admission.capacityLimit,
    description: data.description,
    priceInPaise: eventPolicy.pricing.basePriceInPaise,
    currency: data.currency ?? "INR",
    constraints: normalizeConstraints(data.constraints),
    eventPolicy,
    cohortCounts: {},
    waitlistedCohortCounts: {},
  };
}

/**
 * Builds the optional initial event-success plan owned by createEvent.
 * @param {object} params Source event and callable payload.
 * @return {object|null} Firestore plan doc, or null when disabled.
 */
function buildCreateEventSuccessPlanDoc(params: {
  data: CreateEventCallablePayload;
  eventId: string;
  event: EventDocument;
  serverTimestamp?: () => FirebaseFirestore.FieldValue;
}): Record<string, unknown> | null {
  const defaults = params.data.eventSuccessDefaults;
  if (!defaults?.enabled) return null;

  const timestamp = params.serverTimestamp?.() ??
    admin.firestore.FieldValue.serverTimestamp();
  const eventFormat = requireScheduledEvent(params.event).eventFormat;
  const primitives = eventSuccessPrimitivesFor(eventFormat);
  const interactionModel = effectiveInteractionModelFor(
    eventFormat.interactionModel,
    primitives.assignmentAlgorithm
  );
  const targetAttendeeCount = clampInteger(
    params.event.capacityLimit,
    1,
    1000,
    20
  );
  const playbookId =
    normalizeString(defaults.playbookId) ??
    normalizeString(eventFormat.defaultPlaybookId) ??
    defaultEventSuccessPlaybookIdFor(interactionModel, primitives);
  const selectedModuleIds = stableStringList(
    defaults.selectedModuleIds,
    24,
    defaultEventSuccessModuleIdsFor(interactionModel, primitives)
  );
  const wingmanRequestsSelected =
    selectedModuleIds.includes("wingman_requests");
  const contextualOpenersSelected =
    selectedModuleIds.includes("contextual_openers");
  const compatibilityQuestionnaireSelected =
    selectedModuleIds.includes("compatibility_questionnaire");

  return {
    eventId: params.eventId,
    clubId: params.data.clubId,
    organizerId: params.event.organizerId ?? params.data.clubId,
    layoutId: defaults.layoutId ?? null,
    affinityConstraints: [],
    spatialOverrides: [],
    playbookId,
    selectedModuleIds,
    targetAttendeeCount,
    structureConfig: normalizeEventSuccessStructureConfig(
      defaults.structureConfig,
      interactionModel,
      targetAttendeeCount
    ),
    hostGoal:
      normalizeString(defaults.hostGoal) ??
      "Help attendees meet at least two new people.",
    wingmanRequestsEnabled: wingmanRequestsSelected,
    contextualOpenersEnabled: contextualOpenersSelected,
    compatibilityAffectsRanking:
      compatibilityQuestionnaireSelected &&
      (defaults.compatibilityAffectsRanking ??
        primitives.compatibilityPolicy === "mutualInterestOnly"),
    questionnaireConfig: normalizeEventSuccessQuestionnaireConfig(
      defaults.questionnaireConfig
    ),
    activeStepIndex: 0,
    liveControlRevision: 0,
    assignmentDraftRevision: 0,
    publishedRotationRoundIndex: -1,
    publishedRevealRoundIndex: -1,
    status: "setup",
    revealStatus: "idle",
    activeRevealRoundIndex: 0,
    revealStartedAt: null,
    attendeePrompt: normalizeNullableString(defaults.attendeePrompt),
    createdAt: timestamp,
    updatedAt: timestamp,
    frozenAt: null,
    completedAt: null,
  };
}

/**
 * Returns a valid event-success structure for the event format.
 * @param {object=} raw Optional client defaults.
 * @param {string} interactionModel Event interaction model.
 * @param {number} targetAttendeeCount Capacity used for whole-group formats.
 * @return {object} Persistable structure config.
 */
function normalizeEventSuccessStructureConfig(
  raw: EventSuccessStructureConfigPayload | undefined,
  interactionModel: EventFormatSnapshot["interactionModel"],
  targetAttendeeCount: number
) {
  const fallback = defaultEventSuccessStructureConfigFor(
    interactionModel,
    targetAttendeeCount
  );
  const source = isDeprecatedTeamRotationDefault(raw, interactionModel) ?
    undefined :
    raw;
  return {
    unitKind: source?.unitKind ?? fallback.unitKind,
    unitSize: source?.unitSize ?? fallback.unitSize,
    unitCount: source?.unitCount ?? fallback.unitCount,
    rotationIntervalMinutes:
      source?.rotationIntervalMinutes ?? fallback.rotationIntervalMinutes,
    revealCountdownSeconds:
      source?.revealCountdownSeconds ?? fallback.revealCountdownSeconds,
  };
}

/**
 * Detects the old team-rotation fallback that stored a fixed three-team plan.
 * @param {object=} raw Optional client structure config.
 * @param {string} interactionModel Event interaction model.
 * @return {boolean} Whether the fallback should be replaced with auto count.
 */
function isDeprecatedTeamRotationDefault(
  raw: EventSuccessStructureConfigPayload | undefined,
  interactionModel: EventFormatSnapshot["interactionModel"]
): boolean {
  return interactionModel === "teamRotations" &&
    raw?.unitKind === "teams" &&
    raw.unitSize === 5 &&
    raw.unitCount === 3 &&
    raw.rotationIntervalMinutes == null &&
    (raw.revealCountdownSeconds ?? 10) === 10;
}

/**
 * Returns a valid questionnaire config from optional defaults.
 * @param {object=} raw Optional questionnaire config.
 * @return {object} Persistable questionnaire config.
 */
function normalizeEventSuccessQuestionnaireConfig(
  raw: EventSuccessDefaultsPayload["questionnaireConfig"] | undefined
) {
  return {
    templateId: normalizeString(raw?.templateId) ?? "balanced",
    ...(raw?.customTitle !== undefined ?
      {customTitle: normalizeNullableString(raw.customTitle)} :
      {}),
    ...(raw?.customQuestions !== undefined ?
      {customQuestions: raw.customQuestions} :
      {}),
  };
}

/**
 * Returns a stable unique string list, falling back when empty.
 * @param {string[] | undefined} values Candidate strings.
 * @param {number} maxItems Maximum number of returned strings.
 * @param {string[]} fallback Fallback values when candidates are empty.
 * @return {string[]} Stable unique strings.
 */
function stableStringList(
  values: string[] | undefined,
  maxItems: number,
  fallback: string[]
): string[] {
  const normalized = (values ?? [])
    .map((value) => normalizeString(value))
    .filter((value): value is string => value !== null);
  const source = normalized.length > 0 ? normalized : fallback;
  return [...new Set(source)].sort().slice(0, maxItems);
}

/**
 * Trims a string and returns null when blank.
 * @param {unknown} value Raw value.
 * @return {string|null} Normalized string.
 */
function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

/**
 * Trims a nullable string and preserves explicit null for Firestore.
 * @param {unknown} value Raw value.
 * @return {string|null} Normalized nullable string.
 */
function normalizeNullableString(value: unknown): string | null {
  return normalizeString(value);
}

/**
 * Clamps an integer-like value into a valid range.
 * @param {unknown} value Raw value.
 * @param {number} min Minimum value.
 * @param {number} max Maximum value.
 * @param {number} fallback Fallback when not finite.
 * @return {number} Clamped integer.
 */
function clampInteger(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Returns default event-success playbook for resolved format primitives.
 * @param {string} interactionModel Effective event interaction model.
 * @param {ResolvedEventSuccessPrimitives} primitives Resolved primitives.
 * @return {string} Playbook id.
 */
function defaultEventSuccessPlaybookIdFor(
  interactionModel: EventFormatSnapshot["interactionModel"],
  primitives: ResolvedEventSuccessPrimitives
): string {
  switch (interactionModel) {
  case "pairedRotations":
    return "pickleball_rotations";
  case "teamRotations":
    return "pub_quiz_team_mixer";
  case "seatedTable":
    return "dinner_table_mixer";
  case "freeFormMixer":
    return primitives.compatibilityPolicy === "mutualInterestOnly" ?
      "algorithmic_mixer_reveal" :
      "host_led_social";
  case "hostLedProgram":
  case "openFormat":
    return "host_led_social";
  case "pacePods":
  default:
    return "social_run_light";
  }
}

/**
 * Returns default module ids for an event format.
 * @param {string} interactionModel Effective event interaction model.
 * @param {ResolvedEventSuccessPrimitives} primitives Resolved primitives.
 * @return {string[]} Default module ids.
 */
function defaultEventSuccessModuleIdsFor(
  interactionModel: EventFormatSnapshot["interactionModel"],
  primitives: ResolvedEventSuccessPrimitives
): string[] {
  const base = [
    "host_script",
    "social_missions",
    "wingman_requests",
    "contextual_openers",
    "decomposed_feedback",
    "host_analytics",
  ];
  switch (interactionModel) {
  case "pacePods":
    return [...base, "micro_pods"];
  case "pairedRotations":
    return [...base, "guided_rotations", "live_reveal"];
  case "teamRotations":
    return [...base, "micro_pods", "live_reveal"];
  case "freeFormMixer":
    return primitives.compatibilityPolicy === "mutualInterestOnly" ?
      [...base, "guided_rotations", "live_reveal",
        "compatibility_questionnaire"] :
      [...base, "guided_rotations", "live_reveal"];
  default:
    return base;
  }
}

/**
 * Resolves optional contract primitives from the event format.
 * @param {EventFormatSnapshot} eventFormat Persisted event format.
 * @return {ResolvedEventSuccessPrimitives} Resolved behavior primitives.
 */
/**
 * Returns default event-success structure for an event format.
 * @param {string} interactionModel Event interaction model.
 * @param {number} targetAttendeeCount Event target size.
 * @return {object} Structure config.
 */
function defaultEventSuccessStructureConfigFor(
  interactionModel: EventFormatSnapshot["interactionModel"],
  targetAttendeeCount: number
): EventSuccessStructureConfigPayload {
  switch (interactionModel) {
  case "pairedRotations":
  case "freeFormMixer":
    return {
      unitKind: "pairs",
      unitSize: 2,
      unitCount: null,
      rotationIntervalMinutes: 15,
      revealCountdownSeconds: 10,
    };
  case "teamRotations":
    return {
      unitKind: "teams",
      unitSize: 5,
      unitCount: null,
      rotationIntervalMinutes: null,
      revealCountdownSeconds: 10,
    };
  case "seatedTable":
    return {
      unitKind: "tables",
      unitSize: 4,
      unitCount: null,
      rotationIntervalMinutes: 30,
      revealCountdownSeconds: 10,
    };
  case "pacePods":
  case "hostLedProgram":
  case "openFormat":
  default:
    return {
      unitKind: "wholeGroup",
      unitSize: targetAttendeeCount,
      unitCount: 1,
      rotationIntervalMinutes: null,
      revealCountdownSeconds: 10,
    };
  }
}

/**
 * Validates and returns invite-only access material for the host-private doc.
 * @param {CreateEventCallablePayload} data Validated create payload.
 * @param {EventPolicyBundleDocument} eventPolicy Normalized public policy
 * snapshot.
 * @return {string|null} Invite code to store in eventPrivateAccess/{eventId}.
 */
function normalizedInviteCodeForCreate(
  data: CreateEventCallablePayload,
  eventPolicy: EventPolicyBundleDocument
): string | null {
  if (!eventPolicy.admission.inviteRequired) return null;

  const inviteCode = normalizeInviteCode(
    (data as CreateEventPayloadWithPolicy).privateAccess?.inviteCode
  );
  if (!inviteCode || inviteCode.length < 4 || inviteCode.length > 64) {
    throw new HttpsError(
      "invalid-argument",
      "Invite-only events need an invite code between 4 and 64 characters."
    );
  }
  return inviteCode;
}

/**
 * Normalizes the optional event-format snapshot on create.
 * @param {EventFormatSnapshot | null | undefined} raw Client payload snapshot.
 * @return {EventFormatSnapshot} Persistable event-format snapshot.
 */
function normalizeEventFormat(
  raw?: EventFormatSnapshot | null
): EventFormatSnapshot {
  const activityKind = raw?.activityKind ?? "socialRun";
  const eventSuccessPrimitives = normalizeEventSuccessFormatPrimitives(
    raw?.eventSuccessPrimitives
  );
  return {
    version: 1,
    activityKind,
    interactionModel:
      raw?.interactionModel ?? defaultInteractionModelFor(activityKind),
    ...(raw?.customActivityLabel != null ?
      {customActivityLabel: raw.customActivityLabel} : {}),
    ...(raw?.defaultPlaybookId != null ?
      {defaultPlaybookId: raw.defaultPlaybookId} : {}),
    ...(raw?.defaultModuleIds != null && raw.defaultModuleIds.length > 0 ?
      {defaultModuleIds: raw.defaultModuleIds} : {}),
    ...(eventSuccessPrimitives != null ?
      {eventSuccessPrimitives} : {}),
    ...(raw?.activityDetails != null ?
      {activityDetails: raw.activityDetails} : {}),
  };
}

/**
 * Normalizes optional event-success primitives embedded in a format snapshot.
 * @param {EventSuccessFormatPrimitivesPayload=} raw Raw primitive payload.
 * @return {EventSuccessFormatPrimitivesPayload|null} Persistable primitives.
 */
function normalizeEventSuccessFormatPrimitives(
  raw?: EventSuccessFormatPrimitives
): EventSuccessFormatPrimitives | null {
  const normalized: EventSuccessFormatPrimitives = {};
  if (isEventSuccessPhoneAvailability(raw?.phoneAvailability)) {
    normalized.phoneAvailability = raw.phoneAvailability;
  }
  if (isEventSuccessRotationSuitability(raw?.rotationSuitability)) {
    normalized.rotationSuitability = raw.rotationSuitability;
  }
  if (isEventSuccessAssignmentAlgorithm(raw?.assignmentAlgorithm)) {
    normalized.assignmentAlgorithm = raw.assignmentAlgorithm;
  }
  if (isEventSuccessCompatibilityPolicy(raw?.compatibilityPolicy)) {
    normalized.compatibilityPolicy = raw.compatibilityPolicy;
  }
  if (isEventSuccessMatchingObjective(raw?.matchingObjective)) {
    normalized.matchingObjective = raw.matchingObjective;
  }
  if (isEventSuccessUnitOutcome(raw?.unitOutcome)) {
    normalized.unitOutcome = raw.unitOutcome;
  }
  if (isEventSuccessDurationShape(raw?.durationShape)) {
    normalized.durationShape = raw.durationShape;
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function assertValidSourceVenue(params: {
  snapshot: FirebaseFirestore.DocumentSnapshot | null;
  organizerId: string;
  sourceVenueId: string;
  meetingLocation: EventMeetingLocation;
}): void {
  if (!params.snapshot?.exists) {
    throw new HttpsError(
      "failed-precondition",
      "The selected saved place no longer exists."
    );
  }
  const venue = requireDoc<OrganizerEventVenueDocument>(
    params.snapshot,
    "OrganizerEventVenueDocument"
  );
  assertOrganizerEventVenueSource({
    venue,
    organizerId: params.organizerId,
    venueId: params.sourceVenueId,
    meetingLocation: params.meetingLocation,
  });
}

/**
 * Returns the canonical meeting-location object for new event documents.
 * @param {CreateEventCallablePayload} data Validated create payload.
 * @return {EventMeetingLocation} Persistable meeting location.
 */
function normalizeMeetingLocationForCreate(
  data: CreateEventCallablePayload
): EventMeetingLocation {
  const structured = data.meetingLocation;
  if (structured) return normalizeMeetingLocation(structured);
  return normalizeMeetingLocation({
    name: data.meetingPoint,
    latitude: data.startingPointLat,
    longitude: data.startingPointLng,
    notes: data.locationDetails ?? null,
  });
}

/**
 * Merges legacy where fields or the structured field into one location object.
 * @param {EventDocument} event Current event document.
 * @param {object} fields Host update fields.
 * @return {EventMeetingLocation} Normalized merged location.
 */
function normalizeMeetingLocationForUpdate(
  event: EventDocument,
  fields: EventHostUpdateFields
): EventMeetingLocation {
  if (fields.meetingLocation !== undefined) {
    return normalizeMeetingLocation(fields.meetingLocation);
  }
  if (!hasLegacyLocationChange(fields)) return effectiveMeetingLocation(event);

  const current = effectiveMeetingLocation(event);
  const latitude = fields.startingPointLat !== undefined ?
    fields.startingPointLat :
    current.latitude;
  const longitude = fields.startingPointLng !== undefined ?
    fields.startingPointLng :
    current.longitude;
  return normalizeMeetingLocation({
    name: fields.meetingPoint ?? current.name,
    address: current.address ?? null,
    placeId: current.placeId ?? null,
    latitude,
    longitude,
    notes: fields.locationDetails !== undefined ?
      fields.locationDetails :
      current.notes ?? event.locationDetails ?? null,
  });
}

/**
 * Normalizes structured location text and validates coordinates.
 * @param {MeetingLocationPayload} raw Raw location payload.
 * @return {EventMeetingLocation} Firestore-safe location.
 */
function normalizeMeetingLocation(
  raw: MeetingLocationInput
): EventMeetingLocation {
  const name = normalizeString(raw.name);
  if (!name) {
    throw new HttpsError("invalid-argument", "Meeting location is required.");
  }
  assertValidCoordinate(raw.latitude, "meetingLocation.latitude", -90, 90);
  assertValidCoordinate(raw.longitude, "meetingLocation.longitude", -180, 180);
  return {
    name,
    address: normalizeNullableString(raw.address),
    placeId: normalizeNullableString(raw.placeId),
    latitude: raw.latitude,
    longitude: raw.longitude,
    notes: normalizeNullableString(raw.notes),
  };
}

/**
 * Reads a canonical location from new docs or legacy location fields.
 * @param {EventDocument} event Current event document.
 * @return {EventMeetingLocation} Effective meeting location.
 */
function effectiveMeetingLocation(
  event: EventDocument
): EventMeetingLocation {
  if (event.meetingLocation) {
    return normalizeMeetingLocation(event.meetingLocation);
  }
  if (event.startingPointLat == null || event.startingPointLng == null) {
    throw new HttpsError(
      "failed-precondition",
      "This event has no exact meeting location. Resolve it before editing."
    );
  }
  return normalizeMeetingLocation({
    name: event.meetingPoint,
    latitude: event.startingPointLat,
    longitude: event.startingPointLng,
    notes: event.locationDetails ?? null,
  });
}

/**
 * Returns the attendee-facing location name with legacy fallback.
 * @param {EventDocument} event Event document.
 * @return {string} Location name.
 */
function eventLocationName(event: EventDocument): string {
  return event.meetingLocation?.name ?? event.meetingPoint ??
    "Location to be confirmed";
}

/**
 * Throws when a coordinate is outside the allowed range.
 * @param {unknown} value Raw coordinate.
 * @param {string} fieldName Error field name.
 * @param {number} min Minimum accepted value.
 * @param {number} max Maximum accepted value.
 */
function assertValidCoordinate(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    throw new HttpsError("invalid-argument", `${fieldName} is invalid.`);
  }
}

/**
 * Returns the default interaction model for a known activity kind.
 * @param {string} activityKind Activity kind.
 * @return {string} Interaction model.
 */
function defaultInteractionModelFor(
  activityKind: EventFormatSnapshot["activityKind"]
): EventFormatSnapshot["interactionModel"] {
  switch (activityKind) {
  case "socialRun":
    return "pacePods";
  case "pickleball":
  case "padel":
  case "tennis":
  case "badminton":
    return "pairedRotations";
  case "pubQuiz":
    return "teamRotations";
  case "dinner":
    return "seatedTable";
  case "barCrawl":
  case "singlesMixer":
    return "freeFormMixer";
  case "openActivity":
    return "openFormat";
  default:
    return "hostLedProgram";
  }
}

/**
 * Converts host-editable callable fields into Firestore update fields.
 * @param {EventDocument} event Current event document.
 * @param {object} fields Update fields.
 * @param {EventMutationDeps} deps Injectable dependencies.
 * @return {Partial<EventDocument>} Firestore update patch.
 */
function buildUpdateEventPatch(
  event: EventDocument,
  fields: EventHostUpdateFields,
  deps: EventMutationDeps
): Partial<EventDocument> {
  const patch: Partial<EventDocument> = {};
  if (fields.name !== undefined) patch.name = fields.name.trim();
  const meetingLocation = normalizeMeetingLocationForUpdate(event, fields);
  if (fields.startTimeMillis !== undefined) {
    patch.startTime = deps.timestampFromMillis(fields.startTimeMillis);
  }
  if (fields.endTimeMillis !== undefined) {
    patch.endTime = deps.timestampFromMillis(fields.endTimeMillis);
  }
  patch.meetingLocation = meetingLocation;
  patch.meetingPoint = meetingLocation.name;
  patch.startingPointLat = meetingLocation.latitude;
  patch.startingPointLng = meetingLocation.longitude;
  patch.locationDetails = meetingLocation.notes ?? null;
  if (fields.itinerary !== undefined) {
    patch.itinerary = normalizeEventItinerary(fields.itinerary);
  }
  if (fields.eventPhotos !== undefined) {
    const eventPhotos = normalizeUploadedPhotosForFirestore(fields.eventPhotos);
    patch.eventPhotos = eventPhotos;
    patch.photoUrl = primaryPhotoUrl(eventPhotos);
  } else if (fields.photoUrl !== undefined) {
    patch.photoUrl = fields.photoUrl;
  }
  if (fields.distanceKm !== undefined) patch.distanceKm = fields.distanceKm;
  if (fields.pace !== undefined) patch.pace = fields.pace;
  if (fields.description !== undefined) patch.description = fields.description;
  if (fields.eventFormat !== undefined) {
    patch.eventFormat = normalizeEventFormat(fields.eventFormat);
  }
  if (fields.publicRegistrationEnabled !== undefined) {
    if (event.publicRegistrationMode === "paid" &&
        fields.publicRegistrationEnabled !== event.publicRegistrationEnabled) {
      throw new HttpsError("failed-precondition",
        "Use event registration settings to change paid registration.");
    }
    patch.publicRegistrationEnabled = fields.publicRegistrationEnabled;
    if (event.publicRegistrationMode !== undefined &&
        fields.publicRegistrationEnabled !== event.publicRegistrationEnabled) {
      const revision = event.publicRegistrationRevision ?? 0;
      if (!Number.isSafeInteger(revision) ||
          revision >= Number.MAX_SAFE_INTEGER) {
        throw new HttpsError("failed-precondition",
          "Invalid registration revision.");
      }
      patch.publicRegistrationMode = fields.publicRegistrationEnabled ?
        "free" : "closed";
      patch.publicRegistrationRevision = revision + 1;
    }
  }
  if (fields.constraints !== undefined) {
    patch.constraints = normalizeConstraints(fields.constraints);
  }
  if (fields.eventPolicy !== undefined) {
    const eventPolicy = normalizePolicy(fields.eventPolicy);
    patch.eventPolicy = eventPolicy;
    patch.capacityLimit = eventPolicy.admission.capacityLimit;
    patch.priceInPaise = eventPolicy.pricing.basePriceInPaise;
  } else {
    if (fields.capacityLimit !== undefined) {
      patch.capacityLimit = fields.capacityLimit;
      if (event.eventPolicy) {
        patch.eventPolicy = normalizePolicy({...event.eventPolicy,
          admission: {...event.eventPolicy.admission,
            capacityLimit: fields.capacityLimit}});
      }
    }
    if (fields.priceInPaise !== undefined) {
      patch.priceInPaise = fields.priceInPaise;
    }
  }
  return patch;
}

/**
 * Extracts the first usable full-size URL from an uploaded photo gallery.
 * @param {unknown[] | undefined} photos Candidate uploaded photo records.
 * @return {string|null} First full-size URL, or null when unavailable.
 */
function primaryPhotoUrl(
  photos: unknown[] | undefined
): string | null {
  if (!Array.isArray(photos) || photos.length === 0) return null;
  const first = photos[0];
  if (first === null || typeof first !== "object") return null;
  const url = (first as {url?: unknown}).url;
  return typeof url === "string" && url.trim().length > 0 ? url : null;
}

/**
 * Returns true when an update touches legacy where fields.
 * @param {object} fields Host update fields.
 * @return {boolean} Whether legacy location fields are present.
 */
function hasLegacyLocationChange(fields: EventHostUpdateFields): boolean {
  return fields.meetingPoint !== undefined ||
    fields.startingPointLat !== undefined ||
    fields.startingPointLng !== undefined ||
    fields.locationDetails !== undefined;
}

/**
 * Returns true when the event's time window changes, not merely its location.
 * @param {EventDocument} event Current event.
 * @param {object} fields Host update fields.
 * @return {boolean} Whether time locks must be replaced.
 */
function hasScheduleTimeChange(event: EventDocument,
  fields: EventHostUpdateFields
): boolean {
  return (fields.startTimeMillis !== undefined &&
      fields.startTimeMillis !== event.startTime.toMillis()) ||
    (fields.endTimeMillis !== undefined &&
      fields.endTimeMillis !== requiredEventEndTime(event).toMillis());
}

/**
 * Returns true when an update changes booking policy or private invite state.
 * @param {EventDocument} event Current event.
 * @param {object} patch Normalized update.
 * @param {object} fields Host update fields.
 * @param {object | undefined} privateAccess Current invite settings.
 * @return {boolean} Whether participant-free policy guards should run.
 */
function hasPolicyChange(event: EventDocument, patch: Partial<EventDocument>,
  fields: EventHostUpdateFields, privateAccess: FirebaseFirestore.DocumentData |
  undefined): boolean {
  const keys = ["capacityLimit", "priceInPaise", "constraints",
    "eventPolicy"] as const;
  return keys.some((key) => patch[key] !== undefined &&
    !isDeepStrictEqual(patch[key], event[key])) ||
    (fields.privateAccess !== undefined &&
      normalizeInviteCode(fields.privateAccess.inviteCode) !==
        normalizeInviteCode(privateAccess?.inviteCode));
}

/**
 * Syncs the host-private invite code document after a policy update.
 * @param {object} params Sync dependencies and normalized policy fields.
 */
function syncPrivateAccessForPolicyUpdate(params: {
  tx: FirebaseFirestore.Transaction;
  privateAccessRef: FirebaseFirestore.DocumentReference;
  privateAccessSnap: FirebaseFirestore.DocumentSnapshot;
  eventId: string;
  clubId: string;
  fields: EventHostUpdateFields;
  eventPolicy: EventPolicyBundleDocument;
  serverTimestamp?: () => FirebaseFirestore.FieldValue;
}) {
  if (!params.eventPolicy.admission.inviteRequired) {
    if (params.privateAccessSnap.exists) {
      params.tx.delete(params.privateAccessRef);
    }
    return;
  }

  const existingCode = params.privateAccessSnap.exists ?
    normalizeInviteCode(params.privateAccessSnap.data()?.inviteCode) :
    null;
  const nextCode =
    normalizeInviteCode(params.fields.privateAccess?.inviteCode) ??
    existingCode;
  if (!nextCode || nextCode.length < 4 || nextCode.length > 64) {
    throw new HttpsError(
      "invalid-argument",
      "Invite-only events need an invite code between 4 and 64 characters."
    );
  }

  params.tx.set(params.privateAccessRef, {
    eventId: params.eventId,
    clubId: params.clubId,
    inviteCode: nextCode,
    createdAt: params.privateAccessSnap.data()?.createdAt ??
      params.serverTimestamp?.() ??
      admin.firestore.FieldValue.serverTimestamp(),
  }, {merge: true});
}

/**
 * Applies partial schedule edits to an event start time.
 * @param {EventDocument} event Current event document.
 * @param {object} fields Update fields.
 * @return {number} Merged start time in epoch milliseconds.
 */
function fieldsStartTimeMillis(
  event: EventDocument,
  fields: EventHostUpdateFields
): number {
  return fields.startTimeMillis ?? event.startTime.toMillis();
}

/**
 * Applies partial schedule edits to an event end time.
 * @param {EventDocument} event Current event document.
 * @param {object} fields Update fields.
 * @return {number} Merged end time in epoch milliseconds.
 */
function fieldsEndTimeMillis(
  event: EventDocument,
  fields: EventHostUpdateFields
): number {
  return fields.endTimeMillis ?? requiredEventEndTime(event).toMillis();
}

/** Legacy cancellation needs scheduling data, not an activity format. */
function requiredEventEndTime(
  event: EventDocument
): FirebaseFirestore.Timestamp {
  const end = event.endTime;
  if (!end || !Number.isFinite(end.toMillis()) ||
      end.toMillis() <= event.startTime.toMillis()) {
    throw new HttpsError("failed-precondition",
      "Event end time is unavailable.");
  }
  return end;
}

/**
 * Converts optional client constraint fields into the canonical stored shape.
 * @param {ParsedEventConstraints=} constraints Validated constraints.
 * @return {EventConstraints} Firestore constraints shape.
 */
function normalizeConstraints(
  constraints?: ParsedEventConstraints
): EventConstraints {
  const value = {
    minAge: 0,
    maxAge: 99,
    ...constraints,
  };
  return {
    minAge: value.minAge,
    maxAge: value.maxAge,
    maxMen: value.maxMen ?? null,
    maxWomen: value.maxWomen ?? null,
  };
}

/**
 * Enforces cross-field age bounds that JSON Schema draft-07 cannot express
 * cleanly without making the payload schema harder to read.
 * @param {ParsedEventConstraints=} constraints Validated constraint fields.
 */
function assertValidEventConstraints(constraints?: ParsedEventConstraints) {
  if (!constraints) return;
  const minAge = constraints.minAge ?? 0;
  const maxAge = constraints.maxAge ?? 99;
  if (maxAge < minAge) {
    throw new HttpsError(
      "invalid-argument",
      "maxAge must be greater than or equal to minAge"
    );
  }
}

/**
 * Authorizes event creation against the canonical organizer collection.
 * @param {FirebaseFirestore.DocumentSnapshot} organizerSnap Entity snapshot.
 * @param {FirebaseFirestore.DocumentSnapshot} deletedUserSnap Tombstone snap.
 * @param {string} hostUserId Authenticated caller UID.
 * @return {OrganizerDocument} Authorized entity document.
 */
function assertCanMutateOrganizerEntity(
  organizerSnap: FirebaseFirestore.DocumentSnapshot,
  deletedUserSnap: FirebaseFirestore.DocumentSnapshot,
  hostUserId: string
): OrganizerDocument {
  if (deletedUserSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "This account cannot manage events."
    );
  }
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer not found.");
  }
  const organizer = requireDoc<OrganizerDocument>(
    organizerSnap,
    "OrganizerDocument"
  );
  if (!isOrganizerManager(organizer, hostUserId)) {
    throw new HttpsError(
      "permission-denied",
      "Only organizer owners and managers can manage events."
    );
  }
  return organizer;
}

function requireOrganizerId(event: EventDocument): string {
  if (!event.organizerId) {
    throw new HttpsError("failed-precondition", "Event has no organizer.");
  }
  return event.organizerId;
}

/**
 * Validates timing and coordinate invariants after applying a partial update.
 * @param {EventDocument} event Current event document.
 * @param {object} fields Update fields.
 */
function assertValidMergedRunUpdate(
  event: EventDocument,
  fields: EventHostUpdateFields
) {
  const startTimeMillis = fields.startTimeMillis ??
    event.startTime.toMillis();
  const endTimeMillis = fields.endTimeMillis ??
    requiredEventEndTime(event).toMillis();
  assertValidEventTimeRange(startTimeMillis, endTimeMillis);
  normalizeMeetingLocationForUpdate(event, fields);
  if (fields.eventFormat != null && event.eventFormat &&
      (fields.eventFormat.activityKind !== event.eventFormat.activityKind ||
       fields.eventFormat.interactionModel !==
          event.eventFormat.interactionModel)) {
    throw new HttpsError(
      "invalid-argument",
      "Event format updates may change route details but not activity kind."
    );
  }
  assertValidEventItinerary({
    itinerary: fields.itinerary ?? event.itinerary,
    startTimeMillis,
    endTimeMillis,
    eventFormat: fields.eventFormat ?? event.eventFormat,
  });
  assertStandalonePublicRegistrationPolicy(event, fields);
}


function assertStandalonePublicRegistrationPolicy(
  event: EventDocument,
  fields: EventHostUpdateFields
): void {
  const enabled = fields.publicRegistrationEnabled ??
    event.publicRegistrationEnabled === true;
  if (!enabled) return;
  const mergedEvent: EventDocument = {
    ...event,
    capacityLimit: fields.capacityLimit ?? event.capacityLimit,
    priceInPaise: fields.priceInPaise ?? event.priceInPaise,
    constraints: fields.constraints ?
      normalizeConstraints({...event.constraints, ...fields.constraints}) :
      event.constraints,
    eventPolicy: fields.eventPolicy ?? event.eventPolicy,
  };
  assertPublicRegistrationTerms(mergedEvent,
    event.publicRegistrationMode === "paid" ? "paid" : "free");
}

/**
 * Fans out a new-event activity item to active club members.
 *
 * Notification delivery is intentionally best-effort: event creation should not
 * be reported as failed after the event document has already been committed.
 * @param {object} params Fan-out parameters.
 * @param {FirebaseFirestore.Firestore} params.db Firestore instance.
 * @param {EventMutationDeps} params.deps Injectable dependencies.
 * @param {string} params.eventId Created event id.
 * @param {string} params.clubId Club id.
 * @param {string} params.hostUserId Host user id to exclude.
 * @param {string} params.clubName Club display name.
 * @param {EventDocument} params.event Created event document.
 */
async function notifyClubMembersForNewEvent(params: {
  db: FirebaseFirestore.Firestore;
  deps: EventMutationDeps;
  eventId: string;
  clubId: string;
  organizerId: string;
  useLegacyFollowerProjection: boolean;
  hostUserId: string;
  clubName: string;
  event: EventDocument;
}) {
  try {
    const members = await params.db
      .collection(params.useLegacyFollowerProjection ?
        "clubMemberships" : "organizerFollows")
      .where(
        params.useLegacyFollowerProjection ? "clubId" : "organizerId",
        "==",
        params.organizerId
      )
      .where("status", "==", "active")
      .get();
    const memberEntries = members.docs
      .map((doc) => doc.data() as ClubMembershipNotificationDocument)
      .filter((membership): membership is
        Required<Pick<ClubMembershipNotificationDocument, "uid">> &
        ClubMembershipNotificationDocument =>
        typeof membership.uid === "string" &&
        membership.uid !== params.hostUserId
      );
    if (memberEntries.length === 0) return;

    const userSnaps = await Promise.all(
      memberEntries.map((membership) =>
        params.db.collection("users").doc(membership.uid).get()
      )
    );
    const copy = newClubEventNotificationCopy(params.clubName, params.event);

    await Promise.all(userSnaps.map(async (snap, index) => {
      const membership = memberEntries[index];
      const uid = membership.uid;
      const user = snap.data() as NotificationUserDocument | undefined;
      if (!user) return;
      await setActivityNotification(params.db, {
        id: activityNotificationId(
          "organizerUpdate",
          params.eventId
        ),
        uid,
        type: "organizerUpdate",
        title: copy.title,
        body: copy.body,
        createdAt: params.deps.serverTimestamp?.() ??
          admin.firestore.FieldValue.serverTimestamp(),
        eventId: params.eventId,
        organizerId: params.organizerId,
      });
      if (
        membership.pushNotificationsEnabled === true &&
        user.fcmToken &&
        allowsPushPreference(user, "clubUpdates")
      ) {
        await params.deps.sendNotification?.({
          token: user.fcmToken,
          title: copy.title,
          body: copy.body,
          type: "organizerUpdate",
          eventId: params.eventId,
          organizerId: params.organizerId,
        });
      }
    }));
  } catch (error) {
    logger.error("Failed to fan out new-event notifications", {
      eventId: params.eventId,
      clubId: params.clubId,
      error,
    });
  }
}

/**
 * Fans out event update/cancellation activity to booked and waitlisted users.
 *
 * Delivery is best-effort after the canonical event write commits. A
 * notification failure should not roll back a host's already-committed schedule
 * update or cancellation.
 * @param {object} params Fan-out parameters.
 * @param {FirebaseFirestore.Firestore} params.db Firestore instance.
 * @param {EventMutationDeps} params.deps Injectable dependencies.
 * @param {string} params.eventId Event id.
 * @param {EventDocument} params.event Event document used for copy.
 * @param {"eventUpdated"|"eventCancelled"} params.type Notification type.
 */
async function notifyEventParticipants(params: {
  db: FirebaseFirestore.Firestore;
  deps: EventMutationDeps;
  eventId: string;
  event: EventDocument;
  type: "eventUpdated" | "eventCancelled";
}) {
  try {
    const [signedUp, waitlisted] = await Promise.all([
      params.db
        .collection("eventParticipations")
        .where("eventId", "==", params.eventId)
        .where("status", "==", "signedUp")
        .get(),
      params.db
        .collection("eventParticipations")
        .where("eventId", "==", params.eventId)
        .where("status", "==", "waitlisted")
        .get(),
    ]);
    const uids = Array.from(new Set([...signedUp.docs, ...waitlisted.docs]
      .map((doc) => doc.data().uid)
      .filter((uid): uid is string => typeof uid === "string")));
    if (uids.length === 0) return;

    const copy = eventActivityNotificationCopy(params.type, params.event);
    const userSnaps = await Promise.all(
      uids.map((uid) => params.db.collection("users").doc(uid).get())
    );

    await Promise.all(userSnaps.map(async (snap, index) => {
      const uid = uids[index];
      const user = snap.data() as NotificationUserDocument | undefined;
      if (!user) return;
      await setActivityNotification(params.db, {
        id: activityNotificationId(params.type, params.eventId),
        uid,
        type: params.type,
        title: copy.title,
        body: copy.body,
        createdAt: params.deps.serverTimestamp?.() ??
          admin.firestore.FieldValue.serverTimestamp(),
        eventId: params.eventId,
        organizerId: params.event.organizerId,
      });
      if (user.fcmToken && allowsPushPreference(user, "eventStatusUpdates")) {
        await params.deps.sendNotification?.({
          token: user.fcmToken,
          title: copy.title,
          body: copy.body,
          type: params.type,
          eventId: params.eventId,
          organizerId: params.event.organizerId,
        });
      }
    }));
  } catch (error) {
    logger.error("Failed to fan out event participant notifications", {
      eventId: params.eventId,
      type: params.type,
      error,
    });
  }
}

/**
 * Builds user-facing copy for a newly hosted club event.
 * @param {string} clubName Club display name.
 * @param {EventDocument} event Created event.
 * @return {{title: string, body: string}} Notification copy.
 */
function newClubEventNotificationCopy(
  clubName: string,
  event: EventDocument
): {title: string; body: string} {
  const distance = eventDistanceLabel(event);
  return {
    title: `${clubName} posted an event`,
    body:
      distance ?
        `${distance} from ` +
        `${eventLocationName(event)}.` :
        `${eventTitleLabel(event)} at ${eventLocationName(event)}.`,
  };
}

export const createEvent = onCall(
  appCheckCallableOptions,
  (request) => createEventHandler(request)
);
export const updateEvent = onCall(
  appCheckCallableOptions,
  (request) => updateEventHandler(request)
);
export const cancelEvent = onCall(
  appCheckCallableOptions,
  (request) => cancelEventHandler(request)
);
export const deleteEvent = onCall(
  appCheckCallableOptions,
  (request) => deleteEventHandler(request)
);
