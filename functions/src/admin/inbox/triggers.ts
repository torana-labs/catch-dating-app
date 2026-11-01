/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  INBOX_ITEMS_COLLECTION,
  INBOX_JOURNEY_COLLECTION,
  INBOX_SOURCE_KINDS,
  InboxItemDocument,
  InboxSourceKind,
  journeyStepDocId,
  sourceCollections,
} from "./model";
import {journeyStepDocument, syncInboxSource} from "./store";
import {syncPeopleIndex} from "../peopleSearch";

/**
 * Every source write re-projects its one inbox item. The triggers are not
 * retried (a retrying trigger needs a forced deploy); reconcileAdminInboxNightly
 * re-projects every source, so an item a failed trigger missed catches up.
 */
function inboxTrigger(kind: InboxSourceKind) {
  return onDocumentWritten({document: `${sourceCollections[kind]}/{sourceId}`},
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

const reconcilePageSize = 300;
const reconcileSourceLimit = 10_000;

export interface InboxReconcileSummary {
  scanned: number;
  written: number;
  failed: number;
  truncated: string[];
}

/**
 * Re-projects every inbox source and the people index from their documents.
 * Syncing is idempotent: an item already in step is left as it is and a
 * journey step is written once, so a rerun changes nothing. One document
 * that fails is logged and counted, never fatal to the rest.
 */
export async function reconcileAdminInbox(db: FirebaseFirestore.Firestore, now: () => Date,
  pageSize = reconcilePageSize, sourceLimit = reconcileSourceLimit): Promise<InboxReconcileSummary> {
  const summary: InboxReconcileSummary = {scanned: 0, written: 0, failed: 0, truncated: []};
  const sources: Array<InboxSourceKind | "people"> = [...INBOX_SOURCE_KINDS, "people"];
  for (const source of sources) {
    const collection = source === "people" ? "users" : sourceCollections[source];
    let cursor: string | null = null;
    let seen = 0;
    for (;;) {
      let query = db.collection(collection).orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      for (const doc of page.docs) {
        summary.scanned += 1;
        try {
          if (source === "people") {
            if (await syncPeopleIndex(db, doc.id, doc.data(), now())) summary.written += 1;
          } else if ((await syncInboxSource(db, source, doc.id, doc.data(), now())).outcome === "written") {
            summary.written += 1;
          }
        } catch (error) {
          summary.failed += 1;
          logger.error("Inbox reconcile could not sync a document.", {source, id: doc.id, error: String(error)});
        }
      }
      seen += page.docs.length;
      if (page.docs.length < pageSize) break;
      cursor = page.docs[page.docs.length - 1].id;
      if (seen >= sourceLimit) {
        const more = await db.collection(collection).orderBy(admin.firestore.FieldPath.documentId())
          .startAfter(cursor).limit(1).get();
        if (!more.empty) summary.truncated.push(source);
        break;
      }
    }
  }
  return summary;
}

export const reconcileAdminInboxNightly = onSchedule({
  schedule: "10 3 * * *", timeZone: "Asia/Kolkata", region: "asia-south1", maxInstances: 1,
  timeoutSeconds: 540, memory: "512MiB",
}, async () => {
  const summary = await reconcileAdminInbox(admin.firestore(), () => new Date());
  logger.info("Admin inbox reconciled.", {...summary});
});
