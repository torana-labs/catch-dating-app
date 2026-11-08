import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {hashRequest} from "../shared/programOperationHash";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {
  requireProgramAccess,
  requireProgramDuty,
  requireProgramMutable,
  type ProgramAccess,
} from "../shared/programAuthority";
import {momentAttentionWindowMillis} from
  "../organizers/organizerAttentionPolicy";
import {MOMENT_SENDS_COLLECTION} from "../moments/momentDocuments";
import {staffAttentionSend, staffVisibleDuties} from "./programStaffAttention";
import type {GetProgramLiveBoardCallablePayload} from
  "../shared/generated/getProgramLiveBoardCallablePayload";
import type {ProgramLiveBoardCallableResponse} from
  "../shared/generated/programLiveBoardCallableResponse";
import type {ResolveProgramAlertCallablePayload} from
  "../shared/generated/resolveProgramAlertCallablePayload";
import type {ProgramAlertCallableResponse} from
  "../shared/generated/programAlertCallableResponse";
import {validateGetProgramLiveBoardCallablePayload} from
  "../shared/generated/validators/getProgramLiveBoardInput";
import {validateResolveProgramAlertCallablePayload} from
  "../shared/generated/validators/resolveProgramAlertInput";

/* firestore-index: programTravelLegs (
  programId:ASCENDING,
  kind:ASCENDING
) */

export const PROGRAM_ALERTS_COLLECTION = "programAlerts";
const SEND_SCAN_LIMIT = 400;
const ALERT_LIMIT = 150;
const LEG_SCAN_LIMIT = 500;
const FUNCTION_SCAN_LIMIT = 50;

type Board = ProgramLiveBoardCallableResponse;
type BoardAlert = Board["alerts"][number];
type BoardFunction = Board["tonight"][number];

export interface LiveBoardDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: LiveBoardDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

interface StoredResolution {
  state: "open" | "done";
  assigneeUid: string | null;
  assigneeName: string | null;
  revision: number;
}

/** `programAlerts` doc id: programme-prefixed so one read lists them. */
export function programAlertDocId(programId: string, alertId: string): string {
  return `${programId}_${alertId}`;
}

/** Calendar day of [millis] in [timeZone], as YYYY-MM-DD. */
function dayKey(millis: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {timeZone, year: "numeric",
      month: "2-digit", day: "2-digit"}).format(new Date(millis));
  } catch {
    return new Date(millis).toISOString().slice(0, 10);
  }
}

/**
 * The function phases for today in the programme's zone: done, now (one
 * at most), next (the first still to start) and later.
 */
export function tonightFunctions(
  functions: ReadonlyArray<Omit<BoardFunction, "phase">>,
  nowMillis: number,
  timeZone: string,
): BoardFunction[] {
  const today = dayKey(nowMillis, timeZone);
  const todays = functions
    .filter((fn) => dayKey(fn.startsAtMillis, timeZone) === today)
    .sort((a, b) => a.startsAtMillis - b.startsAtMillis);
  let nextGiven = false;
  return todays.map((fn) => {
    let phase: BoardFunction["phase"];
    if (fn.endsAtMillis <= nowMillis) {
      phase = "done";
    } else if (fn.startsAtMillis <= nowMillis) {
      phase = "now";
    } else if (!nextGiven) {
      phase = "next";
      nextGiven = true;
    } else {
      phase = "later";
    }
    return {...fn, phase};
  });
}

interface LegFact {
  id: string;
  flightNumber: string | null;
  flightStatus: string;
  readiness: string;
  updatedAtMillis: number;
}

/** Alerts a journey raises: a cancelled or diverted flight, or a
 *  journey staff marked disrupted. */
export function travelAlerts(legs: ReadonlyArray<LegFact>):
  Array<Omit<BoardAlert, "state" | "assignedToMe" | "assigneeName" |
    "revision">> {
  const alerts: Array<Omit<BoardAlert, "state" | "assignedToMe" |
    "assigneeName" | "revision">> = [];
  for (const leg of legs) {
    const flight = leg.flightNumber ?? "A flight";
    if (leg.flightStatus === "cancelled" || leg.flightStatus === "diverted") {
      alerts.push({
        alertId: `flight_${leg.id}`,
        source: "flight",
        severity: "urgent",
        title: leg.flightStatus === "cancelled" ?
          `${flight} was cancelled` : `${flight} was diverted`,
        subjectId: leg.id,
        createdAtMillis: leg.updatedAtMillis,
      });
    } else if (leg.readiness === "disrupted") {
      alerts.push({
        alertId: `readiness_${leg.id}`,
        source: "readiness",
        severity: "warning",
        title: `${flight} needs a new plan`,
        subjectId: leg.id,
        createdAtMillis: leg.updatedAtMillis,
      });
    }
  }
  return alerts;
}

