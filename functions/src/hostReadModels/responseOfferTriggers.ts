import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {reconcileApplicationSummary} from "./responseStore";

/**
 * An event offer changed: the response summaries of the application it came
 * from (and of the one it came from before, when that changed) recompute
 * their derived `offer`.
 */
export const onHostResponseSummaryOfferChanged = onDocumentWritten({
  retry: true, memory: "512MiB", document: "organizerEventOffers/{offerId}",
}, async (event) => {
  const ids = new Set<string>();
  for (const data of [event.data?.before.data(), event.data?.after.data()]) {
    if (typeof data?.applicationId === "string") ids.add(data.applicationId);
  }
  const db = admin.firestore();
  for (const id of ids) await reconcileApplicationSummary(db, id);
});
