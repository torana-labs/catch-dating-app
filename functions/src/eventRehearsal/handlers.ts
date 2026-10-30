import {preparePracticeSettings, practiceSettingsProjection} from
  "./assistanceSettings";
import {practiceRoleAuthority, practiceStaffProjection,
  preparePracticeStaffChange} from "./groupStaff";
import {readPracticeDepartures, PracticeDepartures} from "./movementGuidance";
import type {GetEventRehearsalMovementCallablePayload as MovementInput} from
  "../shared/generated/getEventRehearsalMovementCallablePayload";
import type {EventRehearsalMovementCallableResponse as MovementReview} from
  "../shared/generated/eventRehearsalMovementCallableResponse";
import {validateGetEventRehearsalMovementCallablePayload} from
  "../shared/generated/validators/getEventRehearsalMovementInput";
import {validateEventRehearsalMovementCallableResponse} from
  "../shared/generated/validators/eventRehearsalMovementOutput";
import {practiceMovementReview, preparePracticeMovementCommand,
  practiceMovementScope} from "./movement";
import {rehearsalMovements, MovementScope} from "./movementRecords";
import {rehearsalRouteDecisions} from "./routeDecisions";
import {practiceAccountabilityProjection} from "./accountability";
import {createHash, randomBytes, timingSafeEqual} from "node:crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {adminRolesFromToken} from "../admin/adminAuth";
import {requireAuth} from "../shared/auth";
import {requireScheduledEvent} from "../events/configuredEvent";
import {
  appCheckCallableOptions,
  appCheckCallableOptionsWithLimits,
} from "../shared/callableOptions";
import type {
  EventDocument,
  OrganizerDocument,
  EventRehearsalActionDocument,
  EventRehearsalActorDocument,
  EventRehearsalDocument,
  EventRehearsalGuestViewDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ControlEventRehearsalCallablePayload} from
  "../shared/generated/controlEventRehearsalCallablePayload";
import type {ControlEventRehearsalSpatialCallablePayload} from
  "../shared/generated/controlEventRehearsalSpatialCallablePayload";
import type {CreateEventRehearsalCallablePayload} from
  "../shared/generated/createEventRehearsalCallablePayload";
import type {CreateEventRehearsalCallableResponse} from
  "../shared/generated/createEventRehearsalCallableResponse";
import type {EventRehearsalBootstrapCallableResponse} from
  "../shared/generated/eventRehearsalBootstrapCallableResponse";
import type {EventRehearsalGuestBootstrapCallableResponse} from
  "../shared/generated/eventRehearsalGuestBootstrapCallableResponse";
import type {EventRehearsalReproductionCallableResponse} from
  "../shared/generated/eventRehearsalReproductionCallableResponse";
import type {GetEventRehearsalBootstrapCallablePayload} from
  "../shared/generated/getEventRehearsalBootstrapCallablePayload";
import type {GetEventRehearsalGuestBootstrapCallablePayload} from
  "../shared/generated/getEventRehearsalGuestBootstrapCallablePayload";
import type {InjectEventRehearsalBehaviorCallablePayload} from
  "../shared/generated/injectEventRehearsalBehaviorCallablePayload";
import type {ResetEventRehearsalCallablePayload} from
  "../shared/generated/resetEventRehearsalCallablePayload";
import type {RotateEventRehearsalGuestLinkCallablePayload} from
  "../shared/generated/rotateEventRehearsalGuestLinkCallablePayload";
import type {SubmitEventRehearsalGuestActionCallablePayload} from
  "../shared/generated/submitEventRehearsalGuestActionCallablePayload";
import type {UpdateEventRehearsalSetupCallablePayload} from
  "../shared/generated/updateEventRehearsalSetupCallablePayload";
import {
  validateControlEventRehearsalCallablePayload,
} from "../shared/generated/validators/controlEventRehearsalInput";
import {
  validateControlEventRehearsalSpatialCallablePayload,
} from
  "../shared/generated/validators/controlEventRehearsalSpatialInput";
import {
  validateCreateEventRehearsalCallablePayload,
} from "../shared/generated/validators/createEventRehearsalInput";
import {
  validateGetEventRehearsalBootstrapCallablePayload,
} from
  "../shared/generated/validators/getEventRehearsalBootstrapInput";
import {
  validateGetEventRehearsalGuestBootstrapCallablePayload,
} from
  "../shared/generated/validators/getEventRehearsalGuestBootstrapInput";
import {
  validateInjectEventRehearsalBehaviorCallablePayload,
} from
  "../shared/generated/validators/injectEventRehearsalBehaviorInput";
import {
  validateResetEventRehearsalCallablePayload,
} from "../shared/generated/validators/resetEventRehearsalInput";
import {
  validateRotateEventRehearsalGuestLinkCallablePayload,
} from
  "../shared/generated/validators/rotateEventRehearsalGuestLinkInput";
import {
  validateSubmitEventRehearsalGuestActionCallablePayload,
} from
  "../shared/generated/validators/submitEventRehearsalGuestActionInput";
import {
  validateUpdateEventRehearsalSetupCallablePayload,
} from
  "../shared/generated/validators/updateEventRehearsalSetupInput";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {buildConfiguredRehearsalActors, freezeRehearsalSetup,
  loadRehearsalRosterSnapshot, rehearsalUnitCount} from "./configuration";
import {
  actorAtMoment,
  applyRehearsalBehavior,
  applyRehearsalCues,
  applyRehearsalGuestAction,
  applyRehearsalSpatialAction,
  cuesBetween,
  eventRehearsalActionDocumentId,
  momentForStep,
  REHEARSAL_MAX_ACTIONS,
  REHEARSAL_MAX_ACTIVE_SESSIONS,
  REHEARSAL_RETENTION_MILLIS,
  rehearsalActorConnectionState,
  rehearsalGuestMoments,
  resolveRehearsalControl,
} from "./engine";

import {operationContentHash} from "../operations/durableActions";
import {isOrganizerManager} from "../shared/organizerHosts";
import {applyPracticeHostCommand, applyPracticeGuestReply,
  applyPracticeAutomations} from
  "./assistanceTransactions";
import {practiceMessageDocumentId, practiceMessageView, practiceDeliveryView,
  readPracticeMessage,
  rehearsalMessages, PracticeMessage} from "./assistanceRuntime";

import {preparePracticeHelp, practiceHelpProjection, rehearsalCases} from
  "./assistanceCases";
import {practiceDeliveryReviews} from "./assistanceDelivery";
import {practiceMembershipProjection} from "./membership";
import {applyPracticeRequiredDataSubmission,
  practiceRequiredDataReview, preparePracticeRequiredDataRequest} from
  "./requiredData";
import {practiceOutcomeReview, preparePracticeOutcome} from "./outcomes";
import {eventSuccessPrimitivesFor} from "../eventSuccess/formatPrimitives";
import {practiceRevealReview, preparePracticeReveal,
  settlePracticeReveal} from "./reveal";
import {practiceAllocationReview, preparePracticeAllocation,
  type PracticeAllocationCommand} from "./allocation";
import {buildPracticeRosterSource, practiceRosterReview,
  preparePracticeRosterReconciliation} from "./rosterReconciliation";
import {BRAND} from "../shared/generated/brand";

const sessions = "eventRehearsals";
const actors = "eventRehearsalActors";
const actions = "eventRehearsalActions";
const guestViews = "eventRehearsalGuestViews";
const websiteBaseUrl = (process.env.WEBSITE_BASE_URL ??
  BRAND.web.origin).replace(/\/$/u, "");

type RehearsalSetup = EventRehearsalDocument["setup"];
type Firestore = FirebaseFirestore.Firestore;

interface CreateOverrides {
  setup?: RehearsalSetup;
  sourceEventRevision?: string | null;
  clubId?: string;
  rosterSnapshot?: EventRehearsalDocument["rosterSnapshot"];
}

/** Creates an isolated rehearsal and its deterministic synthetic roster. */
export async function createEventRehearsalHandler(
  request: CallableRequest<unknown>,
  db: Firestore = admin.firestore()
): Promise<CreateEventRehearsalCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<CreateEventRehearsalCallablePayload>(
    request,
    validateCreateEventRehearsalCallablePayload
  );
  await checkRateLimit(db, uid, "createEventRehearsal", {
    maxRequests: 10, windowMs: 60 * 60 * 1000,
  });
  await requireOrganizerManager({
    db,
    organizerId: data.organizerId,
    actorUid: uid,
  });
  await assertActiveSessionLimit(db, uid);
  return createSession(db, uid, data);
}

/** Returns Host-authorized state without reading live runtime data. */
export async function getEventRehearsalBootstrapHandler(
  request: CallableRequest<unknown>
): Promise<EventRehearsalBootstrapCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetEventRehearsalBootstrapCallablePayload
  >(
    request,
    validateGetEventRehearsalBootstrapCallablePayload
  );
  const db = admin.firestore();
  await checkRateLimit(db, uid, "getEventRehearsalBootstrap", {
    maxRequests: 90, windowMs: 60 * 1000,
  });
  const session = await requireHostSession(db, data.sessionId, uid);
  await maybeApplyReadFault(session);
  return hostProjection(db, data.sessionId, session, request, undefined,
    data.practiceOperatorId);
}

/** Detailed movement history is fetched on demand, with bounded pagination. */
export async function getEventRehearsalMovementHandler(
  request: CallableRequest<unknown>): Promise<MovementReview> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<MovementInput>(request,
    validateGetEventRehearsalMovementCallablePayload);
  const db = admin.firestore();
  await checkRateLimit(db, uid, "getEventRehearsalMovement", {
    maxRequests: 90, windowMs: 60 * 1000,
  });
  return hostMovementReview(db, uid, data);
}
async function hostMovementReview(db: Firestore, uid: string,
  data: MovementInput): Promise<MovementReview> {
  return db.runTransaction(async (tx) => {
    const [sessionSnap, actorSnaps] = await Promise.all([
      tx.get(db.collection(sessions).doc(data.sessionId)),
      tx.get(db.collection(actors).where("sessionId", "==", data.sessionId)
        .limit(51)),
    ]);
    const session = requireSession(sessionSnap);
    if (session.setupRevision !== data.expectedSetupRevision) {
      throw new HttpsError("aborted", "This rehearsal was reset.");
    }
    const organizer = await requireCurrentHostAuthority(db, tx, session, uid);
    const review = await practiceMovementReview(db, tx, data.sessionId,
      session, actorSnaps.docs.map((doc) =>
        requireDoc<EventRehearsalActorDocument>(doc,
          "EventRehearsalActorDocument")), data.scope,
      practiceRoleAuthority(data.sessionId, session, {organizer, actorUid: uid},
        data.practiceOperatorId));
    if (session.expiresAt.toMillis() <= Date.now()) {
      throw new HttpsError("not-found", "This dress rehearsal has expired.");
    }
    if (!validateEventRehearsalMovementCallableResponse(review)) {
      throw new HttpsError("failed-precondition",
        "Movement review unavailable.");
    }
    return review;
  });
}

