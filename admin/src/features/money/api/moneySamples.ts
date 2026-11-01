import type {AdminManageOrganizerBillsCallablePayload} from
  "../../../generated/contracts/adminManageOrganizerBillsCallablePayload";
import type {AdminManageOrganizerBillsCallableResponse} from
  "../../../generated/contracts/adminManageOrganizerBillsCallableResponse";
import type {AdminManagePaymentIssuesCallablePayload} from
  "../../../generated/contracts/adminManagePaymentIssuesCallablePayload";
import type {AdminManagePaymentIssuesCallableResponse} from
  "../../../generated/contracts/adminManagePaymentIssuesCallableResponse";

/**
 * Sample-mode Money: October 2026's bills and three open issues, as drawn on
 * the AdminMoney and AdminMoneyBills boards. Actions change the in-memory
 * copy with the server's revision and state rules; nothing is real.
 */
type Bill = AdminManageOrganizerBillsCallableResponse["bills"][number];
type Issue = AdminManagePaymentIssuesCallableResponse["issues"][number];

const ist = (iso: string) => Date.parse(`${iso}+05:30`);
const october = {start: ist("2026-10-01T00:00:00"),
  end: ist("2026-11-01T00:00:00")};
const due = ist("2026-11-15T23:59:59.999");

/** The sample clock: Money as it stands on 18 November 2026. */
export const moneySampleNowMillis = ist("2026-11-18T12:00:00");

function bill(input: {
  id: string; name: string; events: number; gross: number; refunded: number;
  rate: number; capped?: boolean; status: Bill["status"]; total: number;
  invoice?: number; paidOn?: string; trialEnds?: string; ownTerms?: boolean;
  fee: number;
}): Bill {
  const sent = input.status !== "toSend" && input.status !== "free";
  const paidAt = input.paidOn ? ist(`${input.paidOn}T10:00:00`) : null;
  return {schemaVersion: 1, billId: `${input.id}_2026-10`,
    organizerId: input.id, organizerName: input.name, month: "2026-10",
    periodStartMillis: october.start, periodEndMillis: october.end,
    revision: sent ? 2 : 1, status: input.status,
    sales: {paymentCount: input.events * 40, eventCount: input.events,
      grossMinor: input.gross + input.refunded, refundedMinor: input.refunded,
      baseMinor: input.gross, providerFeeMinor: input.fee,
      providerTaxMinor: Math.round(input.fee * 18 / 118),
      unsnapshottedCount: 0},
    commission: {rateBasisPoints: input.rate,
      uncappedMinor: Math.floor(input.gross * input.rate / 10_000),
      capMinor: 1_000_000, capped: input.capped ?? false,
      trialWaivedMinor: input.status === "free" ?
        Math.floor(input.gross * input.rate / 10_000) : 0,
      amountMinor: input.total},
    trialEndsAtMillis: input.trialEnds ?
      ist(`${input.trialEnds}T00:00:00`) : null,
    terms: {platformRevision: 3, organizerRevision: input.ownTerms ? 1 : 0,
      ownTerms: input.ownTerms ?? false},
    gst: {registered: false, rateBasisPoints: 0, amountMinor: 0},
    totalMinor: input.total,
    invoiceNumber: input.invoice ?
      `2026-27/${String(input.invoice).padStart(3, "0")}` : null,
    dueAtMillis: sent ? due : null,
    paymentLink: sent ? {linkId: `plink_Sample${input.invoice ?? 0}`,
      url: "https://rzp.io/l/sample"} : null,
    sentAtMillis: sent ? ist("2026-11-01T09:00:00") : null, reminders: [],
    paidAtMillis: paidAt, paidMinor: paidAt ? input.total : null,
    paidVia: paidAt ? "paymentLink" : null, writtenOffAtMillis: null,
    history: [{atMillis: ist("2026-11-01T06:00:00"), action: "generated",
      byUid: null, note: null}, ...(sent ? [{
      atMillis: ist("2026-11-01T09:00:00"), action: "sent" as const,
      byUid: "sample-owner", note: null}] : []), ...(paidAt ? [{
      atMillis: paidAt, action: "paid" as const, byUid: null,
      note: "Paid by payment link"}] : [])],
    generatedAtMillis: ist("2026-11-01T06:00:00"),
    updatedAtMillis: paidAt ?? ist("2026-11-01T09:00:00")};
}

