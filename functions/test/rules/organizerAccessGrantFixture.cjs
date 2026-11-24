// Organiser access grants for the rules specs (#2474 step 3). Every command
// that writes an organiser's hostUserId, ownerUserId or hostUserIds writes
// accessGrants/organizer__{organizerId}__{uid} for each holder in the same
// transaction, and the rules decide from those documents. Seeding an
// organiser through this helper keeps the specs to that invariant, with the
// same mapping as functions/src/domain/access/organizerAccessGrants.ts.
const {collection, deleteDoc, doc, getDocs, query, setDoc, where} =
  require("firebase/firestore");

/**
 * uid to role for an organiser's manager fields: the owner (ownerUserId,
 * else hostUserId) as owner, every other id as manager.
 * @param {object} organizer The organiser fixture.
 * @return {Map<string, string>} The holders.
 */
function organizerAccessHolders(organizer) {
  const holders = new Map();
  if (!organizer) return holders;
  const owner = organizer.ownerUserId ?? organizer.hostUserId ?? null;
  for (const uid of [organizer.hostUserId, organizer.ownerUserId,
    ...(Array.isArray(organizer.hostUserIds) ? organizer.hostUserIds : [])]) {
    if (typeof uid === "string" && uid.length > 0) {
      holders.set(uid, uid === owner ? "owner" : "manager");
    }
  }
  return holders;
}

/**
 * The access document for one holder.
 * @param {string} organizerId The organiser.
 * @param {string} uid The holder.
 * @param {string} role owner or manager.
 * @return {object} The accessGrants document.
 */
function organizerAccessGrant(organizerId, uid, role) {
  return {scopeType: "organizer", scopeId: organizerId, uid, organizerId,
    role, status: "active", activeFromMillis: 0, expiresAtMillis: null,
    reach: {}, assignments: [], grantedBy: null, revision: 0,
    updatedAt: new Date(), version: 1};
}

/**
 * Writes an organiser and replaces its access documents, inside a
 * rules-disabled context's Firestore.
 * @param {object} firestore A rules-disabled Firestore.
 * @param {string} organizerId The organiser.
 * @param {object} organizer The organiser document.
 */
async function writeOrganizerWithAccess(firestore, organizerId, organizer) {
  await setDoc(doc(firestore, "organizers", organizerId), organizer);
  const existing = await getDocs(query(collection(firestore, "accessGrants"),
    where("scopeType", "==", "organizer"),
    where("scopeId", "==", organizerId)));
  const holders = organizerAccessHolders(organizer);
  for (const snap of existing.docs) {
    if (!holders.has(snap.data().uid)) await deleteDoc(snap.ref);
  }
  for (const [uid, role] of holders) {
    await setDoc(doc(firestore, "accessGrants",
      `organizer__${organizerId}__${uid}`),
    organizerAccessGrant(organizerId, uid, role));
  }
}

module.exports = {
  organizerAccessGrant,
  organizerAccessHolders,
  writeOrganizerWithAccess,
};
