import {createHash} from "node:crypto";
import type Razorpay from "razorpay";
import type {OrganizerBillDocument} from
  "../shared/generated/firestoreAdminTypes";

/**
 * Razorpay payment links for organizer bills and tools-only purchases, on
 * Catch's own Razorpay account. The link notes carry the bill (or the
 * organizer buying tools-only) and the project, so the shared webhook can
 * recognise a payment for this environment.
 */
export interface BillPaymentLinkClient {
  create(bill: OrganizerBillDocument): Promise<{linkId: string; url: string}>;
  /** A tools-only purchase: one fee on Catch's account, for one organizer. */
  createForPlan(input: {organizerId: string; organizerName: string;
    amountMinor: number; nowMillis: number}):
    Promise<{linkId: string; url: string}>;
  fetch(linkId: string): Promise<{status: string; amountPaid: number;
    billId: string | null; planOrganizerId: string | null;
    project: string | null}>;
  /** Best effort: an unpaid link is cancelled so it cannot be paid later. */
  cancel(linkId: string): Promise<void>;
}

/**
 * A tools-only purchase link's reference: unique per organizer, project and
 * moment, at most 40 characters.
 * @param {string} organizerId Organizer.
 * @param {string} projectId Runtime project.
 * @param {number} nowMillis Now.
 * @return {string} Reference id.
 */
export function planLinkReference(organizerId: string, projectId: string,
  nowMillis: number): string {
  const tag = createHash("sha256").update(`${projectId}/${organizerId}`)
    .digest("hex").slice(0, 12);
  return `tools-${tag}-${nowMillis.toString(36)}`.slice(0, 40);
}

function checkedLink(link: {id: string; short_url: unknown}):
  {linkId: string; url: string} {
  if (!/^plink_[A-Za-z0-9]{1,40}$/u.test(link.id) ||
      !String(link.short_url).startsWith("https://")) {
    throw new Error("Razorpay returned an unusable payment link.");
  }
  return {linkId: link.id, url: String(link.short_url)};
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
      return checkedLink(link);
    },
    async createForPlan(input) {
      if (input.amountMinor < 100) {
        throw new Error("A tools-only purchase must be at least ₹1.");
      }
      const link = await razorpay.paymentLink.create({
        amount: input.amountMinor, currency: "INR", accept_partial: false,
        reference_id: planLinkReference(input.organizerId, projectId,
          input.nowMillis),
        description: "Catch tools-only plan: first billing cycle",
        customer: {name: input.organizerName.slice(0, 100)},
        notes: {catchPlanOrganizerId: input.organizerId,
          catchProject: projectId},
        reminder_enable: false,
      });
      return checkedLink(link);
    },
    async cancel(linkId) {
      await razorpay.paymentLink.cancel(linkId);
    },
    async fetch(linkId) {
      const link = await razorpay.paymentLink.fetch(linkId);
      const notes = (link.notes ?? {}) as Record<string, unknown>;
      return {status: String(link.status),
        amountPaid: Number(link.amount_paid) || 0,
        billId: typeof notes.catchBillId === "string" ?
          notes.catchBillId : null,
        planOrganizerId: typeof notes.catchPlanOrganizerId === "string" ?
          notes.catchPlanOrganizerId : null,
        project: typeof notes.catchProject === "string" ?
          notes.catchProject : null};
    },
  };
}