let bills: Bill[] = [
  bill({id: "sample-lantern", name: "Lantern Lane Social", events: 9,
    gross: 16_000_000, refunded: 150_000, rate: 400, status: "sent",
    total: 640_000, invoice: 31, ownTerms: true, fee: 377_600}),
  bill({id: "sample-harbor", name: "Harbor Social Club", events: 3,
    gross: 4_200_000, refunded: 0, rate: 500, status: "sent", total: 210_000,
    invoice: 32, fee: 99_120}),
  bill({id: "sample-padel", name: "Mumbai Padel Social", events: 7,
    gross: 11_200_000, refunded: 0, rate: 500, status: "toSend",
    total: 560_000, fee: 264_320}),
  bill({id: "sample-afterfly", name: "Afterfly", events: 4,
    gross: 22_400_000, refunded: 0, rate: 500, capped: true, status: "paid",
    total: 1_000_000, invoice: 29, paidOn: "2026-11-03", fee: 528_640}),
  bill({id: "sample-bhag", name: "Bhag Club", events: 6, gross: 5_800_000,
    refunded: 0, rate: 500, status: "paid", total: 290_000, invoice: 30,
    paidOn: "2026-11-02", fee: 136_880}),
  bill({id: "sample-seaside", name: "Seaside Sessions", events: 2,
    gross: 1_800_000, refunded: 0, rate: 500, status: "free", total: 0,
    trialEnds: "2026-11-12", fee: 42_480}),
];
let lastInvoice = 32;

function listBills(scope: {month: string} | {organizerId: string},
  nowMillis: number): AdminManageOrganizerBillsCallableResponse {
  const monthBills = "month" in scope ?
    (scope.month === "2026-10" ? bills : []) :
    bills.filter((entry) => entry.organizerId === scope.organizerId);
  const counts = {all: monthBills.length, toSend: 0, sent: 0, overdue: 0,
    paid: 0, writtenOff: 0, free: 0};
  const totals = {salesMinor: 0, billedMinor: 0, paidMinor: 0};
  for (const entry of monthBills) {
    counts[entry.status as Bill["status"]]++;
    if (entry.status === "sent" && (entry.dueAtMillis ?? Infinity) <
      nowMillis) counts.overdue++;
    totals.salesMinor += entry.sales.grossMinor - entry.sales.refundedMinor;
    if (entry.status !== "free") totals.billedMinor += entry.totalMinor;
    totals.paidMinor += entry.paidMinor ?? 0;
  }
  return {month: "month" in scope ? scope.month : null,
    organizerId: "organizerId" in scope ? scope.organizerId : null,
    bills: [...monthBills].sort((a, b) =>
    b.updatedAtMillis - a.updatedAtMillis), totals, counts,
  nextInvoiceNumber: `2026-27/${String(lastInvoice + 1).padStart(3, "0")}`,
  gstRegistered: false};
}

/**
 * Sample adminManageOrganizerBills.
 * @param {AdminManageOrganizerBillsCallablePayload} payload Request.
 * @param {number} nowMillis Sample clock.
 * @return {AdminManageOrganizerBillsCallableResponse} Month.
 */
export function sampleManageOrganizerBills(
  payload: AdminManageOrganizerBillsCallablePayload,
  nowMillis = moneySampleNowMillis):
  AdminManageOrganizerBillsCallableResponse {
  if (payload.action === "list" || payload.action === "generate") {
    return listBills(payload.organizerId ?
      {organizerId: payload.organizerId} :
      {month: payload.month ?? "2026-10"}, nowMillis);
  }
  const current = bills.find((entry) => entry.billId === payload.billId);
  if (!current) throw new Error("Bill not found.");
  if (current.revision !== payload.expectedRevision) {
    throw new Error("This bill changed. Review it again.");
  }
  const next: Bill = {...current, revision: current.revision + 1,
    updatedAtMillis: nowMillis};
  if (payload.action === "send" && current.status === "toSend") {
    lastInvoice++;
    Object.assign(next, {status: "sent", sentAtMillis: nowMillis,
      dueAtMillis: due,
      invoiceNumber: `2026-27/${String(lastInvoice).padStart(3, "0")}`,
      paymentLink: {linkId: `plink_Sample${lastInvoice}`,
        url: "https://rzp.io/l/sample"}});
  } else if (payload.action === "remind" && current.status === "sent") {
    next.reminders = [...current.reminders, nowMillis];
  } else if (payload.action === "markPaid" && current.status === "sent") {
    Object.assign(next, {status: "paid", paidAtMillis: nowMillis,
      paidMinor: current.totalMinor, paidVia: "manual"});
  } else if (payload.action === "writeOff" &&
      ["toSend", "sent"].includes(current.status)) {
    Object.assign(next, {status: "writtenOff", writtenOffAtMillis: nowMillis});
  } else {
    throw new Error(`A bill that is ${current.status} cannot do that.`);
  }
  next.history = [...current.history, {atMillis: nowMillis,
    action: payload.action === "send" ? "sent" : payload.action === "remind" ?
      "reminded" : payload.action === "markPaid" ? "paid" : "writtenOff",
    byUid: "sample-owner", note: payload.note}];
  bills = bills.map((entry) => entry.billId === next.billId ? next : entry);
  return listBills({month: next.month}, nowMillis);
}

