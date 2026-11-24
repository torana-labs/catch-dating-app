import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type {
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  publicProfileFromUserProfileDoc,
} from "../shared/profileProjection";
import {isSocialReadyUserProfile} from "../shared/profileReadiness";
import {organizerHostProfiles, organizerManagerUserIds} from
  "../shared/organizerHosts";
import {HostProfileDocument} from "../shared/hostProfiles";
import {EVENT_GUEST_PROFILES, bookingSharesEventProfile,
  eventGuestProfileData, eventGuestProfileRef, maxEventGuestProfileCopies}
  from
  "../shared/eventGuestProfiles";

interface SyncPublicProfileDeps {
  firestore: () => FirebaseFirestore.Firestore;
}

const defaultDeps: SyncPublicProfileDeps = {
  firestore: () => admin.firestore(),
};

/** Organizer host display fields projected from hostProfiles. */
interface HostPatch {hostName: string; hostAvatarUrl: string | null}

/**
 * What a trigger event saw of its source: the document's updateTime, or null
 * when the event is a delete.
 */
export type SourceVersion = FirebaseFirestore.Timestamp | null;

/**
 * Re-projects publicProfiles/{uid} and authored review names from the current
 * users/{uid}. The payload is never projected: the handler re-reads the source
 * in a transaction, so an older or repeated delivery cannot republish a field
 * the person has since changed, and retrying is safe.
 */
export const syncPublicProfile = onDocumentWritten(
  {document: "users/{userId}", retry: true},
  async (event) => {
    await syncUserProfileProjectionsHandler(event.params.userId,
      sourceVersionOf(event.data?.after));
  }
);

/**
 * Re-projects organizer host snapshots from the current hostProfiles/{uid},
 * re-read inside each organizer transaction; retrying is safe.
 */
export const syncHostProfile = onDocumentWritten(
  {document: "hostProfiles/{userId}", retry: true},
  async (event) => {
    await syncHostProfileProjectionsHandler(event.params.userId);
  }
);

/**
 * The source version a trigger event carried.
 * @param {FirebaseFirestore.DocumentSnapshot | undefined} after Event after.
 * @return {SourceVersion | undefined} updateTime, null for a delete, or
 * undefined when the event carried no snapshot.
 */
function sourceVersionOf(
  after: FirebaseFirestore.DocumentSnapshot | undefined
): SourceVersion | undefined {
  if (!after) return undefined;
  return after.exists ? after.updateTime ?? undefined : null;
}

/**
 * Whether a newer write to the source has landed since the event.
 * @param {FirebaseFirestore.DocumentSnapshot} source Re-read source.
 * @param {SourceVersion | undefined} eventVersion What the event saw.
 * @return {boolean} True when a later event owns the projection.
 */
function isStaleEvent(
  source: FirebaseFirestore.DocumentSnapshot,
  eventVersion: SourceVersion | undefined
): boolean {
  if (eventVersion === undefined || !source.exists) return false;
  // The source exists now, so a delete event was followed by a re-create.
  if (eventVersion === null) return true;
  const current = source.updateTime;
  if (!current) return false;
  return current.seconds > eventVersion.seconds ||
    (current.seconds === eventVersion.seconds &&
      current.nanoseconds > eventVersion.nanoseconds);
}

/**
 * Why a user has no public profile, or null when they have one.
 * @param {UserProfileDocument | undefined} user Current user profile.
 * @return {string | null} Reason for logs.
 */
function hiddenReason(user: UserProfileDocument | undefined): string | null {
  if (!user) return "user deleted";
  if (user.deleted) return "user marked deleted";
  if (!isSocialReadyUserProfile(user)) return "incomplete social profile";
  return null;
}

/**
 * Syncs public/profile-owned denormalized projections from the current
 * users/{uid}. It re-reads the source inside a transaction and projects that,
 * so the result always matches the source at commit. An event older than the
 * source's current version is skipped: the newer event (retried until it
 * succeeds) owns the projection.
 * @param {string} userId User id whose private profile changed.
 * @param {SourceVersion | undefined} eventVersion The source version the
 * trigger event saw; undefined skips the staleness check (repairs).
 * @param {SyncPublicProfileDeps} deps Injectable Firebase dependencies.
 * @return {Promise<"synced" | "deleted" | "stale">} What the call did.
 */
