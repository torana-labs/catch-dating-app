import * as admin from "firebase-admin";
import {requireDoc} from "../shared/validation";
import {activityNotificationId,
  allowsPushPreference, setActivityNotificationInTransaction,
  type FcmParams} from "../shared/notifications";
import {conversationPushTokens} from
  "../shared/conversationPushTargets";
import {hasBlockingRelationshipInTransaction} from "../safety/blocking";
import type {EventChatMessageDocument as Message} from
  "../shared/generated/firestoreAdminTypes";
import {requireEventChatMember} from "./eventChatAccess";

export interface EventChatNotificationCandidate {
  eventId: string;
  messageId: string;
  recipientUid: string;
}
interface Deps {
  db: () => FirebaseFirestore.Firestore;
  enabled: boolean;
  sink: (payload: FcmParams) => Promise<void>;
}
const defaults: Deps = {db: () => admin.firestore(), enabled: false,
  sink: async () => undefined};

/** A queued candidate is never an access grant. Current authority and a
 * deterministic hidden Activity receipt are checked/created atomically. The
 * injected sink is synthetic only; no production push provider is enabled. */
export async function dispatchEventChatNotification(
  candidate: EventChatNotificationCandidate, deps: Deps = defaults
): Promise<boolean> {
  if (!deps.enabled) return false;
  const db = deps.db();
  const receiptId = activityNotificationId("message",
    `eventChat_${candidate.messageId}`);
  const deliveries = await db.runTransaction(async (tx) => {
    const snap = await tx.get(db.collection("eventChatMessages")
      .doc(candidate.messageId));
    if (!snap.exists) return false;
    const message = requireDoc<Message>(snap, "EventChatMessageDocument");
    if (message.eventId !== candidate.eventId ||
        message.status !== "visible" ||
        message.uid === candidate.recipientUid) return false;
    try {
      const [recipient, sender] = await Promise.all([
        requireEventChatMember(db, tx, candidate.eventId,
          candidate.recipientUid),
        requireEventChatMember(db, tx, candidate.eventId, message.uid!),
      ]);
      const blocked = await hasBlockingRelationshipInTransaction(tx, db,
        candidate.recipientUid, [message.uid!]);
      if (blocked || recipient.member?.notificationsMuted ||
          recipient.view.organizerId !== message.organizerId ||
          sender.view.organizerId !== message.organizerId) return false;
      const [user, deleted, receipt, installations] = await Promise.all([
        tx.get(db.collection("users").doc(candidate.recipientUid)),
        tx.get(db.collection("deletedUsers").doc(candidate.recipientUid)),
        tx.get(db.collection("notifications").doc(candidate.recipientUid)
          .collection("items").doc(receiptId)),
        tx.get(db.collection("users").doc(candidate.recipientUid)
          .collection("pushInstallations").limit(21)),
      ]);
      if (!user.exists || user.data()?.deleted === true || deleted.exists ||
          receipt.exists || installations.size > 20) return null;
      const userData = user.data();
      const role = recipient.view.canManage ? "host" : "consumer";
      const pushEnabled = role === "host" ?
        userData?.prefsMessages !== false :
        allowsPushPreference(userData, "messages");
      if (!pushEnabled) return null;
      const tokens = conversationPushTokens(installations.docs.map((row) =>
        row.data()), role);
      if (tokens.length === 0) return null;
      setActivityNotificationInTransaction(tx, db, {
        id: receiptId,
        uid: candidate.recipientUid,
        type: "message",
        title: "Event room update",
        body: "Open the room to see the new message.",
        createdAt: admin.firestore.Timestamp.now(),
        eventId: candidate.eventId,
        organizerId: message.organizerId,
        actorUid: message.uid!,
      });
      return tokens.map((token): FcmParams => ({
        token,
        title: "Event room update",
        body: "Open the room to see the new message.",
        type: "eventChatMessage",
        eventId: candidate.eventId,
        organizerId: message.organizerId,
        messageId: candidate.messageId,
        notificationId: receiptId,
        recipientUid: candidate.recipientUid,
        appRole: role,
      }));
    } catch {
      return null;
    }
  });
  if (!deliveries) return false;
  await Promise.all(deliveries.map((payload) => deps.sink(payload)));
  return true;
}

/** Bounded post-commit seam. Disabled by default; no queue or provider is
 * activated by a message write. The 100-row limit counts historical left,
 * removed and banned memberships as well as joined members; a room exceeding
 * that total fails closed until a joined-only indexed query is provisioned.
 * Synthetic sinks are at-most-once: if a sink fails after the receipt commits,
 * retry does not replay that preview. */
export async function dispatchEventChatNotificationCandidates(
  message: {eventId: string; messageId: string},
  deps: Deps = defaults
): Promise<number> {
  if (!deps.enabled) return 0;
  const db = deps.db();
  const members = await db.collection("eventChatMemberships")
    .where("eventId", "==", message.eventId).limit(101).get();
  if (members.size > 100) return 0;
  let delivered = 0;
  for (const row of members.docs) {
    const member = row.data();
    if (member.status !== "joined" || typeof member.uid !== "string") {
      continue;
    }
    if (await dispatchEventChatNotification({...message,
      recipientUid: member.uid}, deps)) delivered++;
  }
  return delivered;
}
