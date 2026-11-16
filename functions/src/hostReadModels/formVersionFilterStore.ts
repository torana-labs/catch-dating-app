import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {HostFormVersionFilterDocument, OrganizerFormVersionDocument} from
  "../shared/generated/firestoreAdminTypes";
import {responseFilterOptions} from
  "../organizers/organizerFormResponseFilters";

export const hostFormVersionFiltersCollection = "hostFormVersionFilters";

/**
 * The manager read view of one form version's answer filters, or null when
 * the version is absent or lacks its owner. The options are exactly what
 * listOrganizerFormResponses returns as answerFilterOptions for the version:
 * promoted, non-sensitive choice questions with their option labels. Never
 * an answer or the rest of the definition.
 * @param {string} versionId The organizerFormVersions document id.
 * @param {FirebaseFirestore.DocumentData|undefined} data The version data.
 * @return {HostFormVersionFilterDocument|null} The view, or null.
 */
export function hostFormVersionFilter(versionId: string,
  data: FirebaseFirestore.DocumentData | undefined
): HostFormVersionFilterDocument | null {
  if (!data) return null;
  const version = data as OrganizerFormVersionDocument;
  if (typeof version.organizerId !== "string" || !version.organizerId ||
      typeof version.formId !== "string" || !version.formId ||
      !Number.isInteger(version.version) || version.version < 1 ||
      !Array.isArray(version.definition?.sections)) return null;
  return {organizerId: version.organizerId, formId: version.formId,
    versionId, formVersion: version.version,
    answerFilterOptions: responseFilterOptions(version.definition),
    version: 1};
}

/**
 * Rewrites one version's filter view from the current version document.
 * A version that cannot be projected (a stored shape the current schema
 * rejects) is logged and gets no view, rather than blocking a trigger retry
 * loop; the nightly data validation reports the document.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} versionId The organizerFormVersions document id.
 * @return {Promise<void>} Resolves once the view matches the source.
 */
export async function reconcileFormVersionFilter(
  db: FirebaseFirestore.Firestore, versionId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(hostFormVersionFiltersCollection).doc(versionId);
    const [source, old] = await tx.getAll(
      db.collection("organizerFormVersions").doc(versionId), ref);
    let next: HostFormVersionFilterDocument | null = null;
    try {
      next = hostFormVersionFilter(versionId, source.data());
    } catch (error) {
      logger.warn("Form version filter view left out a version that fails " +
        "its contract.", {versionId,
        reason: error instanceof Error ? error.message : String(error)});
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}
