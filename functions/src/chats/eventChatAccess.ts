import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError, onCall, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {eventOrganizerId, eventOrganizerRef, requireEventOrganizer,
  isEventOrganizerManager} from "../shared/eventOrganizers";
import {requireVerifiedParticipant} from "../profiles/claimFormProfile";
import type {EventDocument, UserProfileDocument,
  EventParticipationDocument, EventAttendeeDocument,
  EventChatRoomDocument as Room, EventChatMembershipDocument as Membership,
  EventChatProfileShareDocument as ProfileShare,
  EventChatAccessReceiptDocument as Receipt} from
  "../shared/generated/firestoreAdminTypes";
import type {GetEventChatAccessCallableResponse as View} from
  "../shared/generated/getEventChatAccessCallableResponse";
import type {UpdateEventChatAccessCallableResponse as Result} from
  "../shared/generated/updateEventChatAccessCallableResponse";
import {validateGetEventChatAccessCallablePayload} from
  "../shared/generated/validators/getEventChatAccessInput";
import {validateUpdateEventChatAccessCallablePayload} from
  "../shared/generated/validators/updateEventChatAccessInput";
import {canPostEventChatMode, canReadEventChatMode,
  effectiveEventChatRoomMode} from "./eventChatRoomPolicy";

export function requireEventChatActor(uid: string, expectedUid: string) {
  if (uid !== expectedUid) {
    throw new HttpsError("permission-denied",
      "Your account changed. Reopen this conversation.");
  }
}

export const eventChatTermsVersion = "event-chat-v1";
const hash = (value: unknown) => createHash("sha256")
  .update(JSON.stringify(value)).digest("hex");
export const eventChatMembershipId = (eventId: string, uid: string) =>
  hash([eventId, uid]);
interface Deps {
  db: () => FirebaseFirestore.Firestore;
  now: () => Timestamp;
  rateLimit: typeof checkRateLimit;
}
const defaults: Deps = {db: () => admin.firestore(), now: () => Timestamp.now(),
  rateLimit: checkRateLimit};

/** Canonical cancellation or conflicting evidence cannot be bypassed by a
 * stale room membership, runtime identity, or another positive projection. */
export function hasEventChatAdmission(eventId: string, organizerId: string,
  uid: string, participation: EventParticipationDocument | null,
  attendees: EventAttendeeDocument[]): boolean {
  if (attendees.length > 1) return false;
  if (participation && (participation.eventId !== eventId ||
      participation.uid !== uid ||
      (participation.organizerId ?? participation.clubId) !== organizerId ||
      !["signedUp", "attended"].includes(participation.status))) return false;
  const attendee = attendees[0];
  if (attendee && (attendee.eventId !== eventId ||
      attendee.organizerId !== organizerId || attendee.linkedUid !== uid ||
      !["registered", "checkedIn"].includes(attendee.status))) return false;
  return participation !== null || attendee !== undefined;
}

export async function readEventChatAccount(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, uid: string) {
  const [deleted, user] = await Promise.all([
    tx.get(db.collection("deletedUsers").doc(uid)),
    tx.get(db.collection("users").doc(uid)),
  ]);
  if (deleted.exists || user.data()?.deleted === true) {
    throw new HttpsError("permission-denied", "This account is unavailable.");
  }
  return user.exists ? requireDoc<UserProfileDocument>(user,
    "UserProfileDocument") : null;
}

