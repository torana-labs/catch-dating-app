import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type {
  HostFormAutomationRuleViewDocument,
  HostFormAutomationRunViewDocument,
  OrganizerFormAutomationRuleDocument,
  OrganizerFormAutomationRunDocument,
} from "../shared/generated/firestoreAdminTypes";
import {ruleProjection, runProjection} from
  "../organizers/organizerFormAutomations";

export const hostFormAutomationRuleViewsCollection =
  "hostFormAutomationRuleViews";
export const hostFormAutomationRunViewsCollection =
  "hostFormAutomationRunViews";

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/**
 * Reads one rule's view from its source inside a transaction, without
 * writing, or null when the rule is absent or has no owner. The row is
 * exactly what listOrganizerFormAutomationRuns returns for it, so the
 * webhook secret is only whether one is set.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The read transaction.
 * @param {string} ruleId The rule id.
 * @return {Promise<HostFormAutomationRuleViewDocument|null>} The view.
 */
export async function readHostFormAutomationRuleView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  ruleId: string): Promise<HostFormAutomationRuleViewDocument | null> {
  const snapshot = await tx.get(db.collection("organizerFormAutomationRules")
    .doc(ruleId));
  const rule = snapshot.data() as OrganizerFormAutomationRuleDocument |
    undefined;
  if (!rule || !nonEmpty(rule.organizerId)) return null;
  return {organizerId: rule.organizerId, ruleId,
    formId: nonEmpty(rule.formId) ? rule.formId : null,
    row: ruleProjection(ruleId, rule), version: 1};
}

/**
 * Reads one run's view from current sources inside a transaction, without
 * writing, or null when the run is absent or has no owner. The row is
 * exactly what listOrganizerFormAutomationRuns returns for it; the rule's
 * current name is joined in when the rule belongs to the same organizer.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The read transaction.
 * @param {string} runId The run id.
 * @return {Promise<HostFormAutomationRunViewDocument|null>} The view.
 */
export async function readHostFormAutomationRunView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  runId: string): Promise<HostFormAutomationRunViewDocument | null> {
  const snapshot = await tx.get(db.collection("organizerFormAutomationRuns")
    .doc(runId));
  const run = snapshot.data() as OrganizerFormAutomationRunDocument |
    undefined;
  if (!run || !nonEmpty(run.organizerId) || !nonEmpty(run.ruleId)) {
    return null;
  }
  const ruleSnapshot = await tx.get(
    db.collection("organizerFormAutomationRules").doc(run.ruleId));
  const rule = ruleSnapshot.data();
  return {organizerId: run.organizerId, runId, ruleId: run.ruleId,
    formId: nonEmpty(run.formId) ? run.formId : null,
    createdAtMillis: run.createdAt.toMillis(),
    ruleName: rule?.organizerId === run.organizerId && nonEmpty(rule.name) ?
      rule.name : null,
    row: runProjection(runId, run), version: 1};
}

type ViewRead<T> = (db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, id: string) => Promise<T | null>;

/**
 * Rewrites one view from current sources, writing only on change. A source
 * that fails its contract is logged and keeps its previous view rather than
 * blocking a trigger retry loop; the nightly data validation reports it.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} collection The view collection.
 * @param {string} id The source and view id.
 * @param {ViewRead} read Builds the view inside the transaction.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
async function reconcileView<T>(db: FirebaseFirestore.Firestore,
  collection: string, id: string, read: ViewRead<T>): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(collection).doc(id);
    const old = await tx.get(ref);
    let next: T | null;
    try {
      next = await read(db, tx, id);
    } catch (error) {
      logger.warn("Automation view kept a source that fails its contract.",
        {collection, id,
          reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/**
 * Rewrites one rule's view from its source, writing only on change.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} ruleId The rule id.
 * @return {Promise<void>} Resolves once the view matches the rule.
 */
export function reconcileFormAutomationRuleView(
  db: FirebaseFirestore.Firestore, ruleId: string): Promise<void> {
  return reconcileView(db, hostFormAutomationRuleViewsCollection, ruleId,
    readHostFormAutomationRuleView);
}

/**
 * Rewrites one run's view from current sources, writing only on change.
 * Lease and attempt bookkeeping that the row does not show writes nothing.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} runId The run id.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export function reconcileFormAutomationRunView(
  db: FirebaseFirestore.Firestore, runId: string): Promise<void> {
  return reconcileView(db, hostFormAutomationRunViewsCollection, runId,
    readHostFormAutomationRunView);
}

/**
 * Reconciles the run views of a renamed rule, in bounded pages. Only a
 * change to the name or owner matters.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} ruleId The rule id.
 * @param {FirebaseFirestore.DocumentData|undefined} before Old rule.
 * @param {FirebaseFirestore.DocumentData|undefined} after New rule.
 * @return {Promise<number>} How many runs were reconciled.
 */
export async function refreshRenamedRuleRunViews(
  db: FirebaseFirestore.Firestore, ruleId: string,
  before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined): Promise<number> {
  if (before?.name === after?.name &&
      before?.organizerId === after?.organizerId) return 0;
  let reconciled = 0;
  let cursor: string | undefined;
  do {
    let query = db.collection("organizerFormAutomationRuns")
      .where("ruleId", "==", ruleId)
      .orderBy(admin.firestore.FieldPath.documentId()).limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) {
      await reconcileFormAutomationRunView(db, doc.id);
      reconciled++;
    }
    cursor = page.docs.length === 100 ? page.docs.at(-1)?.id : undefined;
  } while (cursor);
  return reconciled;
}
