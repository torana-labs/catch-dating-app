import type {
  HostProfileDocument,
  UserProfileDocument,
} from "./generated/firestoreAdminTypes";
import {OrganizerHostProfile, OrganizerHostRole} from "./organizerHosts";
import {publicAvatarUrl, publicDisplayName} from "./profileProjection";

export type {HostProfileDocument} from "./generated/firestoreAdminTypes";

/**
 * Returns a professional host snapshot for club/event display.
 * Host profile data wins over dating profile data. User profile fields are
 * fallback-only for migration and are never required for host operation.
 * @param {object} params Lookup inputs.
 * @param {string} params.uid Host auth uid.
 * @param {FirebaseFirestore.DocumentSnapshot} params.hostProfileSnap
 * Host profile document snapshot.
 * @param {FirebaseFirestore.DocumentSnapshot} params.userSnap Optional user
 * profile document snapshot.
 * @param {OrganizerHostRole} params.role Host role inside the club.
 * @return {OrganizerHostProfile} Professional host display snapshot.
 */
export function professionalHostSnapshot(params: {
  uid: string;
  hostProfileSnap: FirebaseFirestore.DocumentSnapshot;
  userSnap?: FirebaseFirestore.DocumentSnapshot;
  role: OrganizerHostRole;
}): OrganizerHostProfile {
  const hostProfile = params.hostProfileSnap.exists ?
    params.hostProfileSnap.data() as HostProfileDocument :
    null;
  const user = params.userSnap?.exists ?
    params.userSnap.data() as UserProfileDocument :
    null;
  const displayName =
    nonBlank(hostProfile?.displayName) ??
    (user ? publicDisplayName(user) : null) ??
    "Catch Host";
  const avatarUrl =
    nonBlank(hostProfile?.avatarUrl) ??
    (user ? publicAvatarUrl(user) : null);

  return {
    uid: params.uid,
    displayName,
    avatarUrl,
    role: params.role,
  };
}

/**
 * Builds an owner-owned hostProfiles/{uid} seed from a professional snapshot.
 * @param {OrganizerHostProfile} snapshot Professional display snapshot.
 * @param {FirebaseFirestore.FieldValue} timestamp Server timestamp.
 * @return {Record<string, unknown>} Firestore patch.
 */
export function hostProfileSeedPatch(
  snapshot: OrganizerHostProfile,
  timestamp: FirebaseFirestore.FieldValue
): Record<string, unknown> {
  return {
    displayName: snapshot.displayName,
    avatarUrl: snapshot.avatarUrl,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Returns a trimmed string when a profile field has meaningful display text.
 * @param {string | null | undefined} value Candidate profile text.
 * @return {string | null} Normalized text or null.
 */
function nonBlank(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