/** Reads current event authority without trusting a cached roster grant. */
export async function readEventChatAccess(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, eventId: string, uid: string,
  nowMillis = Date.now()) {
  const user = await readEventChatAccount(db, tx, uid);
  const eventSnap = await tx.get(db.collection("events").doc(eventId));
  if (!eventSnap.exists) throw unavailable();
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const organizerId = eventOrganizerId(event);
  const organizer = requireEventOrganizer(await tx.get(
    eventOrganizerRef(db, event)), event);
  const host = isEventOrganizerManager(organizer, event, uid);
  if (!host) {
    const [participationSnap, attendeeRows] = await Promise.all([
      tx.get(db.collection("eventParticipations").doc(`${eventId}_${uid}`)),
      tx.get(db.collection("eventAttendees").where("eventId", "==", eventId)
        .where("linkedUid", "==", uid).limit(2)),
    ]);
    const participation = participationSnap.exists ?
      requireDoc<EventParticipationDocument>(participationSnap,
        "EventParticipationDocument") : null;
    if (!hasEventChatAdmission(eventId, organizerId, uid, participation,
      attendeeRows.docs.map((row) => requireDoc<EventAttendeeDocument>(row,
        "EventAttendeeDocument")))) throw unavailable();
  }
  const [roomSnap, memberSnap] = await Promise.all([
    tx.get(db.collection("eventChatRooms").doc(eventId)),
    tx.get(db.collection("eventChatMemberships")
      .doc(eventChatMembershipId(eventId, uid))),
  ]);
  const room = roomSnap.exists ? requireDoc<Room>(roomSnap,
    "EventChatRoomDocument") : null;
  const member = memberSnap.exists ? requireDoc<Membership>(memberSnap,
    "EventChatMembershipDocument") : null;
  if ((room && (room.eventId !== eventId ||
      room.organizerId !== organizerId)) ||
      (member && (member.eventId !== eventId || member.uid !== uid ||
        member.organizerId !== organizerId))) throw unavailable();
  const claimed = user !== null && typeof user.displayName === "string" &&
    user.displayName.trim().length > 0 &&
    (user.profileComplete === true || user.profileClaimedAt != null);
  const mode = event.status === "active" ?
    effectiveEventChatRoomMode(room, nowMillis) : "closed";
  const active = event.status === "active" && canReadEventChatMode(mode);
  const joined = member?.status === "joined";
  const canReadMessages = active && claimed && joined;
  const view: View = {eventId, organizerId, title: event.name ?? "",
    role: host ? "host" : "attendee",
    room: {status: mode, revision: room?.revision ?? 0,
      opensAtMillis: room?.opensAtMillis ?? null,
      closesAtMillis: room?.closesAtMillis ?? null},
    membership: {status: member?.status ?? "notJoined",
      revision: member?.revision ?? 0,
      notificationsMuted: member?.notificationsMuted === true},
    canManage: host, canJoin: active && claimed &&
      member?.status !== "removed" && member?.status !== "banned",
    canReadMessages,
    canPostMessages: canReadMessages && canPostEventChatMode(mode, host),
    profileClaimRequired: !claimed, termsVersion: eventChatTermsVersion};
  return {event, room, member, user, view};
}

export async function requireEventChatMember(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, eventId: string, uid: string,
  nowMillis = Date.now()) {
  const access = await readEventChatAccess(db, tx, eventId, uid, nowMillis);
  if (!access.view.canReadMessages) throw unavailable();
  return access;
}

export async function getEventChatAccessHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults): Promise<View> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateGetEventChatAccessCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventChatAccess", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  return db.runTransaction(async (tx) =>
    (await readEventChatAccess(db, tx, data.eventId, uid,
      deps.now().toMillis())).view);
}

