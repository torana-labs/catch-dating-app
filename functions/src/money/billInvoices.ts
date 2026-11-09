import type Razorpay from "razorpay";
import type {OrganizerBillDocument} from
  "../shared/generated/firestoreAdminTypes";
import {billLinkReference} from "./billPaymentLinks";

/**
 * Razorpay Invoices for organizer bills, on Catch's own Razorpay account.
 * #1124 prefers invoices over bare payment links: an invoice is a numbered
 * document with its own hosted page that the host can keep. Catch's own
 * invoice number is the invoice's receipt, tagged by project like links.
 * Razorpay's own email and SMS are off: Catch sends the notice itself
 * (billNotices.ts) so the host gets one message. GST stays off while Catch
 * is not GST registered (#1088): the invoice carries the bill's total as one
 * line, and a registered Catch needs tax lines before invoices go live.
 */
export interface BillInvoiceClient {
  create(bill: OrganizerBillDocument): Promise<{invoiceId: string;
    url: string}>;
  fetch(invoiceId: string): Promise<{status: string; amountPaid: number;
    billId: string | null; project: string | null}>;
}

/**
 * The invoice's one line: what the period was billed on.
 * @param {OrganizerBillDocument} bill A sent bill.
 * @return {string} Line item name.
 */
export function invoiceLineName(bill: OrganizerBillDocument): string {
  const plan = bill.plan?.kind === "toolsOnly" ? "Catch tools-only plan" :
    "Catch ticketing commission";
  if ((bill.periodKind ?? "calendarMonth") === "cycle") {
    // The one line carries the total, so it says when a credit came off.
    const credit = bill.refundCredit?.appliedMinor ? ", less refund credit" :
      "";
    return `${plan}, billing cycle ${bill.cycleNumber ?? ""}`.trim() + credit;
  }
  return `${plan}, ${bill.month}`;
}

/**
 * Invoices through the Razorpay SDK.
 * @param {Razorpay} razorpay Client on Catch's account.
 * @param {string} projectId Runtime project.
 * @return {BillInvoiceClient} Invoice client.
 */
export function razorpayBillInvoices(razorpay: Razorpay, projectId: string):
  BillInvoiceClient {
  return {
    async create(bill) {
      if (!bill.invoiceNumber || bill.totalMinor < 100) {
        throw new Error("Only a sent bill of at least ₹1 gets an invoice.");
      }
      const invoice = await razorpay.invoices.create({
        type: "invoice",
        description: `Catch bill ${bill.invoiceNumber}`,
        customer: {name: bill.organizerName.slice(0, 100) || "Organizer"},
        line_items: [{name: invoiceLineName(bill).slice(0, 250),
          amount: bill.totalMinor, currency: "INR", quantity: 1}],
        currency: "INR",
        receipt: billLinkReference(bill.invoiceNumber, projectId),
        sms_notify: 0,
        email_notify: 0,
        partial_payment: 0,
        notes: {catchBillId: bill.billId, catchProject: projectId},
      });
      const id = String(invoice.id);
      const url = String(invoice.short_url ?? "");
      if (!/^inv_[A-Za-z0-9]{1,40}$/u.test(id) || !url.startsWith("https://")) {
        throw new Error("Razorpay returned an unusable invoice.");
      }
      return {invoiceId: id, url};
    },
    async fetch(invoiceId) {
      const invoice = await razorpay.invoices.fetch(invoiceId);
      const notes = (invoice.notes ?? {}) as Record<string, unknown>;
      return {status: String(invoice.status),
        amountPaid: Number(invoice.amount_paid) || 0,
        billId: typeof notes.catchBillId === "string" ?
          notes.catchBillId : null,
        project: typeof notes.catchProject === "string" ?
          notes.catchProject : null};
    },
  };
}
