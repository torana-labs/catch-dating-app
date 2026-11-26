import type {
  ContactPermissionDocument,
  ContactPermissionReceiptDocument,
} from "./generated/firestoreAdminTypes";
import {
  contactPermissionReceiptRef,
  contactPermissionsCollection,
} from "./contactPermissions";

/**
 * Event-day contact consent (issue #2494): one document per guest and event
 * at users/{uid}/contactPermissions/event_{eventId}, beside the catch and
 * organizer_ documents. It holds one grant per event-day channel (sms, rcs,
 * whatsapp, purpose eventService), each bound to one roster row, one sender
 * identity and one number until it expires, and the guest's two
 * approval-notification choices (phone and email, purpose bookingUpdates).
 * Every decision's receipt joins contactPermissionReceipts.
 *
 * This module is the read side the send gates use. Only the messaging
 * context writes the documents (functions/src/messaging/
 * eventContactPermissions.ts).
 */

type Grants = ContactPermissionDocument["grants"];
export type EventServiceChannel = "sms" | "rcs" | "whatsapp";
export const eventServiceKeys = {
  sms: "sms:eventService",
  rcs: "rcs:eventService",
  whatsapp: "whatsapp:eventService",
} as const;
export type EventServiceKey =
  typeof eventServiceKeys[EventServiceChannel];
export const bookingUpdatesKeys = {
  phone: "phone:bookingUpdates",
  email: "email:bookingUpdates",
} as const;
export type BookingUpdatesKey =
  typeof bookingUpdatesKeys[keyof typeof bookingUpdatesKeys];
export type EventGrantKey = EventServiceKey | BookingUpdatesKey;
export const eventGrantKeys: readonly EventGrantKey[] = [
  ...Object.values(eventServiceKeys), ...Object.values(bookingUpdatesKeys),
];

export type EventServiceGrant = NonNullable<Grants["sms:eventService"]>;
export type PhoneBookingUpdatesGrant =
  NonNullable<Grants["phone:bookingUpdates"]>;
export type EmailBookingUpdatesGrant =
  NonNullable<Grants["email:bookingUpdates"]>;
export interface EventContactGrants {
  "sms:eventService"?: EventServiceGrant;
  "rcs:eventService"?: EventServiceGrant;
  "whatsapp:eventService"?: EventServiceGrant;
  "phone:bookingUpdates"?: PhoneBookingUpdatesGrant;
  "email:bookingUpdates"?: EmailBookingUpdatesGrant;
}
export type EventContactPermission =
  Omit<ContactPermissionDocument, "grants" | "granted" | "organizerId"> & {
    senderKind: "event";
    organizerId: string;
    grants: EventContactGrants;
    granted: EventGrantKey[];
  };
export type EventContactReceipt = ContactPermissionReceiptDocument & {
  senderKind: "event";
  organizerId: string;
};

/**
 * Millis of a stored timestamp: a Firestore Timestamp, or the
 * {_seconds, _nanoseconds} shape a copied one has. NaN for anything else,
 * which every comparison treats as not covered.
 */
export function storedMillis(value: unknown): number {
  const stamp = value as {toMillis?: () => number; _seconds?: unknown;
    _nanoseconds?: unknown} | null | undefined;
  if (typeof stamp?.toMillis === "function") return stamp.toMillis();
  return typeof stamp?._seconds === "number" &&
    typeof stamp._nanoseconds === "number" ?
    stamp._seconds * 1000 + Math.floor(stamp._nanoseconds / 1_000_000) : NaN;
}

/** event_{eventId}. */
export function eventSenderKey(eventId: string): string {
  return `event_${eventId}`;
}

/** The guest's event-day permission document for one event. */
export function eventContactPermissionRef(db: FirebaseFirestore.Firestore,
  uid: string, eventId: string): FirebaseFirestore.DocumentReference {
  return db.collection("users").doc(uid)
    .collection(contactPermissionsCollection).doc(eventSenderKey(eventId));
}

export {contactPermissionReceiptRef};

/**
 * The stored event document, or null when there is none. A document that
 * names another event, or is not an event document, is refused: event
 * consent never falls back to another sender's answer.
 */
export function readEventContactPermission(
  data: FirebaseFirestore.DocumentData | undefined,
  eventId: string): EventContactPermission | null {
  if (!data) return null;
  if (data.senderKind !== "event" || data.senderId !== eventId ||
      typeof data.organizerId !== "string" ||
      typeof data.grants !== "object" || data.grants === null ||
      !Array.isArray(data.granted) ||
      Object.keys(data.grants).some((key) =>
        !eventGrantKeys.includes(key as EventGrantKey))) {
    throw new Error("Invalid event contact permission");
  }
  return data as EventContactPermission;
}

/** One event receipt, or null when it is missing or is not one. */
export function readEventContactReceipt(
  data: FirebaseFirestore.DocumentData | undefined,
  eventId: string): EventContactReceipt | null {
  if (!data || data.senderKind !== "event" || data.senderId !== eventId ||
      typeof data.organizerId !== "string") return null;
  return data as EventContactReceipt;
}

/** Whether an event-day grant is effective at `nowMillis`. */
export function eventServiceGrantIsEffective(
  grant: EventServiceGrant | undefined, nowMillis: number): boolean {
  return !!grant && grant.status === "optedIn" && grant.evidence !== null &&
    storedMillis(grant.expiresAt) > nowMillis;
}

/** The sorted keys whose event grants are effective at `nowMillis`. */
export function effectiveEventContactKeys(grants: EventContactGrants,
  nowMillis: number): EventGrantKey[] {
  const keys: EventGrantKey[] = [];
  for (const key of Object.values(eventServiceKeys)) {
    if (eventServiceGrantIsEffective(grants[key], nowMillis)) keys.push(key);
  }
  const phone = grants["phone:bookingUpdates"];
  if (phone?.status === "optedIn" && phone.endpointE164) {
    keys.push("phone:bookingUpdates");
  }
  const email = grants["email:bookingUpdates"];
  if (email?.status === "optedIn" && email.email) {
    keys.push("email:bookingUpdates");
  }
  return keys.sort();
}

/** The latest event-day grant expiry; the document's TTL field. */
export function eventContactExpiry(
  grants: EventContactGrants): FirebaseFirestore.Timestamp | null {
  let latest: FirebaseFirestore.Timestamp | null = null;
  for (const key of Object.values(eventServiceKeys)) {
    const expiresAt = grants[key]?.expiresAt;
    if (expiresAt && (!latest ||
        storedMillis(expiresAt) > storedMillis(latest))) {
      latest = expiresAt;
    }
  }
  return latest;
}
