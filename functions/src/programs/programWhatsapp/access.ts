import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {checkRateLimit} from "../../shared/rateLimit";
import {
  dutyAssignments,
  requireProgramDuty,
  type ProgramAccess,
} from "../../shared/programAuthority";

// Who may use the programme inbox and its settings. Managers always; staff
// through either duty that talks to guests, communications or guest
// relations, for the inbox (coordinators satisfy every duty); the
// communications duty for saving the saved replies; and the coordinator
// duty for assistant settings.

/** The duties that talk to guests, so open the guest inbox. */
export const INBOX_DUTIES = ["communications", "guestRelations"] as const;

export interface ProgramInboxDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  checkRateLimit: typeof checkRateLimit;
}

export const defaultProgramInboxDeps: ProgramInboxDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  checkRateLimit,
};

/**
 * Reading, replying to, taking over and marking read a guest conversation.
 * @param {ProgramAccess} access The caller's programme access.
 */
export function requireInboxAccess(access: ProgramAccess): void {
  if (access.role === "manager") return;
  if (INBOX_DUTIES.some((duty) => dutyAssignments(access, duty).length > 0)) {
    return;
  }
  throw new HttpsError("permission-denied",
    `This account lacks any of ${INBOX_DUTIES.join(", ")} for this program.`);
}

/**
 * Saving the programme saved replies: planner text, so communications only.
 * @param {ProgramAccess} access The caller's programme access.
 */
export function requireSavedReplyAccess(access: ProgramAccess): void {
  if (access.role !== "manager") requireProgramDuty(access, "communications");
}

export function requireSettingsAccess(access: ProgramAccess): void {
  if (access.role !== "manager") {
    requireProgramDuty(access, "programCoordinator");
  }
}

export function requireValid<T>(validate: (value: unknown) => boolean,
  value: T, label: string): T {
  if (!validate(value)) {
    throw new HttpsError("internal", `Invalid ${label}.`);
  }
  return value;
}