/** Merges stored resolutions over derived alerts, open first then newest. */
export function mergeResolutions(
  derived: ReadonlyArray<Omit<BoardAlert, "state" | "assignedToMe" |
    "assigneeName" | "revision">>,
  stored: ReadonlyMap<string, StoredResolution>,
  actorUid: string,
): BoardAlert[] {
  return derived.map((alert) => {
    const resolution = stored.get(alert.alertId);
    return {
      ...alert,
      state: resolution?.state ?? "open",
      assignedToMe: resolution?.assigneeUid === actorUid,
      assigneeName: resolution?.assigneeName ?? null,
      revision: resolution?.revision ?? 0,
    };
  }).sort((a, b) => a.state === b.state ?
    b.createdAtMillis - a.createdAtMillis : a.state === "open" ? -1 : 1);
}

/**
 * The live board. Planners and coordinators see the function on now,
 * tonight's schedule, travel counts and every alert; function leads see
 * the staff alerts stamped for the duties they hold (travel alerts need
 * coordinator reach). Alerts are derived on read; `programAlerts` holds
 * only who took or finished one.
 */
export async function getProgramLiveBoardHandler(
  request: CallableRequest<unknown>,
  deps: LiveBoardDeps = defaultDeps,
): Promise<Board> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<GetProgramLiveBoardCallablePayload>(
    request, validateGetProgramLiveBoardCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getProgramLiveBoard", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const now = deps.now();
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now,
  });
  requireProgramDuty(access, "functionLead");
  const visibleDuties = staffVisibleDuties(access);
  const fullReach = visibleDuties === null;
  const organizerId = access.program.organizerId;

  const [sendSnap, functionSnap, legSnap, alertSnap] = await Promise.all([
    db.collection(MOMENT_SENDS_COLLECTION)
      .where("organizerId", "==", organizerId)
      .where("actionKind", "==", "staffAttention")
      .where("createdAtMillis", ">",
        now.toMillis() - momentAttentionWindowMillis)
      .orderBy("createdAtMillis")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(SEND_SCAN_LIMIT + 1)
      .get(),
    db.collection("programFunctions")
      .where("programId", "==", data.programId)
      .limit(FUNCTION_SCAN_LIMIT).get(),
    fullReach ? db.collection("programTravelLegs")
      .where("programId", "==", data.programId)
      .where("kind", "==", "inbound")
      .limit(LEG_SCAN_LIMIT).get() : Promise.resolve(null),
    db.collection(PROGRAM_ALERTS_COLLECTION)
      .where("programId", "==", data.programId)
      .limit(ALERT_LIMIT * 2).get(),
  ]);

  const derived: Parameters<typeof mergeResolutions>[0][number][] = [];
  const seen = new Set<string>();
  for (const snap of sendSnap.docs.slice(0, SEND_SCAN_LIMIT)) {
    const send = staffAttentionSend(snap);
    if (send === null || send.scopeKind !== "program" ||
        send.scopeId !== data.programId ||
        (visibleDuties !== null && !visibleDuties.has(send.duty))) {
      continue;
    }
    const alertId = `${send.runId}_${send.duty}`;
    if (seen.has(alertId)) continue;
    seen.add(alertId);
    derived.push({
      alertId, source: "staffAttention", severity: send.severity,
      title: send.title, subjectId: send.momentId,
      createdAtMillis: send.createdAtMillis,
    });
  }

  const legs: LegFact[] = (legSnap?.docs ?? []).flatMap((doc) => {
    const leg = doc.data() as Record<string, unknown>;
    if (leg.organizerId !== organizerId) return [];
    return [{
      id: doc.id,
      flightNumber: typeof leg.flightNumber === "string" ?
        leg.flightNumber : null,
      flightStatus: String(leg.flightStatus ?? "unknown"),
      readiness: String(leg.readiness ?? "expected"),
      updatedAtMillis: staffTimestampMillis(leg.updatedAt) ||
        now.toMillis(),
    }];
  });
  derived.push(...travelAlerts(legs));

  const stored = new Map<string, StoredResolution>();
  for (const doc of alertSnap.docs) {
    const alert = doc.data() as Record<string, unknown>;
    if (alert.programId !== data.programId ||
        typeof alert.alertId !== "string") continue;
    stored.set(alert.alertId, {
      state: alert.state === "done" ? "done" : "open",
      assigneeUid: typeof alert.assigneeUid === "string" ?
        alert.assigneeUid : null,
      assigneeName: typeof alert.assigneeName === "string" ?
        alert.assigneeName : null,
      revision: typeof alert.revision === "number" ? alert.revision : 0,
    });
  }
  const alerts = mergeResolutions(derived, stored, actorUid);

  const functions = functionSnap.docs.flatMap((doc) => {
    const fn = doc.data() as Record<string, unknown>;
    if (fn.organizerId !== organizerId || fn.status === "cancelled") {
      return [];
    }
    return [{
      functionId: doc.id,
      name: String(fn.name ?? ""),
      venueName: String(fn.venueName ?? ""),
      startsAtMillis: staffTimestampMillis(fn.startsAt),
      endsAtMillis: staffTimestampMillis(fn.endsAt),
      expectedCount: typeof fn.expectedCount === "number" ?
        fn.expectedCount : null,
      checkedInCount: typeof fn.checkedInCount === "number" ?
        fn.checkedInCount : null,
    }];
  });
  const tonight = tonightFunctions(functions, now.toMillis(),
    access.program.timezone);
  const current = tonight.find((fn) => fn.phase === "now") ??
    tonight.find((fn) => fn.phase === "next") ?? null;

  return {
    programId: data.programId,
    generatedAtMillis: now.toMillis(),
    now: current,
    tonight,
    travel: {
      expected: legs.filter((leg) => leg.readiness === "expected").length,
      atCurb: legs.filter((leg) => leg.readiness === "ready").length,
      disrupted: legs.filter((leg) => leg.readiness === "disrupted").length,
    },
    alerts: alerts.slice(0, ALERT_LIMIT),
    truncated: sendSnap.docs.length > SEND_SCAN_LIMIT ||
      alerts.length > ALERT_LIMIT,
  };
}

