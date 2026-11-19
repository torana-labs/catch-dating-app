import type {GuestListConverter} from "../canonical";
import {orderArrivalGroupAliases} from "../mapping";
import {indianPhoneAliases} from "./formQuestions";

/**
 * A Townscript attendee report. One booking can hold several attendees, so
 * the booking id groups arrivals and an attendee or ticket number, when the
 * report has one, is the reference.
 */
export const townscriptConverter: GuestListConverter = {
  id: "townscript-v1",
  provider: null,
  signature: ["bookingid", "ticketname", "emailid", "bookingdate"],
  aliases: {
    displayName: new Set(["attendeename", "username"]),
    email: new Set(["emailid", "attendeeemailid", "useremailid"]),
    phone: indianPhoneAliases,
  },
  externalReferenceAliases: new Set(["attendeeid", "ticketid",
    "ticketnumber", "registrationid", "ticketcode"]),
  arrivalGroupAliases: orderArrivalGroupAliases(),
};