/** Updates the frozen safe snapshot while the rehearsal is not running. */
export async function updateEventRehearsalSetupHandler(
  request: CallableRequest<unknown>,
  db: Firestore = admin.firestore()
): Promise<EventRehearsalBootstrapCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    UpdateEventRehearsalSetupCallablePayload
  >(
    request,
    validateUpdateEventRehearsalSetupCallablePayload
  );
  await checkRateLimit(db, uid, "updateEventRehearsalSetup", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireHostSession(db, data.sessionId, uid);
  const sessionRef = db.collection(sessions).doc(data.sessionId);
  const actorQuery = db.collection(actors)
    .where("sessionId", "==", data.sessionId);
  const guestViewQuery = db.collection(guestViews)
    .where("sessionId", "==", data.sessionId);
  await db.runTransaction(async (tx) => {
    const [snap, actorSnaps, guestViewSnaps] = await Promise.all([
      tx.get(sessionRef),
      tx.get(actorQuery),
      tx.get(guestViewQuery),
    ]);
    const session = requireSession(snap);
    if (!["draft", "ready"].includes(session.status)) {
      throw new HttpsError(
        "failed-precondition",
        "Setup is frozen after a rehearsal starts. Reset or fork the run."
      );
    }
    if (session.setupRevision !== data.expectedRevision) {
      throw staleRevision(session.setupRevision);
    }
    const now = admin.firestore.Timestamp.now();
    if (session.guestSource === "event" &&
        data.actorCount !== session.actorCount) {
      throw new HttpsError(
        "failed-precondition", "A copied roster cannot be resized."
      );
    }
    const nextSetup = freezeRehearsalSetup({
      ...session.setup,
      ...data.setup,
      ...(session.setup.movementSimulation &&
          !data.setup.movementSimulation ? {
          movementSimulation: session.setup.movementSimulation,
        } : {}),
    });
    const nextActors = buildConfiguredRehearsalActors(
      data.sessionId, data.actorCount, session.seed, now,
      session.rosterSnapshot, nextSetup
    );
    const nextActorDocumentIds = new Set(nextActors.map((actor) =>
      actorDocumentId(data.sessionId, actor.actorId)
    ));
    tx.update(sessionRef, {
      setup: nextSetup,
      scenarioId: data.scenarioId,
      actorCount: data.actorCount,
      setupRevision: session.setupRevision + 1,
      staff: admin.firestore.FieldValue.delete(),
      assistanceSettings: admin.firestore.FieldValue.delete(),
      unitOutcomes: admin.firestore.FieldValue.delete(),
      revealControl: admin.firestore.FieldValue.delete(),
      allocationState: admin.firestore.FieldValue.delete(),
      rosterReconciliation: buildPracticeRosterSource(data.sessionId,
        session.setupRevision + 1, data.scenarioId, nextActors),
      updatedAt: now,
    });
    for (const actorSnap of actorSnaps.docs) {
      if (!nextActorDocumentIds.has(actorSnap.id)) tx.delete(actorSnap.ref);
    }
    for (const actor of nextActors) {
      tx.set(
        db.collection(actors).doc(
          actorDocumentId(data.sessionId, actor.actorId)
        ),
        actor
      );
    }
    for (const guestViewSnap of guestViewSnaps.docs) {
      tx.delete(guestViewSnap.ref);
    }
  });
  return hostProjection(
    db,
    data.sessionId,
    await requireHostSession(db, data.sessionId, uid),
    request
  );
}

