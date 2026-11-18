import type {GuestListConverter} from "../canonical";

/** A Partiful guest list export. */
export const partifulConverter: GuestListConverter = {
  id: "partiful-v1",
  provider: "partiful",
  signature: ["name", "rsvpstatus", "phonenumber", "email"],
};
