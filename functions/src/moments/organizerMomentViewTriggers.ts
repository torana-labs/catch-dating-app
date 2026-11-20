import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {isDeepStrictEqual} from "node:util";
import {reconcileOrganizerMomentView} from "./organizerMomentViews";

const options = {retry: true};

type Data = FirebaseFirestore.DocumentData | undefined;

/** A moment saved, armed, paused, resumed, done or removed: its row. */
export const onOrganizerMomentViewChanged = onDocumentWritten({
  ...options, document: "organizerMoments/{momentId}",
}, (event) => reconcileOrganizerMomentView(admin.firestore(),
  event.params.momentId));

/**
 * A run planned, dispatched or superseded: its moment's sent count and next
 * run. Other run bookkeeping leaves the row alone.
 */
export const onOrganizerMomentRunViewChanged = onDocumentWritten({
  ...options, document: "organizerMomentRuns/{runId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const tally = (data: Data) => data === undefined ? null : {
    momentId: data.momentId ?? null, status: data.status ?? null,
    sent: data.sent ?? null, dueAtMillis: data.dueAtMillis ?? null};
  if (isDeepStrictEqual(tally(before), tally(after))) return;
  const db = admin.firestore();
  const momentIds = new Set([before?.momentId, after?.momentId].filter(
    (id): id is string => typeof id === "string" && id.length > 0));
  for (const momentId of momentIds) {
    await reconcileOrganizerMomentView(db, momentId);
  }
});
