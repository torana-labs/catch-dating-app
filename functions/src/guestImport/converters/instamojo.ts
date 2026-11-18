import type {GuestListConverter, GuestStatus} from "../canonical";
import {normalizeHeader} from "../table";

/**
 * An Instamojo payments export for a payment link: one row per payment,
 * with the buyer's name, phone and email. The payment id is the reference.
 * Failed, refunded and cancelled payments are not guests.
 */
export const instamojoConverter: GuestListConverter = {
  id: "instamojo-v1",
  provider: null,
  signature: ["paymentid", "buyername", "buyerphone", "buyeremail"],
  aliases: {
    phone: new Set(["buyerphone", "buyerphonenumber"]),
    email: new Set(["buyeremail"]),
    status: new Set(["paymentstatus", "status"]),
  },
  externalReferenceAliases: new Set(["paymentid"]),
  // One row is one payment, so the buyer's email does not group arrivals.
  arrivalGroupAliases: new Set(),
  statusFor: instamojoStatus,
};

function instamojoStatus(value: string | null): GuestStatus | "excluded" {
  const normalized = normalizeHeader(value ?? "");
  if (["failed", "failure", "refunded", "cancelled", "canceled",
    "initiated"].includes(normalized)) {
    return "excluded";
  }
  return "registered";
}
