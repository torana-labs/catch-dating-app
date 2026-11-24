import type {ManageEventApprovalNotificationsCallablePayload} from "../../../../functions/src/shared/generated/manageEventApprovalNotificationsCallablePayload";
import type {ManageEventApprovalNotificationsCallableResponse} from "../../../../functions/src/shared/generated/manageEventApprovalNotificationsCallableResponse";
import type {ManageEventOfferCheckoutCallablePayload} from "../../../../functions/src/shared/generated/manageEventOfferCheckoutCallablePayload";
import type {ManageEventOfferCheckoutCallableResponse} from "../../../../functions/src/shared/generated/manageEventOfferCheckoutCallableResponse";
import type {ManagePublicEventCheckoutCallablePayload} from "../../../../functions/src/shared/generated/managePublicEventCheckoutCallablePayload";
import type {ManagePublicEventCheckoutCallableResponse} from "../../../../functions/src/shared/generated/managePublicEventCheckoutCallableResponse";
import type {RecordEventInviteLinkOpenCallablePayload} from "../../../../functions/src/shared/generated/recordEventInviteLinkOpenCallablePayload";
import type {RegisterPublicEventCallablePayload} from "../../../../functions/src/shared/generated/registerPublicEventCallablePayload";
import type {RegisterPublicEventCallableResponse} from "../../../../functions/src/shared/generated/registerPublicEventCallableResponse";
import type {ResolveEventInviteLandingCallablePayload} from "../../../../functions/src/shared/generated/resolveEventInviteLandingCallablePayload";
import type {ResolveEventInviteLandingCallableResponse} from "../../../../functions/src/shared/generated/resolveEventInviteLandingCallableResponse";
import {eventRuntimeFirebaseConfigured, publicEventRegistrationFirebaseConfigured, publicFormsFirebaseConfigured} from "../../firebaseConfig";
import {getFirebaseRuntime, getPublicFirebaseRuntime, invokeWebsiteCallable, websiteFirestore} from "./runtime";

/**
 * Public event registration, checkout, invites and the guest's live event documents.
 */
export type RegisterPublicEventPayload = RegisterPublicEventCallablePayload;
export type RegisterPublicEventResponse = RegisterPublicEventCallableResponse;
export type EventInviteLanding = ResolveEventInviteLandingCallableResponse;

export type EventOfferCheckoutResponse = ManageEventOfferCheckoutCallableResponse;

export async function manageEventOfferCheckout(
  payload: ManageEventOfferCheckoutCallablePayload
): Promise<ManageEventOfferCheckoutCallableResponse> {
  return invokeWebsiteCallable("manageEventOfferCheckout", {...payload, includeEventAccess: true},
    publicFormsFirebaseConfigured, "Event invitation checkout");
}

export async function registerPublicEvent(
  payload: RegisterPublicEventPayload
): Promise<RegisterPublicEventResponse> {
  return invokeWebsiteCallable<RegisterPublicEventPayload, RegisterPublicEventResponse>(
    "registerPublicEvent", payload, publicEventRegistrationFirebaseConfigured, "Website event registrations");
}

export async function recordEventInviteLinkOpen(
  payload: RecordEventInviteLinkOpenCallablePayload
): Promise<{accepted: boolean; inviteLinkId: string}> {
  return invokeWebsiteCallable(
    "recordEventInviteLinkOpen",
    payload,
    publicEventRegistrationFirebaseConfigured || eventRuntimeFirebaseConfigured
  );
}

export async function resolveEventInviteLanding(
  payload: ResolveEventInviteLandingCallablePayload
): Promise<ResolveEventInviteLandingCallableResponse> {
  return invokeWebsiteCallable(
    "resolveEventInviteLanding",
    payload,
    publicEventRegistrationFirebaseConfigured || eventRuntimeFirebaseConfigured
  );
}

export async function managePublicEventCheckout(payload: ManagePublicEventCheckoutCallablePayload): Promise<ManagePublicEventCheckoutCallableResponse> {
  return invokeWebsiteCallable("managePublicEventCheckout", payload, publicEventRegistrationFirebaseConfigured, "Event registration");
}

/** Listed public event copies (#1666), live. Rules list only listed copies and
 * keep events/{id} to the organizer's team. Never deliver Firestore's local
 * cache as authority. */
export async function subscribePublicCatchEvents(
  onSnapshotReceived: (snapshot: {
    metadata: {fromCache: boolean; hasPendingWrites: boolean};
    size: number; docs: readonly {id: string; data(): unknown}[];
  }) => void,
  onUnavailable: () => void
): Promise<() => void> {
  const runtime = await getPublicFirebaseRuntime();
  if (!runtime) throw new Error("Public event service is unavailable.");
  const {collection, query, where, limit, onSnapshot} =
    await import("firebase/firestore");
  const source = query(collection(await websiteFirestore(runtime.app), "publicEvents"),
    where("listing", "==", "listed"), limit(401));
  return onSnapshot(source, {includeMetadataChanges: true}, onSnapshotReceived, onUnavailable);

}


/** The raw documents behind a guest's step on an event page; the caller parses them. */
export interface GuestEventDocuments {
  entry: unknown;
  status: unknown;
  bookingFacts: unknown;
}

/**
 * Listens to the event's guest entry, the signed-in guest's own row for it
 * and their booking facts, and reports all three once each has arrived.
 * The UID comes from the signed-in account; rules let a guest read only
 * their own row and facts.
 */
export async function watchGuestEventDocuments(
  eventId: string,
  uid: string,
  onValue: (documents: GuestEventDocuments) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !(publicEventRegistrationFirebaseConfigured || publicFormsFirebaseConfigured)) {
    throw new Error("Event guest status are not configured for this build.");
  }
  const {doc, onSnapshot} = await import("firebase/firestore");
  const documents: Partial<Record<keyof GuestEventDocuments, unknown>> = {};
  const listen = (key: keyof GuestEventDocuments, path: string, id: string) =>
    onSnapshot(doc(runtime.firestore, path, id), (snapshot) => {
      documents[key] = snapshot.data() ?? null;
      if ("entry" in documents && "status" in documents && "bookingFacts" in documents) {
        onValue({entry: documents.entry, status: documents.status, bookingFacts: documents.bookingFacts});
      }
    }, (error) => onError(error));
  const stops = [
    listen("entry", "eventGuestEntries", eventId),
    listen("status", "guestEventStatuses", `${eventId}_${uid}`),
    listen("bookingFacts", "guestBookingFacts", uid),
  ];
  return () => stops.forEach((stop) => stop());
}


export async function manageEventApprovalNotifications(
  payload: ManageEventApprovalNotificationsCallablePayload
): Promise<ManageEventApprovalNotificationsCallableResponse> {
  return invokeWebsiteCallable("manageEventApprovalNotifications", payload,
    publicEventRegistrationFirebaseConfigured || publicFormsFirebaseConfigured,
    "Application notifications");
}
