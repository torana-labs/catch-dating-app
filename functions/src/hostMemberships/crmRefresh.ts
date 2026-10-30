import {FieldPath} from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  projectHostMembershipToContacts,
  rebuildOrganizerContact,
} from "../organizers/organizerAudienceProjection";
import {collections} from "./membershipStore";

const pageSize = 200;
const maxDocumentsPerKind = 2000;
const budgetMillis = 8 * 60 * 1000;

/**
 * Time-window membership segments (30/60-day attendance, period ends) go
 * stale without new events, so traits are rebuilt daily for members and for
 * recent attendees. Bounded per run; projection receipts make it idempotent.
 */
export async function refreshHostMembershipSegmentsOnce(params: {
  db?: FirebaseFirestore.Firestore; runKey: string;
  clock?: () => number; organizerId?: string;
}): Promise<{members: number; recentAttendees: number}> {
  const db = params.db ?? admin.firestore();
  const clock = params.clock ?? Date.now;
  const deadline = clock() + budgetMillis;
  const counts = {members: 0, recentAttendees: 0};

  const scoped = (query: FirebaseFirestore.Query) => params.organizerId ?
    query.where("organizerId", "==", params.organizerId) : query;
  let cursor: string | null = null;
  while (counts.members < maxDocumentsPerKind && clock() < deadline) {
    let query = scoped(db.collection(collections.memberships))
      .orderBy(FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) {
      const {organizerId, uid} = doc.data();
      if (typeof organizerId !== "string" || typeof uid !== "string") continue;
      await projectHostMembershipToContacts({organizerId, uid,
        projectionEventId: `membershipRefresh:${params.runKey}:${doc.id}`});
      counts.members++;
    }
    if (page.size < pageSize) break;
    cursor = page.docs.at(-1)!.id;
  }

  let after: [number, string] | null = null;
  while (counts.recentAttendees < maxDocumentsPerKind && clock() < deadline) {
    let query = scoped(db.collection("organizerContactTraits"))
      .where("attended60DayCount", ">", 0)
      .orderBy("attended60DayCount").orderBy(FieldPath.documentId())
      .limit(pageSize);
    if (after) query = query.startAfter(after[0], after[1]);
    const page = await query.get();
    for (const doc of page.docs) {
      await rebuildOrganizerContact(doc.id,
        `membershipRefresh:${params.runKey}:${doc.id}`);
      counts.recentAttendees++;
    }
    if (page.size < pageSize) break;
    const last = page.docs.at(-1)!;
    after = [last.get("attended60DayCount") as number, last.id];
  }
  return counts;
}

export const refreshHostMembershipSegments = onSchedule({
  schedule: "10 3 * * *", timeZone: "Asia/Kolkata", timeoutSeconds: 540,
  maxInstances: 1,
}, async () => {
  const runKey = new Date().toISOString().slice(0, 10);
  await refreshHostMembershipSegmentsOnce({runKey});
});
