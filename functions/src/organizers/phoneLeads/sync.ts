/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {listingSuppressionHmacKey} from "../../listingSuppressions/registry";
import {anySourceEnabled, type PhoneLeadSource, type ShadowProfilePolicy} from "./policy";
import {applyPhoneLeadChange, phoneLeadId, type PhoneLeadWriter} from "./store";
import {isStaleSourceEvent, sourceVersionOf, type SourceVersion} from "../../shared/sourceVersion";

// The index is fed from the records phones already arrive in, so no front
// door changes: a trigger reads the record before and after each write and
// moves that record's entries. Each trigger returns at once while every
// source is off.

type Data = FirebaseFirestore.DocumentData | undefined;

export interface PhoneObservation {
  organizerId: string;
  source: PhoneLeadSource;
  phones: string[];
}

/**
 * Phones a sales contact relationship holds for its organizer: verified
 * endpoints as sales_crm_verified, the rest as staff_entered.
 * @return {PhoneObservation[]} One observation per source.
 */
export function salesRelationshipPhones(data: Data): PhoneObservation[] {
  const organizerId = typeof data?.organizerId === "string" ? data.organizerId : null;
  if (!organizerId) return [];
  const endpoints = Array.isArray(data?.endpoints) ? data.endpoints : [];
  const phones = (verified: boolean) => endpoints
    .filter((item: Record<string, unknown>) => item?.kind === "phone" &&
      (item.verificationStatus === "verified") === verified)
    .map((item: Record<string, unknown>) => String(item.value ?? ""));
  return [
    {organizerId, source: "sales_crm_verified", phones: phones(true)},
    {organizerId, source: "staff_entered", phones: phones(false)},
  ];
}

/**
 * Applies the difference between two views of one record.
 * @return {Promise<number>} Lead documents written.
 */
export async function syncObservations(db: FirebaseFirestore.Firestore,
  before: PhoneObservation[], after: PhoneObservation[], now: Date,
  options: {hash?: (phone: string) => Promise<string | null>;
    policy?: ShadowProfilePolicy; writer?: PhoneLeadWriter} = {}
): Promise<number> {
  const hash = options.hash ?? ((phone: string) => phoneLeadId(phone));
  const keyOf = (item: PhoneObservation) => `${item.source}\u0000${item.organizerId}`;
  const groups = new Map<string, {organizerId: string; source: PhoneLeadSource;
    before: string[]; after: string[]}>();
  for (const [side, list] of [["before", before], ["after", after]] as const) {
    for (const item of list) {
      const group = groups.get(keyOf(item)) ??
        {organizerId: item.organizerId, source: item.source, before: [], after: []};
      for (const phone of item.phones) {
        const id = await hash(phone);
        if (id) group[side].push(id);
      }
      groups.set(keyOf(item), group);
    }
  }
  let writes = 0;
  for (const group of groups.values()) {
    writes += await applyPhoneLeadChange(db, {organizerId: group.organizerId,
      source: group.source, now, policy: options.policy, writer: options.writer,
      change: {add: group.after, remove: group.before.filter((id) => !group.after.includes(id))}});
  }
  return writes;
}

/**
 * The trigger path (#2472): re-reads the relationship inside the transaction
 * that writes the leads and adds the phones it holds now, not the event's.
 * The event's before phones that it no longer holds are removed. An event
 * older than the relationship's current version is skipped, so deliveries in
 * any order end at its latest phones.
 * @return {Promise<number | "stale">} Lead documents written, or stale.
 */
export async function syncRelationshipFromStore(db: FirebaseFirestore.Firestore,
  relationshipId: string, before: Data, eventVersion: SourceVersion | undefined, now: Date,
  options: {hash?: (phone: string) => Promise<string | null>;
    policy?: ShadowProfilePolicy} = {}): Promise<number | "stale"> {
  const ref = db.collection("salesContactRelationships").doc(relationshipId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (isStaleSourceEvent(snap, eventVersion)) return "stale";
    return syncObservations(db, salesRelationshipPhones(before),
      salesRelationshipPhones(snap.exists ? snap.data() : undefined), now,
      {...options, writer: tx});
  });
}

// Retried: lead writes are merges of the re-read relationship, so a rerun
// lands on the same entries. A failure is logged (counts only) and rethrown.
export const onSalesRelationshipPhoneLeads = onDocumentWritten({
  document: "salesContactRelationships/{relationshipId}",
  secrets: [listingSuppressionHmacKey],
  retry: true,
}, async (event) => {
  if (!anySourceEnabled()) return;
  try {
    const writes = await syncRelationshipFromStore(admin.firestore(),
      event.params.relationshipId, event.data?.before.data(),
      sourceVersionOf(event.data?.after), new Date());
    if (writes !== "stale" && writes > 0) logger.info("Phone leads updated.", {from: "sales", writes});
  } catch (error) {
    // Counts only: never the phone or the lead id.
    logger.error("Phone lead update failed.", {from: "sales",
      error: error instanceof Error ? error.message : String(error)});
    throw error;
  }
});