/** Applies lifecycle, playbook-step, and virtual-clock actions atomically. */
export async function controlEventRehearsalHandler(
  request: CallableRequest<unknown>,
  db: Firestore = admin.firestore()
): Promise<EventRehearsalBootstrapCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<ControlEventRehearsalCallablePayload>(
    request,
    validateControlEventRehearsalCallablePayload
  );
  await checkRateLimit(db, uid, "controlEventRehearsal", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  const authorized = await requireHostSession(db, data.sessionId, uid);
  const sessionRef = db.collection(sessions).doc(data.sessionId);
  const actorQuery = db.collection(actors)
    .where("sessionId", "==", data.sessionId).limit(51);
  const actionRef = db.collection(actions)
    .doc(eventRehearsalActionDocumentId(
      data.sessionId,
      "host",
      data.clientActionId
    ));
  const requestHash = operationContentHash([uid, data]);
  const previous = await actionRef.get();
  requireAssistanceGeneration(authorized, data);
  if (previous.exists) {
    requireAssistanceReceipt(previous, requestHash,
      ["assistance", "movement", "staff", "settings", "requiredData",
        "outcome", "reveal", "allocation", "roster"]
        .includes(data.action));
    return hostProjection(db, data.sessionId,
      await requireHostSession(db, data.sessionId, uid), request,
      data.movement ? practiceMovementScope(data.movement) : undefined,
      data.practiceOperatorId);
  }
  await maybeApplyActionFault(db, data.sessionId, authorized);
  await db.runTransaction(async (tx) => {
    const [sessionSnap, actorSnaps, actionSnap] = await Promise.all([
      tx.get(sessionRef),
      tx.get(actorQuery),
      tx.get(actionRef),
    ]);
    const session = requireSession(sessionSnap);
    requireAssistanceGeneration(session, data);
    const organizer = await requireCurrentHostAuthority(db, tx, session, uid);
    if (actionSnap.exists) {
      requireAssistanceReceipt(actionSnap, requestHash,
        ["assistance", "movement", "staff", "settings", "requiredData",
          "outcome", "reveal", "allocation", "roster"]
          .includes(data.action));
      return;
    }
    assertActionCapacity(session);
    assertCurrentRevision(session, data.expectedRevision);
    if (actorSnaps.size > 50) {
      throw new HttpsError(
        "resource-exhausted",
        "Rehearsal roster is too large."
      );
    }
    if (data.action === "staff") {
      const staff = preparePracticeStaffChange(data.sessionId, session,
        {organizer, actorUid: uid}, data.staff!);
      const now = admin.firestore.Timestamp.now();
      if (session.expiresAt.toMillis() <= now.toMillis()) {
        throw new HttpsError("not-found", "This dress rehearsal has expired.");
      }
      tx.update(sessionRef, {staff,
        runtimeRevision: session.runtimeRevision + 1,
        actionCount: session.actionCount + 1, updatedAt: now});
      tx.create(actionRef, actionDocument({sessionId: data.sessionId,
        clientActionId: data.clientActionId, actorUid: uid, actorId: null,
        kind: "control", name: "staff:" + data.staff!.decision.kind,
        requestHash,
        runtimeRevision: session.runtimeRevision + 1,
        virtualNow: session.virtualNow, createdAt: now}));
      return;
    }
    if (data.action === "roster") {
      const roster = preparePracticeRosterReconciliation(session,
        data.roster!, uid, data.clientActionId);
      const now = admin.firestore.Timestamp.now();
      if (session.expiresAt.toMillis() <= now.toMillis()) {
        throw new HttpsError("not-found", "This dress rehearsal has expired.");
      }
      tx.update(sessionRef, {rosterReconciliation: roster.state,
        runtimeRevision: session.runtimeRevision + 1,
        actionCount: session.actionCount + 1, updatedAt: now});
      tx.create(actionRef, actionDocument({sessionId: data.sessionId,
        clientActionId: data.clientActionId, actorUid: uid, actorId: null,
        kind: "control", name: "roster:reconcile", requestHash,
        runtimeRevision: session.runtimeRevision + 1,
        virtualNow: session.virtualNow, createdAt: now}));
      return;
    }
    const roleAuthority = practiceRoleAuthority(data.sessionId, session,
      {organizer, actorUid: uid}, data.practiceOperatorId);
    if (data.action === "allocation") {
      const actorValues = actorSnaps.docs.map((doc) =>
        requireDoc<EventRehearsalActorDocument>(doc,
          "EventRehearsalActorDocument"));
      const now = admin.firestore.Timestamp.now();
      if (session.expiresAt.toMillis() <= now.toMillis()) {
        throw new HttpsError("not-found", "This dress rehearsal has expired.");
      }
      const allocation = preparePracticeAllocation(data.sessionId, session,
        actorValues, data.allocation as PracticeAllocationCommand, uid,
        data.clientActionId, now);
      for (const actor of allocation.actors) {
        tx.set(db.collection(actors).doc(actorDocumentId(data.sessionId,
          actor.actorId)), actor);
      }
      tx.update(sessionRef, {allocationState: allocation.state,
        runtimeRevision: session.runtimeRevision + 1,
        actionCount: session.actionCount + 1, updatedAt: now});
      tx.create(actionRef, actionDocument({sessionId: data.sessionId,
        clientActionId: data.clientActionId, actorUid: uid, actorId: null,
        kind: "control", name: "allocation:" + data.allocation!.kind,
        requestHash, runtimeRevision: session.runtimeRevision + 1,
        virtualNow: session.virtualNow, createdAt: now}));
      return;
    }
    if (data.action === "reveal") {
      const actorValues = actorSnaps.docs.map((doc) =>
        requireDoc<EventRehearsalActorDocument>(doc,
          "EventRehearsalActorDocument"));
      if (actorValues.length !== session.actorCount ||
          new Set(actorValues.map((actor) => actor.actorId)).size !==
            actorValues.length ||
          actorValues.some((actor) => actor.sessionId !== data.sessionId)) {
        throw new HttpsError("failed-precondition", "Practice roster changed.");
      }
      const reveal = preparePracticeReveal(session, data.reveal!);
      const now = admin.firestore.Timestamp.now();
      if (session.expiresAt.toMillis() <= now.toMillis()) {
        throw new HttpsError("not-found", "This dress rehearsal has expired.");
      }
      const revealStep = rehearsalGuestMoments.indexOf("reveal");
      const activeStepIndex = reveal.publishedNow ? revealStep :
        session.activeStepIndex;
      const nextActors = reveal.publishedNow ?
        await applyPracticeAutomations(db, tx, {...session,
          revealControl: reveal.state, activeStepIndex,
          runtimeRevision: session.runtimeRevision + 1},
        actorValues.map((actor) => actorAtMoment(actor, "reveal", now))) : [];
      for (const actor of nextActors) {
        tx.set(db.collection(actors).doc(actorDocumentId(data.sessionId,
          actor.actorId)), actor);
      }
      tx.update(sessionRef, {revealControl: reveal.state, activeStepIndex,
        runtimeRevision: session.runtimeRevision + 1,
        actionCount: session.actionCount + 1, updatedAt: now});
      tx.create(actionRef, actionDocument({sessionId: data.sessionId,
        clientActionId: data.clientActionId, actorUid: uid, actorId: null,
        kind: "control", name: "reveal:" + data.reveal!.action, requestHash,
        runtimeRevision: session.runtimeRevision + 1,
        virtualNow: session.virtualNow, createdAt: now}));
      return;
    }
    if (data.action === "outcome") {
      const actorValues = actorSnaps.docs.map((doc) =>
        requireDoc<EventRehearsalActorDocument>(doc,
          "EventRehearsalActorDocument"));
      if (actorValues.length !== session.actorCount ||
          new Set(actorValues.map((actor) => actor.actorId)).size !==
            actorValues.length ||
          actorValues.some((actor) => actor.sessionId !== data.sessionId)) {
        throw new HttpsError("failed-precondition", "Practice roster changed.");
      }
      const unitOutcomes = preparePracticeOutcome(session, actorValues,
        data.outcome!, uid, data.clientActionId);
      const now = admin.firestore.Timestamp.now();
      if (session.expiresAt.toMillis() <= now.toMillis()) {
        throw new HttpsError("not-found", "This dress rehearsal has expired.");
      }
      tx.update(sessionRef, {unitOutcomes,
        runtimeRevision: session.runtimeRevision + 1,
        actionCount: session.actionCount + 1, updatedAt: now});
      tx.create(actionRef, actionDocument({sessionId: data.sessionId,
        clientActionId: data.clientActionId, actorUid: uid, actorId: null,
        kind: "control", name: "outcome:record", requestHash,
        runtimeRevision: session.runtimeRevision + 1,
        virtualNow: session.virtualNow, createdAt: now}));
      return;
    }
    if (data.action === "requiredData") {
      const command = data.requiredData!;
      const target = actorSnaps.docs.find((doc) =>
        doc.data().actorId === command.attendeeId);
      if (!target) {
        throw new HttpsError("not-found", "Practice guest not found.");
      }
      const actor = requireDoc<EventRehearsalActorDocument>(target,
        "EventRehearsalActorDocument");
      if (actor.sessionId !== data.sessionId) {
        throw new HttpsError("failed-precondition",
          "Practice actor scope changed.");
      }
      const next = preparePracticeRequiredDataRequest(session, actor, command);
      const now = admin.firestore.Timestamp.now();
      if (session.expiresAt.toMillis() <= now.toMillis()) {
        throw new HttpsError("not-found", "This dress rehearsal has expired.");
      }
      tx.set(target.ref, {...next, updatedAt: now});
      tx.update(sessionRef, {runtimeRevision: session.runtimeRevision + 1,
        actionCount: session.actionCount + 1, updatedAt: now});
      tx.create(actionRef, actionDocument({sessionId: data.sessionId,
        clientActionId: data.clientActionId, actorUid: uid,
        actorId: actor.actorId, kind: "control",
        name: "requiredData:request", requestHash,
        runtimeRevision: session.runtimeRevision + 1,
        virtualNow: session.virtualNow, createdAt: now}));
      return;
    }
    if (data.action === "settings") {
      const actorValues = actorSnaps.docs.map((doc) =>
        requireDoc<EventRehearsalActorDocument>(doc,
          "EventRehearsalActorDocument"));
      if (actorValues.length !== session.actorCount ||
          new Set(actorValues.map((a) => a.actorId)).size !==
            actorValues.length ||
          actorValues.some((actor) => actor.sessionId !== data.sessionId)) {
        throw new HttpsError("failed-precondition", "Practice roster changed.");
      }
      const assistanceSettings = preparePracticeSettings(data.sessionId,
        session, actorValues, data.settings!, roleAuthority);
      const nextActors = await applyPracticeAutomations(db, tx,
        {...session, assistanceSettings,
          runtimeRevision: session.runtimeRevision + 1}, actorValues);
      const now = admin.firestore.Timestamp.now();
      if (session.expiresAt.toMillis() <= now.toMillis()) {
        throw new HttpsError("not-found", "This dress rehearsal has expired.");
      }
      for (const actor of nextActors) {
        tx.set(db.collection(actors).doc(actorDocumentId(data.sessionId,
          actor.actorId)), {...actor, updatedAt: now});
      }
      tx.update(sessionRef, {assistanceSettings,
        runtimeRevision: session.runtimeRevision + 1,
        actionCount: session.actionCount + 1, updatedAt: now});
      tx.create(actionRef, actionDocument({sessionId: data.sessionId,
        clientActionId: data.clientActionId, actorUid: uid, actorId: null,
        kind: "control", name: "settings:" + data.settings!.kind, requestHash,
        runtimeRevision: session.runtimeRevision + 1,
        virtualNow: session.virtualNow, createdAt: now}));
      return;
    }
    if (data.action === "movement") {
      const command = data.movement!;
      const commit = await preparePracticeMovementCommand(db, tx,
        data.sessionId, session, actorSnaps.docs.map((doc) =>
          requireDoc<EventRehearsalActorDocument>(doc,
            "EventRehearsalActorDocument")), command,
        roleAuthority, data.clientActionId);
      const pendingProgress = commit.confirmedDeparture ??
        commit.routeDecision;
      const nextActors = pendingProgress ?
        await applyPracticeAutomations(db, tx,
          {...session, runtimeRevision: session.runtimeRevision + 1},
          actorSnaps.docs.map((doc) =>
            requireDoc<EventRehearsalActorDocument>(doc,
              "EventRehearsalActorDocument")), pendingProgress) :
        commit.actorChanges ?? [];
      const now = admin.firestore.Timestamp.now();
      if (session.expiresAt.toMillis() <= now.toMillis()) {
        throw new HttpsError("not-found", "This dress rehearsal has expired.");
      }
      commit.commit();
      for (const actor of nextActors) {
        tx.set(db.collection(actors).doc(actorDocumentId(data.sessionId,
          actor.actorId)), actor);
      }
      tx.update(sessionRef, {runtimeRevision: session.runtimeRevision + 1,
        actionCount: session.actionCount + 1, updatedAt: now});
      tx.create(actionRef, actionDocument({sessionId: data.sessionId,
        clientActionId: data.clientActionId, actorUid: uid, actorId: null,
        kind: "control", name: "movement:" + command.kind, requestHash,
        runtimeRevision: session.runtimeRevision + 1,
        virtualNow: session.virtualNow, createdAt: now}));
      return;
    }
    if (data.action === "assistance") {
      const command = data.assistance!;
      if (command.kind === "transferGroup") {
        practiceMembershipProjection(data.sessionId, session,
          actorSnaps.docs.map((doc) => requireDoc<EventRehearsalActorDocument>(
            doc, "EventRehearsalActorDocument")), roleAuthority);
      }
      const target = actorSnaps.docs.find((doc) =>
        doc.data().actorId === command.actorId);
      if (!target) {
        throw new HttpsError("not-found",
          "Practice guest not found.");
      }
      const actor = requireDoc<EventRehearsalActorDocument>(target,
        "EventRehearsalActorDocument");
      if (actor.sessionId !== data.sessionId) {
        throw new HttpsError("failed-precondition",
          "Practice actor scope changed.");
      }
      const next = await applyPracticeHostCommand(db, tx, session, actor,
        command, {...roleAuthority, operationId: data.clientActionId});
      const now = admin.firestore.Timestamp.now();
      tx.set(target.ref, {...next, updatedAt: now});
      tx.update(sessionRef, {runtimeRevision: session.runtimeRevision + 1,
        actionCount: session.actionCount + 1, updatedAt: now});
      tx.create(actionRef, actionDocument({sessionId: data.sessionId,
        clientActionId: data.clientActionId, actorUid: uid,
        actorId: actor.actorId,
        kind: "control", name: "assistance:" + command.kind, requestHash,
        runtimeRevision: session.runtimeRevision + 1,
        virtualNow: session.virtualNow, createdAt: now}));
      return;
    }
    const resolved = resolveControlOrThrow(session, data);
    const now = admin.firestore.Timestamp.now();
    const virtualNow = admin.firestore.Timestamp.fromMillis(
      resolved.virtualNowMillis
    );
    const nextRevision = session.runtimeRevision + 1;
    const actorDocuments = actorSnaps.docs.map((doc) => ({
      ref: doc.ref,
      value: requireDoc<EventRehearsalActorDocument>(
        doc,
        "EventRehearsalActorDocument"
      ),
    })).sort((a, b) => a.value.actorId.localeCompare(b.value.actorId));
    if (actorDocuments.length !== session.actorCount) {
      throw new HttpsError(
        "failed-precondition",
        "Practice guests are missing. Reset this rehearsal before continuing."
      );
    }
    const cues = data.action === "advanceClock" ? cuesBetween(
      session.scenarioId,
      session.virtualStartedAt.toMillis(),
      session.virtualNow.toMillis(),
      resolved.virtualNowMillis,
      session.actorCount
    ) : [];
    const provisionalSession = {...session, status: resolved.status,
      activeStepIndex: resolved.activeStepIndex, virtualNow,
      runtimeRevision: nextRevision};
    const revealControl = settlePracticeReveal(provisionalSession);
    const revealPublished = session.revealControl?.status === "countingDown" &&
      revealControl.status === "revealed" &&
      revealControl.publishedRound > session.revealControl.publishedRound;
    const activeStepIndex = revealPublished ?
      rehearsalGuestMoments.indexOf("reveal") : resolved.activeStepIndex;
    const nextSession = {...provisionalSession, activeStepIndex,
      ...(session.revealControl ? {revealControl} : {})};
    const nextActors = await applyPracticeAutomations(db, tx, nextSession,
      applyRehearsalCues(actorDocuments.map((actor) =>
        actorAtMoment(actor.value, momentForStep(activeStepIndex), now)
      ), cues, now, session.virtualStartedAt.toMillis()));
    if (resolved.status === "complete") {
      tx.set(db.collection("eventRehearsalMilestones")
        .doc(session.organizerId), {
        organizerId: session.organizerId, completedAt: now,
      });
    }
    tx.update(sessionRef, {
      status: resolved.status,
      activeStepIndex,
      virtualNow,
      ...(session.revealControl ? {revealControl} : {}),
      runtimeRevision: nextRevision,
      actionCount: session.actionCount + 1,
      updatedAt: now,
      completedAt: resolved.status === "complete" ? now : null,
    });
    for (const [index, actor] of actorDocuments.entries()) {
      tx.set(actor.ref, nextActors[index]);
    }
    tx.create(actionRef, actionDocument({
      sessionId: data.sessionId,
      clientActionId: data.clientActionId,
      actorUid: uid,
      actorId: null,
      kind: "control",
      name: data.action,
      requestHash,
      runtimeRevision: nextRevision,
      virtualNow,
      createdAt: now,
    }));
  });
  return hostProjection(
    db,
    data.sessionId,
    await requireHostSession(db, data.sessionId, uid),
    request,
    data.movement ? practiceMovementScope(data.movement) : undefined,
    data.practiceOperatorId
  );
}

