/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  INBOX_ITEMS_COLLECTION,
  INBOX_JOURNEY_COLLECTION,
  InboxItemDocument,
  InboxSourceKind,
  journeyStepDocId,
  sourceCollections,
} from "./model";
import {journeyStepDocument, syncInboxSource} from "./store";

/** Every source write re-projects its one inbox item; a retry is harmless. */
function inboxTrigger(kind: InboxSourceKind) {
  return onDocumentWritten({document: `${sourceCollections[kind]}/{sourceId}`, retry: true},
    async (event) => {
      const result = await syncInboxSource(admin.firestore(), kind, event.params.sourceId,
        event.data?.after.data(), new Date());
      if (result.outcome === "written") logger.info("Inbox item synced.", {kind, ...result});
    });
}

export const onSupplyIntakeRequestWrittenSyncInbox = inboxTrigger("supplyIntakeRequest");
export const onOrganizerClaimRequestWrittenSyncInbox = inboxTrigger("organizerClaimRequest");
export const onSalesInboundIntentWrittenSyncInbox = inboxTrigger("salesInboundIntent");
export const onAccessApplicationWrittenSyncInbox = inboxTrigger("accessApplication");
export const onExternalEventWrittenSyncInbox = inboxTrigger("externalEvent");

/** Puts items back in the inbox when their snooze ends. */
export async function wakeSnoozedInboxItems(db: FirebaseFirestore.Firestore, now: Date): Promise<number> {
  const nowIso = now.toISOString();
  const due = await db.collection(INBOX_ITEMS_COLLECTION).where("status", "==", "snoozed")
    .where("snoozedUntil", "<=", nowIso).limit(200).get();
  let woken = 0;
  for (const doc of due.docs) {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(doc.ref);
      const item = snap.data() as InboxItemDocument | undefined;
      if (!item || item.status !== "snoozed" || !item.snoozedUntil || item.snoozedUntil > nowIso) return;
      const stepId = `snooze-ended-${Date.parse(item.snoozedUntil)}`;
      tx.set(doc.ref, {...item, status: "waiting", snoozedUntil: null, updatedAt: nowIso});
      tx.set(db.collection(INBOX_JOURNEY_COLLECTION).doc(journeyStepDocId(item.itemId, stepId)),
        journeyStepDocument(item.itemId, {stepId, occurredAt: item.snoozedUntil, title: "Snooze ended",
          detail: null, actorUid: null, tone: "ink"}));
      woken += 1;
    });
  }
  return woken;
}

export const wakeSnoozedInboxItemsEvery30Minutes = onSchedule({
  schedule: "every 30 minutes", region: "asia-south1", maxInstances: 1, timeoutSeconds: 120,
}, async () => {
  const woken = await wakeSnoozedInboxItems(admin.firestore(), new Date());
  if (woken) logger.info("Snoozed inbox items woken.", {woken});
});
