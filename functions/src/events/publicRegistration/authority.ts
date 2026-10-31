import {readCommunityMembership} from
  "../../memberships/communityMembershipAuthority";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument} from "../../shared/generated/firestoreAdminTypes";
import type {LoadRecipientAuth} from
  "../../organizerEventOfferRecipients/recipientGrant";
import {
  isEventOrganizerManager,
  eventOrganizerRef,
  requireEventOrganizer,
} from "../../shared/eventOrganizers";
import {requireDoc} from "../../shared/validation";
import {normalizeRosterPhone} from "../eventAttendees";

/** Recheck Admin Auth on transaction retries, including webhook fulfillment.
 * Public OTP guests need no Consumer profile, but deleted accounts are denied.
 */
export async function assertCurrentPublicGuest(input: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  uid: string;
  phoneE164: string;
  loadCurrentAuthUser?: LoadRecipientAuth;
}): Promise<void> {
  const {db, tx, uid, phoneE164} = input;
  const normalized = normalizeRosterPhone(phoneE164);
  if (
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u.test(uid) ||
    normalized.issue ||
    !normalized.value ||
    normalized.value !== phoneE164
  ) {
    throw new HttpsError(
      "permission-denied",
      "Verify your phone to continue.",
    );
  }
  const [user, deleted] = await Promise.all([
    tx.get(db.collection("users").doc(uid)),
    tx.get(db.collection("deletedUsers").doc(uid)),
  ]);
  if (
    deleted.exists ||
    user.data()?.deleted === true ||
    user.data()?.deletedAt != null
  ) {
    throw new HttpsError("permission-denied", "Account is unavailable.");
  }
  let current;
  try {
    current = await (
      input.loadCurrentAuthUser ??
      ((id: string) => admin.auth().getUser(id))
    )(uid);
  } catch (error) {
    if ((error as { code?: string })?.code === "auth/user-not-found") {
      throw new HttpsError("permission-denied", "Account is unavailable.");
    }
    throw error;
  }
  if (
    current.uid !== uid ||
    current.disabled ||
    current.phoneNumber !== phoneE164
  ) {
    throw new HttpsError("permission-denied", "Verify your current phone.");
  }
}

export async function readPublicEventSource(input: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
}) {
  const {db, tx, eventId} = input;
  const event = requireDoc<EventDocument>(
    await tx.get(db.collection("events").doc(eventId)),
    "EventDocument",
  );
  const organizer = requireEventOrganizer(
    await tx.get(eventOrganizerRef(db, event)),
    event,
  );
  return {event, organizer};
}

export async function readRegistrationManager(input: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
  organizerId: string;
  actorUid: string;
}) {
  const {db, tx, actorUid} = input;
  const [source, user, deleted] = await Promise.all([
    readPublicEventSource(input),
    tx.get(db.collection("users").doc(actorUid)),
    tx.get(db.collection("deletedUsers").doc(actorUid)),
  ]);
  if (
    source.event.organizerId !== input.organizerId ||
    !user.exists ||
    deleted.exists ||
    user.data()?.deleted === true ||
    user.data()?.deletedAt != null ||
    !isEventOrganizerManager(source.organizer, source.event, actorUid)
  ) {
    throw new HttpsError("permission-denied", "Organizer access required.");
  }
  return source;
}

/** Resolve current membership from its entitlement and immutable decision. */
export async function publicGuestMembership(input: {
  db: FirebaseFirestore.Firestore; tx: FirebaseFirestore.Transaction;
  event: EventDocument; uid: string; nowMillis: number;
}): Promise<boolean> {
  const admission = input.event.eventPolicy?.admission;
  if (!admission?.membershipRequired && admission?.format !== "membersOnly" &&
      admission?.approvedMembersSkipReview !== true) return false;
  return (await readCommunityMembership({...input,
    organizerId: input.event.organizerId}))?.state ===
      "active";
}
