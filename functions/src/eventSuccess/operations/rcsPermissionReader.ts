import {messageRecipientMatches} from "./messageRecipient";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {GuestSourceFacts, guestSourceFactsFromSnapshots} from "./guestRecords";
import {rcsCallbackClock} from "./rcsCallbackRecords";
import {RcsConfig, parseRcsConfig, rcsPhoneHash} from "./rcsProtocol";
import {readRcsSubscription, RcsSubscription} from "./rcsSubscriptions";
import {Permission, rcsPermissionId, rcsPermissionHasReceipt,
  rcsPermissionClearsStop} from "./rcsConsent";
import {readEventChannelConsent} from "./eventContactGrants";

export type RcsPermissionScope = {context: Permission["context"];
  attendeeId: string; senderId: string};
export type RcsPermissionResult =
  | {kind: "blocked"; reason: "missingPermission" | "suppressed"}
  | {kind: "allowed"; permission: Extract<Permission, {status: "granted"}>;
      source: GuestSourceFacts;
      subscription: RcsSubscription | null};

/** Shared consent facts for planning and final dispatch transactions. */
export async function readRcsMessagePermission(db: Firestore, tx: Transaction,
  scope: RcsPermissionScope, config: RcsConfig, now: number):
  Promise<RcsPermissionResult> {
  rcsCallbackClock(now);
  parseRcsConfig(config);
  const missing: RcsPermissionResult = {kind: "blocked",
    reason: "missingPermission"};
  const suppressed: RcsPermissionResult = {kind: "blocked",
    reason: "suppressed"};
  const {context, attendeeId, senderId} = scope;
  if (context.mode !== "live" || senderId !== config.senderId) return missing;
  const id = rcsPermissionId(context, attendeeId, senderId);
  const [eventSnap, attendeeSnap] = await tx.getAll(
    db.collection("events").doc(context.eventId),
    db.collection("eventAttendees").doc(attendeeId));
  const attendee = attendeeSnap.data();
  // The row's linked guest owns the consent; an unlinked row has none, and
  // no one's permission document is read for it (issue #2494).
  const uid = attendee?.linkedUid;
  if (typeof uid !== "string" || uid.length === 0) return missing;
  const consent = await readEventChannelConsent(db, tx, "rcs", uid,
    context.eventId);
  if (!consent) return missing;
  const {permission, receipt} = consent;
  if (permission.status !== "granted") return suppressed;
  const source = guestSourceFactsFromSnapshots(context, attendeeId,
    eventSnap, attendeeSnap);
  if (permission.permissionId !== id ||
      permission.sender.agentId !== config.agentId ||
      permission.attendeeGeneration !== source.attendeeGeneration ||
      permission.sourceGeneration !== source.sourceGeneration ||
      !messageRecipientMatches(permission.recipientBinding, {
        rosterPhone: attendee?.phoneE164, linkedUid: attendee?.linkedUid,
        sourceGeneration: source.sourceGeneration,
      }, (phone) => phone === permission.phoneE164) ||
      permission.subjectUid !== attendee?.linkedUid ||
      permission.updatedAt > now || permission.expiresAt <= now ||
      now >= Math.floor(source.eventEnd) + 86_400_000) return missing;
  if (!rcsPermissionHasReceipt(permission, receipt)) return missing;
  const subscription = await readRcsSubscription(db, tx, config.agentId,
    rcsPhoneHash(permission.phoneE164)!, now);
  return rcsPermissionClearsStop(permission, subscription) ?
    {kind: "allowed", permission, source, subscription} : suppressed;
}
