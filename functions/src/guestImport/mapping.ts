// The deterministic column mapper every converter shares. A converter only
// overrides the aliases its format uses differently; everything else reads
// the same way for every file.

import type {
  GuestColumnMapping,
  GuestField,
  GuestListConverter,
  GuestStatus,
} from "./canonical";
import {findHeader, normalizeHeader} from "./table";

export const fullNameAliases: ReadonlySet<string> = new Set([
  "name",
  "fullname",
  "guestname",
  "attendeename",
  "participantname",
  "ticketbuyer",
  "ticketbuyername",
  "buyername",
  "customername",
]);

const phoneAliases: ReadonlySet<string> = new Set([
  "phone", "phonenumber", "mobile", "mobilenumber", "contactnumber",
  "whatsapp", "phonee164", "guestphone",
]);

const emailAliases: ReadonlySet<string> = new Set([
  "email", "emailaddress", "guestemail", "attendeeemail",
]);

const ticketTypeAliases: ReadonlySet<string> = new Set([
  "ticket", "tickettype", "category", "pass", "ticketname",
]);

const statusAliases: ReadonlySet<string> = new Set([
  "status", "registrationstatus", "bookingstatus", "rsvpstatus",
  "approvalstatus", "attendeestatus", "checkinstatus",
]);

/** A file no converter recognised may use any reference-like column. */
const genericExternalReferenceAliases: ReadonlySet<string> = new Set([
  "id", "reference", "bookingid", "orderid", "ticketid", "guestkey",
  "ticketkey", "attendeeid", "order", "ordernumber",
]);

const commonArrivalGroupAliases = [
  "arrivalgroup", "groupid", "partyid", "bookinggroup", "buyeremail",
  "ticketbuyeremail",
];

/** Booking fields shared by formats with no order column of their own. */
export const genericArrivalGroupAliases: ReadonlySet<string> =
  new Set(commonArrivalGroupAliases);

/** Order-based formats group the guests on one order. */
export function orderArrivalGroupAliases(): ReadonlySet<string> {
  return new Set([
    "orderid", "ordernumber", "order", "bookingid",
    ...commonArrivalGroupAliases,
  ]);
}

/**
 * Maps the table's columns to guest fields for [converter] (null for a file
 * no converter recognised). A converter's own aliases are tried first, then
 * the shared ones, then (for form exports) words in the question text.
 * @return {GuestColumnMapping} Column index per field.
 */
export function suggestGuestMapping(headers: string[],
  converter: GuestListConverter | null): GuestColumnMapping {
  const shared: Record<GuestField, ReadonlySet<string>> = {
    displayName: fullNameAliases,
    phone: phoneAliases,
    email: emailAliases,
    externalReference: converter?.externalReferenceAliases ??
      genericExternalReferenceAliases,
    arrivalGroup: converter?.arrivalGroupAliases ??
      genericArrivalGroupAliases,
    ticketType: ticketTypeAliases,
    status: statusAliases,
  };
  const mapping = {} as GuestColumnMapping;
  for (const field of guestFields) {
    const own = converter?.aliases?.[field];
    mapping[field] = (own ? findHeader(headers, own) : null) ??
      findHeader(headers, shared[field]);
  }
  const words = converter?.questionWords;
  if (!words) return mapping;
  const used = new Set(Object.values(mapping)
    .filter((index): index is number => index !== null));
  for (const field of guestFields) {
    const fieldWords = words[field];
    if (mapping[field] !== null || !fieldWords) continue;
    const index = headers.findIndex((header, column) => {
      if (used.has(column)) return false;
      const normalized = normalizeHeader(header);
      return fieldWords.some((word) => normalized.includes(word)) &&
        !(field === "displayName" && nameStopWords.some((word) =>
          normalized.includes(word)));
    });
    if (index >= 0) {
      mapping[field] = index;
      used.add(index);
    }
  }
  return mapping;
}

/** Mapping order. Earlier fields claim a question column first. */
export const guestFields: readonly GuestField[] = ["displayName", "phone",
  "email", "externalReference", "arrivalGroup", "ticketType", "status"];

/** A question about someone else's name, or a brand, is not the guest's. */
const nameStopWords = ["company", "brand", "business", "organisation",
  "organization", "event", "user", "instagram", "handle", "college",
  "school", "friend", "referr", "emergency", "team"];

/** Reads a status cell. Anything unrecognised counts as registered. */
export function rosterStatus(value: string | null): GuestStatus {
  const normalized = normalizeHeader(value ?? "");
  if (["waitlist", "waitlisted", "waiting"].includes(normalized)) {
    return "waitlisted";
  }
  if (["invited", "invite", "pending"].includes(normalized)) {
    return "invited";
  }
  return "registered";
}
