import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {checkRateLimit} from "../../shared/rateLimit";
import {
  requireProgramDuty,
  type ProgramAccess,
} from "../../shared/programAuthority";

// Who may use the programme inbox and its settings. Managers always; staff
// through the communications duty for the inbox (coordinators satisfy every
// duty) and the coordinator duty for assistant settings.

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

export function requireInboxAccess(access: ProgramAccess): void {
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
