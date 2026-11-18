// The deterministic column mapper every converter shares. A converter only
// overrides the aliases its format uses differently; everything else reads
// the same way for every file.

import type {
  GuestColumnMapping,
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
 * no converter recognised).
 * @return {GuestColumnMapping} Column index per field.
 */
export function suggestGuestMapping(headers: string[],
  converter: GuestListConverter | null): GuestColumnMapping {
  return {
    displayName: findHeader(headers, fullNameAliases),
    phone: findHeader(headers, phoneAliases),
    email: findHeader(headers, emailAliases),
    externalReference: findHeader(headers,
      converter?.externalReferenceAliases ?? genericExternalReferenceAliases),
    arrivalGroup: findHeader(headers,
      converter?.arrivalGroupAliases ?? genericArrivalGroupAliases),
    ticketType: findHeader(headers, ticketTypeAliases),
    status: findHeader(headers, statusAliases),
  };
}

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
