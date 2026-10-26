import {FieldPath} from "firebase-admin/firestore";
import {HttpsError, onCall, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {hasBlockingRelationshipInTransaction} from "../safety/blocking";
import type {EventChatMembershipDocument as Membership} from
  "../shared/generated/firestoreAdminTypes";
import type {ListEventChatParticipantsCallableResponse as Result} from
  "../shared/generated/listEventChatParticipantsCallableResponse";
import {validateListEventChatParticipantsCallablePayload} from
  "../shared/generated/validators/listEventChatParticipantsInput";
import {eventChatMembershipId, requireEventChatActor,
  requireEventChatMember, readEventChatAccess} from "./eventChatAccess";
import {messageDefaults, type EventChatMessageDeps} from
  "./eventChatMessageShared";

/** Membership rows are candidates, never an admission or profile grant.
 * One bounded transaction checks the viewer and every returned participant. */
export async function listEventChatParticipantsHandler(
  request: CallableRequest<unknown>,
  deps: EventChatMessageDeps = messageDefaults,
): Promise<Result> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateListEventChatParticipantsCallablePayload);
  requireEventChatActor(uid, data.expectedUid);
  if (data.cursor && (data.cursor.accountUid !== uid ||
      data.cursor.eventId !== data.eventId)) {
    throw new HttpsError("permission-denied", "Refresh the participant list.");
  }
  const db = deps.db();
  await deps.rateLimit(db, uid, "listEventChatParticipants", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  return db.runTransaction(async (tx) => {
    const viewer = await requireEventChatMember(db, tx, data.eventId, uid,
      deps.now().toMillis());
    let query = db.collection("eventChatMemberships")
      .where("eventId", "==", data.eventId)
      .orderBy(FieldPath.documentId()).limit(data.limit + 1);
    if (data.cursor) query = query.startAfter(data.cursor.after);
    const candidates = await tx.get(query);
    const rows = candidates.docs.slice(0, data.limit);
    const items: Result["items"] = [];
    for (const row of rows) {
      const member = requireDoc<Membership>(row, "EventChatMembershipDocument");
      if (member.status === "left") continue;
      if (member.eventId !== data.eventId ||
          member.organizerId !== viewer.view.organizerId ||
          (member.status !== "joined" &&
            (!viewer.view.canManage || !["removed", "banned"].includes(
              member.status))) ||
          row.id !== eventChatMembershipId(data.eventId, member.uid)) continue;
      try {
        const target = await readEventChatAccess(db, tx,
          data.eventId, member.uid, deps.now().toMillis());
        if (!target.user?.displayName?.trim() ||
            target.view.profileClaimRequired ||
            target.member?.revision !== member.revision ||
            target.member?.status !== member.status ||
            (member.status === "joined" &&
              !target.view.canReadMessages)) continue;
        if (await hasBlockingRelationshipInTransaction(tx, db,
          uid, [member.uid])) continue;
        items.push({uid: member.uid,
          displayName: target.user!.displayName!.trim().slice(0, 120),
          role: target.view.role, membershipStatus: member.status,
          membershipRevision: member.revision});
      } catch (error) {
        // Revoked, deleted, left or unclaimed people are absent. Operational
        // failures must not masquerade as an empty participant list.
        if (!(error instanceof HttpsError) ||
            !["permission-denied", "not-found"].includes(error.code)) {
          throw error;
        }
      }
    }
    return {items, nextCursor: candidates.docs.length > rows.length ?
      {eventId: data.eventId, accountUid: uid, after: rows.at(-1)!.id} : null};
  });
}

export const listEventChatParticipants = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => listEventChatParticipantsHandler(request),
);
