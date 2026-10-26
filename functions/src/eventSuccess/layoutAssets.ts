import {randomBytes} from "crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {
  EventDocument,
  EventParticipationDocument,
  EventRuntimeParticipantDocument,
  EventSuccessAssignmentDocument,
  EventSuccessPlanDocument,
  OrganizerDocument,
  OrganizerEventSuccessLayoutDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {EventSuccessSpatialActionCallablePayload} from
  "../shared/generated/eventSuccessSpatialActionCallablePayload";
import type {EventSuccessSpatialActionCallableResponse} from
  "../shared/generated/eventSuccessSpatialActionCallableResponse";
import type {GetEventSuccessSpatialLayoutCallablePayload} from
  "../shared/generated/getEventSuccessSpatialLayoutCallablePayload";
import type {GetEventSuccessSpatialLayoutCallableResponse} from
  "../shared/generated/getEventSuccessSpatialLayoutCallableResponse";
import type {UpsertEventSuccessLayoutCallablePayload} from
  "../shared/generated/upsertEventSuccessLayoutCallablePayload";
import type {UpsertEventSuccessLayoutCallableResponse} from
  "../shared/generated/upsertEventSuccessLayoutCallableResponse";
import {
  validateEventSuccessSpatialActionCallablePayload,
} from
  "../shared/generated/validators/eventSuccessSpatialActionInput";
import {
  validateGetEventSuccessSpatialLayoutCallablePayload,
} from
  "../shared/generated/validators/getEventSuccessSpatialLayoutInput";
import {
  validateUpsertEventSuccessLayoutCallablePayload,
} from "../shared/generated/validators/upsertEventSuccessLayoutInput";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {isOrganizerManager} from "../shared/organizerHosts";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {assignmentConstraintPairKey} from "./assignmentConstraints";
import {
  organizerEventSuccessLayoutDocumentId,
  publicEventSuccessLayout,
} from "./spatialLayout";
import {
  confirmedSpatialUnitId,
  destinationPeerUid,
  releasedSpatialPlanFields,
  requireSpatialRevision,
  resolveSpatialDestinations,
  spatialReassignmentPlanFields,
} from "./spatialControl";

interface EventSuccessLayoutDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  randomLayoutId: () => string;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: EventSuccessLayoutDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  randomLayoutId: () => randomBytes(12).toString("base64url"),
  checkRateLimit: defaultCheckRateLimit,
};

/** Creates or updates one reusable organizer layout. */
export async function upsertEventSuccessLayoutHandler(
  request: CallableRequest<unknown>,
  deps: EventSuccessLayoutDeps = defaultDeps
): Promise<UpsertEventSuccessLayoutCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<
    UpsertEventSuccessLayoutCallablePayload
  >(request, validateUpsertEventSuccessLayoutCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "upsertEventSuccessLayout", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  await requireOrganizerLayoutManager(db, payload.organizerId, uid);
  const label = payload.label.trim();
  if (label.length === 0) {
    throw new HttpsError("invalid-argument", "Layout label is required.");
  }
  assertUniqueLayoutUnits(payload.units);
  const layoutId = payload.layoutId ?? deps.randomLayoutId();
  const ref = db.collection("organizerEventSuccessLayouts").doc(
    organizerEventSuccessLayoutDocumentId(payload.organizerId, layoutId)
  );
  const now = deps.now();
  const saved = await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      const current = requireDoc<OrganizerEventSuccessLayoutDocument>(
        existing,
        "OrganizerEventSuccessLayoutDocument"
      );
      if (
        current.organizerId !== payload.organizerId ||
        current.layoutId !== layoutId
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Layout identity mismatch."
        );
      }
    }
    const layout: OrganizerEventSuccessLayoutDocument = {
      organizerId: payload.organizerId,
      layoutId,
      label,
      units: payload.units,
      createdAt: existing.exists ?
        requireDoc<OrganizerEventSuccessLayoutDocument>(
          existing,
          "OrganizerEventSuccessLayoutDocument"
        ).createdAt : now,
      updatedAt: now,
    };
    tx.set(ref, layout);
    return layout;
  });
  return {layout: publicEventSuccessLayout(saved)};
}

/** Returns the selected layout to an authorized manager or participant. */
export async function getEventSuccessSpatialLayoutHandler(
  request: CallableRequest<unknown>,
  deps: EventSuccessLayoutDeps = defaultDeps
): Promise<GetEventSuccessSpatialLayoutCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<
    GetEventSuccessSpatialLayoutCallablePayload
  >(request, validateGetEventSuccessSpatialLayoutCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "getEventSuccessSpatialLayout", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const {event, plan} = await loadEventAndPlan(db, payload.eventId);
  await requireSpatialReader(db, event, payload.eventId, uid);
  if (
    !plan.layoutId ||
    plan.structureConfig?.unitKind === "wholeGroup"
  ) return {layout: null};
  const layout = await loadSelectedLayout(db, event, plan);
  return {layout: publicEventSuccessLayout(layout)};
}

