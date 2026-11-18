import {createHash} from "node:crypto";
import {FieldPath} from "firebase-admin/firestore";
import {normalizeRosterPhone} from "../../events/eventAttendees";
import {hashedEmail, hashedPhone} from "../adConversions/hostConversions";

/**
 * Ad-matching opt-outs (docs/ads_conversion_spec.md, Ad-matching notice and
 * opt-out). One record per opted-out identifier, keyed by a domain-separated
 * hash of the same digest the ad platforms receive, so the conversion queue
 * and the customer-list job can check a record from the digests they already
 * hold. Raw phone numbers and emails are never stored.
 */
export const AD_MATCHING_OPT_OUTS = "adMatchingOptOuts";

export type AdMatchingIdentifierKind = "phone" | "email";

export interface AdMatchingDigests {
  /** SHA-256 of the E.164 phone (`hashedPhone`). */
  phoneSha256?: string | null;
  /** SHA-256 of the trimmed, lowercased email (`hashedEmail`). */
  emailSha256?: string | null;
}

export interface AdMatchingKey {
  kind: AdMatchingIdentifierKind;
  optOutId: string;
}

const DIGEST = /^[a-f0-9]{64}$/u;

/**
 * The opt-out document ID for one platform digest. The prefix and kind keep
 * the ID distinct from the digest itself and from any other hashed key.
 * @param {AdMatchingIdentifierKind} kind Identifier kind.
 * @param {string} digest Platform digest of the normalised identifier.
 * @return {string} Document ID.
 */
export function adMatchingOptOutId(kind: AdMatchingIdentifierKind,
  digest: string): string {
  return createHash("sha256")
    .update(`catch-ad-matching-opt-out-v1:${kind}:${digest}`, "utf8")
    .digest("hex");
}

/**
 * The opt-out keys for the digests a record carries.
 * @param {AdMatchingDigests} digests Phone and email digests.
 * @return {AdMatchingKey[]} Keys, phone first.
 */
export function adMatchingKeys(digests: AdMatchingDigests): AdMatchingKey[] {
  const keys: AdMatchingKey[] = [];
  if (digests.phoneSha256 && DIGEST.test(digests.phoneSha256)) {
    keys.push({kind: "phone",
      optOutId: adMatchingOptOutId("phone", digests.phoneSha256)});
  }
  if (digests.emailSha256 && DIGEST.test(digests.emailSha256)) {
    keys.push({kind: "email",
      optOutId: adMatchingOptOutId("email", digests.emailSha256)});
  }
  return keys;
}

/**
 * Digests for contact details typed by staff: a phone with or without its
 * country code (a ten-digit number is Indian) and an email. Each is null
 * when absent or not a complete identifier.
 * @param {object} contact Raw phone and email.
 * @return {AdMatchingDigests} Digests.
 */
export function adMatchingDigestsFromContact(contact: {
  phone: string | null; email: string | null;
}): {phoneSha256: string | null; emailSha256: string | null} {
  const phone = contact.phone ?
    normalizeRosterPhone(contact.phone).value : null;
  return {
    phoneSha256: hashedPhone(phone),
    emailSha256: contact.email ? hashedEmail(contact.email) : null,
  };
}

/**
 * Every identifier a host can be known by: the account's phone and email,
 * and the organizer's own email. A host who opts out with any of them is
 * opted out, whichever key a record or list row would carry.
 * @param {object|undefined} owner Owner's user document.
 * @param {object|undefined} organizer Organizer document.
 * @return {AdMatchingDigests[]} Digest sets to check.
 */
export function hostContactDigests(owner: Record<string, unknown> | undefined,
  organizer: Record<string, unknown> | undefined): AdMatchingDigests[] {
  return [
    {phoneSha256: hashedPhone(owner?.phoneNumber),
      emailSha256: hashedEmail(owner?.email)},
    {emailSha256: hashedEmail(organizer?.email)},
  ];
}

const isActive = (data: Record<string, unknown> | undefined) =>
  data?.status === "active";

/**
 * Whether any identifier in the digests is opted out.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {AdMatchingDigests} digests Phone and email digests.
 * @return {Promise<boolean>} True when at least one is opted out.
 */
export async function isAdMatchingOptedOut(db: FirebaseFirestore.Firestore,
  digests: AdMatchingDigests): Promise<boolean> {
  for (const key of adMatchingKeys(digests)) {
    const snap = await db.collection(AD_MATCHING_OPT_OUTS)
      .doc(key.optOutId).get();
    if (isActive(snap.data())) return true;
  }
  return false;
}

/**
 * Whether any identifier in any of the digest sets is opted out.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {AdMatchingDigests[]} sets Digest sets.
 * @return {Promise<boolean>} True when at least one is opted out.
 */
export async function anyAdMatchingOptedOut(db: FirebaseFirestore.Firestore,
  sets: AdMatchingDigests[]): Promise<boolean> {
  for (const digests of sets) {
    if (await isAdMatchingOptedOut(db, digests)) return true;
  }
  return false;
}

const PAGE = 500;

/**
 * Every active opt-out ID, for jobs that check many people at once.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @return {Promise<Set<string>>} Active opt-out document IDs.
 */
export async function activeAdMatchingOptOutIds(
  db: FirebaseFirestore.Firestore): Promise<Set<string>> {
  const ids = new Set<string>();
  let after: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let query = db.collection(AD_MATCHING_OPT_OUTS)
      .where("status", "==", "active")
      .orderBy(FieldPath.documentId())
      .limit(PAGE);
    if (after) query = query.startAfter(after);
    const page = await query.get();
    for (const doc of page.docs) ids.add(doc.id);
    if (page.docs.length < PAGE) return ids;
    after = page.docs[page.docs.length - 1];
  }
}

/**
 * Whether any identifier is in a set of active opt-out IDs.
 * @param {Set<string>} optedOut Active opt-out IDs.
 * @param {AdMatchingDigests} digests Phone and email digests.
 * @return {boolean} True when at least one is opted out.
 */
export function inAdMatchingOptOuts(optedOut: Set<string>,
  digests: AdMatchingDigests): boolean {
  return adMatchingKeys(digests).some((key) => optedOut.has(key.optOutId));
}
