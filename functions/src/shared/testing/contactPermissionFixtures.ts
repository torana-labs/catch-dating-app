import {Timestamp} from "firebase-admin/firestore";
import {
  contactSenderKey,
  effectiveContactKeys,
  type ContactGrant,
  type ContactGrantKey,
  type ContactPermission,
  type ContactSender,
} from "../contactPermissions";

/** Test fixtures for users/{uid}/contactPermissions (issue #2460). */

/** The stored path of a person's permission for one sender. */
export function contactPermissionPath(uid: string,
  sender: ContactSender): string {
  return `users/${uid}/contactPermissions/${contactSenderKey(sender)}`;
}

/** An effective opt-in on the reviewed registration copy. */
export function optedInGrant(endpointE164: string,
  patch: Partial<ContactGrant> = {}): ContactGrant {
  return {status: "optedIn", endpointE164, receiptId: "receipt-grant",
    termsVersion: "organizer-updates-v1", source: "publicEventRegistration",
    updatedAt: Timestamp.fromMillis(1), ...patch};
}

/** A withdrawal, which covers every number. */
export function optedOutGrant(patch: Partial<ContactGrant> = {}):
  ContactGrant {
  return {status: "optedOut", endpointE164: null, receiptId: "receipt-stop",
    termsVersion: null, source: "participantSettings",
    updatedAt: Timestamp.fromMillis(2), ...patch};
}

/** The stored permission document for these grants. */
export function contactPermissionDocument(sender: ContactSender,
  grants: Partial<Record<ContactGrantKey, ContactGrant>>,
  updatedAt: Timestamp = Timestamp.fromMillis(2)): ContactPermission {
  return {senderKind: sender.kind,
    senderId: sender.kind === "catch" ? "catch" : sender.organizerId,
    grants, granted: effectiveContactKeys(grants), updatedAt};
}

/** A path-and-document pair seeding an organizer's permission. */
export function organizerPermissionSeed(organizerId: string, uid: string,
  grants: Partial<Record<ContactGrantKey, ContactGrant>>):
  [string, ContactPermission] {
  const sender = {kind: "organizer" as const, organizerId};
  return [contactPermissionPath(uid, sender),
    contactPermissionDocument(sender, grants)];
}
