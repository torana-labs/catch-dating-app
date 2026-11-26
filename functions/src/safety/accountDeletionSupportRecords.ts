import {Timestamp} from "firebase-admin/firestore";
import type {DeletionWriter} from "./accountDeletion";
import {supportExpiresAtMillis} from "../shared/supportRetention";

type Db = FirebaseFirestore.Firestore;

/**
 * Stands in for the account where a schema requires a uid string. It
 * matches no account (an Auth uid is never this word), so no reader can
 * mistake the record for someone's.
 */
export const DELETED_ACCOUNT_UID = "deleted-account";

/**
 * Erases the guest's records with Catch outside events (#2468, group 2):
 * its try-it workspace pointer, launch access application, supply
 * nominator entry and approval-notification delivery records are deleted;
 * its support conversations, intake requests, listing work items and
 * nomination inbox items stay as Catch's records without the account.
 * @param {object} params Inputs.
 * @param {Db} params.db Firestore.
 * @param {string} params.uid The account being deleted.
 * @param {DeletionWriter} params.writer Deletion writes.
 * @param {number} [params.nowMillis] Clock.
 */
export async function queueSupportRecordCleanup(params: {
  db: Db;
  uid: string;
  writer: DeletionWriter;
  nowMillis?: number;
}): Promise<void> {
  const {db, uid, writer, nowMillis = Date.now()} = params;
  const byField = (collection: string, field: string) =>
    db.collection(collection).where(field, "==", uid).get();
  const [conversations, deliveries, dispatches, nominators, workItems,
    tryItRequests, submittedRequests, inboxItems] = await Promise.all([
    byField("supportConversations", "uid"),
    byField("deliveryMessages", "intent.context.uid"),
    byField("whatsappDispatches", "context.uid"),
    byField("supplyNominators", "uid"),
    byField("operationWorkItems",
      "normalizedPayload.intake.listing.submittedBy.uid"),
    byField("supplyIntakeRequests", "tryItImport.uid"),
    byField("supplyIntakeRequests", "request.submittedBy.uid"),
    byField("adminInboxItems", "nominatorUid"),
  ]);

  writer.delete(db.collection("tryItWorkspaces").doc(uid));
  // Each review decision is already in adminAuditLogs, which keeps the
  // staff outcome without the applicant's answers.
  writer.delete(db.collection("accessApplications").doc(uid));
  // A closed conversation expires 180 days after the deletion at the
  // earliest (supportRetention.ts), with its messages; an open one is
  // stamped when it closes.
  const deletionExpiry = Timestamp.fromMillis(
    supportExpiresAtMillis(nowMillis));
  await Promise.all(conversations.docs.map(async (doc) => {
    const data = doc.data();
    if (data.status !== "closed") {
      writer.update(doc.ref, {uid: null});
      return;
    }
    const current = data.expiresAt instanceof Timestamp ?
      data.expiresAt : null;
    const expiresAt = current && current.toMillis() >=
      deletionExpiry.toMillis() ? current : deletionExpiry;
    writer.update(doc.ref, {uid: null, expiresAt});
    const messages = await db.collection("supportConversations")
      .doc(doc.id).collection("messages").get();
    messages.forEach((message) => writer.update(message.ref, {expiresAt}));
  }));
  deliveries.forEach((doc) => writer.delete(doc.ref));
  dispatches.forEach((doc) => writer.delete(doc.ref));
  nominators.forEach((doc) => writer.delete(doc.ref));
  workItems.forEach((doc) => writer.update(doc.ref,
    {"normalizedPayload.intake.listing.submittedBy.uid": null}));
  const requests = new Map<string, FirebaseFirestore.DocumentData>();
  const refs = new Map<string, FirebaseFirestore.DocumentReference>();
  for (const doc of [...tryItRequests.docs, ...submittedRequests.docs]) {
    if (refs.has(doc.ref.path)) continue;
    refs.set(doc.ref.path, doc.ref);
    const data = doc.data();
    const patch: FirebaseFirestore.DocumentData = {};
    // tryItImport.uid is a required string; the request's other fields
    // (the workspace organizer, the link) stay for the import record.
    if (data.tryItImport?.uid === uid) {
      patch["tryItImport.uid"] = DELETED_ACCOUNT_UID;
    }
    // A front-door submitter's uid may be null; staff and partner
    // submitters are left for the staff-access pass.
    const submittedBy = data.request?.submittedBy;
    if (submittedBy?.uid === uid &&
        (submittedBy.role === "organizer" || submittedBy.role === "system")) {
      patch["request.submittedBy.uid"] = null;
    }
    requests.set(doc.ref.path, patch);
  }
  for (const [path, patch] of requests) {
    if (Object.keys(patch).length > 0) writer.update(refs.get(path)!, patch);
  }
  inboxItems.forEach((doc) => writer.update(doc.ref, {nominatorUid: null}));
}