/** Injects a behavior or a privileged QA fault into the isolated domain. */
export async function injectEventRehearsalBehaviorHandler(
  request: CallableRequest<unknown>
): Promise<EventRehearsalBootstrapCallableResponse> {
  const uid = requireAuth(request);
  const data =
    validateCallableWithAjv<InjectEventRehearsalBehaviorCallablePayload>(
      request,
      validateInjectEventRehearsalBehaviorCallablePayload
    );
  const db = admin.firestore();
  await checkRateLimit(db, uid, "injectEventRehearsalBehavior", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  await requireHostSession(db, data.sessionId, uid);
  if (data.faultId !== "none" && !canUseInternalFaults(request)) {
    throw new HttpsError(
      "permission-denied",
      "Advanced fault injection is limited to internal QA accounts."
    );
  }
  const sessionRef = db.collection(sessions).doc(data.sessionId);
  const actionRef = db.collection(actions)
    .doc(eventRehearsalActionDocumentId(
      data.sessionId,
      "host",
      data.clientActionId
    ));
  const actorRef = data.actorId ?
    db.collection(actors).doc(actorDocumentId(data.sessionId, data.actorId)) :
    null;
  const actorQuery = db.collection(actors)
    .where("sessionId", "==", data.sessionId);
  await db.runTransaction(async (tx) => {
    const reads = await Promise.all([
      tx.get(sessionRef),
      tx.get(actionRef),
      tx.get(actorQuery),
      ...(actorRef ? [tx.get(actorRef)] : []),
    ]);
    const session = requireSession(
      reads[0] as FirebaseFirestore.DocumentSnapshot
    );
    const actionSnap = reads[1] as FirebaseFirestore.DocumentSnapshot;
    const actorSnaps = reads[2] as FirebaseFirestore.QuerySnapshot;
    if (actionSnap.exists) return;
    assertActionCapacity(session);
    assertCurrentRevision(session, data.expectedRevision);
    await requireCurrentHostAuthority(db, tx, session, uid);
    if (data.behavior && !["running", "paused"].includes(session.status)) {
      throw new HttpsError(
        "failed-precondition",
        "Synthetic guest behavior is available only while the rehearsal " +
          "is running or paused."
      );
    }
    const now = admin.firestore.Timestamp.now();
    const nextRevision = session.runtimeRevision + 1;
    if (data.behavior) {
      if (!actorRef) {
        throw new HttpsError("invalid-argument", "actorId is required.");
      }
      const actorSnap = reads[3] as FirebaseFirestore.DocumentSnapshot;
      if (!actorSnap?.exists) {
        throw new HttpsError("not-found", "Synthetic actor not found.");
      }
      const actor = requireDoc<EventRehearsalActorDocument>(
        actorSnap,
        "EventRehearsalActorDocument"
      );
      const changedActor = applyRehearsalBehavior(
        actor,
        data.behavior,
        actorSnaps.docs.map((doc) =>
          requireDoc<EventRehearsalActorDocument>(
            doc,
            "EventRehearsalActorDocument"
          ).actorId
        ),
        now,
        session.virtualNow.toMillis()
      );
      const [nextActor] = await applyPracticeAutomations(db, tx,
        {...session, runtimeRevision: nextRevision}, [changedActor]);
      tx.set(actorRef, nextActor);
    }
    tx.update(sessionRef, {
      faultId: data.faultId,
      faultConsumed: false,
      runtimeRevision: nextRevision,
      actionCount: session.actionCount + 1,
      updatedAt: now,
    });
    tx.create(actionRef, actionDocument({
      sessionId: data.sessionId,
      clientActionId: data.clientActionId,
      actorUid: uid,
      actorId: data.actorId,
      kind: "behavior",
      name: data.behavior ?? `fault:${data.faultId}`,
      runtimeRevision: nextRevision,
      virtualNow: session.virtualNow,
      createdAt: now,
    }));
  });
  return hostProjection(
    db,
    data.sessionId,
    await requireHostSession(db, data.sessionId, uid),
    request
  );
}

/** Persists a revision-fenced Room placement for one synthetic actor. */
export async function controlEventRehearsalSpatialHandler(
  request: CallableRequest<unknown>
): Promise<EventRehearsalBootstrapCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    ControlEventRehearsalSpatialCallablePayload
  >(request, validateControlEventRehearsalSpatialCallablePayload);
  const db = admin.firestore();
  await checkRateLimit(db, uid, "controlEventRehearsalSpatial", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  await requireHostSession(db, data.sessionId, uid);
  const sessionRef = db.collection(sessions).doc(data.sessionId);
  const actorRef = db.collection(actors)
    .doc(actorDocumentId(data.sessionId, data.actorId));
  const actionRef = db.collection(actions)
    .doc(eventRehearsalActionDocumentId(
      data.sessionId,
      "host-spatial",
      data.clientActionId
    ));
  await db.runTransaction(async (tx) => {
    const [sessionSnap, actorSnap, actionSnap] = await Promise.all([
      tx.get(sessionRef),
      tx.get(actorRef),
      tx.get(actionRef),
    ]);
    if (actionSnap.exists) return;
    const session = requireSession(sessionSnap);
    assertActionCapacity(session);
    assertCurrentRevision(session, data.expectedRevision);
    await requireCurrentHostAuthority(db, tx, session, uid);
    if (!["running", "paused"].includes(session.status)) {
      throw new HttpsError(
        "failed-precondition",
        "Room placement is available only while the rehearsal is running " +
          "or paused."
      );
    }
    if (!actorSnap.exists) {
      throw new HttpsError("not-found", "Synthetic actor not found.");
    }
    const actor = requireDoc<EventRehearsalActorDocument>(
      actorSnap,
      "EventRehearsalActorDocument"
    );
    const now = admin.firestore.Timestamp.now();
    let nextActor: EventRehearsalActorDocument;
    try {
      nextActor = applyRehearsalSpatialAction(
        actor,
        data.action,
        data.destinationUnitId,
        data.scope,
        rehearsalUnitCount(session),
        now
      );
    } catch (error) {
      throw new HttpsError(
        "invalid-argument",
        error instanceof Error ? error.message : "Invalid Room placement."
      );
    }
    const nextRevision = session.runtimeRevision + 1;
    [nextActor] = await applyPracticeAutomations(db, tx,
      {...session, runtimeRevision: nextRevision}, [nextActor]);
    tx.set(actorRef, nextActor);
    tx.update(sessionRef, {
      runtimeRevision: nextRevision,
      actionCount: session.actionCount + 1,
      updatedAt: now,
    });
    tx.create(actionRef, actionDocument({
      sessionId: data.sessionId,
      clientActionId: data.clientActionId,
      actorUid: uid,
      actorId: data.actorId,
      kind: "spatial",
      name: data.destinationUnitId ?
        `${data.action}:${data.destinationUnitId}` : data.action,
      runtimeRevision: nextRevision,
      virtualNow: session.virtualNow,
      createdAt: now,
    }));
  });
  return hostProjection(
    db,
    data.sessionId,
    await requireHostSession(db, data.sessionId, uid),
    request
  );
}

/** Resets the current run or forks the frozen setup to a new session. */
export async function resetEventRehearsalHandler(
  request: CallableRequest<unknown>,
  db: Firestore = admin.firestore()
): Promise<
  CreateEventRehearsalCallableResponse |
  EventRehearsalBootstrapCallableResponse
> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<ResetEventRehearsalCallablePayload>(
    request,
    validateResetEventRehearsalCallablePayload
  );
  await checkRateLimit(db, uid, "resetEventRehearsal", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  const session = await requireHostSession(db, data.sessionId, uid);
  if (data.fork) {
    await assertActiveSessionLimit(db, uid);
    return createSession(db, uid, {
      organizerId: session.organizerId,
      sourceEventId: session.sourceEventId,
      scenarioId: session.scenarioId,
      seed: data.seed ?? session.seed,
      actorCount: session.actorCount,
      guestSource: session.guestSource ?? "simulated",
    }, {
      setup: session.setup,
      sourceEventRevision: session.sourceEventRevision,
      clubId: session.clubId,
      rosterSnapshot: session.rosterSnapshot,
    });
  }
  await deleteSessionChildren(db, data.sessionId);
  const now = admin.firestore.Timestamp.now();
  const nextActors = buildConfiguredRehearsalActors(
    data.sessionId, session.actorCount, data.seed ?? session.seed, now,
    session.rosterSnapshot, session.setup
  );
  await db.collection(sessions).doc(data.sessionId).update({
    seed: data.seed ?? session.seed,
    status: "draft",
    setupRevision: session.setupRevision + 1,
    runtimeRevision: 0,
    staff: admin.firestore.FieldValue.delete(),
    assistanceSettings: admin.firestore.FieldValue.delete(),
    unitOutcomes: admin.firestore.FieldValue.delete(),
    revealControl: admin.firestore.FieldValue.delete(),
    allocationState: admin.firestore.FieldValue.delete(),
    rosterReconciliation: buildPracticeRosterSource(data.sessionId,
      session.setupRevision + 1, session.scenarioId, nextActors),
    actionCount: 0,
    activeStepIndex: 0,
    virtualNow: now,
    virtualStartedAt: now,
    faultId: "none",
    faultConsumed: false,
    completedAt: null,
    updatedAt: now,
    expiresAt: admin.firestore.Timestamp.fromMillis(
      now.toMillis() + REHEARSAL_RETENTION_MILLIS
    ),
  });
  await writeActors(
    db,
    data.sessionId,
    nextActors
  );
  return hostProjection(
    db,
    data.sessionId,
    await requireHostSession(db, data.sessionId, uid),
    request
  );
}

/** Rotates the public id and secret, revoking existing guest slots. */
export async function rotateEventRehearsalGuestLinkHandler(
  request: CallableRequest<unknown>
): Promise<EventRehearsalBootstrapCallableResponse> {
  const uid = requireAuth(request);
  const data =
    validateCallableWithAjv<RotateEventRehearsalGuestLinkCallablePayload>(
      request,
      validateRotateEventRehearsalGuestLinkCallablePayload
    );
  const db = admin.firestore();
  await checkRateLimit(db, uid, "rotateEventRehearsalGuestLink", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  await requireHostSession(db, data.sessionId, uid);
  await deleteBySession(db, guestViews, data.sessionId);
  const publicRehearsalId = randomToken(24);
  await db.collection(sessions).doc(data.sessionId).update({
    publicRehearsalId,
    viewerTokenHash: sha256(publicRehearsalId),
    updatedAt: admin.firestore.Timestamp.now(),
  });
  const next = await requireHostSession(db, data.sessionId, uid);
  return hostProjection(db, data.sessionId, next, request);
}

/** Redeems a share secret into a short-lived anonymous synthetic guest slot. */
export async function getEventRehearsalGuestBootstrapHandler(
  request: CallableRequest<unknown>
): Promise<EventRehearsalGuestBootstrapCallableResponse> {
  const data =
    validateCallableWithAjv<GetEventRehearsalGuestBootstrapCallablePayload>(
      request,
      validateGetEventRehearsalGuestBootstrapCallablePayload
    );
  const db = admin.firestore();
  await checkRateLimit(
    db,
    guestRateLimitIdentity(data.publicRehearsalId, data.clientInstanceId),
    "getEventRehearsalGuestBootstrap",
    {maxRequests: 90, windowMs: 60 * 1000}
  );
  const resolved = await resolvePublicSession(db, data.publicRehearsalId);
  await maybeApplyGuestReadFault(resolved.session);
  const view = await resolveOrRedeemGuestView({
    db,
    sessionId: resolved.id,
    session: resolved.session,
    clientInstanceId: data.clientInstanceId,
    viewerToken: data.viewerToken,
    slotToken: data.slotToken,
  });
  const actorSnap = await db.collection(actors)
    .doc(actorDocumentId(resolved.id, view.actorId)).get();
  if (!actorSnap.exists) {
    throw new HttpsError("not-found", "Practice guest is no longer available.");
  }
  await db.collection(guestViews).doc(
    guestViewDocumentId(resolved.id, view.slotId)
  ).update({lastSeenAt: admin.firestore.Timestamp.now()});
  const actor = requireDoc<EventRehearsalActorDocument>(actorSnap,
    "EventRehearsalActorDocument");
  return guestMessageProjection(db, resolved.session, actor, view.slotToken);
}

/** Applies a guest action only to the slot's synthetic actor. */
export async function submitEventRehearsalGuestActionHandler(
  request: CallableRequest<unknown>
): Promise<EventRehearsalGuestBootstrapCallableResponse> {
  const data =
    validateCallableWithAjv<SubmitEventRehearsalGuestActionCallablePayload>(
      request,
      validateSubmitEventRehearsalGuestActionCallablePayload
    );
  const db = admin.firestore();
  await checkRateLimit(
    db,
    guestRateLimitIdentity(data.publicRehearsalId, data.slotToken),
    "submitEventRehearsalGuestAction",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  const resolved = await resolvePublicSession(db, data.publicRehearsalId);
  const slotId = data.slotToken.slice(0, 24);
  const viewRef = db.collection(guestViews)
    .doc(guestViewDocumentId(resolved.id, slotId));
  const sessionRef = db.collection(sessions).doc(resolved.id);
  const actionRef = db.collection(actions)
    .doc(eventRehearsalActionDocumentId(
      resolved.id,
      `guest-${slotId}`,
      data.clientActionId
    ));
  const requestHash = operationContentHash([resolved.id, slotId, data]);
  let actorId: string | null = null;
  await db.runTransaction(async (tx) => {
    const [sessionSnap, viewSnap, actionSnap] = await Promise.all([
      tx.get(sessionRef),
      tx.get(viewRef),
      tx.get(actionRef),
    ]);
    if (actionSnap.exists && data.action !== "respondToAssistance" &&
        !actionSnap.get("requestHash")) return;
    const session = requireSession(sessionSnap);
    if (session.publicRehearsalId !== data.publicRehearsalId) {
      throw new HttpsError(
        "permission-denied",
        "Dress rehearsal link expired."
      );
    }
    const view = requireGuestViewSnapshot(viewSnap, data.slotToken);
    actorId = view.actorId;
    if (actionSnap.exists) {
      requireAssistanceReceipt(actionSnap, requestHash, true);
      return;
    }
    const actorRef = db.collection(actors)
      .doc(actorDocumentId(resolved.id, view.actorId));
    const actorSnap = await tx.get(actorRef);
    assertActionCapacity(session);
    if (!["running", "paused"].includes(session.status)) {
      throw new HttpsError(
        "failed-precondition",
        "Guest controls are available only while the dress rehearsal is " +
          "running or paused."
      );
    }
    if (!actorSnap.exists) {
      throw new HttpsError("not-found", "Practice guest not found.");
    }
    const actor = requireDoc<EventRehearsalActorDocument>(
      actorSnap,
      "EventRehearsalActorDocument"
    );
    const now = admin.firestore.Timestamp.now();
    const nextRevision = session.runtimeRevision + 1;
    if (actor.sessionId !== resolved.id || actor.actorId !== view.actorId) {
      throw new HttpsError("failed-precondition",
        "Practice actor scope changed.");
    }
    const nextSession = {...session, runtimeRevision: nextRevision};
    const help = data.action === "askForHelp" ?
      await preparePracticeHelp(db, tx, nextSession, actor,
        {kind: "guestAction", actionId: actionRef.id}, "other") : null;
    const nextActor = data.action === "respondToAssistance" ?
      await applyPracticeGuestReply(db, tx, nextSession, actor, {
        messageId: data.messageId!, intentRevision: data.intentRevision!,
        choiceId: data.choiceId!, requestId: data.clientActionId,
        actionId: "practice:" + operationContentHash([
          resolved.id, slotId, data.clientActionId])}) :
      (await applyPracticeAutomations(db, tx, nextSession,
        [help?.actor ??
          (data.action === "submitRequiredData" ?
            applyPracticeRequiredDataSubmission(session, actor,
              data.requiredData!) :
            applyRehearsalGuestAction(actor, data.action, now,
              session.virtualNow.toMillis()))]))[0];
    help?.commit();
    tx.set(actorRef, {...nextActor, lastActionAt: now, updatedAt: now});
    tx.update(sessionRef, {
      runtimeRevision: nextRevision,
      actionCount: session.actionCount + 1,
      updatedAt: now,
    });
    tx.create(actionRef, actionDocument({
      sessionId: resolved.id,
      clientActionId: data.clientActionId,
      actorUid: null,
      actorId: actor.actorId,
      kind: "guest",
      name: data.action,
      requestHash,
      runtimeRevision: nextRevision,
      virtualNow: session.virtualNow,
      createdAt: now,
    }));
  });
  const latest = await requirePublicSessionById(db, resolved.id);
  if (!actorId) {
    const existingAction = requireDoc<EventRehearsalActionDocument>(
      await actionRef.get(),
      "EventRehearsalActionDocument"
    );
    actorId = existingAction.actorId;
  }
  if (!actorId) {
    throw new HttpsError("not-found", "Practice guest not found.");
  }
  const actorSnap = await db.collection(actors)
    .doc(actorDocumentId(resolved.id, actorId)).get();
  const actor = requireDoc<EventRehearsalActorDocument>(actorSnap,
    "EventRehearsalActorDocument");
  return guestMessageProjection(db, latest, actor, data.slotToken);
}

/** Completes a rehearsal through the Host-control lifecycle invariant. */
export async function completeEventRehearsalHandler(
  request: CallableRequest<unknown>
): Promise<EventRehearsalBootstrapCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetEventRehearsalBootstrapCallablePayload
  >(
    request,
    validateGetEventRehearsalBootstrapCallablePayload
  );
  const db = admin.firestore();
  await checkRateLimit(db, uid, "completeEventRehearsal", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  if (data.practiceOperatorId) {
    throw new HttpsError("invalid-argument",
      "This rehearsal control belongs to the Host, not a practice role.");
  }
  await requireHostSession(db, data.sessionId, uid);
  const sessionRef = db.collection(sessions).doc(data.sessionId);
  const actorQuery = db.collection(actors)
    .where("sessionId", "==", data.sessionId);
  const actionRef = db.collection(actions).doc(
    eventRehearsalActionDocumentId(
      data.sessionId,
      "system",
      "system_complete"
    )
  );
  await db.runTransaction(async (tx) => {
    const [sessionSnap, actorSnaps, actionSnap] = await Promise.all([
      tx.get(sessionRef),
      tx.get(actorQuery),
      tx.get(actionRef),
    ]);
    const session = requireSession(sessionSnap);
    if (session.status === "complete" || actionSnap.exists) return;
    assertActionCapacity(session);
    const resolved = resolveControlOrThrow(session, {
      sessionId: data.sessionId,
      expectedRevision: session.runtimeRevision,
      clientActionId: "system_complete",
      action: "complete",
    });
    const now = admin.firestore.Timestamp.now();
    const nextRevision = session.runtimeRevision + 1;
    tx.update(sessionRef, {
      status: resolved.status,
      activeStepIndex: resolved.activeStepIndex,
      runtimeRevision: nextRevision,
      actionCount: session.actionCount + 1,
      completedAt: now,
      updatedAt: now,
    });
    for (const actorDoc of actorSnaps.docs) {
      const actor = requireDoc<EventRehearsalActorDocument>(
        actorDoc,
        "EventRehearsalActorDocument"
      );
      tx.set(actorDoc.ref, actorAtMoment(actor, "complete", now));
    }
    tx.create(actionRef, actionDocument({
      sessionId: data.sessionId,
      clientActionId: "system_complete",
      actorUid: uid,
      actorId: null,
      kind: "control",
      name: "complete",
      runtimeRevision: nextRevision,
      virtualNow: session.virtualNow,
      createdAt: now,
    }));
  });
  return hostProjection(
    db,
    data.sessionId,
    await requireHostSession(db, data.sessionId, uid),
    request
  );
}

/** Exports deterministic setup and action history without personal data. */
export async function exportEventRehearsalReproductionHandler(
  request: CallableRequest<unknown>
): Promise<EventRehearsalReproductionCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetEventRehearsalBootstrapCallablePayload
  >(
    request,
    validateGetEventRehearsalBootstrapCallablePayload
  );
  const db = admin.firestore();
  await checkRateLimit(db, uid, "exportEventRehearsalReproduction", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  if (data.practiceOperatorId) {
    throw new HttpsError("invalid-argument",
      "This rehearsal control belongs to the Host, not a practice role.");
  }
  const session = await requireHostSession(db, data.sessionId, uid);
  const actionSnaps = await db.collection(actions)
    .where("sessionId", "==", data.sessionId)
    .limit(REHEARSAL_MAX_ACTIONS)
    .get();
  return {
    schemaVersion: 1,
    sessionId: data.sessionId,
    scenarioId: session.scenarioId,
    seed: session.seed,
    setup: session.setup,
    actions: actionSnaps.docs.map((doc) => {
      const action = requireDoc<EventRehearsalActionDocument>(
        doc,
        "EventRehearsalActionDocument"
      );
      return {
        clientActionId: action.clientActionId,
        actorId: action.actorId,
        kind: action.kind,
        name: action.name,
        runtimeRevision: action.runtimeRevision,
        virtualNowMillis: action.virtualNow.toMillis(),
      };
    }).sort((a, b) => a.runtimeRevision - b.runtimeRevision),
  };
}

/** Hourly cleanup enforces the 24-hour product retention contract. */
export async function expireEventRehearsalsHandler(
  db: Firestore = admin.firestore(),
  now: FirebaseFirestore.Timestamp = admin.firestore.Timestamp.now()
): Promise<number> {
  const expired = await db.collection(sessions)
    .where("expiresAt", "<=", now).limit(200).get();
  for (const session of expired.docs) {
    await deleteSessionChildren(db, session.id);
    await session.ref.delete();
  }
  return expired.size;
}

async function createSession(
  db: Firestore,
  uid: string,
  data: CreateEventRehearsalCallablePayload,
  overrides: CreateOverrides = {}
): Promise<CreateEventRehearsalCallableResponse> {
  const now = admin.firestore.Timestamp.now();
  const sessionId = randomToken(18);
  const publicRehearsalId = randomToken(24);
  const source = data.sourceEventId && !overrides.setup ?
    await sourceSetup(db, data.organizerId, data.sourceEventId) : null;
  const guestSource = data.guestSource ?? "simulated";
  if (guestSource === "event" && !data.sourceEventId) {
    throw new HttpsError("invalid-argument", "Choose an event to copy guests.");
  }
  const rosterSnapshot = overrides.rosterSnapshot ??
    (guestSource === "event" ? await loadRehearsalRosterSnapshot(
      db, data.sourceEventId!, data.organizerId
    ) : undefined);
  const requestedSetup = overrides.setup ?? data.setup ??
    source?.setup ?? sampleSetup();
  const setup = freezeRehearsalSetup({
    ...requestedSetup,
    ...(source?.setup.movementSimulation &&
        (!requestedSetup.eventFormat ||
        requestedSetup.eventFormat.activityKind ===
        source.setup.eventFormat?.activityKind) ? {
        movementSimulation: source.setup.movementSimulation,
      } : {}),
  });
  const actorCount = rosterSnapshot?.length ?? data.actorCount;
  const running = data.startImmediately === true;
  const syntheticActors = buildConfiguredRehearsalActors(
    sessionId, actorCount, data.seed, now, rosterSnapshot, setup
  ).map((actor) => running ? actorAtMoment(actor, "checkIn", now) : actor);
  const session: EventRehearsalDocument = {
    organizerId: data.organizerId,
    clubId: overrides.clubId ?? source?.clubId ?? data.organizerId,
    ownerUid: uid,
    sourceEventId: data.sourceEventId,
    sourceEventRevision: overrides.sourceEventRevision ??
      source?.revision ?? null,
    publicRehearsalId,
    viewerTokenHash: sha256(publicRehearsalId),
    scenarioId: data.scenarioId,
    seed: data.seed,
    actorCount,
    guestSource,
    ...(rosterSnapshot ? {rosterSnapshot} : {}),
    actionCount: 0,
    status: running ? "running" : "draft",
    setup,
    setupRevision: 0,
    runtimeRevision: 0,
    activeStepIndex: running ? 1 : 0,
    virtualStartedAt: now,
    virtualNow: now,
    faultId: "none",
    faultConsumed: false,
    createdAt: now,
    updatedAt: now,
    expiresAt: admin.firestore.Timestamp.fromMillis(
      now.toMillis() + REHEARSAL_RETENTION_MILLIS
    ),
    completedAt: null,
    rosterReconciliation: buildPracticeRosterSource(sessionId, 0,
      data.scenarioId, syntheticActors),
  };
  const batch = db.batch();
  batch.create(db.collection(sessions).doc(sessionId), session);
  for (const actor of syntheticActors) {
    batch.set(
      db.collection(actors).doc(actorDocumentId(sessionId, actor.actorId)),
      actor
    );
  }
  await batch.commit();
  return {
    sessionId,
    guestUrl: guestUrl(publicRehearsalId),
    setupRevision: 0,
    runtimeRevision: 0,
  };
}

/** Rehearsal only needs a named meeting place, never booking-grade GPS. */
function rehearsalLocationName(event: EventDocument): string {
  const name = event.meetingLocation?.name?.trim() ||
    event.meetingPoint?.trim();
  if (!name) {
    throw new HttpsError("failed-precondition",
      "This event needs a valid schedule and venue.");
  }
  return name;
}

function requireRehearsalSourceEvent(event: EventDocument) {
  const scheduled = requireScheduledEvent(event);
  rehearsalLocationName(scheduled);
  return scheduled;
}

async function sourceSetup(
  db: Firestore,
  organizerId: string,
  eventId: string
): Promise<{setup: RehearsalSetup; clubId: string; revision: string}> {
  const snap = await db.collection("events").doc(eventId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Source event not found.");
  }
  const event = requireDoc<EventDocument>(snap, "EventDocument");
  const eventOrganizerId = event.organizerId ?? event.clubId;
  if (eventOrganizerId !== organizerId) {
    throw new HttpsError(
      "permission-denied",
      "The source event does not belong to this organizer."
    );
  }
  const configuredEvent = requireRehearsalSourceEvent(event);
  const durationMinutes = Math.max(
    30,
    Math.min(360, Math.round(
      (configuredEvent.endTime.toMillis() -
        configuredEvent.startTime.toMillis()) / 60000
    ))
  );
  const setup = rehearsalSetupFromEvent(configuredEvent);
  return {
    clubId: event.clubId,
    revision: sha256(JSON.stringify({
      name: event.name ?? null,
      startTimeMillis: event.startTime.toMillis(),
      endTimeMillis: configuredEvent.endTime.toMillis(),
      meetingLocation: event.meetingLocation,
      itinerary: event.itinerary ?? [],
      routePlan: configuredEvent.eventFormat.activityDetails?.routePlan ?? null,
      unitOutcome: eventSuccessPrimitivesFor(
        configuredEvent.eventFormat).unitOutcome,
    })).slice(0, 32),
    setup: {...setup, durationMinutes},
  };
}

/** Builds a frozen rehearsal snapshot with synthetic movement only. */
export function rehearsalSetupFromEvent(event: EventDocument): RehearsalSetup {
  const configuredEvent = requireRehearsalSourceEvent(event);
  const routePlan = configuredEvent.eventFormat.activityDetails?.routePlan ??
    null;
  const itinerary = event.itinerary ?? [];
  const path = routePlan?.path ?? [];
  const trackingMode = routePlan?.version === 2 ?
    routePlan.liveTrackingPolicy?.mode ?? "disabled" : "disabled";
  const midpoint = path.length ? path[Math.floor(path.length / 2)] : null;
  const livePositions: NonNullable<
    RehearsalSetup["movementSimulation"]
  >["livePositions"] = midpoint && trackingMode !== "disabled" ? [{
    role: "host",
    latitude: midpoint.latitude,
    longitude: midpoint.longitude,
    recordedOffsetMinutes: 30,
  }, ...(trackingMode === "authorizedOperators" && path.length > 1 ? [{
    role: "operator" as const,
    latitude: path[0].latitude,
    longitude: path[0].longitude,
    recordedOffsetMinutes: 29,
  }] : [])] : [];
  const nextStop = itinerary.find((item) =>
    item.kind === "stop" || item.kind === "finish" || Boolean(item.location)
  );
  return {
    eventFormat: {...configuredEvent.eventFormat, version: 1},
    title: event.name?.trim() ||
      `${activityLabel(configuredEvent.eventFormat.activityKind)} ` +
        "dress rehearsal",
    locationName: rehearsalLocationName(configuredEvent),
    durationMinutes: Math.max(
      30,
      Math.min(360, Math.round(
        (configuredEvent.endTime.toMillis() -
          configuredEvent.startTime.toMillis()) / 60000
      ))
    ),
    hostGoal: "Help every guest understand what happens next.",
    attendeePrompt: "Introduce yourself to someone you have not met yet.",
    unitOutcome: eventSuccessPrimitivesFor(
      configuredEvent.eventFormat).unitOutcome,
    moduleIds: [
      "arrival",
      "firstHello",
      "pods",
      "rotations",
      "conversationCues",
      "reveal",
      "afterglow",
      "accountability",
    ],
    ...(routePlan || itinerary.length ? {
      movementSimulation: {
        itinerary,
        routePlan,
        livePositions,
        lateArrivalGuidance: nextStop ?
          `Join at the next published stop: ${nextStop.title}.` :
          `Meet the route lead at ${rehearsalLocationName(configuredEvent)}.`,
      },
    } : {}),
  };
}

function sampleSetup(): RehearsalSetup {
  return {
    title: "Catch social mixer dress rehearsal",
    locationName: "Practice venue",
    durationMinutes: 120,
    hostGoal: "Learn the whole Host flow before guests arrive.",
    attendeePrompt: "Find one thing you have in common with your group.",
    unitOutcome: "completion",
    moduleIds: [
      "arrival",
      "firstHello",
      "pods",
      "rotations",
      "conversationCues",
      "reveal",
      "afterglow",
      "accountability",
    ],
  };
}

async function requireCurrentHostAuthority(db: Firestore,
  tx: FirebaseFirestore.Transaction, session: EventRehearsalDocument,
  uid: string): Promise<OrganizerDocument> {
  const snapshot = await tx.get(db.collection("organizers")
    .doc(session.organizerId));
  const organizer = requireDoc<OrganizerDocument>(snapshot,
    "OrganizerDocument");
  if (session.expiresAt.toMillis() <= Date.now()) {
    throw new HttpsError("not-found", "This dress rehearsal has expired.");
  }
  if (!isOrganizerManager(organizer, uid)) {
    throw new HttpsError("permission-denied", "Host authority changed.");
  }
  return organizer;
}

async function requireHostSession(
  db: Firestore,
  sessionId: string,
  uid: string
): Promise<EventRehearsalDocument> {
  const session = await requirePublicSessionById(db, sessionId);
  await requireOrganizerManager({
    db,
    organizerId: session.organizerId,
    actorUid: uid,
  });
  return session;
}

async function requirePublicSessionById(
  db: Firestore,
  sessionId: string
): Promise<EventRehearsalDocument> {
  const snap = await db.collection(sessions).doc(sessionId).get();
  const session = requireSession(snap);
  if (session.expiresAt.toMillis() <= Date.now()) {
    throw new HttpsError("not-found", "This dress rehearsal has expired.");
  }
  return session;
}

function requireSession(
  snap: FirebaseFirestore.DocumentSnapshot
): EventRehearsalDocument {
  if (!snap.exists) {
    throw new HttpsError("not-found", "Dress rehearsal not found.");
  }
  return requireDoc<EventRehearsalDocument>(snap, "EventRehearsalDocument");
}

async function hostProjection(
  db: Firestore,
  sessionId: string,
  session: EventRehearsalDocument,
  request: CallableRequest<unknown>,
  movementScope?: MovementScope,
  practiceOperatorId?: string,
): Promise<EventRehearsalBootstrapCallableResponse> {
  const [actorSnaps, actionSnaps] = await Promise.all([
    db.collection(actors).where("sessionId", "==", sessionId).limit(51).get(),
    db.collection(actions).where("sessionId", "==", sessionId)
      .limit(REHEARSAL_MAX_ACTIONS).get(),
  ]);
  const actorValues = actorSnaps.docs.map((doc) =>
    requireDoc<EventRehearsalActorDocument>(doc,
      "EventRehearsalActorDocument"));
  const messageRefs = actorValues.filter((actor) =>
    actor.assistance?.latestMessageId)
    .map((actor) =>
      db.collection(rehearsalMessages).doc(practiceMessageDocumentId(
        sessionId, actor.assistance!.latestMessageId!)));
  const messageSnaps = messageRefs.length ?
    await db.getAll(...messageRefs) : [];
  const messageValues = new Map(messageSnaps.map((snap) => [snap.id,
    snap.data()]));
  const helpRequests = await practiceHelpProjection(db, sessionId, session,
    actorValues, requireAuth(request));
  const organizer = requireDoc<OrganizerDocument>(await db.collection(
    "organizers").doc(session.organizerId).get(), "OrganizerDocument");
  const roleAuthority = practiceRoleAuthority(sessionId, session,
    {organizer, actorUid: requireAuth(request)}, practiceOperatorId);
  const currentMessages = actorValues.flatMap((actor) => {
    const id = actor.assistance?.latestMessageId;
    return id ? [readPracticeMessage(messageValues.get(
      practiceMessageDocumentId(sessionId, id)), session, actor)] : [];
  });
  const departures = await projectionDepartures(db, sessionId, session,
    currentMessages.map((m) => m.plan));
  const deliveryReviews = practiceDeliveryReviews(sessionId, session,
    actorValues, currentMessages, organizer, requireAuth(request));
  const movementReview = movementScope ? await hostMovementReview(db,
    requireAuth(request), {sessionId,
      expectedSetupRevision: session.setupRevision,
      scope: movementScope, ...(practiceOperatorId ?
        {practiceOperatorId} : {})}) : undefined;
  if (movementReview && movementReview.runtimeRevision !==
      session.runtimeRevision) {
    throw new HttpsError("aborted",
      "Rehearsal changed during movement review.");
  }
  const movementSimulation = rehearsalMovementProjection(session);
  return {
    ...(movementReview ? {movementReview} : {}),
    staffReview: practiceStaffProjection(sessionId, session, roleAuthority),
    settingsReview: practiceSettingsProjection(sessionId, session,
      roleAuthority),
    outcomeReview: practiceOutcomeReview(session, actorValues),
    revealReview: practiceRevealReview(session),
    allocationReview: practiceAllocationReview(session, actorValues),
    ...(session.rosterReconciliation ? {
      rosterReview: practiceRosterReview(session),
    } : {}),
    helpRequests,
    deliveryReviews,
    accountabilityReviews: practiceAccountabilityProjection(sessionId,
      session, actorValues, roleAuthority),
    membershipReviews: practiceMembershipProjection(sessionId, session,
      actorValues, roleAuthority),
    session: {
      id: sessionId,
      organizerId: session.organizerId,
      sourceEventId: session.sourceEventId,
      guestSource: session.guestSource ?? "simulated",
      scenarioId: session.scenarioId,
      seed: session.seed,
      actorCount: session.actorCount,
      actionCount: session.actionCount,
      status: session.status,
      setup: {
        ...session.setup,
        ...(movementSimulation ? {
          movementSimulation,
        } : {}),
      },
      setupRevision: session.setupRevision,
      runtimeRevision: session.runtimeRevision,
      activeStepIndex: session.activeStepIndex,
      virtualStartedAtMillis: session.virtualStartedAt.toMillis(),
      virtualNowMillis: session.virtualNow.toMillis(),
      faultId: session.faultId,
      expiresAtMillis: session.expiresAt.toMillis(),
    },
    actors: actorValues.map((actor) => {
      const messageId = actor.assistance?.latestMessageId;
      const message = messageId ? readPracticeMessage(messageValues.get(
        practiceMessageDocumentId(sessionId, messageId)), session,
      actor) : null;
      return {
        actorId: actor.actorId,
        displayName: actor.displayName,
        persona: actor.persona,
        status: actor.status,
        connectionState: rehearsalActorConnectionState(actor),
        guestMoment: actor.guestMoment,
        optedOut: actor.optedOut,
        keepApartActorIds: actor.keepApartActorIds,
        helpRequested: actor.helpRequested,
        promptCompleted: actor.promptCompleted,
        layoutUnitId: actor.layoutUnitId,
        confirmedLayoutUnitId: actor.confirmedLayoutUnitId,
        ...(actor.assistanceAutomation ? {
          assistanceAutomation: actor.assistanceAutomation,
        } : {}),
        ...(actor.assistance ? {assistance: actor.assistance,
          assistanceDelivery: practiceDeliveryView(message),
          assistanceMessage: practiceMessageView(session, actor,
            message, departures)} : {}),
        requiredData: practiceRequiredDataReview(session, actor),
      };
    }).sort((a, b) => a.actorId.localeCompare(b.actorId)),
    actions: actionSnaps.docs.map((doc) => {
      const action = requireDoc<EventRehearsalActionDocument>(
        doc,
        "EventRehearsalActionDocument"
      );
      return {
        clientActionId: action.clientActionId,
        actorId: action.actorId,
        kind: action.kind,
        name: action.name,
        runtimeRevision: action.runtimeRevision,
        virtualNowMillis: action.virtualNow.toMillis(),
      };
    }).sort((a, b) => a.runtimeRevision - b.runtimeRevision),
    guestUrl: guestUrl(session.publicRehearsalId),
    canUseInternalFaults: canUseInternalFaults(request),
  };
}

export function rehearsalGuestProjection(
  session: EventRehearsalDocument,
  actor: EventRehearsalActorDocument,
  slotToken: string,
  message: PracticeMessage | null = null,
  departures: PracticeDepartures = new Map(),
): EventRehearsalGuestBootstrapCallableResponse {
  const movementSimulation = rehearsalMovementProjection(session);
  return {
    slotToken,
    practiceBanner: "Practice mode · Nothing here affects a real event",
    session: {
      title: session.setup.title,
      locationName: session.setup.locationName,
      status: session.status,
      activeStepIndex: session.activeStepIndex,
      virtualNowMillis: session.virtualNow.toMillis(),
      attendeePrompt: session.setup.attendeePrompt,
      moduleIds: session.setup.moduleIds,
      runtimeRevision: session.runtimeRevision,
      faultId: session.faultId,
      ...(movementSimulation ? {
        movementSimulation,
      } : {}),
    },
    actor: {
      actorId: actor.actorId,
      displayName: session.guestSource === "event" ?
        `Practice guest ${actor.actorId.replace("actor-", "")}` :
        actor.displayName,
      status: actor.status,
      connectionState: rehearsalActorConnectionState(actor),
      guestMoment: actor.guestMoment,
      optedOut: actor.optedOut,
      helpRequested: actor.helpRequested,
      promptCompleted: actor.promptCompleted,
      ...(actor.assistance ? {assistance: actor.assistance,
        assistanceMessage: practiceMessageView(session, actor, message,
          departures)} : {}),
      requiredData: practiceRequiredDataReview(session, actor),
    },
  };
}

async function projectionDepartures(db: Firestore, sessionId: string,
  session: EventRehearsalDocument, plans: readonly PracticeMessage["plan"][]) {
  if (!plans.length) return new Map();
  return db.runTransaction(async (tx) => {
    const current = requireSession(await tx.get(db.collection(sessions)
      .doc(sessionId)));
    if (current.setupRevision !== session.setupRevision ||
        current.runtimeRevision !== session.runtimeRevision) {
      throw new HttpsError("aborted",
        "Practice changed while reading directions.");
    }
    const departures = await readPracticeDepartures(db, tx, sessionId,
      current, plans);
    if (current.expiresAt.toMillis() <= Date.now()) {
      throw new HttpsError("not-found", "This dress rehearsal has expired.");
    }
    return departures;
  });
}
async function guestMessageProjection(db: Firestore,
  session: EventRehearsalDocument, actor: EventRehearsalActorDocument,
  slotToken: string) {
  const message = await actorPracticeMessage(db, session, actor);
  const departures = await projectionDepartures(db, actor.sessionId, session,
    message ? [message.plan] : []);
  return rehearsalGuestProjection(session, actor, slotToken, message,
    departures);
}

/** Derives deterministic route progress from the virtual rehearsal clock. */
export function rehearsalMovementProjection(
  session: EventRehearsalDocument
): RehearsalSetup["movementSimulation"] {
  const movement = session.setup.movementSimulation;
  if (!movement) return undefined;
  const durationMinutes = Math.max(1, session.setup.durationMinutes);
  const virtualStartedAt = session.virtualStartedAt ?? session.virtualNow;
  const elapsedMinutes = Math.max(0, Math.min(
    durationMinutes,
    Math.floor(
      (session.virtualNow.toMillis() - virtualStartedAt.toMillis()) / 60000
    )
  ));
  const path = movement.routePlan?.path ?? [];
  const progressIndex = path.length > 1 ? Math.min(
    path.length - 1,
    Math.round((elapsedMinutes / durationMinutes) * (path.length - 1))
  ) : 0;
  return {
    ...movement,
    livePositions: movement.livePositions.map((position, index) => {
      const point = path.length ? path[Math.max(0, progressIndex - index)] :
        position;
      return {
        ...position,
        latitude: point.latitude,
        longitude: point.longitude,
        recordedOffsetMinutes: Math.max(0, elapsedMinutes - index),
      };
    }),
  };
}

async function resolvePublicSession(
  db: Firestore,
  publicRehearsalId: string
): Promise<{id: string; session: EventRehearsalDocument}> {
  const snaps = await db.collection(sessions)
    .where("publicRehearsalId", "==", publicRehearsalId).limit(1).get();
  if (snaps.empty) {
    throw new HttpsError("not-found", "Dress rehearsal link not found.");
  }
  const snap = snaps.docs[0];
  if (!snap) {
    throw new HttpsError("not-found", "Dress rehearsal link not found.");
  }
  const session = requireSession(snap);
  if (session.expiresAt.toMillis() <= Date.now()) {
    throw new HttpsError("not-found", "This dress rehearsal link has expired.");
  }
  return {id: snap.id, session};
}

async function redeemGuestView(
  db: Firestore,
  sessionId: string,
  session: EventRehearsalDocument,
  clientInstanceId: string,
  viewerToken: string | null
): Promise<EventRehearsalGuestViewDocument & {slotToken: string}> {
  const bearerToken = viewerToken ?? session.publicRehearsalId;
  if (!safeHashEquals(session.viewerTokenHash, sha256(bearerToken))) {
    throw new HttpsError(
      "permission-denied",
      "Dress rehearsal link is invalid."
    );
  }
  const slotId = sha256(`${sessionId}:${clientInstanceId}`).slice(0, 24);
  const slotToken = `${slotId}_${sha256(
    `${session.viewerTokenHash}:${clientInstanceId}`
  ).slice(0, 40)}`;
  const viewRef = db.collection(guestViews)
    .doc(guestViewDocumentId(sessionId, slotId));
  const actorQuery = db.collection(actors)
    .where("sessionId", "==", sessionId).limit(50);
  const viewQuery = db.collection(guestViews)
    .where("sessionId", "==", sessionId).limit(50);
  return db.runTransaction(async (tx) => {
    const [existing, actorSnaps, viewSnaps] = await Promise.all([
      tx.get(viewRef),
      tx.get(actorQuery),
      tx.get(viewQuery),
    ]);
    if (existing.exists) {
      const view = requireDoc<EventRehearsalGuestViewDocument>(
        existing,
        "EventRehearsalGuestViewDocument"
      );
      if (!safeHashEquals(view.tokenHash, sha256(slotToken))) {
        throw new HttpsError("permission-denied", "Guest slot is invalid.");
      }
      return {...view, slotToken};
    }
    const claimed = new Set(viewSnaps.docs.map((doc) =>
      requireDoc<EventRehearsalGuestViewDocument>(
        doc,
        "EventRehearsalGuestViewDocument"
      ).actorId
    ));
    const sortedActors = actorSnaps.docs.map((doc) =>
      requireDoc<EventRehearsalActorDocument>(
        doc,
        "EventRehearsalActorDocument"
      )
    ).sort((a, b) => a.actorId.localeCompare(b.actorId));
    const actor = sortedActors.find((candidate) =>
      !claimed.has(candidate.actorId)
    ) ?? sortedActors[viewSnaps.size % Math.max(1, sortedActors.length)];
    if (!actor) {
      throw new HttpsError("not-found", "No practice guests are available.");
    }
    const now = admin.firestore.Timestamp.now();
    const view: EventRehearsalGuestViewDocument = {
      sessionId,
      slotId,
      actorId: actor.actorId,
      tokenHash: sha256(slotToken),
      createdAt: now,
      lastSeenAt: now,
      expiresAt: session.expiresAt,
    };
    tx.create(viewRef, view);
    return {...view, slotToken};
  });
}

async function resolveOrRedeemGuestView({
  db,
  sessionId,
  session,
  clientInstanceId,
  viewerToken,
  slotToken,
}: {
  db: Firestore;
  sessionId: string;
  session: EventRehearsalDocument;
  clientInstanceId: string;
  viewerToken: string | null;
  slotToken: string | null;
}): Promise<EventRehearsalGuestViewDocument & {slotToken: string}> {
  if (slotToken) {
    try {
      return await requireGuestView(db, sessionId, slotToken);
    } catch (error) {
      if (
        !(error instanceof HttpsError) ||
        error.code !== "permission-denied"
      ) {
        throw error;
      }
      // Setup changes and reset intentionally revoke prior actor leases. The
      // The still-valid public link can redeem this browser deterministically.
    }
  }
  return redeemGuestView(
    db,
    sessionId,
    session,
    clientInstanceId,
    viewerToken
  );
}

async function requireGuestView(
  db: Firestore,
  sessionId: string,
  slotToken: string
): Promise<EventRehearsalGuestViewDocument & {slotToken: string}> {
  const slotId = slotToken.slice(0, 24);
  const snap = await db.collection(guestViews)
    .doc(guestViewDocumentId(sessionId, slotId)).get();
  return {
    ...requireGuestViewSnapshot(snap, slotToken),
    slotToken,
  };
}

function requireGuestViewSnapshot(
  snap: FirebaseFirestore.DocumentSnapshot,
  slotToken: string
): EventRehearsalGuestViewDocument {
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "Guest slot expired.");
  }
  const view = requireDoc<EventRehearsalGuestViewDocument>(
    snap,
    "EventRehearsalGuestViewDocument"
  );
  if (!safeHashEquals(view.tokenHash, sha256(slotToken)) ||
      view.expiresAt.toMillis() <= Date.now()) {
    throw new HttpsError("permission-denied", "Guest slot expired.");
  }
  return view;
}

async function assertActiveSessionLimit(
  db: Firestore,
  uid: string
): Promise<void> {
  const snaps = await db.collection(sessions)
    .where("ownerUid", "==", uid).limit(100).get();
  const active = snaps.docs.map((doc) =>
    requireDoc<EventRehearsalDocument>(doc, "EventRehearsalDocument")
  ).filter((session) =>
    session.expiresAt.toMillis() > Date.now() &&
    !["complete", "expired"].includes(session.status)
  );
  if (active.length >= REHEARSAL_MAX_ACTIVE_SESSIONS) {
    throw new HttpsError(
      "resource-exhausted",
      "Complete or wait for an existing dress rehearsal before creating " +
        "another."
    );
  }
}

async function writeActors(
  db: Firestore,
  sessionId: string,
  values: EventRehearsalActorDocument[]
): Promise<void> {
  const batch = db.batch();
  for (const actor of values) {
    batch.set(
      db.collection(actors).doc(actorDocumentId(sessionId, actor.actorId)),
      actor
    );
  }
  await batch.commit();
}

async function deleteSessionChildren(
  db: Firestore,
  sessionId: string
): Promise<void> {
  await Promise.all([
    deleteBySession(db, actors, sessionId),
    deleteBySession(db, actions, sessionId),
    deleteBySession(db, guestViews, sessionId),
    deleteBySession(db, rehearsalMessages, sessionId),
    deleteBySession(db, rehearsalCases, sessionId),
    deleteBySession(db, rehearsalMovements, sessionId),
    deleteBySession(db, rehearsalRouteDecisions, sessionId),
  ]);
}

async function deleteBySession(
  db: Firestore,
  collection: string,
  sessionId: string
): Promise<void> {
  for (;;) {
    const snaps = await db.collection(collection)
      .where("sessionId", "==", sessionId).limit(500).get();
    if (snaps.empty) return;
    const batch = db.batch();
    for (const doc of snaps.docs) batch.delete(doc.ref);
    await batch.commit();
  }
}

async function actorPracticeMessage(db: Firestore,
  session: EventRehearsalDocument,
  actor: EventRehearsalActorDocument): Promise<PracticeMessage | null> {
  const id = actor.assistance?.latestMessageId;
  if (!id) return null;
  const snap = await db.collection(rehearsalMessages).doc(
    practiceMessageDocumentId(actor.sessionId, id)).get();
  return readPracticeMessage(snap.data(), session, actor);
}

function requireAssistanceReceipt(snapshot: FirebaseFirestore.DocumentSnapshot,
  requestHash: string, required: boolean) {
  const saved = snapshot.get("requestHash");
  if ((required || saved) && saved !== requestHash) {
    throw new HttpsError("aborted", "Practice request identity changed.");
  }
}

function actionDocument(
  value: EventRehearsalActionDocument
): EventRehearsalActionDocument {
  return value;
}

/** A reset reuses runtime revisions but always advances setup revision. */
function requireAssistanceGeneration(session: EventRehearsalDocument,
  data: ControlEventRehearsalCallablePayload): void {
  if (["assistance", "movement", "staff", "settings", "requiredData",
    "outcome", "reveal", "allocation", "roster"]
    .includes(data.action) &&
      data.expectedSetupRevision !== session.setupRevision) {
    throw new HttpsError("aborted",
      "This rehearsal was reset. Review the current run before continuing.");
  }
}

function assertCurrentRevision(
  session: EventRehearsalDocument,
  expectedRevision: number
): void {
  if (session.runtimeRevision !== expectedRevision) {
    throw staleRevision(session.runtimeRevision);
  }
}

function assertActionCapacity(session: EventRehearsalDocument): void {
  if (session.actionCount >= REHEARSAL_MAX_ACTIONS) {
    throw new HttpsError(
      "resource-exhausted",
      "This rehearsal reached its 500-action limit. Reset or fork to continue."
    );
  }
}

function staleRevision(current: number): HttpsError {
  return new HttpsError(
    "aborted",
    `This rehearsal changed on another screen. Refresh revision ${current}.`
  );
}

function resolveControlOrThrow(
  session: EventRehearsalDocument,
  data: ControlEventRehearsalCallablePayload
) {
  try {
    return resolveRehearsalControl(session, data.action, data.minutes ?? 5);
  } catch (error) {
    throw new HttpsError(
      "failed-precondition",
      error instanceof Error ? error.message : "Invalid rehearsal transition."
    );
  }
}

async function maybeApplyActionFault(
  db: Firestore,
  sessionId: string,
  session: EventRehearsalDocument
): Promise<void> {
  if (session.faultId === "latency") await delay(1500);
  if (session.faultId === "staleRevision") {
    throw new HttpsError("aborted", "Injected stale revision conflict.");
  }
  if (session.faultId === "oneShotFailure" && !session.faultConsumed) {
    await db.collection(sessions).doc(sessionId).update({
      faultConsumed: true,
      updatedAt: admin.firestore.Timestamp.now(),
    });
    throw new HttpsError(
      "unavailable",
      "Injected one-shot failure. Retry is safe."
    );
  }
}

async function maybeApplyReadFault(
  session: EventRehearsalDocument
): Promise<void> {
  if (session.faultId === "latency") await delay(1000);
}

async function maybeApplyGuestReadFault(
  session: EventRehearsalDocument
): Promise<void> {
  if (session.faultId === "listenerDisconnect") {
    throw new HttpsError(
      "unavailable",
      "Injected listener disconnect. The guest view will retry."
    );
  }
  if (session.faultId === "lowBandwidth") await delay(1200);
}

function canUseInternalFaults(request: CallableRequest<unknown>): boolean {
  const token = request.auth?.token as Record<string, unknown> | undefined;
  return token?.internalQa === true || adminRolesFromToken(token).length > 0;
}

function actorDocumentId(sessionId: string, actorId: string): string {
  return `${sessionId}_${actorId}`;
}

function guestViewDocumentId(sessionId: string, slotId: string): string {
  return `${sessionId}_${slotId}`;
}

function guestUrl(publicRehearsalId: string): string {
  return `${websiteBaseUrl}/rehearse/${publicRehearsalId}`;
}

function guestRateLimitIdentity(
  publicRehearsalId: string,
  clientIdentity: string
): string {
  return `rehearsal_${sha256(`${publicRehearsalId}:${clientIdentity}`)
    .slice(0, 40)}`;
}

function randomToken(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeHashEquals(expected: string, actual: string): boolean {
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function activityLabel(value: string): string {
  return value.replace(/([a-z])([A-Z])/gu, "$1 $2")
    .replace(/^./u, (letter) => letter.toUpperCase());
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export const createEventRehearsal = onCall(
  appCheckCallableOptions,
  (request) => createEventRehearsalHandler(request)
);
export const getEventRehearsalBootstrap = onCall(
  appCheckCallableOptionsWithLimits({memory: "512MiB"}),
  getEventRehearsalBootstrapHandler
);
export const updateEventRehearsalSetup = onCall(
  appCheckCallableOptions,
  (request) => updateEventRehearsalSetupHandler(request)
);
export const controlEventRehearsal = onCall(
  appCheckCallableOptions,
  (request) => controlEventRehearsalHandler(request)
);
export const injectEventRehearsalBehavior = onCall(
  appCheckCallableOptions,
  injectEventRehearsalBehaviorHandler
);
export const controlEventRehearsalSpatial = onCall(
  appCheckCallableOptions,
  controlEventRehearsalSpatialHandler
);
export const resetEventRehearsal = onCall(
  appCheckCallableOptions,
  (request) => resetEventRehearsalHandler(request)
);
export const rotateEventRehearsalGuestLink = onCall(
  appCheckCallableOptions,
  rotateEventRehearsalGuestLinkHandler
);
export const getEventRehearsalGuestBootstrap = onCall(
  appCheckCallableOptions,
  getEventRehearsalGuestBootstrapHandler
);
export const submitEventRehearsalGuestAction = onCall(
  appCheckCallableOptions,
  submitEventRehearsalGuestActionHandler
);
export const completeEventRehearsal = onCall(
  appCheckCallableOptions,
  completeEventRehearsalHandler
);
export const exportEventRehearsalReproduction = onCall(
  appCheckCallableOptions,
  exportEventRehearsalReproductionHandler
);
export const expireEventRehearsals = onSchedule(
  {schedule: "every 60 minutes", region: "asia-south1"},
  async () => {
    await expireEventRehearsalsHandler();
  }
);

export const getEventRehearsalMovement = onCall(
  appCheckCallableOptions,
  getEventRehearsalMovementHandler
);
