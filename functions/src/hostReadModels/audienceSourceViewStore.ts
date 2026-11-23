import {isDeepStrictEqual} from "node:util";
import {HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import type {HostAudienceSourceViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import {savedAudienceFilterOptions} from
  "../organizers/organizerSavedAudienceSources";

export const hostAudienceSourceViewsCollection = "hostAudienceSourceViews";

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

/**
 * One organizer's audience sources, read only: the forms, filterable form
 * questions, events and manual tags listOrganizerSavedAudiences returned as
 * filterOptions (each tag's id and label only). When a source exceeds the
 * callable's bounds the view keeps no options and the reason the callable
 * gave, so the app fails as the callable did. Null when the organizer is gone.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} organizerId The organizer.
 * @return {Promise<HostAudienceSourceViewDocument|null>} The view, or null.
 */
export async function readAudienceSourceView(db: Db, tx: Tx,
  organizerId: string): Promise<HostAudienceSourceViewDocument | null> {
  const organizer = await tx.get(db.collection("organizers").doc(organizerId));
  if (!organizer.exists) return null;
  try {
    const options = await savedAudienceFilterOptions(db, organizerId, tx);
    // The vocabulary also keeps who made each tag and when; the response
    // contract shows only the id and label, so only those reach the view.
    return {organizerId, forms: options.forms, questions: options.questions,
      events: options.events,
      tags: options.tags.map(({tagId, label}) => ({tagId, label})),
      unavailableReason: null, version: 1};
  } catch (error) {
    if (!(error instanceof HttpsError) || error.code !== "resource-exhausted") {
      throw error;
    }
    return {organizerId, forms: [], questions: [], events: [], tags: [],
      unavailableReason: error.message, version: 1};
  }
}

/**
 * Rewrites one organizer's audience source view, writing only on change. A
 * source that fails its contract is logged and keeps the previous view.
 * @param {Db} db Firestore.
 * @param {string} organizerId The organizer.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export async function reconcileAudienceSourceView(db: Db,
  organizerId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(hostAudienceSourceViewsCollection)
      .doc(organizerId);
    const old = await tx.get(ref);
    let next: HostAudienceSourceViewDocument | null;
    try {
      next = await readAudienceSourceView(db, tx, organizerId);
    } catch (error) {
      logger.warn("Audience source view kept a source that fails its " +
        "contract.", {organizerId,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}