export async function updateEventChatAccessHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults): Promise<Result> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(request,
    validateUpdateEventChatAccessCallablePayload);
  requireEventChatActor(uid, data.expectedUid);
  if (data.action === "join") {
    requireVerifiedParticipant(request);
    if (data.termsVersion !== eventChatTermsVersion) {
      throw new HttpsError("failed-precondition",
        "Review the room disclosure.");
    }
  } else if (data.termsVersion !== null) {
    throw new HttpsError("invalid-argument", "Terms apply only when joining.");
  }
  if (data.action === "schedule") {
    if (!Number.isSafeInteger(data.opensAtMillis) ||
        !Number.isSafeInteger(data.closesAtMillis) ||
        data.opensAtMillis! >= data.closesAtMillis!) {
      throw new HttpsError("invalid-argument", "Choose a valid room window.");
    }
  } else if (data.opensAtMillis !== undefined ||
      data.closesAtMillis !== undefined) {
    throw new HttpsError("invalid-argument", "Timing applies to schedule.");
  }
  const db = deps.db();
  await deps.rateLimit(db, uid, "updateEventChatAccess", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const receiptRef = db.collection("eventChatAccessReceipts")
    .doc(hash([uid, data.requestId]));
  const legacyPayload = [data.eventId, data.action,
    data.expectedRevision, data.termsVersion];
  const payloadHash = hash(["join", "leave", "open", "close"].includes(
    data.action) ? legacyPayload : [...legacyPayload,
      data.opensAtMillis ?? null, data.closesAtMillis ?? null]);
  return db.runTransaction(async (tx) => {
    await readEventChatAccount(db, tx, uid);
    const receiptSnap = await tx.get(receiptRef);
    if (receiptSnap.exists) {
      const receipt = requireDoc<Receipt>(receiptSnap,
        "EventChatAccessReceiptDocument");
      if (receipt.uid !== uid || receipt.eventId !== data.eventId ||
          receipt.payloadHash !== payloadHash) {
        throw new HttpsError("already-exists",
          "This request was already used.");
      }
      // A replay reports the old applied revision, not present access.
      return {revision: receipt.revision, replayed: true};
    }
    const memberRef = db.collection("eventChatMemberships")
      .doc(eventChatMembershipId(data.eventId, uid));
    const now = deps.now();
    let revision: number;
    if (["leave", "mute", "unmute"].includes(data.action)) {
      // Withdrawal is available even after admission or the event disappears.
      const snap = await tx.get(memberRef);
      const member = snap.exists ? requireDoc<Membership>(snap,
        "EventChatMembershipDocument") : null;
      if (!member || member.uid !== uid || member.eventId !== data.eventId) {
        throw unavailable();
      }
      if (member.status !== "joined" && data.action !== "leave") {
        throw unavailable();
      }
      if (member.status === "removed" || member.status === "banned") {
        throw unavailable();
      }
      assertRevision(member.revision, data.expectedRevision);
      revision = member.revision + 1;
      if (data.action !== "leave") {
        const shareRef = db.collection("eventChatProfileShares")
          .doc(eventChatMembershipId(data.eventId, uid));
        const shareSnap = await tx.get(shareRef);
        if (shareSnap.exists) {
          const share = requireDoc<ProfileShare>(shareSnap,
            "EventChatProfileShareDocument");
          const selectedRevision = share.selection?.membershipRevision;
          // Mute is a setting within the same membership, not a new profile
          // consent. Advance only a choice still valid before this change.
          if (share.uid === uid && share.eventId === data.eventId &&
              share.organizerId === member.organizerId &&
              (selectedRevision === member.revision ||
                (selectedRevision === 0 && member.revision === 1))) {
            tx.update(shareRef, {"selection.membershipRevision": revision});
          }
        }
      }
      tx.set(memberRef, {...member, revision,
        status: data.action === "leave" ? "left" : member.status,
        leftAt: data.action === "leave" ? now : member.leftAt,
        notificationsMuted: data.action === "mute" ? true :
          data.action === "unmute" ? false :
            member.notificationsMuted ?? false,
        updatedAt: now} satisfies Membership);
    } else {
      const access = await readEventChatAccess(db, tx, data.eventId, uid,
        now.toMillis());
      if (data.action === "join") {
        if (!access.view.canJoin) throw unavailable();
        if (access.member?.status === "removed" ||
            access.member?.status === "banned") throw unavailable();
        assertRevision(access.member?.revision ?? 0, data.expectedRevision);
        revision = (access.member?.revision ?? 0) + 1;
        tx.set(memberRef, {eventId: data.eventId,
          organizerId: access.view.organizerId, uid, revision, status: "joined",
          termsVersion: eventChatTermsVersion, joinedAt: now, leftAt: null,
          notificationsMuted: access.member?.notificationsMuted ?? false,
          removedAt: null, removedByUid: null,
          createdAt: access.member?.createdAt ?? now, updatedAt: now} satisfies
          Membership);
      } else {
        if (!access.view.canManage ||
            access.room?.status === "archived" ||
            (!["close", "archive"].includes(data.action) &&
              access.event.status !== "active")) throw unavailable();
        if (["pause", "announcementsOnly", "resume", "archive"].includes(
          data.action) && (!access.room ||
            !["open", "paused", "announcementsOnly", "closed"].includes(
              access.room.status))) throw unavailable();
        if (["pause", "announcementsOnly", "resume"].includes(data.action) &&
            access.room?.status === "closed") throw unavailable();
        assertRevision(access.room?.revision ?? 0, data.expectedRevision);
        revision = (access.room?.revision ?? 0) + 1;
        const status = data.action === "close" ? "closed" :
          data.action === "archive" ? "archived" :
            data.action === "pause" ? "paused" :
              data.action === "announcementsOnly" ? "announcementsOnly" :
                "open";
        tx.set(db.collection("eventChatRooms").doc(data.eventId), {
          eventId: data.eventId, organizerId: access.view.organizerId,
          status, revision,
          opensAtMillis: data.action === "schedule" ? data.opensAtMillis! :
            data.action === "open" ? null :
              access.room?.opensAtMillis ?? null,
          closesAtMillis: data.action === "schedule" ? data.closesAtMillis! :
            data.action === "open" ? null :
              access.room?.closesAtMillis ?? null,
          lastMessageSequence: access.room?.lastMessageSequence ?? 0,
          createdByUid: access.room?.createdByUid ?? uid, updatedByUid: uid,
          createdAt: access.room?.createdAt ?? now, updatedAt: now,
        } satisfies Room);
      }
    }
    tx.create(receiptRef, {eventId: data.eventId, uid, payloadHash, revision,
      createdAt: now} satisfies Receipt);
    return {revision, replayed: false};
  });
}

function assertRevision(actual: number, expected: number) {
  if (actual !== expected) {
    throw new HttpsError("aborted",
      "Room settings changed. Refresh and retry.");
  }
  if (!Number.isSafeInteger(actual + 1)) throw unavailable();
}
function unavailable() {
  return new HttpsError("permission-denied", "This event chat is unavailable.");
}
export const getEventChatAccess = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => getEventChatAccessHandler(request));
export const updateEventChatAccess = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => updateEventChatAccessHandler(request));
