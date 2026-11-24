/**
 * Organiser access grants (issue #2474 step 3): one
 * accessGrants/organizer__{organizerId}__{uid} document per organiser owner
 * and manager. It is the one definition of "organiser manager": security
 * rules get() it, and requireOrganizerManager, the analytics and payout
 * checks read it. Every command that changes an organiser's owner or
 * managers stages it on the transaction that changes the organiser's
 * hostUserId, ownerUserId and hostUserIds fields and its team edges, which
 * stay as copies for released Host builds' organizer queries.
 */

import type {
  AccessGrantDocument,
  OrganizerDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {
  organizerManagerUserIds,
  organizerOwnerUserId,
} from "../../shared/organizerHosts";
import {
  accessGrantId,
  accessGrantsCollection,
  type AccessGrantWriter,
} from "./programAccessGrants";

export type OrganizerAccessRole = "owner" | "manager";

/** The organiser access document's id. */
export function organizerAccessGrantId(organizerId: string, uid: string):
  string {
  return accessGrantId("organizer", organizerId, uid);
}

/**
 * The access document for one organiser owner or manager. It never
 * expires: removal deletes it.
 * @param {object} params The grant.
 * @param {string} params.organizerId The organiser.
 * @param {string} params.uid The account.
 * @param {OrganizerAccessRole} params.role owner or manager.
 * @param {string|null} params.grantedBy Who made the change; null for a
 *   system or migration write.
 * @param {FirebaseFirestore.Timestamp} params.updatedAt When it commits.
 * @return {AccessGrantDocument} The document.
 */
export function organizerAccessGrant(params: {
  organizerId: string;
  uid: string;
  role: OrganizerAccessRole;
  grantedBy: string | null;
  updatedAt: FirebaseFirestore.Timestamp;
}): AccessGrantDocument {
  return {
    scopeType: "organizer",
    scopeId: params.organizerId,
    uid: params.uid,
    organizerId: params.organizerId,
    role: params.role,
    status: "active",
    activeFromMillis: 0,
    expiresAtMillis: null,
    reach: {},
    assignments: [],
    grantedBy: params.grantedBy,
    revision: 0,
    updatedAt: params.updatedAt,
    version: 1,
  };
}

/**
 * The organiser's access holders from its manager fields, as the fields read
 * once the command commits: the owner (organizerOwnerUserId: ownerUserId,
 * else the legacy hostUserId) as owner, every other id
 * organizerManagerUserIds names as manager. These are the same helpers
 * isOrganizerManager and isOrganizerOwner use, so the access documents, the
 * callables and the rules share one definition of organiser manager.
 * @param {object} organizer The organiser's manager fields.
 * @return {Map<string, OrganizerAccessRole>} uid to role.
 */
export function organizerAccessHolders(organizer: {
  hostUserId?: string | null;
  ownerUserId?: string | null;
  hostUserIds?: string[] | null;
} | undefined | null): Map<string, OrganizerAccessRole> {
  const holders = new Map<string, OrganizerAccessRole>();
  if (!organizer) return holders;
  const fields = organizer as unknown as OrganizerDocument;
  const owner = organizerOwnerUserId(fields);
  for (const uid of organizerManagerUserIds(fields)) {
    holders.set(uid, uid === owner ? "owner" : "manager");
  }
  return holders;
}

/**
 * Stages the organiser's access documents on the caller's transaction or
 * batch so they match its manager fields after the command: set for every
 * holder (idempotent, so a holder written before these writers existed is
 * repaired too), deleted for everyone who held access before and holds none
 * now. Call it after every read, with the fields as
 * they were read and as they will be written.
 * @param {AccessGrantWriter} writer The caller's transaction or batch.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} params The change.
 * @param {string} params.organizerId The organiser.
 * @param {object|null} params.before The manager fields as read, or null for
 *   a new organiser.
 * @param {object|null} params.after The manager fields as written, or null
 *   when the organiser is deleted.
 * @param {string|null} params.grantedBy Who made the change.
 * @param {FirebaseFirestore.Timestamp} params.updatedAt When it commits.
 */
export function stageOrganizerAccessGrants(writer: AccessGrantWriter,
  db: FirebaseFirestore.Firestore, params: {
    organizerId: string;
    before: Parameters<typeof organizerAccessHolders>[0];
    after: Parameters<typeof organizerAccessHolders>[0];
    grantedBy: string | null;
    updatedAt: FirebaseFirestore.Timestamp;
  }): void {
  const before = organizerAccessHolders(params.before);
  const after = organizerAccessHolders(params.after);
  const tx = writer as FirebaseFirestore.Transaction;
  const ref = (uid: string) => db.collection(accessGrantsCollection)
    .doc(organizerAccessGrantId(params.organizerId, uid));
  for (const [uid, role] of after) {
    tx.set(ref(uid), organizerAccessGrant({organizerId: params.organizerId,
      uid, role, grantedBy: params.grantedBy, updatedAt: params.updatedAt}));
  }
  for (const uid of before.keys()) {
    if (!after.has(uid)) tx.delete(ref(uid));
  }
}

/**
 * Reads one account's organiser access document, inside the caller's
 * transaction when it has one.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} organizerId The organiser.
 * @param {string} uid The account.
 * @param {FirebaseFirestore.Transaction} transaction Optional transaction.
 * @return {Promise<OrganizerAccessRole|null>} The live role, or null.
 */
export async function readOrganizerAccessRole(
  db: FirebaseFirestore.Firestore, organizerId: string, uid: string,
  transaction?: FirebaseFirestore.Transaction):
  Promise<OrganizerAccessRole | null> {
  const ref = db.collection(accessGrantsCollection)
    .doc(organizerAccessGrantId(organizerId, uid));
  const snap = transaction ? await transaction.get(ref) : await ref.get();
  const data = snap.data() as AccessGrantDocument | undefined;
  if (!data || data.scopeType !== "organizer" ||
      data.scopeId !== organizerId || data.uid !== uid ||
      data.status !== "active") return null;
  return data.role === "owner" || data.role === "manager" ? data.role : null;
}
