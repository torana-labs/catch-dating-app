/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One booking made at a member price, keyed {eventId}_{uid}. Source of the member's savings total and of the upcoming member-priced booking cap. Readable by the member only.
 */
export interface HostMembershipBenefitUseDocument {
  schemaVersion: 1;
  membershipId: string;
  organizerId: string;
  uid: string;
  eventId: string;
  planId: string;
  listPriceInPaise: number;
  paidPriceInPaise: number;
  savingsInPaise: number;
  eventStartMillis: number;
  state: "booked" | "released";
  createdAtMillis: number;
}
