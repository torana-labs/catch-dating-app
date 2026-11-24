import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {hashRequest} from "../shared/programOperationHash";
import {
  requireProgramAccess,
  requireProgramDuty,
  requireProgramMutable,
  type ProgramAccess,
} from "../shared/programAuthority";
import type {ProgramAlertViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {ResolveProgramAlertCallablePayload} from
  "../shared/generated/resolveProgramAlertCallablePayload";
import type {ProgramAlertCallableResponse} from
  "../shared/generated/programAlertCallableResponse";
import {validateResolveProgramAlertCallablePayload} from
  "../shared/generated/validators/resolveProgramAlertInput";

export const PROGRAM_ALERTS_COLLECTION = "programAlerts";

/** An alert derived from a journey, before its stored resolution. */
export interface DerivedTravelAlert {
  alertId: string;
  source: ProgramAlertViewDocument["source"];
  severity: ProgramAlertViewDocument["severity"];
  title: string;
  subjectId: string | null;
  createdAtMillis: number;
}

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

/** `programAlerts` doc id: programme-prefixed so one read lists them. */
export function programAlertDocId(programId: string, alertId: string): string {
  return `${programId}_${alertId}`;
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
export function travelAlerts(
  legs: ReadonlyArray<LegFact>,
): DerivedTravelAlert[] {
  const alerts: DerivedTravelAlert[] = [];
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

export const resolveProgramAlert = onCall(
  appCheckCallableOptionsWithLimits(liveBoardLimits),
  (request) => resolveProgramAlertHandler(request),
);
