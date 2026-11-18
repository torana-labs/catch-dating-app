import type {GuestListConverter} from "../canonical";

/** A Luma guest export (CSV download from an event's guest list). */
export const lumaConverter: GuestListConverter = {
  id: "luma-v1",
  provider: "luma",
  signature: ["name", "approvalstatus", "registrationdate", "tickettype",
    "guestkey"],
  externalReferenceAliases: new Set(["guestkey", "guestid", "attendeeid",
    "id"]),
};
