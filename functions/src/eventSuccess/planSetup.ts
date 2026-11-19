/* eslint-disable max-len */
import type {SaveEventSuccessPlanSetupCallablePayload} from
  "../shared/generated/saveEventSuccessPlanSetupCallablePayload";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";

// The one server write of an event-success plan's setup fields
// (eventSuccessPlans/{eventId}). saveEventSuccessPlanSetup (Catch Host's
// plan screen) and night.plan both write through it, under the checks the
// Firestore rules applied to Catch Host's former client write: the event has
// not started and has no bookings, waitlist or check-ins, and the plan is
// still in setup and not frozen.

export type PlanSetupFields = SaveEventSuccessPlanSetupCallablePayload["setup"];

/** The setup fields, in the order the plan stores them. Nothing else is written. */
export const PLAN_SETUP_FIELDS = Object.freeze([
  "playbookId", "selectedModuleIds", "targetAttendeeCount", "structureConfig", "hostGoal",
  "wingmanRequestsEnabled", "contextualOpenersEnabled", "compatibilityAffectsRanking",
  "questionnaireConfig", "conversationGraphConsentMode", "attendeePrompt",
] as const satisfies ReadonlyArray<keyof PlanSetupFields>);

export type PlanSetupRefusal = "plan_missing" | "event_mismatch" | "setup_closed" | "plan_locked";

type Data = Record<string, unknown>;

/**
 * Why the plan's setup can't be written now, or null: the same checks as the
 * former client rule (eventSuccessSetupBlockedByEvent, eventSuccessPlanSetupFrozen).
 */
export function planSetupRefusal(event: EventDocument | Data | undefined, plan: Data | undefined,
  eventId: string, nowMillis: number): PlanSetupRefusal | null {
  if (!plan) return "plan_missing";
  if (plan.eventId !== undefined && plan.eventId !== eventId) return "event_mismatch";
  if (!event || setupBlockedByEvent(event as Data, nowMillis)) return "setup_closed";
  if (plan.status !== "setup" || (plan.frozenAt !== undefined && plan.frozenAt !== null)) return "plan_locked";
  return null;
}

/** The event has started, or has anyone booked, waitlisted or checked in. */
export function setupBlockedByEvent(event: Data, nowMillis: number): boolean {
  const start = millisOf(event.startTime);
  return (start !== null && start <= nowMillis) ||
    positive(event.bookedCount) || positive(event.waitlistedCount) || positive(event.checkedInCount);
}

/** Writes [fields] (only setup fields) and a server updatedAt to the plan in [tx]. */
export function stagePlanSetupUpdate(tx: FirebaseFirestore.Transaction, planRef: FirebaseFirestore.DocumentReference,
  fields: Partial<PlanSetupFields>, serverTimestamp: () => FirebaseFirestore.FieldValue): void {
  const update: Data = {};
  for (const key of PLAN_SETUP_FIELDS) {
    if (Object.hasOwn(fields, key)) update[key] = fields[key];
  }
  update.updatedAt = serverTimestamp();
  tx.update(planRef, update);
}

/** A Firestore timestamp in microseconds since the epoch, or null. */
export function timestampMicros(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as {seconds?: unknown; _seconds?: unknown; nanoseconds?: unknown; _nanoseconds?: unknown};
  const seconds = typeof raw.seconds === "number" ? raw.seconds : raw._seconds;
  const nanos = typeof raw.nanoseconds === "number" ? raw.nanoseconds : raw._nanoseconds;
  if (typeof seconds !== "number" || typeof nanos !== "number") return null;
  return seconds * 1_000_000 + Math.floor(nanos / 1000);
}

function millisOf(value: unknown): number | null {
  const micros = timestampMicros(value);
  return micros === null ? null : Math.floor(micros / 1000);
}

function positive(value: unknown): boolean {
  return typeof value === "number" && value > 0;
}
