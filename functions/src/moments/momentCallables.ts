import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import type {Firestore} from "firebase-admin/firestore";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import {checkRateLimit, RateLimitConfig} from "../shared/rateLimit";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {
  requireProgramAccess,
  requireProgramDuty,
  requireProgramMutable,
} from "../shared/programAuthority";
import type {ProgramAccess} from "../shared/programAuthority";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  validateListOrganizerMomentsCallablePayload,
} from
  "../shared/generated/validators/listOrganizerMomentsInput";
import {
  validateOrganizerMomentActionCallablePayload,
} from
  "../shared/generated/validators/organizerMomentActionInput";
import {
  validateRunOrganizerMomentCallablePayload,
} from
  "../shared/generated/validators/runOrganizerMomentInput";
import {
  validateUpsertOrganizerMomentCallablePayload,
} from
  "../shared/generated/validators/upsertOrganizerMomentInput";
import type {
  ListOrganizerMomentsCallablePayload,
} from "../shared/generated/listOrganizerMomentsCallablePayload";
import type {
  ListOrganizerMomentsCallableResponse,
} from "../shared/generated/listOrganizerMomentsCallableResponse";
import type {
  OrganizerMomentActionCallablePayload,
} from "../shared/generated/organizerMomentActionCallablePayload";
import type {
  OrganizerMomentCallableResponse,
} from "../shared/generated/organizerMomentCallableResponse";
import type {
  RunOrganizerMomentCallablePayload,
} from "../shared/generated/runOrganizerMomentCallablePayload";
import type {
  RunOrganizerMomentCallableResponse,
} from "../shared/generated/runOrganizerMomentCallableResponse";
import type {
  UpsertOrganizerMomentCallablePayload,
} from "../shared/generated/upsertOrganizerMomentCallablePayload";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import {
  MOMENTS_COLLECTION,
  momentFromDocument,
  momentToDocument,
  readAction,
  readAudience,
  readInitiation,
  readScope,
} from "./momentDocuments";
import {
  armMoment,
  pauseMoment,
  resumeMoment,
  reviseMoment,
  sameScope,
  scopeId,
  validateMomentDefinition,
  type LifecycleResult,
  type MomentDefinition,
  type MomentScope,
} from "./momentModel";
import {
  replanMoment,
  runManualMoment,
  type MomentRunnerDeps,
} from "./momentRunner";
import {buildMomentRunnerDeps} from "./momentWiring";

/**
 * Organizer-facing moment management, kept as deps-injected handlers so the
 * onCall wiring lands with the generated contract validators in the shared
 * registration window. Authority: program moments need manager access or an
 * active communications/coordinator duty; event moments are
 * organizer-manager only (event staff do not configure sends in v1).
 *
 * Every mutation round-trips through the pure lifecycle in momentModel:
 * edits drop a moment back to draft and clear its approval (approve the
 * rule once per definition, not once ever), and arming writes the
 * approval record.
 */

export interface MomentCallablesDeps {
  firestore: () => Firestore;
  nowMillis: () => number;
  authorizeManage: (
    db: Firestore,
    scope: MomentScope,
    actorUid: string,
  ) => Promise<ProgramAccess | void>;
}

export const defaultMomentCallablesDeps: Omit<MomentCallablesDeps,
  "authorizeManage"> = {
    firestore: () => admin.firestore(),
    nowMillis: () => Date.now(),
  };

/** Default authority: manager, or staff holding the communications duty
 *  (program coordinators satisfy every duty); event moments are
 *  organizer-manager only. */
export async function requireMomentManageAuthority(
  db: Firestore,
  scope: MomentScope,
  actorUid: string,
): Promise<ProgramAccess | void> {
  // Organizer scope is server-managed: companion moments exist only as
  // projections of form-automation rules and can never be authored,
  // armed, paused, or run through the callables.
  if (scope.kind === "organizer") {
    throw new HttpsError(
      "permission-denied",
      "Organizer-scope moments are managed by automation rules.");
  }
  if (scope.kind === "program") {
    const access = await requireProgramAccess({
      db,
      programId: scope.programId,
      actorUid,
    });
    if (access.role !== "manager") {
      requireProgramDuty(access, "communications");
    }
    return access;
  }
  const eventSnap = await db.collection("events").doc(scope.eventId).get();
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const organizerSnap = await eventOrganizerRef(db, event).get();
  const organizer = requireEventOrganizer(organizerSnap, event);
  if (!isEventOrganizerManager(organizer, event, actorUid)) {
    throw new HttpsError(
      "permission-denied",
      "Only an organizer manager can manage moments for this event.");
  }
}

