import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type {
  HostFormAnalyticsViewDocument,
  HostFormEditorViewDocument,
  HostFormSourceViewDocument,
  OrganizerFormAggregateDocument,
  OrganizerFormDocument,
  OrganizerFormDraftDocument,
  OrganizerFormVersionDocument,
} from "../shared/generated/firestoreAdminTypes";
import {requireDoc} from "../shared/validation";
import {projectEditor} from "../organizers/organizerForms";
import {formSourceFunnels, formVersionAnalytics} from
  "../organizers/organizerFormOperations";

export const hostFormEditorViewsCollection = "hostFormEditorViews";
export const hostFormAnalyticsViewsCollection = "hostFormAnalyticsViews";
export const hostFormSourceViewsCollection = "hostFormSourceViews";

/** The most share links a source view holds, as the callable read. */
export const formSourceViewLimit = 200;

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

/**
 * One form's editor view, read only: the summary, the draft definition and
 * its validation issues exactly as getOrganizerFormEditor returns them (the
 * availability instants as Firestore timestamps), or
 * null when the form or its draft is gone or they disagree on the owner.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} formId The organizerForms document id.
 * @return {Promise<HostFormEditorViewDocument|null>} The view, or null.
 */
export async function readFormEditorView(db: Db, tx: Tx, formId: string):
  Promise<HostFormEditorViewDocument | null> {
  const [formSnap, draftSnap] = await Promise.all([
    tx.get(db.collection("organizerForms").doc(formId)),
    tx.get(db.collection("organizerFormDrafts").doc(formId))]);
  if (!formSnap.exists || !draftSnap.exists) return null;
  const form = requireDoc<OrganizerFormDocument>(formSnap,
    "OrganizerFormDocument");
  const draft = requireDoc<OrganizerFormDraftDocument>(draftSnap,
    "OrganizerFormDraftDocument");
  if (draft.organizerId !== form.organizerId || draft.formId !== formId) {
    return null;
  }
  const editor = projectEditor(formId, form, draft);
  // The definition keeps Firestore timestamps; the callable sent them in its
  // wire shape, which the app rebuilds from these.
  return {organizerId: form.organizerId, formId, form: editor.form,
    definition: draft.definition, validationIssues: editor.validationIssues,
    version: 1};
}

/**
 * One published version's analytics view, read only: the funnel and the
 * question aggregates exactly as getOrganizerFormAnalytics returns them for
 * the version, with the privacy threshold applied here, so a thresholded
 * question's counts never reach the view. Null when the version is gone.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} versionId The organizerFormVersions document id.
 * @param {FirebaseFirestore.Timestamp} now Stamps an empty funnel only.
 * @return {Promise<HostFormAnalyticsViewDocument|null>} The view, or null.
 */
export async function readFormAnalyticsView(db: Db, tx: Tx,
  versionId: string,
  now: FirebaseFirestore.Timestamp = admin.firestore.Timestamp.now()):
  Promise<HostFormAnalyticsViewDocument | null> {
  const versionSnap = await tx.get(db.collection("organizerFormVersions")
    .doc(versionId));
  if (!versionSnap.exists) return null;
  const version = requireDoc<OrganizerFormVersionDocument>(versionSnap,
    "OrganizerFormVersionDocument");
  const aggregates = await tx.get(db.collection("organizerFormAggregates")
    .where("organizerId", "==", version.organizerId)
    .where("formId", "==", version.formId)
    .where("versionId", "==", versionId));
  const {version: formVersion, ...analytics} = formVersionAnalytics({
    organizerId: version.organizerId,
    formId: version.formId,
    versionId,
    version,
    aggregates: aggregates.docs.map((doc) =>
      doc.data() as OrganizerFormAggregateDocument),
    now,
  });
  return {...analytics, formVersion, version: 1};
}

/**
 * One form's share-link funnel view, read only: each link's label and
 * counters, at most 200, exactly the sources getOrganizerFormAnalytics
 * returns; never a link token. Null when the form is gone or has no links.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} formId The organizerForms document id.
 * @return {Promise<HostFormSourceViewDocument|null>} The view, or null.
 */
export async function readFormSourceView(db: Db, tx: Tx, formId: string):
  Promise<HostFormSourceViewDocument | null> {
  const formSnap = await tx.get(db.collection("organizerForms").doc(formId));
  if (!formSnap.exists) return null;
  const form = requireDoc<OrganizerFormDocument>(formSnap,
    "OrganizerFormDocument");
  const links = await tx.get(db.collection("organizerFormShareLinks")
    .where("organizerId", "==", form.organizerId)
    .where("formId", "==", formId)
    .limit(formSourceViewLimit));
  if (links.empty) return null;
  return {organizerId: form.organizerId, formId,
    sources: formSourceFunnels(links.docs), version: 1};
}

/**
 * Rewrites one view from current sources inside a transaction, writing only
 * on change and deleting it when its source is gone. A source that fails its
 * contract is logged and keeps the previous view, so a retry cannot loop.
 * @param {Db} db Firestore.
 * @param {string} collection The view collection.
 * @param {string} id The view id.
 * @param {Function} build Reads the next view, or null for none.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
async function reconcileFormView<T>(db: Db, collection: string, id: string,
  build: (tx: Tx) => Promise<T | null>): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(collection).doc(id);
    const old = await tx.get(ref);
    let next: T | null;
    try {
      next = await build(tx);
    } catch (error) {
      logger.warn("Form view kept a source that fails its contract.", {
        collection, id,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/** Rewrites one form's editor view, writing only on change. */
export function reconcileFormEditorView(db: Db, formId: string):
  Promise<void> {
  return reconcileFormView(db, hostFormEditorViewsCollection, formId,
    (tx) => readFormEditorView(db, tx, formId));
}

/** Rewrites one version's analytics view, writing only on change. */
export function reconcileFormAnalyticsView(db: Db, versionId: string):
  Promise<void> {
  return reconcileFormView(db, hostFormAnalyticsViewsCollection, versionId,
    (tx) => readFormAnalyticsView(db, tx, versionId));
}

/** Rewrites one form's share-link funnel view, writing only on change. */
export function reconcileFormSourceView(db: Db, formId: string):
  Promise<void> {
  return reconcileFormView(db, hostFormSourceViewsCollection, formId,
    (tx) => readFormSourceView(db, tx, formId));
}
