import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  HostApplicationDetailViewDocument,
  OrganizerApplicationDocument,
} from "../shared/generated/firestoreAdminTypes";
import {genericFormApplicationId} from
  "../organizers/organizerApplicationAccess";
import {organizerApplicationDetail} from
  "../organizers/organizerApplications";

export const hostApplicationDetailViewsCollection =
  "hostApplicationDetailViews";

/** The most applications one membership write re-evaluates. */
export const maxApplicationDetailFanOut = 100;

/**
 * Reads one application's manager view from current sources inside a
 * transaction, without writing: exactly what getOrganizerApplicationDetail
 * returns, every source read in the transaction so a delayed trigger cannot
 * bring back answers a withdrawal masked.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The read transaction.
 * @param {string} applicationId The organizerApplications document id.
 * @return {Promise<HostApplicationDetailViewDocument|null>} The view, or
 *     null when the application is gone or has no owner.
 */
export async function readHostApplicationDetailView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  applicationId: string
): Promise<HostApplicationDetailViewDocument | null> {
  const snapshot = await tx.get(db.collection("organizerApplications")
    .doc(applicationId));
  const application = snapshot.data() as
    OrganizerApplicationDocument | undefined;
  if (!application || typeof application.organizerId !== "string" ||
      !application.organizerId) return null;
  return {
    organizerId: application.organizerId,
    applicationId,
    detail: await organizerApplicationDetail({db, applicationId,
      application, transaction: tx}),
    version: 1,
  };
}

/**
 * Rewrites one application's view from current sources, writing only on
 * change and deleting it with the application. A source that fails its
 * contract is logged and keeps the previous view rather than blocking a
 * trigger retry loop.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} applicationId The application document id.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export async function reconcileHostApplicationDetailView(
  db: FirebaseFirestore.Firestore, applicationId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(hostApplicationDetailViewsCollection)
      .doc(applicationId);
    const old = await tx.get(ref);
    let next: HostApplicationDetailViewDocument | null;
    try {
      next = await readHostApplicationDetailView(db, tx, applicationId);
    } catch (error) {
      logger.warn("Application detail view kept a source that fails its " +
        "contract.", {applicationId,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/**
 * The application a contact origin points at: a generic-form response's
 * derived application, or the application an imported response names.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.DocumentData|undefined} origin The origin.
 * @return {Promise<string|null>} The application id, or null.
 */
export async function applicationIdForOrigin(
  db: FirebaseFirestore.Firestore,
  origin: FirebaseFirestore.DocumentData | undefined
): Promise<string | null> {
  const responseId = origin?.sourceEntityId;
  if (origin?.sourceKind !== "hostForm" || typeof responseId !== "string" ||
      !responseId) return null;
  if (origin.sourceEntityKind === "hostFormResponse") {
    return genericFormApplicationId(responseId);
  }
  if (origin.sourceEntityKind !== "hostApplicationResponse") return null;
  const response = (await db.collection("organizerApplicationResponses")
    .doc(responseId).get()).data();
  return typeof response?.applicationId === "string" &&
    response.applicationId ? response.applicationId : null;
}

/**
 * Re-evaluates the organizer-wide applications of one applicant, whose
 * community membership their views show.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} organizerId The organizer.
 * @param {string} uid The applicant's account id.
 * @return {Promise<void>} Resolves once each view matches its sources.
 */
export async function reconcileHostApplicationDetailViewsForApplicant(
  db: FirebaseFirestore.Firestore, organizerId: string, uid: string
): Promise<void> {
  const applications = await db.collection("organizerApplications")
    .where("organizerId", "==", organizerId)
    .where("linkedUid", "==", uid)
    .limit(maxApplicationDetailFanOut)
    .get();
  for (const application of applications.docs) {
    await reconcileHostApplicationDetailView(db, application.id);
  }
}
