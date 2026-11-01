/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Owner reads one month's organizer bills or acts on them. list reads the month, or with organizerId every bill of one organizer (the organizer's Money tab). generate (re)makes the month's bills from its bookings; bills already sent or closed are kept. send takes the next invoice number, sets the due date and creates a Razorpay payment link. remind records a reminder. markPaid closes a bill paid outside its link and credits its nominator. writeOff closes a bill that will not be paid. Acting on one bill names the revision it reviewed.
 */
export interface AdminManageOrganizerBillsCallablePayload {
  action: "list" | "generate" | "send" | "remind" | "markPaid" | "writeOff";
  month: string | null;
  organizerId: string | null;
  billId: string | null;
  expectedRevision: number | null;
  note: string | null;
}