let issues: Issue[] = [
  {issueId: "publicEventPayments:sample-p1", kind: "payment",
    source: "publicEventPayments", targetId: "sample-p1",
    title: "₹1,500 paid, booking not confirmed",
    subtitle: "Rhea Kapoor · Takeoff: Run + Rave",
    organizerId: "sample-afterfly", organizerName: "Afterfly",
    amountMinor: 150_000, waitingSinceMillis: ist("2026-11-16T18:02:00"),
    status: "captured", lastErrorCode: null,
    providerPaymentId: "pay_PZ81kqSample", eventId: "sample-takeoff",
    canConfirmBooking: true, resolution: null},
  {issueId: "organizerEventOfferPayments:sample-p2", kind: "refund",
    source: "organizerEventOfferPayments", targetId: "sample-p2",
    title: "Refund asked, not sent", subtitle: "Kabir Shah · Padel mixer",
    organizerId: "sample-padel", organizerName: "Mumbai Padel Social",
    amountMinor: 120_000, waitingSinceMillis: ist("2026-11-17T11:00:00"),
    status: "refundPending", lastErrorCode: null,
    providerPaymentId: "pay_QK19sample", eventId: "sample-padel-mixer",
    canConfirmBooking: false, resolution: null},
  {issueId: "organizerBills:sample-lantern_2026-10", kind: "bill",
    source: "organizerBills", targetId: "sample-lantern_2026-10",
    title: "Catch bill unpaid", subtitle: "2026-10 · ₹6,400 · 2026-27/031",
    organizerId: "sample-lantern", organizerName: "Lantern Lane Social",
    amountMinor: 640_000, waitingSinceMillis: ist("2026-11-18T07:00:00"),
    status: "overdue",
    lastErrorCode: null, providerPaymentId: null, eventId: null,
    canConfirmBooking: false, resolution: null},
];
let resolved: Issue[] = [];

function issueCounts(list: Issue[]) {
  const counts = {all: list.length, payment: 0, refund: 0, review: 0,
    bill: 0};
  for (const entry of list) counts[entry.kind]++;
  return counts;
}

/**
 * Sample adminManagePaymentIssues.
 * @param {AdminManagePaymentIssuesCallablePayload} payload Request.
 * @param {number} nowMillis Sample clock.
 * @return {AdminManagePaymentIssuesCallableResponse} View.
 */
export function sampleManagePaymentIssues(
  payload: AdminManagePaymentIssuesCallablePayload,
  nowMillis = moneySampleNowMillis):
  AdminManagePaymentIssuesCallableResponse {
  let outcome: AdminManagePaymentIssuesCallableResponse["outcome"] = null;
  if (payload.action !== "list") {
    const issue = issues.find((entry) => entry.issueId === payload.issueId);
    if (!issue) throw new Error("This issue is no longer open. Reload Money.");
    if (payload.action === "confirmBooking" && !issue.canConfirmBooking) {
      throw new Error("Only a website or offer payment can be confirmed here.");
    }
    outcome = {issueId: issue.issueId,
      result: payload.action === "confirmBooking" ? "admitted" : "closed",
      statusAfter: payload.action === "confirmBooking" ? "admitted" :
        issue.status};
    issues = issues.filter((entry) => entry !== issue);
    resolved = [{...issue, canConfirmBooking: false, resolution: {
      schemaVersion: 1, resolutionId: issue.targetId, issueId: issue.issueId,
      kind: issue.kind, statusAtResolution: issue.status,
      action: payload.action === "confirmBooking" ? "confirmedBooking" :
        "closed", note: payload.note, resolvedAtMillis: nowMillis,
      resolvedByUid: "sample-owner", title: issue.title,
      organizerName: issue.organizerName}}, ...resolved];
  }
  const list = payload.view === "open" ? [...issues].sort((a, b) =>
    a.waitingSinceMillis - b.waitingSinceMillis) : resolved;
  return {view: payload.view, issues: list, counts: issueCounts(list),
    outcome};
}
