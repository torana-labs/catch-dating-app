/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {listingSuppressionHmacKey} from "../../listingSuppressions/registry";
import {anySourceEnabled, type PhoneLeadSource, type ShadowProfilePolicy} from "./policy";
import {applyPhoneLeadChange, phoneLeadId} from "./store";

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
    policy?: ShadowProfilePolicy} = {}
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
      source: group.source, now, policy: options.policy,
      change: {add: group.after, remove: group.before.filter((id) => !group.after.includes(id))}});
  }
  return writes;
}

async function syncLogged(label: string, before: PhoneObservation[],
  after: PhoneObservation[]): Promise<void> {
  try {
    const writes = await syncObservations(admin.firestore(), before, after, new Date());
    if (writes > 0) logger.info("Phone leads updated.", {from: label, writes});
  } catch (error) {
    // Counts only: never the phone or the lead id.
    logger.error("Phone lead update failed.", {from: label,
      error: error instanceof Error ? error.message : String(error)});
  }
}

export const onSalesRelationshipPhoneLeads = onDocumentWritten({
  document: "salesContactRelationships/{relationshipId}",
  secrets: [listingSuppressionHmacKey],
}, async (event) => {
  if (!anySourceEnabled()) return;
  await syncLogged("sales", salesRelationshipPhones(event.data?.before.data()),
    salesRelationshipPhones(event.data?.after.data()));
});
