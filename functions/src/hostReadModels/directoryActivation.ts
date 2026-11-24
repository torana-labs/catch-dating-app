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

/**
 * A new organizer: activate its directory read models.
 * Served by the organizers dispatcher (issue #2451); it re-reads its
 * sources, so a retry or a replay converges.
 */
export const hostDirectoryActivationProjections = defineProjections(
  "organizers", [{
    id: "hostDirectoryActivation", kind: "projection",
    when: (change) => change.operation === "create",
    run: (change, ctx) => activateHostDirectory(ctx.db, change.documentId),
  }]);
