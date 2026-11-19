import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {organizerEventDefaultsHash} from
  "../../events/eventSetupPreferences/resolve";
import {EventPreferenceError} from
  "../../events/eventSetupPreferences/types";
import type {EventSetupDefaultsDependencies} from "./service";

/** Shares preference policy between organizer storage and event snapshots. */
export function eventSetupDefaultsDependencies(
  db: FirebaseFirestore.Firestore
): EventSetupDefaultsDependencies {
  return {
    db,
    serverTimestamp: admin.firestore.FieldValue.serverTimestamp,
    nowMillis: () => Date.now(),
    validateAndHashPreferences: (source) => {
      try {
        return organizerEventDefaultsHash(source);
      } catch (error) {
        if (error instanceof EventPreferenceError) {
          throw new HttpsError("invalid-argument", error.message);
        }
        throw error;
      }
    },
  };
}
