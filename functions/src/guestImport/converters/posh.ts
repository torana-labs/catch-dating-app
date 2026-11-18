import type {GuestListConverter} from "../canonical";
import {orderArrivalGroupAliases} from "../mapping";

/** A Posh order export. Orders group the guests who bought together. */
export const poshConverter: GuestListConverter = {
  id: "posh-v1",
  provider: "posh",
  signature: ["name", "orderid", "tickettype", "phonenumber"],
  externalReferenceAliases: new Set(["attendeeid", "ticketid", "ticketkey",
    "id"]),
  arrivalGroupAliases: orderArrivalGroupAliases(),
};
