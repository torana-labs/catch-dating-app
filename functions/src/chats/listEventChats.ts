import * as admin from "firebase-admin";
import {FieldPath} from "firebase-admin/firestore";
import {HttpsError, onCall, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {validateListEventChatsCallablePayload} from
  "../shared/generated/validators/listEventChatsInput";
import type {ListEventChatsCallableResponse as Result} from
  "../shared/generated/listEventChatsCallableResponse";
import {readEventChatAccess, readEventChatAccount} from "./eventChatAccess";

interface Deps {
  db: () => FirebaseFirestore.Firestore;
  rateLimit: typeof checkRateLimit;
}
const defaults: Deps = {db: () => admin.firestore(), rateLimit: checkRateLimit};
const sources = ["memberships", "participations", "attendees"] as const;
const collections = {
  memberships: ["eventChatMemberships", "uid"],
  participations: ["eventParticipations", "uid"],
  attendees: ["eventAttendees", "linkedUid"],
} as const;

/** Candidate rows discover IDs only; current event admission always decides
 * visibility. Scan pages are bounded even when every candidate was revoked. */
export async function listEventChatsHandler(request: CallableRequest<unknown>,
  deps: Deps = defaults): Promise<Result> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateListEventChatsCallablePayload);
  if (data.cursor && data.cursor.accountUid !== uid) {
    throw new HttpsError("permission-denied", "Refresh your event chats.");
  }
  const db = deps.db();
  await deps.rateLimit(db, uid, "listEventChats", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await db.runTransaction((tx) => readEventChatAccount(db, tx, uid));
  let sourceIndex = data.cursor ? sources.indexOf(data.cursor.source) : 0;
  let after = data.cursor?.after ?? null;
  let remaining = data.limit;
  const items: Result["items"] = [];
  const seen = new Set<string>();
  let nextCursor: Result["nextCursor"] = null;
  while (remaining > 0 && sourceIndex < sources.length) {
    const source = sources[sourceIndex];
    const [collection, ownerField] = collections[source];
    let query = db.collection(collection).where(ownerField, "==", uid)
      .orderBy(FieldPath.documentId()).limit(remaining + 1);
    if (after) query = query.startAfter(after);
    const result = await query.get();
    const rows = result.docs.slice(0, remaining);
    remaining -= rows.length;
    for (const row of rows) {
      const eventId = row.get("eventId");
      if (typeof eventId !== "string" || !eventId || eventId.includes("/") ||
          eventId.length > 1500 || seen.has(eventId)) continue;
      seen.add(eventId);
      try {
        const access = await db.runTransaction((tx) =>
          readEventChatAccess(db, tx, eventId, uid));
        if (access.event.status === "active") items.push(access.view);
      } catch (error) {
        // A cancellation, removed event or duplicate/conflicting roster record
        // removes this entry. Infrastructure/schema failures stay visible.
        if (!(error instanceof HttpsError) ||
            !["permission-denied", "not-found"].includes(error.code)) {
          throw error;
        }
      }
    }
    if (result.docs.length > rows.length) {
      nextCursor = {source, after: rows.at(-1)!.id, accountUid: uid};
      break;
    }
    sourceIndex++;
    after = null;
    if (sourceIndex < sources.length) {
      nextCursor = {source: sources[sourceIndex], after: null, accountUid: uid};
    } else {
      nextCursor = null;
    }
  }
  // Also cover empty scans and deletion while candidate transactions ran.
  await db.runTransaction((tx) => readEventChatAccount(db, tx, uid));
  return {items, nextCursor};
}

export const listEventChats = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => listEventChatsHandler(request));