function actorName(access: ProgramAccess): string | null {
  const grant = access.grant as {displayName?: unknown} | null;
  return grant && typeof grant.displayName === "string" ?
    grant.displayName : null;
}

/**
 * Takes, finishes or reopens one alert. The alert id is not checked
 * against the derived set: a resolution for an alert that has aged out
 * is harmless, and the read only shows resolutions for live alerts.
 */
export async function resolveProgramAlertHandler(
  request: CallableRequest<unknown>,
  deps: LiveBoardDeps = defaultDeps,
): Promise<ProgramAlertCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ResolveProgramAlertCallablePayload>(
    request, validateResolveProgramAlertCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "resolveProgramAlert", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const requestHash = hashRequest({
    op: "resolveProgramAlert", programId: data.programId,
    alertId: data.alertId, action: data.action,
    expectedRevision: data.expectedRevision,
  });
  const ref = db.collection(PROGRAM_ALERTS_COLLECTION)
    .doc(programAlertDocId(data.programId, data.alertId));
  return db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({
      db, programId: data.programId, actorUid, now: deps.now(),
      transaction: tx,
    });
    requireProgramDuty(access, "functionLead");
    requireProgramMutable(access.program);
    const snap = await tx.get(ref);
    const current = snap.exists ?
      snap.data() as Record<string, unknown> : null;
    const reply = (doc: Record<string, unknown>) => ({
      programId: data.programId,
      alertId: data.alertId,
      state: doc.state === "done" ? "done" as const : "open" as const,
      assignedToMe: doc.assigneeUid === actorUid,
      revision: doc.revision as number,
    });
    if (current && current.lastRequestId === data.requestId) {
      if (current.lastRequestHash !== requestHash) {
        throw new HttpsError("failed-precondition",
          "This request id was already used for a different change.");
      }
      return reply(current);
    }
    const revision = typeof current?.revision === "number" ?
      current.revision : 0;
    if (revision !== data.expectedRevision) {
      throw new HttpsError("aborted", "Someone else changed this alert.",
        {reason: "staleRevision", revision});
    }
    const name = actorName(access);
    const next: Record<string, unknown> = {
      programId: data.programId,
      organizerId: access.program.organizerId,
      alertId: data.alertId,
      state: data.action === "done" ? "done" : "open",
      assigneeUid: data.action === "reopen" ?
        null : actorUid,
      assigneeName: data.action === "reopen" ? null : name,
      updatedByUid: actorUid,
      updatedAtMillis: deps.now().toMillis(),
      revision: revision + 1,
      lastRequestId: data.requestId,
      lastRequestHash: requestHash,
    };
    tx.set(ref, next);
    return reply(next);
  });
}

const liveBoardLimits = {timeoutSeconds: 60, maxInstances: 20};

export const getProgramLiveBoard = onCall(
  appCheckCallableOptionsWithLimits(liveBoardLimits),
  (request) => getProgramLiveBoardHandler(request),
);

export const resolveProgramAlert = onCall(
  appCheckCallableOptionsWithLimits(liveBoardLimits),
  (request) => resolveProgramAlertHandler(request),
);
