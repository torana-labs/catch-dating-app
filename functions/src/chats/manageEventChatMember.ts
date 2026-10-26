import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError, onCall, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import type {EventChatMembershipDocument as Membership,
  EventChatAccessReceiptDocument as Receipt,
  EventParticipationDocument, EventAttendeeDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateManageEventChatMemberCallablePayload} from
  "../shared/generated/validators/manageEventChatMemberInput";
import type {ManageEventChatMemberCallableResponse as Result} from
  "../shared/generated/manageEventChatMemberCallableResponse";
import {chatHash} from "./eventChatMessageShared";
import {eventChatMembershipId, hasEventChatAdmission,
  readEventChatAccess, requireEventChatActor} from "./eventChatAccess";

interface Deps {
  db: () => FirebaseFirestore.Firestore;
  now: () => Timestamp;
  rateLimit: typeof checkRateLimit;
}
const defaults: Deps = {db: () => admin.firestore(),
  now: () => Timestamp.now(), rateLimit: checkRateLimit};

/** Moderation changes the membership revision, never the event roster.
 * Reinstatement leaves the person out until they explicitly join again. */
export async function manageEventChatMemberHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults
): Promise<Result> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateManageEventChatMemberCallablePayload);
  requireEventChatActor(uid, data.expectedUid);
  if (uid === data.targetUid) {
    throw new HttpsError("invalid-argument", "Manage another member.");
  }
  const db = deps.db();
  await deps.rateLimit(db, uid, "manageEventChatMember", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  const receiptRef = db.collection("eventChatAccessReceipts")
    .doc(chatHash(["memberManagement", uid, data.requestId]));
  const payloadHash = chatHash([data.eventId, data.targetUid,
    data.action, data.expectedRevision]);
  return db.runTransaction(async (tx) => {
    const actor = await readEventChatAccess(db, tx, data.eventId, uid);
    if (!actor.view.canManage) {
      throw new HttpsError("permission-denied", "This action is unavailable.");
    }
    const receiptSnap = await tx.get(receiptRef);
    if (receiptSnap.exists) {
      const receipt = requireDoc<Receipt>(receiptSnap,
        "EventChatAccessReceiptDocument");
      if (receipt.uid !== uid || receipt.eventId !== data.eventId ||
          receipt.payloadHash !== payloadHash) {
        throw new HttpsError("already-exists",
          "This request was already used.");
      }
      return {revision: receipt.revision, replayed: true};
    }
    const memberRef = db.collection("eventChatMemberships")
      .doc(eventChatMembershipId(data.eventId, data.targetUid));
    const snap = await tx.get(memberRef);
    const member = snap.exists ? requireDoc<Membership>(snap,
      "EventChatMembershipDocument") : null;
    if (!member || member.uid !== data.targetUid ||
        member.eventId !== data.eventId ||
        member.organizerId !== actor.view.organizerId) {
      throw new HttpsError("permission-denied", "This member is unavailable.");
    }
    if (member.revision !== data.expectedRevision) {
      throw new HttpsError("aborted", "Member changed. Refresh and retry.");
    }
    if (data.action === "reinstate") {
      if (member.status !== "removed" && member.status !== "banned") {
        throw new HttpsError("failed-precondition", "Member is not removed.");
      }
      const [participationSnap, attendeeRows] = await Promise.all([
        tx.get(db.collection("eventParticipations")
          .doc(`${data.eventId}_${data.targetUid}`)),
        tx.get(db.collection("eventAttendees")
          .where("eventId", "==", data.eventId)
          .where("linkedUid", "==", data.targetUid).limit(2)),
      ]);
      const participation = participationSnap.exists ?
        requireDoc<EventParticipationDocument>(participationSnap,
          "EventParticipationDocument") : null;
      const attendees = attendeeRows.docs.map((row) =>
        requireDoc<EventAttendeeDocument>(row, "EventAttendeeDocument"));
      if (!hasEventChatAdmission(data.eventId, actor.view.organizerId,
        data.targetUid, participation, attendees)) {
        throw new HttpsError("permission-denied", "Admission is unavailable.");
      }
    } else if (data.action === "remove" && member.status !== "joined") {
      throw new HttpsError("failed-precondition", "Member is not joined.");
    } else if (data.action === "ban" && member.status === "banned") {
      throw new HttpsError("failed-precondition", "Member is already banned.");
    }
    const revision = member.revision + 1;
    if (!Number.isSafeInteger(revision)) {
      throw new HttpsError("failed-precondition", "Member revision exhausted.");
    }
    const now = deps.now();
    tx.set(memberRef, {...member, revision,
      status: data.action === "reinstate" ? "left" :
        data.action === "ban" ? "banned" : "removed",
      leftAt: data.action === "reinstate" ? member.leftAt : now,
      removedAt: data.action === "reinstate" ? null : now,
      removedByUid: data.action === "reinstate" ? null : uid,
      updatedAt: now} satisfies Membership);
    tx.create(receiptRef, {eventId: data.eventId, uid, payloadHash, revision,
      createdAt: now} satisfies Receipt);
    return {revision, replayed: false};
  });
}

export const manageEventChatMember = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => manageEventChatMemberHandler(request));
