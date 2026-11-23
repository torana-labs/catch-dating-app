import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {reconcileLayoutViewsForLayout} from "./layoutViews";

const options = {retry: true};

type Data = FirebaseFirestore.DocumentData | undefined;

const same = (before: Data, after: Data, read: (data: Data) => unknown) =>
  before !== undefined && after !== undefined &&
  JSON.stringify(read(before)) === JSON.stringify(read(after));

/** An organizer layout saved or removed: every event that selects it. */
export const onEventSuccessLayoutViewLayoutChanged = onDocumentWritten({
  ...options, timeoutSeconds: 300,
  document: "organizerEventSuccessLayouts/{layoutDocId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (same(before, after, (data) => [data?.organizerId ?? null,
    data?.layoutId ?? null, data?.label ?? null, data?.units ?? null])) {
    return;
  }
  const seen = new Set<string>();
  for (const data of [before, after]) {
    const organizerId = data?.organizerId;
    const layoutId = data?.layoutId;
    if (typeof organizerId !== "string" || typeof layoutId !== "string" ||
        seen.has(`${organizerId}/${layoutId}`)) continue;
    seen.add(`${organizerId}/${layoutId}`);
    await reconcileLayoutViewsForLayout(admin.firestore(), organizerId,
      layoutId);
  }
});
