import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument} from "../shared/generated/eventDocument";
import {timestampEvidence} from
  "../eventSuccess/operations/groupProgressSource";

export const accountabilityViewsCollection = "hostEventAccountabilityViews";
export const membershipViewsCollection = "hostEventMembershipViews";
export const settingViewsCollection = "hostEventAssistanceSettingViews";
export const runtimeViewsCollection = "hostEventRuntimeViews";
/** The workflow kinds the live console reads settings for. */
export const consoleSettingKinds = ["lateJoin"] as const;
/** More attendees than this in one event is outside the guest views' bound. */
export const maxEventAttendees = 1000;
const documentIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

/** Ids the assistance records accept; any other row has no view. */
export function isAssistanceDocumentId(id: string): boolean {
  return documentIdPattern.test(id);
}

export interface GuestViewDeps {
  now: () => FirebaseFirestore.Timestamp;
}

export const defaultGuestViewDeps: GuestViewDeps = {
  now: () => admin.firestore.Timestamp.now(),
};

export type LiveContext = {mode: "live"; organizerId: string; eventId: string};

/**
 * The live context of an event the live console can operate: it exists, has
 * an assistance format, an end and an organizer id usable in a document id.
 * Anything else has no guest or settings views.
 */
export function operableEvent(eventId: string,
  event: FirebaseFirestore.DocumentData | undefined):
  {context: LiveContext; endAtMillis: number} | null {
  if (!event || !event.eventFormat || !documentIdPattern.test(eventId) ||
      typeof event.organizerId !== "string" ||
      !documentIdPattern.test(event.organizerId)) return null;
  let endAtMillis: number;
  try {
    const end = timestampEvidence(event.endTime);
    endAtMillis = Math.floor(end._seconds * 1000 + end._nanoseconds / 1e6);
  } catch {
    return null;
  }
  if (!Number.isSafeInteger(endAtMillis) || endAtMillis < 1) return null;
  return {context: {mode: "live", organizerId: event.organizerId, eventId},
    endAtMillis};
}

/** The groups a route plan configures, the whole event first. */
export function configuredGroupIds(event: Pick<EventDocument, "eventFormat">):
  string[] {
  const route = event.eventFormat?.activityDetails?.routePlan;
  const paceGroups = route?.groupStrategy === "paceGroups" ?
    (route.paceGroups ?? []).map((group) => group.id) : [];
  return ["event:whole", ...new Set(paceGroups.filter((id) =>
    id !== "event:whole"))];
}

/** A source document that failed validation, named by its collection. */
export class GuestSourceInvalidError extends Error {
  constructor(readonly source: string, readonly detail: string) {
    super(`${source}: ${detail}`);
    this.name = "GuestSourceInvalidError";
  }
}

/**
 * Runs one parsing stage of an evaluation. The operations readers report an
 * invalid or unconfigured source as a failed-precondition (or, for guest
 * rows, not-found) HttpsError; those become a GuestSourceInvalidError
 * naming [source]. Any other error is a transport or programming failure and
 * propagates, so the trigger retries.
 */
export async function parsing<T>(source: string,
  read: () => T | Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof GuestSourceInvalidError) throw error;
    if (error instanceof HttpsError && (error.code === "failed-precondition" ||
        error.code === "not-found")) {
      throw new GuestSourceInvalidError(source, error.message);
    }
    if (error instanceof Error &&
        error.message === "Invalid assistance document id") {
      throw new GuestSourceInvalidError(source, error.message);
    }
    throw error;
  }
}

/** What every view records about its last evaluation. */
export interface EvaluationFields {
  revision: number;
  evaluatedAt: FirebaseFirestore.Timestamp;
  sourceCoverage: "complete" | "invalidSource";
  incompleteSource: string | null;
}

/**
 * Plans one view write with no-op avoidance: [next] is everything except
 * revision and evaluatedAt. An unchanged document is not written; a changed
 * one gets revision + 1 and evaluatedAt now. Firestore does not keep map key
 * order, so documents are compared structurally.
 */
export function planViewWrite<D extends EvaluationFields>(
  previous: D | null, next: Omit<D, "revision" | "evaluatedAt">,
  now: FirebaseFirestore.Timestamp
): {unchanged: true; revision: number} |
  {unchanged: false; revision: number; document: D} {
  const previousRevision = positiveInteger(previous?.revision) ?? 0;
  if (previous !== null) {
    const {revision: _revision, evaluatedAt: _evaluatedAt, ...rest} =
      previous;
    void _revision;
    void _evaluatedAt;
    if (isDeepStrictEqual(normalized(rest), normalized(next))) {
      return {unchanged: true, revision: previousRevision};
    }
  }
  const revision = previousRevision + 1;
  return {unchanged: false, revision,
    document: {...next, revision, evaluatedAt: now} as unknown as D};
}

/** Firestore drops undefined fields; compare what a read would return. */
function normalized(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

export function positiveInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) > 0 ?
    value as number : null;
}

export function millisOf(stamp: FirebaseFirestore.Timestamp): number {
  return stamp.toMillis();
}
