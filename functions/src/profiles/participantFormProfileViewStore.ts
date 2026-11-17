import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  ParticipantFormProfileViewDocument as FormProfileView,
  ParticipantIntakeProfileDocument as Intake,
  ParticipantIntakeProfileViewDocument as IntakeView,
  ParticipantOrganizerCardDocument as Card,
} from "../shared/generated/firestoreAdminTypes";
import {readParticipantFormProfileProposal} from
  "../organizers/organizerFormProfileProposals";

export const participantFormProfileViewsCollection =
  "participantFormProfileViews";
export const participantIntakeProfileViewsCollection =
  "participantIntakeProfileViews";
/** The claim terms the review shows; the claim payload accepts only these. */
export const formProfileClaimTermsVersion = "form-profile-claim-v1";

/**
 * The guest's review row for one submitted form, exactly as
 * getParticipantFormProfile computes the proposal and organizer-card parts,
 * or null when the proposal is unavailable to its owner (no proposal, a
 * withdrawn or changed response, a deleted account, an inconsistent card).
 * Reads in the transaction; never writes.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The read transaction.
 * @param {string} responseId The response, proposal and card id.
 * @return {Promise<FormProfileView|null>} The view.
 */
export async function participantFormProfileView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  responseId: string): Promise<FormProfileView | null> {
  const owner = await tx.get(db.collection("participantFormProfileProposals")
    .doc(responseId));
  const uid = owner.data()?.uid;
  if (typeof uid !== "string" || !uid) return null;
  let proposal: Awaited<ReturnType<typeof readParticipantFormProfileProposal>>;
  try {
    proposal = await readParticipantFormProfileProposal({db, tx, uid,
      responseId});
  } catch (error) {
    if (error instanceof HttpsError && error.code === "not-found") return null;
    throw error;
  }
  const cardSnap = await tx.get(db.collection("participantOrganizerCards")
    .doc(responseId));
  const card = cardSnap.data() as Card | undefined;
  if (card && (card.uid !== uid || card.responseId !== responseId ||
      card.organizerId !== proposal.organizerId)) return null;
  const cardFields = new Set(proposal.fields
    .filter((field) => field.destination === "organizerCard")
    .map((field) => field.questionId));
  return {uid, organizerId: proposal.organizerId, formId: proposal.formId,
    formTitle: proposal.formTitle,
    submittedAtMillis: proposal.submittedAtMillis,
    claimedAtMillis: proposal.claimedAtMillis, fields: proposal.fields,
    selectedCardQuestionIds: (card?.questionIds ?? [])
      .filter((id) => cardFields.has(id)),
    cardRevision: card?.revision ?? 0,
    termsVersion: formProfileClaimTermsVersion, version: 1};
}

/**
 * The guest's intake revision and saved LinkedIn URL, as
 * getParticipantFormProfile returns them, or null without an intake profile
 * (which the review reads as revision 0 and no URL) or after deletion.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The read transaction.
 * @param {string} uid The guest.
 * @return {Promise<IntakeView|null>} The view.
 */
export async function participantIntakeProfileView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  uid: string): Promise<IntakeView | null> {
  const [intakeSnap, deleted] = await Promise.all([
    tx.get(db.collection("participantIntakeProfiles").doc(uid)),
    tx.get(db.collection("deletedUsers").doc(uid)),
  ]);
  if (!intakeSnap.exists || deleted.exists) return null;
  const intake = intakeSnap.data() as Intake;
  const linkedin = intake.fields.find((field) =>
    field.canonicalFieldId === "linkedinUrl")?.value;
  return {uid, intakeRevision: intake.revision ?? 0,
    linkedinUrl: linkedin?.valueKind === "text" ? linkedin.textValue : null,
    version: 1};
}

/**
 * Rewrites one view from current sources: writes it on change and deletes
 * it once its source is unavailable. A source that fails its contract is
 * logged and keeps its previous view rather than looping trigger retries;
 * the nightly data validation reports the document. Firestore errors throw
 * so the trigger retries.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.DocumentReference} ref The view.
 * @param {Function} compute Computes the view in the transaction.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
async function reconcileView<T extends object>(
  db: FirebaseFirestore.Firestore, ref: FirebaseFirestore.DocumentReference,
  compute: (tx: FirebaseFirestore.Transaction) => Promise<T | null>):
  Promise<void> {
  await db.runTransaction(async (tx) => {
    const old = await tx.get(ref);
    let next: T | null;
    try {
      next = await compute(tx);
    } catch (error) {
      if (!(error instanceof HttpsError) && !(error instanceof TypeError)) {
        throw error;
      }
      logger.warn("Form profile view kept a source that fails its contract.",
        {path: ref.path,
          reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/**
 * Rewrites the guest's review row for one response.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} responseId The response id.
 * @return {Promise<void>} Resolves once the row matches its sources.
 */
export function reconcileParticipantFormProfileView(
  db: FirebaseFirestore.Firestore, responseId: string): Promise<void> {
  return reconcileView(db,
    db.collection(participantFormProfileViewsCollection).doc(responseId),
    (tx) => participantFormProfileView(db, tx, responseId));
}

/**
 * Rewrites the guest's intake view.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid The guest.
 * @return {Promise<void>} Resolves once the view matches its source.
 */
export function reconcileParticipantIntakeProfileView(
  db: FirebaseFirestore.Firestore, uid: string): Promise<void> {
  return reconcileView(db,
    db.collection(participantIntakeProfileViewsCollection).doc(uid),
    (tx) => participantIntakeProfileView(db, tx, uid));
}

/** The response fields the review row reads; other writes change nothing. */
const reviewedResponseFields = ["status", "withdrawnAt", "respondentUid",
  "identityKind", "organizerId", "formId", "versionId", "consentVersion",
  "submittedAt", "answers"];

/**
 * Whether a response write can change its review row. Host-side writes such
 * as review notes and labels cannot.
 * @param {FirebaseFirestore.DocumentData|undefined} before Old data.
 * @param {FirebaseFirestore.DocumentData|undefined} after New data.
 * @return {boolean} True when the row needs reconciling.
 */
export function responseWriteChangesReview(
  before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined): boolean {
  if (!before || !after) return true;
  return reviewedResponseFields.some((field) =>
    !isDeepStrictEqual(before[field], after[field]));
}
