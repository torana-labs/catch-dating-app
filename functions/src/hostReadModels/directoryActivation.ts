import * as admin from "firebase-admin";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {activateContactSummaries} from "./contactBackfill";
import {activateResponseSummaries} from "./responseStore";
import {activateSimpleSummaries} from "./simpleStore";
import {defineProjections} from "../platform/dispatch/runtime";

/**
 * Activates every Host directory read model for one organizer: contacts,
 * forms, groups, responses and events. Each activation checks, in one
 * transaction, that the views match their sources before it sets the
 * directory marker, so a source written before its view only delays the
 * marker until a retry. A new organizer has no sources and passes at once;
 * the Host app reads the directory without a callable fallback.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} organizerId The organizer.
 * @return {Promise<void>} Resolves once every marker is set.
 */
export async function activateHostDirectory(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
): Promise<void> {
  await activateContactSummaries(db, organizerId);
  await activateResponseSummaries(db, organizerId);
  for (const model of ["forms", "groups", "events"] as const) {
    await activateSimpleSummaries(db, model, organizerId);
  }
}

export const onHostDirectoryOrganizerCreated = onDocumentCreated({
  document: "organizers/{organizerId}", retry: true,
  memory: "512MiB" as const,
}, (event) => activateHostDirectory(admin.firestore(),
  event.params.organizerId));

/**
 * A new organizer: activate its directory read models.
 * The organizers dispatcher (issue #2451) runs the same work; both run
 * until the old trigger retires, which is safe because it re-reads its
 * sources, so a retry, a replay or a second run converges.
 */
export const hostDirectoryActivationProjections = defineProjections(
  "organizers", [{
    id: "hostDirectoryActivation", kind: "projection",
    when: (change) => change.operation === "create",
    run: (change, ctx) => activateHostDirectory(ctx.db, change.documentId),
  }]);