interface ActorParams {
  actorUid: string;
}

export interface UpsertMomentParams extends ActorParams {
  /** Whole moment payload; `scope` is immutable on update. */
  payload: Record<string, unknown>;
}

/** Creates a draft moment or revises an existing one back to draft. */
export async function upsertOrganizerMomentHandler(
  deps: MomentCallablesDeps,
  params: UpsertMomentParams,
): Promise<{moment: MomentDefinition}> {
  const db = deps.firestore();
  const scope = readScope(params.payload.scope);
  const initiation = readInitiation(params.payload.initiation);
  const audience = readAudience(params.payload.audience);
  const action = readAction(params.payload.action);
  const name = typeof params.payload.name === "string" ?
    params.payload.name.trim() : "";
  if (!scope || !initiation || !audience || !action || name.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "Moment requires scope, name, initiation, audience, and action.");
  }
  // travelTimeLead is flat on the audience contract but meaningful only
  // for functionGuests; other kinds reject instead of silently dropping it.
  const rawAudience = params.payload.audience as
    Record<string, unknown> | undefined;
  if (rawAudience?.travelTimeLead === true &&
      rawAudience.kind !== "functionGuests") {
    throw new HttpsError(
      "invalid-argument",
      "travelTimeLead applies to functionGuests audiences only.");
  }
  await requireScopeMutable(deps, db, scope, params.actorUid);

  const momentId = typeof params.payload.momentId === "string" &&
    params.payload.momentId.length > 0 ?
    params.payload.momentId : db.collection(MOMENTS_COLLECTION).doc().id;
  const ref = db.collection(MOMENTS_COLLECTION).doc(momentId);
  const existing = await ref.get();

  if (existing.exists) {
    const current = momentFromDocument(
      existing.data() as Record<string, unknown>);
    if (current === null) {
      throw new HttpsError(
        "failed-precondition", "Stored moment is unreadable.");
    }
    if (!sameScope(current.scope, scope)) {
      throw new HttpsError(
        "invalid-argument", "A moment's scope cannot change.");
    }
    const result = reviseMoment(current,
      {name, initiation, sense: readSense(params.payload.sense),
        audience, action});
    return lifecycleWrite(db, deps, ref, current, result);
  }
  const next: MomentDefinition = {
    momentId,
    scope,
    name,
    initiation,
    sense: readSense(params.payload.sense),
    audience,
    action,
    status: "draft",
    approval: null,
    origin: "organizer",
    revision: 1,
  };
  const violations = validateMomentDefinition(next);
  if (violations.length > 0) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid moment: ${violations.join(", ")}`);
  }
  await ref.set(momentToDocument(next, deps.nowMillis(), true));
  return {moment: next};
}

interface MomentRefParams extends ActorParams {
  scope: MomentScope;
  momentId: string;
}

/** Moment mutations write run/send state, so a program scope must be
 *  mutable; archived programs stay readable through listOrganizerMoments. */
async function requireScopeMutable(
  deps: MomentCallablesDeps,
  db: Firestore,
  scope: MomentScope,
  actorUid: string,
): Promise<void> {
  const access = await deps.authorizeManage(db, scope, actorUid);
  if (access) requireProgramMutable(access.program);
}

/** Approve-the-rule-once: arms the moment under the actor's approval. */
export async function armOrganizerMomentHandler(
  deps: MomentCallablesDeps,
  params: MomentRefParams,
): Promise<{moment: MomentDefinition}> {
  return transition(deps, params, (current) =>
    armMoment(current, {
      approvedByUid: params.actorUid,
      approvedAtMillis: deps.nowMillis(),
    }));
}

export async function pauseOrganizerMomentHandler(
  deps: MomentCallablesDeps,
  params: MomentRefParams,
): Promise<{moment: MomentDefinition}> {
  return transition(deps, params, pauseMoment);
}

/** Resuming reuses the standing approval — the rule did not change. */
export async function resumeOrganizerMomentHandler(
  deps: MomentCallablesDeps,
  params: MomentRefParams,
): Promise<{moment: MomentDefinition}> {
  return transition(deps, params, resumeMoment);
}

async function transition(
  deps: MomentCallablesDeps,
  params: MomentRefParams,
  apply: (moment: MomentDefinition) => LifecycleResult,
): Promise<{moment: MomentDefinition}> {
  const db = deps.firestore();
  await requireScopeMutable(deps, db, params.scope, params.actorUid);
  const ref = db.collection(MOMENTS_COLLECTION).doc(params.momentId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Moment not found.");
  }
  const current = momentFromDocument(snap.data() as Record<string, unknown>);
  if (current === null) {
    throw new HttpsError(
      "failed-precondition", "Stored moment is unreadable.");
  }
  if (!sameScope(current.scope, params.scope)) {
    throw new HttpsError(
      "permission-denied", "Moment does not belong to this scope.");
  }
  return lifecycleWrite(db, deps, ref, current, apply(current));
}

async function lifecycleWrite(
  db: Firestore,
  deps: MomentCallablesDeps,
  ref: FirebaseFirestore.DocumentReference,
  _current: MomentDefinition,
  result: LifecycleResult,
): Promise<{moment: MomentDefinition}> {
  if (result.kind === "rejected") {
    if (result.reason === "invalidDefinition") {
      throw new HttpsError(
        "invalid-argument",
        `Invalid moment: ${(result.violations ?? []).join(", ")}`);
    }
    throw new HttpsError(
      "failed-precondition", `Cannot transition moment: ${result.reason}`);
  }
  await ref.set(
    momentToDocument(result.moment, deps.nowMillis(), false),
    {merge: true});
  // Lifecycle transitions replan immediately — a fresh arm never waits
  // for the sweep cursor, and pause/revise supersede pending runs now
  // rather than leaving them planned until the scan reaches the moment.
  // Best-effort: the sweep converges whatever this call misses.
  try {
    await replanMoment(db, result.moment, deps.nowMillis());
  } catch (error) {
    logger.warn("Moment lifecycle replan deferred to sweep", {
      momentId: result.moment.momentId, error,
    });
  }
  return {moment: result.moment};
}

/** Fires a manual moment once per caller-supplied request key. The
 *  callable supplies the key (client-generated id per tap); retries and
 *  double-submits resolve to the same run. */
export async function runOrganizerMomentHandler(
  deps: MomentCallablesDeps,
  runner: MomentRunnerDeps,
  params: MomentRefParams & {requestKey: string},
): Promise<{runId: string}> {
  const db = deps.firestore();
  if (typeof params.requestKey !== "string" ||
      params.requestKey.trim().length === 0) {
    throw new HttpsError(
      "invalid-argument", "requestKey is required for manual moments.");
  }
  await requireScopeMutable(deps, db, params.scope, params.actorUid);
  const snap = await db.collection(MOMENTS_COLLECTION)
    .doc(params.momentId).get();
  const current = snap.exists ?
    momentFromDocument(snap.data() as Record<string, unknown>) : null;
  if (current === null || !sameScope(current.scope, params.scope)) {
    throw new HttpsError("not-found", "Moment not found.");
  }
  if (current.status !== "armed") {
    throw new HttpsError(
      "failed-precondition", "Only armed moments can be run manually.");
  }
  const result = await runManualMoment(
    {...runner, firestore: deps.firestore},
    params.momentId, params.requestKey);
  if ("rejected" in result) {
    throw new HttpsError("failed-precondition", result.rejected);
  }
  return result;
}

/** Lists moments for one scope; the caller already holds manage access. */
export async function listOrganizerMomentsHandler(
  deps: MomentCallablesDeps,
  params: ActorParams & {scope: MomentScope},
): Promise<{moments: MomentDefinition[]}> {
  const db = deps.firestore();
  await deps.authorizeManage(db, params.scope, params.actorUid);
  const snap = await db.collection(MOMENTS_COLLECTION)
    .where("scopeKind", "==", params.scope.kind)
    .where("scopeId", "==", scopeId(params.scope))
    .get();
  const moments: MomentDefinition[] = [];
  for (const doc of snap.docs) {
    const moment = momentFromDocument(doc.data());
    if (moment !== null) moments.push(moment);
  }
  moments.sort((a, b) => a.momentId.localeCompare(b.momentId));
  return {moments};
}

function readSense(raw: unknown): MomentDefinition["sense"] {
  return raw === "individual" ? "individual" : "audience";
}

function scopeToWire(
  scope: MomentScope,
): OrganizerMomentCallableResponse["moment"]["scope"] {
  return scope.kind === "event" ?
    {kind: "event", eventId: scope.eventId, programId: null,
      organizerId: null} :
    scope.kind === "program" ?
      {kind: "program", eventId: null, programId: scope.programId,
        organizerId: null} :
      {kind: "organizer", eventId: null, programId: null,
        organizerId: scope.organizerId};
}

function momentToWire(
  moment: MomentDefinition,
): OrganizerMomentCallableResponse["moment"] {
  const initiation = moment.initiation;
  return {
    momentId: moment.momentId,
    scope: scopeToWire(moment.scope),
    name: moment.name,
    initiation: {
      kind: initiation.kind,
      atMillis: initiation.kind === "scheduled" ? initiation.atMillis : null,
      anchorKind: initiation.kind === "anchored" ?
        initiation.anchorKind : null,
      anchorId: initiation.kind === "anchored" ? initiation.anchorId : null,
      offsetMinutes: initiation.kind === "anchored" ?
        initiation.offsetMinutes : null,
      offsetDays: initiation.kind === "anchored" ?
        (initiation.offsetDays ?? 0) : null,
      offsetMonths: initiation.kind === "anchored" ?
        (initiation.offsetMonths ?? 0) : null,
      triggerKind: initiation.kind === "triggered" ?
        initiation.triggerKind : null,
      functionId: initiation.kind === "triggered" ?
        initiation.functionId : null,
    },
    sense: moment.sense,
    audience: momentAudienceToWire(moment.audience),
    action: momentActionToWire(moment.action),
    status: moment.status,
    approval: moment.approval,
    origin: moment.origin,
    revision: moment.revision,
  };
}

function momentAudienceToWire(
  audience: MomentDefinition["audience"],
): OrganizerMomentCallableResponse["moment"]["audience"] {
  switch (audience.kind) {
  case "subject":
    return {kind: "subject"};
  case "eventParticipants":
    return {kind: "eventParticipants", statuses: [...audience.statuses]};
  case "functionGuests":
    return {
      kind: "functionGuests",
      functionId: audience.functionId,
      rsvp: [...audience.rsvp],
      householdDedupe: audience.householdDedupe,
      travelTimeLead: audience.travelTimeLead,
    };
  case "households":
    return {kind: "households", rsvpPendingOnly: audience.rsvpPendingOnly};
  case "staffDuty":
    return {
      kind: "staffDuty",
      duty: audience.duty,
      scopeIds: audience.scopeIds === null ? null : [...audience.scopeIds],
    };
  }
}

function momentActionToWire(
  action: MomentDefinition["action"],
): OrganizerMomentCallableResponse["moment"]["action"] {
  switch (action.kind) {
  case "sendTemplate":
    return {
      kind: "sendTemplate",
      connectionId: action.connectionId,
      templateId: action.templateId,
      variables: {...action.variables},
    };
  case "push":
    return {
      kind: "push",
      notificationType: action.notificationType,
      preferenceKey: action.preferenceKey,
    };
  case "staffAttention":
    return {
      kind: "staffAttention",
      duty: action.duty,
      severity: action.severity,
      titleTemplate: action.titleTemplate,
    };
  }
}

function scopeFromWire(
  scope: OrganizerMomentActionCallablePayload["scope"],
): MomentScope {
  if (scope.kind === "event") {
    if (typeof scope.eventId !== "string" || scope.eventId.length === 0) {
      throw new HttpsError(
        "invalid-argument", "scope.eventId is required for event moments.");
    }
    return {kind: "event", eventId: scope.eventId};
  }
  if (scope.kind === "organizer") {
    if (typeof scope.organizerId !== "string" ||
        scope.organizerId.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "scope.organizerId is required for organizer moments.");
    }
    return {kind: "organizer", organizerId: scope.organizerId};
  }
  if (typeof scope.programId !== "string" || scope.programId.length === 0) {
    throw new HttpsError(
      "invalid-argument", "scope.programId is required for program moments.");
  }
  return {kind: "program", programId: scope.programId};
}

const momentCallableLimits = {timeoutSeconds: 60, maxInstances: 20};

function fullDeps(): MomentCallablesDeps {
  return {
    ...defaultMomentCallablesDeps,
    authorizeManage: requireMomentManageAuthority,
  };
}

async function upsertHandler(
  request: CallableRequest<unknown>,
): Promise<OrganizerMomentCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UpsertOrganizerMomentCallablePayload>(
    request, validateUpsertOrganizerMomentCallablePayload);
  const deps = fullDeps();
  await checkRateLimit(
    deps.firestore(), actorUid, "upsertOrganizerMoment",
    {maxRequests: 60, windowMs: 60 * 1000});
  const result = await upsertOrganizerMomentHandler(deps, {
    actorUid,
    payload: data as unknown as Record<string, unknown>,
  });
  return {moment: momentToWire(result.moment)};
}

async function actionHandler(
  request: CallableRequest<unknown>,
  apply: (
    deps: MomentCallablesDeps,
    params: {actorUid: string; scope: MomentScope; momentId: string},
  ) => Promise<{moment: MomentDefinition}>,
  actionName: string,
  limit: RateLimitConfig,
): Promise<OrganizerMomentCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<OrganizerMomentActionCallablePayload>(
    request, validateOrganizerMomentActionCallablePayload);
  const deps = fullDeps();
  await checkRateLimit(deps.firestore(), actorUid, actionName, limit);
  const result = await apply(deps, {
    actorUid,
    scope: scopeFromWire(data.scope),
    momentId: data.momentId,
  });
  return {moment: momentToWire(result.moment)};
}

async function runHandler(
  request: CallableRequest<unknown>,
): Promise<RunOrganizerMomentCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<RunOrganizerMomentCallablePayload>(
    request, validateRunOrganizerMomentCallablePayload);
  const deps = fullDeps();
  await checkRateLimit(deps.firestore(), actorUid, "runOrganizerMoment", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  return runOrganizerMomentHandler(deps, buildMomentRunnerDeps(), {
    actorUid,
    scope: scopeFromWire(data.scope),
    momentId: data.momentId,
    requestKey: data.requestKey,
  });
}

async function listHandler(
  request: CallableRequest<unknown>,
): Promise<ListOrganizerMomentsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ListOrganizerMomentsCallablePayload>(
    request, validateListOrganizerMomentsCallablePayload);
  const deps = fullDeps();
  await checkRateLimit(deps.firestore(), actorUid, "listOrganizerMoments", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  const result = await listOrganizerMomentsHandler(deps, {
    actorUid,
    scope: scopeFromWire(data.scope),
  });
  return {moments: result.moments.map(momentToWire)};
}

export const upsertOrganizerMoment = onCall(
  appCheckCallableOptionsWithLimits(momentCallableLimits),
  (request) => upsertHandler(request)
);
export const armOrganizerMoment = onCall(
  appCheckCallableOptionsWithLimits(momentCallableLimits),
  (request) => actionHandler(request, armOrganizerMomentHandler,
    "armOrganizerMoment", {maxRequests: 60, windowMs: 60 * 1000})
);
export const pauseOrganizerMoment = onCall(
  appCheckCallableOptionsWithLimits(momentCallableLimits),
  (request) => actionHandler(request, pauseOrganizerMomentHandler,
    "pauseOrganizerMoment", {maxRequests: 60, windowMs: 60 * 1000})
);
export const resumeOrganizerMoment = onCall(
  appCheckCallableOptionsWithLimits(momentCallableLimits),
  (request) => actionHandler(request, resumeOrganizerMomentHandler,
    "resumeOrganizerMoment", {maxRequests: 60, windowMs: 60 * 1000})
);
export const runOrganizerMoment = onCall(
  appCheckCallableOptionsWithLimits(momentCallableLimits),
  (request) => runHandler(request)
);
export const listOrganizerMoments = onCall(
  appCheckCallableOptionsWithLimits(momentCallableLimits),
  (request) => listHandler(request)
);
