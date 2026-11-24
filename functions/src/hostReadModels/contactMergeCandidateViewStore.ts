import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  HostContactMergeCandidateViewDocument,
  OrganizerContactDocument,
  OrganizerContactEventEdgeDocument,
  OrganizerContactIdentityClaimDocument,
  OrganizerContactIdentityLinkDocument,
  OrganizerContactMergeReviewDecisionDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  mergeCandidateRow,
  organizerContactMergeCandidateId,
  proposedCandidateSeeds,
  verifiedCandidateSeeds,
} from "../organizers/organizerContactMergeReview";

export const hostContactMergeCandidateViewsCollection =
  "hostContactMergeCandidateViews";

/** The most claims, link groups or views one contact's routing reads. */
export const mergeCandidatePartnerScan = 50;

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;
type Reader = Pick<Tx, "get">;

/** A contact that can stand in a duplicate pair, or null. */
function activeContact(snap: FirebaseFirestore.DocumentSnapshot,
  organizerId: string): OrganizerContactDocument | null {
  const contact = snap.data() as OrganizerContactDocument | undefined;
  return contact?.organizerId === organizerId && contact.deletedAt === null &&
    contact.hiddenAt == null && contact.identityState !== "merged" ?
    contact : null;
}

/** Conflicted claims of one organizer that name the contact. */
async function claimsNaming(db: Db, reader: Reader, organizerId: string,
  contactId: string, limit = mergeCandidatePartnerScan) {
  const claims = db.collection("organizerContactIdentityClaims");
  const [verified, conflicting] = await Promise.all([
    reader.get(claims.where("verifiedContactId", "==", contactId)
      .limit(limit)),
    reader.get(claims.where("conflictingContactIds", "array-contains",
      contactId).limit(limit)),
  ]);
  const byId = new Map<string, OrganizerContactIdentityClaimDocument>();
  for (const doc of [...verified.docs, ...conflicting.docs]) {
    const claim = doc.data() as OrganizerContactIdentityClaimDocument;
    if (claim.organizerId === organizerId && claim.state === "conflicted") {
      byId.set(doc.id, claim);
    }
  }
  return [...byId.entries()].map(([id, data]) => ({id, data}));
}

/** One contact's identity links within the organizer. */
async function linksOf(db: Db, reader: Reader, organizerId: string,
  contactId: string) {
  const snap = await reader.get(db.collection("organizerContactIdentityLinks")
    .where("contactId", "==", contactId).limit(mergeCandidatePartnerScan));
  return snap.docs.map((doc) => ({id: doc.id,
    data: doc.data() as OrganizerContactIdentityLinkDocument}))
    .filter((link) => link.data.organizerId === organizerId);
}

/** Every link of the organizer that carries one identity hash. */
async function linksWithHash(db: Db, reader: Reader, organizerId: string,
  identityHash: string) {
  const snap = await reader.get(db.collection("organizerContactIdentityLinks")
    .where("identityHash", "==", identityHash)
    .limit(mergeCandidatePartnerScan));
  return snap.docs.map((doc) => ({id: doc.id,
    data: doc.data() as OrganizerContactIdentityLinkDocument}))
    .filter((link) => link.data.organizerId === organizerId);
}

const proposedKey = (link: OrganizerContactIdentityLinkDocument) =>
  link.confidence === "proposed" &&
    (link.kind === "phone" || link.kind === "email") ?
    `${link.kind}|${link.identityHash}` : null;

/** One contact's event ids within the organizer. */
async function eventsOf(db: Db, reader: Reader, organizerId: string,
  contactId: string): Promise<Set<string>> {
  const snap = await reader.get(db.collection("organizerContactEventEdges")
    .where("contactId", "==", contactId));
  return new Set(snap.docs.map((doc) =>
    doc.data() as OrganizerContactEventEdgeDocument)
    .filter((edge) => edge.organizerId === organizerId &&
      edge.contactId === contactId)
    .map((edge) => edge.eventId));
}

