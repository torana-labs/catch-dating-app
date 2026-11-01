import {createHash} from "node:crypto";
import type Razorpay from "razorpay";
import type {OrganizerBillDocument} from
  "../shared/generated/firestoreAdminTypes";

/**
 * Razorpay payment links for organizer bills, on Catch's own Razorpay
 * account. The link notes carry the bill and the project so the shared
 * webhook can recognise a payment for this environment's bill.
 */
export interface BillPaymentLinkClient {
  create(bill: OrganizerBillDocument): Promise<{linkId: string; url: string}>;
  fetch(linkId: string): Promise<{status: string; amountPaid: number;
    billId: string | null; project: string | null}>;
}

/**
 * The link's reference: the invoice number plus a short project tag, so the
 * same invoice number in two environments sharing a test merchant never
 * collides. At most 40 characters, as Razorpay requires.
 * @param {string} invoiceNumber Bill invoice number.
 * @param {string} projectId Runtime project.
 * @return {string} Reference id.
 */
export function billLinkReference(invoiceNumber: string, projectId: string):
  string {
  const tag = createHash("sha256").update(projectId).digest("hex").slice(0, 6);
  return `${invoiceNumber}-${tag}`.slice(0, 40);
}

/**
 * Payment links through the Razorpay SDK.
 * @param {Razorpay} razorpay Client on Catch's account.
 * @param {string} projectId Runtime project.
 * @return {BillPaymentLinkClient} Link client.
 */
export function razorpayBillPaymentLinks(razorpay: Razorpay,
  projectId: string): BillPaymentLinkClient {
  return {
    async create(bill) {
      if (!bill.invoiceNumber || bill.totalMinor < 100) {
        throw new Error("Only a sent bill of at least ₹1 gets a link.");
      }
      const link = await razorpay.paymentLink.create({
        amount: bill.totalMinor, currency: "INR", accept_partial: false,
        reference_id: billLinkReference(bill.invoiceNumber, projectId),
        description: `Catch bill ${bill.invoiceNumber} for ${bill.month}`,
        customer: {name: bill.organizerName},
        notes: {catchBillId: bill.billId, catchProject: projectId},
        reminder_enable: false,
      });
      if (!/^plink_[A-Za-z0-9]{1,40}$/u.test(link.id) ||
          !String(link.short_url).startsWith("https://")) {
        throw new Error("Razorpay returned an unusable payment link.");
      }
      return {linkId: link.id, url: link.short_url};
    },
    async fetch(linkId) {
      const link = await razorpay.paymentLink.fetch(linkId);
      const notes = (link.notes ?? {}) as Record<string, unknown>;
      return {status: String(link.status),
        amountPaid: Number(link.amount_paid) || 0,
        billId: typeof notes.catchBillId === "string" ?
          notes.catchBillId : null,
        project: typeof notes.catchProject === "string" ?
          notes.catchProject : null};
    },
  };
}
