/* eslint-disable max-len */
import {FieldValue} from "firebase-admin/firestore";
import {
  listingSuppressionSecret,
  suppressionModule,
} from "../../listingSuppressions/registry";
import {
  SHADOW_PROFILE_POLICY,
  SOURCE_STRENGTH,
  sourceEnabled,
  type PhoneLeadSource,
  type ShadowProfilePolicy,
} from "./policy";

// organizerPhoneLeads/{leadId}: server-only. The id is a keyed hash of one
// E.164 phone number; no document holds the number itself. Each entry names
// one organizer the number was seen with and the source that saw it.
//
// The key is the do-not-list key (LISTING_SUPPRESSION_HMAC_KEY) under its own
// "phone-lead:" namespace, so no new secret has to exist before a deploy and
// no lead id can equal a do-not-list hash.

export const ORGANIZER_PHONE_LEADS = "organizerPhoneLeads";
const PHONE = /^\+[1-9][0-9]{7,14}$/u;

export interface PhoneLeadEntry {
  organizerId: string;
  source: PhoneLeadSource;
  strength: "strong" | "medium" | "weak";
  lastSeenAt: string;
}

/**
 * A phone as stored in E.164, or null when it cannot be one. Spaces, dashes,
 * dots and brackets are dropped; a leading 00 becomes +.
 * @return {string | null} The E.164 number.
 */
export function e164(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let compact = value.trim().replace(/[\s().-]/gu, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  return PHONE.test(compact) ? compact : null;
}

/**
 * The lead document id for [phone], or null when the key is missing or the
 * phone is not E.164.
 * @return {Promise<string | null>} The keyed hash.
 */
export async function phoneLeadId(phone: unknown,
  secret: string = listingSuppressionSecret()): Promise<string | null> {
  const number = e164(phone);
  if (!number) return null;
  const module = await suppressionModule();
  if (!module.usableSuppressionSecret(secret)) return null;
  return module.suppressionHashes(secret, [`phone-lead:${number}`])[0] ?? null;
}

/** The map key of one entry: one organizer per source. */
export function entryKey(organizerId: string, source: PhoneLeadSource): string {
  return `${source}__${organizerId}`;
}

export interface PhoneLeadChange {
  /** Lead ids whose entry for this organizer and source should exist. */
  add: string[];
  /** Lead ids whose entry for this organizer and source should go. */
  remove: string[];
}

/** Where lead writes go: a batch it commits, or the caller's transaction. */
export interface PhoneLeadWriter {
  set(ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData,
    options: FirebaseFirestore.SetOptions): unknown;
}

/**
 * Writes one source's view of an organizer's numbers: entries for [add],
 * none for [remove]. Write-only (merge), so it is safe to call again.
 * Does nothing while the source is off. Given a writer (a transaction), it
 * queues the writes there and the caller commits them.
 * @return {Promise<number>} Documents written.
 */
export async function applyPhoneLeadChange(db: FirebaseFirestore.Firestore,
  params: {organizerId: string; source: PhoneLeadSource; change: PhoneLeadChange;
    now: Date; policy?: ShadowProfilePolicy; writer?: PhoneLeadWriter}): Promise<number> {
  if (!sourceEnabled(params.source, params.policy ?? SHADOW_PROFILE_POLICY)) return 0;
  const key = entryKey(params.organizerId, params.source);
  const entry: PhoneLeadEntry = {organizerId: params.organizerId, source: params.source,
    strength: SOURCE_STRENGTH[params.source], lastSeenAt: params.now.toISOString()};
  const batch = params.writer ? null : db.batch();
  const writer: PhoneLeadWriter = params.writer ?? batch!;
  let writes = 0;
  for (const leadId of new Set(params.change.add)) {
    writer.set(db.collection(ORGANIZER_PHONE_LEADS).doc(leadId),
      {schemaVersion: 1, updatedAt: entry.lastSeenAt, entries: {[key]: entry}}, {merge: true});
    writes += 1;
  }
  for (const leadId of new Set(params.change.remove)) {
    if (params.change.add.includes(leadId)) continue;
    writer.set(db.collection(ORGANIZER_PHONE_LEADS).doc(leadId),
      {schemaVersion: 1, updatedAt: entry.lastSeenAt, entries: {[key]: FieldValue.delete()}}, {merge: true});
    writes += 1;
  }
  if (batch && writes > 0) await batch.commit();
  return writes;
}

/**
 * The entries a lead document holds for sources that are on.
 * @return {PhoneLeadEntry[]} Entries, strongest first.
 */
export function enabledEntries(data: FirebaseFirestore.DocumentData | undefined,
  policy: ShadowProfilePolicy = SHADOW_PROFILE_POLICY): PhoneLeadEntry[] {
  const entries = data && typeof data.entries === "object" && data.entries ?
    Object.values(data.entries as Record<string, unknown>) : [];
  const rank = {strong: 0, medium: 1, weak: 2};
  return entries.filter((value): value is PhoneLeadEntry => {
    const entry = value as Partial<PhoneLeadEntry> | null;
    return !!entry && typeof entry.organizerId === "string" &&
      typeof entry.source === "string" && entry.source in SOURCE_STRENGTH &&
      sourceEnabled(entry.source as PhoneLeadSource, policy);
  }).sort((a, b) => rank[a.strength] - rank[b.strength]);
}