/**
 * One duplicate pair's view, read only: the candidate exactly as
 * listOrganizerContactMergeCandidates returned it, with the reviewing
 * manager's uid in place of the reader-specific canReopen. Null when the
 * pair is no longer a candidate: a contact gone, hidden or merged, or no
 * conflicted claim or proposed phone or email link joins them.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} organizerId The organizer.
 * @param {string[]} contactIds The pair, in any order.
 * @return {Promise<HostContactMergeCandidateViewDocument|null>} The view.
 */
export async function readContactMergeCandidateView(db: Db, tx: Tx,
  organizerId: string, contactIds: readonly string[]):
  Promise<HostContactMergeCandidateViewDocument | null> {
  const pair = [...contactIds].sort() as [string, string];
  const candidateId = organizerContactMergeCandidateId(organizerId, pair);
  const contactsRef = db.collection("organizerContacts");
  const [leftSnap, rightSnap, decisionSnap] = await Promise.all([
    tx.get(contactsRef.doc(pair[0])), tx.get(contactsRef.doc(pair[1])),
    tx.get(db.collection("organizerContactMergeReviewDecisions")
      .doc(candidateId))]);
  const left = activeContact(leftSnap, organizerId);
  const right = activeContact(rightSnap, organizerId);
  if (!left || !right) return null;
  const [claims, leftLinks, rightLinks] = await Promise.all([
    claimsNaming(db, tx, organizerId, pair[0]),
    linksOf(db, tx, organizerId, pair[0]),
    linksOf(db, tx, organizerId, pair[1]),
  ]);
  const rightKeys = new Set(rightLinks.map((link) => proposedKey(link.data))
    .filter((key): key is string => key !== null));
  const sharedHashes = [...new Set(leftLinks
    .filter((link) => rightKeys.has(proposedKey(link.data) ?? ""))
    .map((link) => link.data.identityHash))];
  const groups = await Promise.all(sharedHashes.map((hash) =>
    linksWithHash(db, tx, organizerId, hash)));
  const seeds = [
    ...verifiedCandidateSeeds(organizerId, claims.filter((claim) =>
      [claim.data.verifiedContactId, ...claim.data.conflictingContactIds]
        .includes(pair[1]))),
    ...proposedCandidateSeeds(organizerId, groups.flat()),
  ].filter((seed) => seed.candidateId === candidateId);
  if (seeds.length === 0) return null;
  const seed = seeds[0];
  for (const other of seeds.slice(1)) {
    for (const kind of other.matchKinds) seed.matchKinds.add(kind);
    for (const hash of other.identityHashes) seed.identityHashes.add(hash);
    if (other.confidence === "verified") seed.confidence = "verified";
    seed.updatedAtMillis = Math.max(seed.updatedAtMillis,
      other.updatedAtMillis);
  }
  const [leftEvents, rightEvents] = await Promise.all([
    eventsOf(db, tx, organizerId, pair[0]),
    eventsOf(db, tx, organizerId, pair[1])]);
  const decision = decisionSnap.data() as
    OrganizerContactMergeReviewDecisionDocument | undefined;
  const row = mergeCandidateRow({
    organizerId,
    seed,
    contacts: new Map([[pair[0], left], [pair[1], right]]),
    events: new Map([[pair[0], leftEvents], [pair[1], rightEvents]]),
    supportingLinks: [...leftLinks, ...rightLinks].map((link) => link.data),
    decision,
  });
  return {organizerId, contactIds: pair, ...row,
    reviewedByUid: row.decisionState === "differentPeople" ?
      decision?.reviewedByUid ?? null : null,
    version: 1};
}