/** Previews or applies one revision-fenced Host spatial-control action. */
export async function controlEventSuccessSpatialHandler(
  request: CallableRequest<unknown>,
  deps: EventSuccessLayoutDeps = defaultDeps
): Promise<EventSuccessSpatialActionCallableResponse> {
  const managerUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    EventSuccessSpatialActionCallablePayload
  >(request, validateEventSuccessSpatialActionCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, managerUid, "controlEventSuccessSpatial", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  const {event, plan} = await loadEventAndPlan(db, payload.eventId);
  await requireEventLayoutManager(db, event, managerUid);
  if (
    !plan.layoutId ||
    plan.structureConfig?.unitKind === "wholeGroup"
  ) {
    throw new HttpsError(
      "failed-precondition",
      "This event does not use a spatial layout."
    );
  }
  if (payload.action === "previewReassignment") {
    assertCurrentRevision(plan.liveControlRevision, payload.expectedRevision);
    const [layout, assignments] = await Promise.all([
      loadSelectedLayout(db, event, plan),
      loadModuleAssignments(db, payload.eventId, payload.moduleId),
    ]);
    const blockedPairs = await loadSelectionBlocks(
      db,
      payload.uid,
      assignments.map((assignment) => assignment.uid)
    );
    return {
      revision: payload.expectedRevision,
      destinations: resolveSpatialDestinations({
        layout,
        assignments,
        selectedUid: payload.uid,
        blockedPairs,
        affinityConstraints: plan.affinityConstraints,
      }),
    };
  }
  return applySpatialActionTransaction({
    db,
    event,
    payload,
    now: deps.now(),
  });
}

export const upsertEventSuccessLayout = onCall(
  appCheckCallableOptions,
  (request) => upsertEventSuccessLayoutHandler(request)
);

export const getEventSuccessSpatialLayout = onCall(
  appCheckCallableOptions,
  (request) => getEventSuccessSpatialLayoutHandler(request)
);

export const controlEventSuccessSpatial = onCall(
  appCheckCallableOptions,
  (request) => controlEventSuccessSpatialHandler(request)
);

async function applySpatialActionTransaction(params: {
  db: FirebaseFirestore.Firestore;
  event: EventDocument;
  payload: EventSuccessSpatialActionCallablePayload;
  now: FirebaseFirestore.Timestamp;
}): Promise<EventSuccessSpatialActionCallableResponse> {
  const planRef = params.db.collection("eventSuccessPlans")
    .doc(params.payload.eventId);
  return params.db.runTransaction(async (tx) => {
    const planSnap = await tx.get(planRef);
    const plan = requireDoc<EventSuccessPlanDocument>(
      planSnap,
      "EventSuccessPlanDocument"
    );
    const revision = requireSpatialRevision(
      plan.liveControlRevision,
      params.payload.expectedRevision
    );
    if (!plan.layoutId || plan.structureConfig?.unitKind === "wholeGroup") {
      throw new HttpsError(
        "failed-precondition",
        "This event does not use a spatial layout."
      );
    }
    const currentLayoutRef = params.db
      .collection("organizerEventSuccessLayouts")
      .doc(organizerEventSuccessLayoutDocumentId(
        requireOrganizerId(params.event),
        plan.layoutId
      ));
    const assignmentsQuery = params.db.collection("eventSuccessAssignments")
      .where("eventId", "==", params.payload.eventId)
      .where("moduleId", "==", params.payload.moduleId);
    const [layoutSnap, assignmentSnap] = await Promise.all([
      tx.get(currentLayoutRef),
      tx.get(assignmentsQuery),
    ]);
    const layout = requireSelectedLayout(
      layoutSnap,
      requireOrganizerId(params.event),
      plan.layoutId
    );
    const assignments = assignmentSnap.docs.map((doc) =>
      requireDoc<EventSuccessAssignmentDocument>(
        doc,
        "EventSuccessAssignmentDocument"
      )
    );
    const assignmentDoc = assignmentSnap.docs.find(
      (doc) => doc.data().uid === params.payload.uid
    );
    if (!assignmentDoc) {
      throw new HttpsError("not-found", "Attendee assignment not found.");
    }

    let planFields: Pick<
      EventSuccessPlanDocument,
      "affinityConstraints" | "spatialOverrides"
    > | null = null;
    let assignmentPatch: FirebaseFirestore.UpdateData<
      FirebaseFirestore.DocumentData
    > | null = null;
    if (params.payload.action === "reassign") {
      const destinationUnitId = params.payload.destinationUnitId;
      const scope = params.payload.scope;
      if (!destinationUnitId || !scope) {
        throw new HttpsError(
          "invalid-argument",
          "Reassignment requires a destination and scope."
        );
      }
      const occupants = assignments
        .filter((assignment) =>
          assignment.uid !== params.payload.uid &&
          assignment.layoutUnitId === destinationUnitId
        )
        .map((assignment) => assignment.uid);
      const refs = blockRefs(
        params.db,
        params.payload.uid,
        occupants
      );
      const blockSnaps = refs.length === 0 ? [] : await tx.getAll(...refs);
      const blockedPairs = blockPairsFromSnapshots(blockSnaps);
      const destinations = resolveSpatialDestinations({
        layout,
        assignments,
        selectedUid: params.payload.uid,
        blockedPairs,
        affinityConstraints: plan.affinityConstraints,
      });
      const destination = destinations.find(
        (candidate) => candidate.unitId === destinationUnitId
      );
      if (!destination?.valid) {
        throw new HttpsError(
          "failed-precondition",
          `Destination is unavailable: ${
            destination?.reason ?? "declaredConstraint"
          }.`
        );
      }
      const targetPeerUid = destinationPeerUid({
        assignments,
        selectedUid: params.payload.uid,
        destinationUnitId,
      });
      if (!targetPeerUid) {
        throw new HttpsError(
          "failed-precondition",
          "Choose a unit with an assigned attendee."
        );
      }
      planFields = spatialReassignmentPlanFields({
        plan,
        uid: params.payload.uid,
        targetPeerUid,
        layoutUnitId: destinationUnitId,
        scope,
      });
      assignmentPatch = {
        layoutUnitId: destinationUnitId,
        confirmedLayoutUnitId: null,
        updatedAt: params.now,
      };
    } else if (params.payload.action === "confirmPosition") {
      const assignment = requireDoc<EventSuccessAssignmentDocument>(
        assignmentDoc,
        "EventSuccessAssignmentDocument"
      );
      assignmentPatch = {
        confirmedLayoutUnitId: confirmedSpatialUnitId(assignment),
        updatedAt: params.now,
      };
    } else if (params.payload.action === "releasePinned") {
      planFields = releasedSpatialPlanFields({
        plan,
        uid: params.payload.uid,
      });
    }
    if (assignmentPatch) tx.update(assignmentDoc.ref, assignmentPatch);
    tx.update(planRef, {
      ...(planFields ?? {}),
      liveControlRevision: revision,
      updatedAt: params.now,
    });
    return {revision, destinations: []};
  });
}

async function loadEventAndPlan(
  db: FirebaseFirestore.Firestore,
  eventId: string
): Promise<{event: EventDocument; plan: EventSuccessPlanDocument}> {
  const [eventSnap, planSnap] = await Promise.all([
    db.collection("events").doc(eventId).get(),
    db.collection("eventSuccessPlans").doc(eventId).get(),
  ]);
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const plan = requireDoc<EventSuccessPlanDocument>(
    planSnap,
    "EventSuccessPlanDocument"
  );
  if (plan.eventId !== eventId) {
    throw new HttpsError("failed-precondition", "Event-success plan mismatch.");
  }
  return {event, plan};
}

async function loadSelectedLayout(
  db: FirebaseFirestore.Firestore,
  event: EventDocument,
  plan: EventSuccessPlanDocument
): Promise<OrganizerEventSuccessLayoutDocument> {
  if (!plan.layoutId) {
    throw new HttpsError("failed-precondition", "No room layout is selected.");
  }
  const organizerId = requireOrganizerId(event);
  const snap = await db.collection("organizerEventSuccessLayouts").doc(
    organizerEventSuccessLayoutDocumentId(organizerId, plan.layoutId)
  ).get();
  return requireSelectedLayout(snap, organizerId, plan.layoutId);
}

function requireSelectedLayout(
  snap: FirebaseFirestore.DocumentSnapshot,
  organizerId: string,
  layoutId: string
): OrganizerEventSuccessLayoutDocument {
  const layout = requireDoc<OrganizerEventSuccessLayoutDocument>(
    snap,
    "OrganizerEventSuccessLayoutDocument"
  );
  if (layout.organizerId !== organizerId || layout.layoutId !== layoutId) {
    throw new HttpsError("failed-precondition", "Selected layout mismatch.");
  }
  return layout;
}

async function loadModuleAssignments(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  moduleId: EventSuccessSpatialActionCallablePayload["moduleId"]
): Promise<EventSuccessAssignmentDocument[]> {
  const snap = await db.collection("eventSuccessAssignments")
    .where("eventId", "==", eventId)
    .where("moduleId", "==", moduleId)
    .get();
  return snap.docs.map((doc) => requireDoc<EventSuccessAssignmentDocument>(
    doc,
    "EventSuccessAssignmentDocument"
  ));
}

async function requireEventLayoutManager(
  db: FirebaseFirestore.Firestore,
  event: EventDocument,
  uid: string
): Promise<void> {
  const organizerSnap = await eventOrganizerRef(db, event).get();
  const organizer = requireEventOrganizer(organizerSnap, event);
  if (!isEventOrganizerManager(organizer, event, uid)) {
    throw new HttpsError(
      "permission-denied",
      "Only an organizer manager can control room placement."
    );
  }
}

async function requireOrganizerLayoutManager(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  uid: string
): Promise<void> {
  const organizerSnap = await db.collection("organizers").doc(organizerId)
    .get();
  const allowed = organizerSnap.exists && isOrganizerManager(
    requireDoc<OrganizerDocument>(organizerSnap, "OrganizerDocument"),
    uid
  );
  if (!allowed) {
    throw new HttpsError(
      "permission-denied",
      "Only an organizer manager can save room layouts."
    );
  }
}

function requireOrganizerId(event: EventDocument): string {
  if (!event.organizerId) {
    throw new HttpsError("failed-precondition", "Event has no organizer.");
  }
  return event.organizerId;
}

async function requireSpatialReader(
  db: FirebaseFirestore.Firestore,
  event: EventDocument,
  eventId: string,
  uid: string
): Promise<void> {
  const organizerSnap = await eventOrganizerRef(db, event).get();
  if (organizerSnap.exists) {
    const organizer = requireEventOrganizer(organizerSnap, event);
    if (isEventOrganizerManager(organizer, event, uid)) return;
  }
  const [participationSnap, runtimeSnap] = await Promise.all([
    db.collection("eventParticipations")
      .doc(eventParticipationId(eventId, uid)).get(),
    db.collection("eventRuntimeParticipants").doc(`${eventId}_${uid}`).get(),
  ]);
  const participation = participationSnap.exists ?
    requireDoc<EventParticipationDocument>(
      participationSnap,
      "EventParticipationDocument"
    ) : null;
  const runtime = runtimeSnap.exists ?
    requireDoc<EventRuntimeParticipantDocument>(
      runtimeSnap,
      "EventRuntimeParticipantDocument"
    ) : null;
  const participantAllowed = participation?.eventId === eventId &&
    participation.uid === uid &&
    (
      participation.status === "signedUp" ||
      participation.status === "attended"
    );
  const runtimeAllowed = runtime?.eventId === eventId && runtime.uid === uid &&
    runtime.accessStatus === "ready";
  if (!participantAllowed && !runtimeAllowed) {
    throw new HttpsError(
      "permission-denied",
      "This room layout is available only to event participants."
    );
  }
}

async function loadSelectionBlocks(
  db: FirebaseFirestore.Firestore,
  selectedUid: string,
  candidateUids: string[]
): Promise<Set<string>> {
  const refs = blockRefs(db, selectedUid, candidateUids);
  if (refs.length === 0) return new Set();
  return blockPairsFromSnapshots(await db.getAll(...refs));
}

function blockRefs(
  db: FirebaseFirestore.Firestore,
  selectedUid: string,
  candidateUids: string[]
): FirebaseFirestore.DocumentReference[] {
  return [...new Set(candidateUids)]
    .filter((uid) => uid !== selectedUid)
    .flatMap((uid) => [
      db.collection("blocks").doc(`${selectedUid}__${uid}`),
      db.collection("blocks").doc(`${uid}__${selectedUid}`),
    ]);
}

function blockPairsFromSnapshots(
  snaps: FirebaseFirestore.DocumentSnapshot[]
): Set<string> {
  const pairs = new Set<string>();
  for (const snap of snaps) {
    if (!snap.exists) continue;
    const data = snap.data();
    if (
      typeof data?.blockerUserId === "string" &&
      typeof data.blockedUserId === "string"
    ) {
      pairs.add(assignmentConstraintPairKey(
        data.blockerUserId,
        data.blockedUserId
      ));
    }
  }
  return pairs;
}

function assertCurrentRevision(current: unknown, expected: number): void {
  const normalized = Number.isInteger(current) && (current as number) >= 0 ?
    current as number : 0;
  if (normalized !== expected) {
    throw new HttpsError(
      "aborted",
      "The live event guide changed on another device. Refresh and retry."
    );
  }
}

function assertUniqueLayoutUnits(
  units: UpsertEventSuccessLayoutCallablePayload["units"]
): void {
  const ids = new Set<string>();
  const orders = new Set<number>();
  const positions = new Set<string>();
  for (const unit of units) {
    const position = `${unit.gridX}:${unit.gridY}`;
    if (ids.has(unit.id) || orders.has(unit.order) || positions.has(position)) {
      throw new HttpsError(
        "invalid-argument",
        "Layout unit ids, order values, and grid positions must be unique."
      );
    }
    ids.add(unit.id);
    orders.add(unit.order);
    positions.add(position);
  }
}
