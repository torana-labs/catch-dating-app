import type {Firestore} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {
  eventSenderKey,
  eventServiceKeys,
  EventContactPermission,
} from "../../shared/eventContactPermissions";
import {AssistanceSourceWorkStore} from "./sourceWorkStore";
import {AssistanceRosterWorkStore} from "./rosterWorkStore";
import {AssistanceSourceChange, enqueueAssistanceSourceChange} from
  "./sourceWorkSignals";

/**
 * Live work for an event-day consent change (issue #2494). It took over
 * from onAssistancePermissionChanged: onContactPermissionAudienceProjected
 * calls it for every event_{eventId} document write. Each channel grant is
 * one source change scoped to the roster row it covers, so a change wakes
 * exactly the guest work an old permission write woke.
 */
export interface EventContactPermissionChange {
  /** The trigger event id; with the scope, it keys the work idempotently. */
  triggerEventId: string;
  eventId: string;
  occurredAt: number;
  before: {value: EventContactPermission; generation: unknown} | null;
  after: {value: EventContactPermission; generation: unknown} | null;
}

/** One source change per event-day channel whose grant changed. */
export function eventContactSourceChanges(
  change: EventContactPermissionChange): AssistanceSourceChange[] {
  const side = (snapshot: EventContactPermissionChange["before"],
    key: typeof eventServiceKeys[keyof typeof eventServiceKeys]) => {
    const grant = snapshot?.value.grants[key];
    if (!snapshot || !grant) return null;
    return {generation: snapshot.generation, value: {
      context: {mode: "live", eventId: change.eventId,
        organizerId: snapshot.value.organizerId},
      attendeeId: grant.attendeeId, key,
      grant: JSON.parse(JSON.stringify(grant)) as Record<string, unknown>,
    }};
  };
  const changes: AssistanceSourceChange[] = [];
  for (const key of Object.values(eventServiceKeys)) {
    const before = side(change.before, key);
    const after = side(change.after, key);
    if (operationContentHash(before?.value ?? null) ===
        operationContentHash(after?.value ?? null)) continue;
    changes.push({
      source: {eventId: change.triggerEventId,
        collection: "contactPermissions",
        documentId: eventSenderKey(change.eventId),
        occurredAt: change.occurredAt},
      before, after,
    });
  }
  return changes;
}

/** Enqueues the live work an event-day consent change needs. */
export async function enqueueEventContactPermissionWork(db: Firestore,
  change: EventContactPermissionChange): Promise<string[]> {
  const store = new AssistanceSourceWorkStore(db);
  const roster = new AssistanceRosterWorkStore(db);
  const queued: string[] = [];
  for (const sourceChange of eventContactSourceChanges(change)) {
    queued.push(...await enqueueAssistanceSourceChange(store, sourceChange,
      roster));
  }
  return queued;
}
