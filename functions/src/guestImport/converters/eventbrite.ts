import type {GuestListConverter} from "../canonical";
import {orderArrivalGroupAliases, fullNameAliases} from "../mapping";
import {findHeader, valueAt, type GuestTable} from "../table";

/**
 * An Eventbrite attendee report. One order can hold several attendees, so
 * the attendee id is the reference and the order id groups arrivals.
 */
export const eventbriteConverter: GuestListConverter = {
  id: "eventbrite-v1",
  provider: "eventbrite",
  signature: ["firstname", "lastname", "orderid", "tickettype",
    "attendeestatus"],
  externalReferenceAliases: new Set(["attendeeid", "ticketid", "ticketkey",
    "id"]),
  arrivalGroupAliases: orderArrivalGroupAliases(),
  normalizeTable: joinFirstAndLastName,
};

/** Adds a "Guest name" column when the report has only first and last. */
export function joinFirstAndLastName(table: GuestTable): GuestTable {
  if (findHeader(table.headers, fullNameAliases) !== null) return table;
  const firstName = findHeader(table.headers, new Set(["firstname"]));
  const lastName = findHeader(table.headers, new Set(["lastname"]));
  if (firstName === null && lastName === null) return table;
  return {
    headers: [...table.headers, "Guest name"],
    rows: table.rows.map((row) => [
      ...row,
      [valueAt(row, firstName), valueAt(row, lastName)]
        .filter((value) => value.length > 0)
        .join(" "),
    ]),
  };
}