export async function syncUserProfileProjectionsHandler(
  userId: string,
  eventVersion?: SourceVersion,
  deps: SyncPublicProfileDeps = defaultDeps
): Promise<"synced" | "deleted" | "stale"> {
  const db = deps.firestore();
  const userRef = db.collection("users").doc(userId);
  const publicProfileRef = db.collection("publicProfiles").doc(userId);
  // The server-only full profile the matching feeds read (#2493, FIX-8).
  const guestProfileRef = db.collection("guestProfiles").doc(userId);
  const authoredReviews = db.collection("reviews")
    .where("reviewerUserId", "==", userId);
  // The copies co-guests read (#2493): one per live booking.
  const guestBookings = db.collection("eventBookings")
    .where("uid", "==", userId)
    .limit(maxEventGuestProfileCopies);
  const eventCopies = db.collection(EVENT_GUEST_PROFILES)
    .where("uid", "==", userId);

  const result = await db.runTransaction(async (tx) => {
    const source = await tx.get(userRef);
    if (isStaleEvent(source, eventVersion)) return "stale" as const;
    const user = source.data() as UserProfileDocument | undefined;
    const reason = hiddenReason(user);
    if (reason || !user) {
      const copies = await tx.get(eventCopies);
      tx.delete(publicProfileRef);
      tx.delete(guestProfileRef);
      copies.docs.forEach((copy) => tx.delete(copy.ref));
      return reason ?? "user deleted";
    }
    const publicProfile = publicProfileFromUserProfileDoc(user);
    // Block underage users from appearing in any swipe queue.
    if (publicProfile.age < 18) {
      const copies = await tx.get(eventCopies);
      tx.delete(publicProfileRef);
      tx.delete(guestProfileRef);
      copies.docs.forEach((copy) => tx.delete(copy.ref));
      return "underage";
    }
    const [reviews, bookings] = await Promise.all([
      tx.get(authoredReviews), tx.get(guestBookings)]);
    tx.set(publicProfileRef, publicProfile);
    tx.set(guestProfileRef, publicProfile);
    for (const booking of bookings.docs) {
      const {eventId, status} = booking.data();
      if (typeof eventId !== "string" || !eventId ||
          !bookingSharesEventProfile(status)) continue;
      tx.set(eventGuestProfileRef(db, eventId, userId),
        eventGuestProfileData(publicProfile, eventId, userId));
    }
    for (const review of reviews.docs) {
      tx.set(review.ref, {reviewerName: publicProfile.name}, {merge: true});
    }
    return "synced" as const;
  });

  if (result === "stale") {
    logger.info("Skipping stale public profile event", {userId});
    return "stale";
  }
  if (result === "synced") {
    logger.info("Synced public profile", {userId});
    return "synced";
  }
  if (result === "underage") {
    logger.warn("Blocking underage public profile sync", {userId});
  } else {
    logger.info("Deleted public profile", {userId, reason: result});
  }
  return "deleted";
}

/**
 * Syncs organizer-owned denormalized host projections from the current
 * hostProfiles/{uid}, re-read inside each organizer transaction.
 * @param {string} userId Host user id.
 * @param {SyncPublicProfileDeps} deps Injectable Firebase dependencies.
 * @return {Promise<void>}
 */
export async function syncHostProfileProjectionsHandler(
  userId: string,
  deps: SyncPublicProfileDeps = defaultDeps
): Promise<void> {
  const hostProfileRef = deps.firestore().collection("hostProfiles")
    .doc(userId);
  await syncOrganizerHostProfile(userId, async (tx) => {
    const hostProfile = (await tx.get(hostProfileRef)).data() as
      HostProfileDocument | undefined;
    return {
      hostName: nonBlank(hostProfile?.displayName) ?? "Catch Host",
      hostAvatarUrl: nonBlank(hostProfile?.avatarUrl),
    };
  }, deps);
}

/**
 * Updates organizer denormalized professional host profile fields.
 * @param {string} userId Host user id.
 * @param {HostPatch | function} patch Host projection patch, or a reader
 * that loads it inside each organizer transaction.
 * @param {SyncPublicProfileDeps} deps Injectable Firebase dependencies.
 * @return {Promise<void>}
 */
export async function syncOrganizerHostProfile(
  userId: string,
  patch: HostPatch |
    ((tx: FirebaseFirestore.Transaction) => Promise<HostPatch>),
  deps: SyncPublicProfileDeps = defaultDeps
): Promise<void> {
  const db = deps.firestore();
  const [
    canonicalOwnerSnap,
    canonicalTeamSnap,
    canonicalHostSnap,
  ] = await Promise.all([
    db.collection("organizers").where("ownerUserId", "==", userId).get(),
    db.collection("organizers")
      .where("hostUserIds", "array-contains", userId)
      .get(),
    db.collection("organizers").where("hostUserId", "==", userId).get(),
  ]);
  const docsByPath = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const doc of canonicalOwnerSnap.docs) docsByPath.set(doc.ref.path, doc);
  for (const doc of canonicalTeamSnap.docs) docsByPath.set(doc.ref.path, doc);
  for (const doc of canonicalHostSnap.docs) docsByPath.set(doc.ref.path, doc);
  if (docsByPath.size === 0) return;

  // Query snapshots only discover candidates. Team removal/transfer and the
  // projection update must serialize on the current organizer document.
  for (const candidate of docsByPath.values()) {
    await db.runTransaction(async (tx) => {
      const current = await tx.get(candidate.ref);
      if (!current.exists) return;
      const organizer = current.data() as
        Parameters<typeof organizerHostProfiles>[0];
      const managerIds = new Set(organizerManagerUserIds(organizer));
      if (!managerIds.has(userId)) return;
      const host = typeof patch === "function" ? await patch(tx) : patch;

      const fields: Record<string, unknown> = {};
      if (organizer.hostUserId === userId) {
        fields.hostName = host.hostName;
        fields.hostAvatarUrl = host.hostAvatarUrl;
      }
      fields.hostProfiles = organizerHostProfiles(organizer)
        .filter((profile) => managerIds.has(profile.uid))
        .map((profile) => profile.uid === userId ?
          {...profile, displayName: host.hostName,
            avatarUrl: host.hostAvatarUrl} :
          profile
        );
      tx.update(candidate.ref, fields);
    });
  }
}

/**
 * Returns a trimmed string when a host profile field has display text.
 * @param {string | null | undefined} value Candidate profile text.
 * @return {string | null} Normalized text or null.
 */
function nonBlank(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