/**
 * Rewrites one pair's view inside a transaction, writing only on change and
 * deleting it when the pair is no longer a candidate. A source that fails
 * its contract is logged and keeps the previous view.
 * @param {Db} db Firestore.
 * @param {string} organizerId The organizer.
 * @param {string[]} contactIds The pair.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export async function reconcileContactMergeCandidateView(db: Db,
  organizerId: string, contactIds: readonly string[]): Promise<void> {
  if (contactIds.length !== 2 || contactIds[0] === contactIds[1]) return;
  const candidateId = organizerContactMergeCandidateId(organizerId,
    contactIds);
  await db.runTransaction(async (tx) => {
    const ref = db.collection(hostContactMergeCandidateViewsCollection)
      .doc(candidateId);
    const old = await tx.get(ref);
    let next: HostContactMergeCandidateViewDocument | null;
    try {
      next = await readContactMergeCandidateView(db, tx, organizerId,
        contactIds);
    } catch (error) {
      logger.warn("Duplicate candidate view kept a source that fails its " +
        "contract.", {candidateId,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/**
 * The contacts that may stand in a pair with one contact: those a
 * conflicted claim names with it, those sharing one of its proposed phone or
 * email links, and those its current candidate views name. With
 * [viewsOnly], only the last: a change that cannot make a new pair.
 * @param {Db} db Firestore.
 * @param {string} organizerId The organizer.
 * @param {string} contactId The contact.
 * @param {boolean} viewsOnly Whether to read only current views.
 * @return {Promise<string[]>} The partner contact ids.
 */
export async function mergeCandidatePartners(db: Db, organizerId: string,
  contactId: string, viewsOnly = false): Promise<string[]> {
  const partners = new Set<string>(viewsOnly ? [] :
    await mergeCandidateSourcePartners(db, organizerId, contactId));
  const views = await db.collection(hostContactMergeCandidateViewsCollection)
    .where("contactIds", "array-contains", contactId)
    .limit(mergeCandidatePartnerScan).get();
  for (const doc of views.docs) {
    const view = doc.data() as HostContactMergeCandidateViewDocument;
    if (view.organizerId !== organizerId) continue;
    for (const id of view.contactIds) partners.add(id);
  }
  partners.delete(contactId);
  return [...partners].sort();
}

/**
 * The contacts a conflicted claim names with one contact, or that share one
 * of its proposed phone or email links: every pair it can start from its
 * sources, whatever views exist.
 * @param {Db} db Firestore.
 * @param {string} organizerId The organizer.
 * @param {string} contactId The contact.
 * @return {Promise<string[]>} The partner contact ids, sorted.
 */
export async function mergeCandidateSourcePartners(db: Db,
  organizerId: string, contactId: string): Promise<string[]> {
  const reader: Reader = {get: ((ref: FirebaseFirestore.Query) =>
    ref.get()) as Tx["get"]};
  const partners = new Set<string>();
  for (const claim of await claimsNaming(db, reader, organizerId,
    contactId)) {
    partners.add(claim.data.verifiedContactId);
    for (const id of claim.data.conflictingContactIds) partners.add(id);
  }
  const keys = new Map<string, string>();
  for (const link of await linksOf(db, reader, organizerId, contactId)) {
    const key = proposedKey(link.data);
    if (key) keys.set(key, link.data.identityHash);
  }
  for (const [key, hash] of keys) {
    for (const link of await linksWithHash(db, reader, organizerId, hash)) {
      if (proposedKey(link.data) === key) partners.add(link.data.contactId);
    }
  }
  partners.delete(contactId);
  return [...partners].sort();
}

/** The view id of a pair, the candidate id the callables use. */
export const organizerContactMergeCandidateViewId =
  organizerContactMergeCandidateId;

/**
 * Rewrites every pair one contact may stand in.
 * @param {Db} db Firestore.
 * @param {string} organizerId The organizer.
 * @param {string} contactId The contact.
 * @param {boolean} viewsOnly Whether only its current views can change.
 * @return {Promise<void>} Resolves once each pair's view matches.
 */
export async function reconcileContactMergeCandidates(db: Db,
  organizerId: string, contactId: string, viewsOnly = false): Promise<void> {
  for (const partner of await mergeCandidatePartners(db, organizerId,
    contactId, viewsOnly)) {
    await reconcileContactMergeCandidateView(db, organizerId,
      [contactId, partner]);
  }
}
