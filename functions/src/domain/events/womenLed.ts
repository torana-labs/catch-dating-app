import {HttpsError} from "firebase-functions/v2/https";
import type {
  EventDocument,
  OrganizerDocument,
} from "../../shared/generated/firestoreAdminTypes";

/**
 * Women-led plans (owner decision, 16 Nov 2026).
 *
 * Women-led is a self-declared hosting label: a plan led or hosted by women.
 * It is informational and filterable only and never restricts attendance;
 * attendance limits stay in event constraints and admission policy. The
 * organizer declares a default, an event may override it, and an admin may
 * clear either and lock it. Every write records who set it, in which role
 * and when. Public read models carry only the resolved boolean.
 */
export type OrganizerWomenLed = NonNullable<OrganizerDocument["womenLed"]>;
export type EventWomenLed = NonNullable<EventDocument["womenLed"]>;
export type WomenLedSetByRole = OrganizerWomenLed["setByRole"];
export type WomenLedAdminAction = "set" | "clear" | "release";
/** setAt is a server timestamp sentinel when written. */
type Timestamp = FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
export type OrganizerWomenLedWrite =
  Omit<OrganizerWomenLed, "setAt"> & {setAt: Timestamp};
export type EventWomenLedWrite =
  Omit<EventWomenLed, "setAt"> & {setAt: Timestamp};

export interface WomenLedActor {
  uid: string;
  role: WomenLedSetByRole;
}

type Raw = Record<string, unknown>;

function record(value: unknown): Raw | null {
  return value !== null && typeof value === "object" &&
    !Array.isArray(value) ? value as Raw : null;
}

/**
 * Whether a stored organizer or event declaration is under an admin lock.
 * Reads raw data so read-model builders can use it without validation.
 * @param {unknown} declaration Stored womenLed value.
 * @return {boolean} True when an admin cleared and locked the label.
 */
export function womenLedLocked(declaration: unknown): boolean {
  return record(declaration)?.lockedByAdmin === true;
}

/**
 * The organizer's resolved women-led default.
 * @param {unknown} organizer Organizer document data.
 * @return {boolean} True when declared and not locked.
 */
export function organizerWomenLed(organizer: unknown): boolean {
  const declaration = record(record(organizer)?.womenLed);
  return declaration?.value === true && declaration.lockedByAdmin !== true;
}

/**
 * The resolved label for one plan: the event's override, else the
 * organizer's default. An admin lock on either side resolves to false.
 * Imported events have no override and pass undefined.
 * @param {unknown} organizer Organizer document data.
 * @param {unknown} event Event document data, if it can override.
 * @return {boolean} True when the plan is women-led.
 */
export function eventWomenLed(organizer: unknown, event?: unknown): boolean {
  if (womenLedLocked(record(organizer)?.womenLed)) return false;
  const override = record(record(event)?.womenLed);
  if (override?.lockedByAdmin === true) return false;
  if (typeof override?.value === "boolean") return override.value;
  return organizerWomenLed(organizer);
}

/**
 * The organizer team role behind a Host edit, for the audit fields.
 * @param {boolean} isOwner Whether the actor owns the organizer.
 * @return {WomenLedSetByRole} owner or manager.
 */
export function hostWomenLedRole(isOwner: boolean): WomenLedSetByRole {
  return isOwner ? "owner" : "manager";
}

/**
 * The organizer declaration a Host edit writes, or null when nothing
 * changes. Declaring true under an admin lock is refused; declaring false
 * leaves a lock in place, so the Host cannot lift moderation.
 * @param {OrganizerWomenLed | undefined} current Stored declaration.
 * @param {boolean} requested Host value.
 * @param {WomenLedActor} actor Owner or manager.
 * @param {Timestamp} now Server timestamp for setAt.
 * @return {OrganizerWomenLedWrite | null} Declaration to store, if any.
 */
export function hostOrganizerWomenLed(
  current: OrganizerWomenLed | undefined,
  requested: boolean,
  actor: WomenLedActor,
  now: Timestamp
): OrganizerWomenLedWrite | null {
  if (current?.lockedByAdmin === true) {
    if (requested) throw lockedError();
    return null;
  }
  if (current?.value === requested) return null;
  return {value: requested, setByUid: actor.uid, setByRole: actor.role,
    setAt: now, lockedByAdmin: false};
}

/**
 * The event override a Host edit writes, or null when nothing changes.
 * null follows the organizer default again. Declaring true is refused under
 * a lock on the event or its organizer.
 * @param {EventWomenLed | undefined} current Stored override.
 * @param {boolean | null} requested Host value.
 * @param {boolean} organizerLocked Whether the organizer is locked.
 * @param {WomenLedActor} actor Owner or manager.
 * @param {Timestamp} now Server timestamp for setAt.
 * @return {EventWomenLedWrite | null} Override to store, if any.
 */
export function hostEventWomenLed(
  current: EventWomenLed | undefined,
  requested: boolean | null,
  organizerLocked: boolean,
  actor: WomenLedActor,
  now: Timestamp
): EventWomenLedWrite | null {
  if (requested === true && (organizerLocked || current?.lockedByAdmin)) {
    throw lockedError();
  }
  if (current?.lockedByAdmin === true) return null;
  if ((current?.value ?? null) === requested) return null;
  return {value: requested, setByUid: actor.uid, setByRole: actor.role,
    setAt: now, lockedByAdmin: false};
}

/**
 * The organizer declaration an admin moderation action writes.
 * @param {OrganizerWomenLed | undefined} current Stored declaration.
 * @param {WomenLedAdminAction} action set, clear or release.
 * @param {string} adminUid Admin uid.
 * @param {Timestamp} now Server timestamp for setAt.
 * @return {OrganizerWomenLedWrite} Declaration to store.
 */
export function adminOrganizerWomenLed(
  current: OrganizerWomenLed | undefined,
  action: WomenLedAdminAction,
  adminUid: string,
  now: Timestamp
): OrganizerWomenLedWrite {
  const audit = {setByUid: adminUid, setByRole: "admin" as const, setAt: now};
  switch (action) {
  case "set":
    return {value: true, ...audit, lockedByAdmin: false};
  case "clear":
    return {value: false, ...audit, lockedByAdmin: true};
  case "release":
    return {value: current?.lockedByAdmin ? false : current?.value ?? false,
      ...audit, lockedByAdmin: false};
  }
}

/**
 * The event override an admin moderation action writes. release returns the
 * event to its organizer's default.
 * @param {WomenLedAdminAction} action set, clear or release.
 * @param {string} adminUid Admin uid.
 * @param {Timestamp} now Server timestamp for setAt.
 * @return {EventWomenLedWrite} Override to store.
 */
export function adminEventWomenLed(
  action: WomenLedAdminAction,
  adminUid: string,
  now: Timestamp
): EventWomenLedWrite {
  const audit = {setByUid: adminUid, setByRole: "admin" as const, setAt: now};
  switch (action) {
  case "set":
    return {value: true, ...audit, lockedByAdmin: false};
  case "clear":
    return {value: false, ...audit, lockedByAdmin: true};
  case "release":
    return {value: null, ...audit, lockedByAdmin: false};
  }
}

function lockedError(): HttpsError {
  return new HttpsError("failed-precondition",
    "An admin reviewed the women-led label. Contact Catch support to " +
    "declare it again.");
}
