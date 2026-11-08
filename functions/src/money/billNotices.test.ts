import assert from "node:assert/strict";
import test from "node:test";
import type * as admin from "firebase-admin";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {EmailSubmission, TransactionalEmail} from
  "../email/emailProvider";
import type {
  OrganizerBillDocument,
  OrganizerBillNoticeDocument,
} from "../shared/generated/firestoreAdminTypes";
import {BRAND} from "../shared/generated/brand";
import {FakeFirestore, type FakeData} from "../shared/testing/programFirestore";
import type {BillInvoiceClient} from "./billInvoices";
import {invoiceLineName, razorpayBillInvoices} from "./billInvoices";
import {
  billNoticeEmail,
  billPeriodText,
  deliverBillNotice,
  enqueueBillNotice,
  retryDeferredBillNotices,
  type NoticeDeps,
} from "./billNotices";
import type {BillPaymentLinkClient} from "./billPaymentLinks";
import {
  adminManageOrganizerBillsHandler,
  markBillPaidFromInvoice,
} from "./organizerBills";
import {ownBillView} from "./organizerOwnBills";

const ist = (5 * 60 + 30) * 60 * 1000;
const start = Date.UTC(2026, 10, 9) - ist;
const end = start + 30 * 24 * 60 * 60 * 1000;

function cycleBill(extra: Partial<OrganizerBillDocument> = {}):
  OrganizerBillDocument {
  return {schemaVersion: 1, billId: "org_c2026-11-09", organizerId: "org",
    organizerName: "Lantern Lane", month: "2026-12", periodStartMillis: start,
    periodEndMillis: end, periodKind: "cycle", cycleNumber: 1,
    countFromMillis: start,
    plan: {kind: "ticketing", toolsOnlyFeeMinor: null}, revision: 1,
    status: "toSend",
    sales: {paymentCount: 2, eventCount: 1, grossMinor: 150_000,
      refundedMinor: 10_000, baseMinor: 140_000, providerFeeMinor: 3_000,
      providerTaxMinor: 500, unsnapshottedCount: 0},
    commission: {rateBasisPoints: 500, uncappedMinor: 7_000,
      capMinor: 1_000_000, capped: false, trialWaivedMinor: 0,
      amountMinor: 7_000},
    trialEndsAtMillis: start,
    terms: {platformRevision: 1, organizerRevision: 0, ownTerms: false},
    gst: {registered: false, rateBasisPoints: 0, amountMinor: 0},
    totalMinor: 7_000, invoiceNumber: null, dueAtMillis: null,
    paymentLink: null, sentAtMillis: null, reminders: [], paidAtMillis: null,
    paidMinor: null, paidVia: null, writtenOffAtMillis: null, history: [],
    generatedAtMillis: end, updatedAtMillis: end, ...extra};
}

const settings = {schemaVersion: 1, updatedAtMillis: 1, email: {
  provider: "resend", accountId: "acct",
  from: `billing@${BRAND.senders.emailDomain}`,
  credentialVersion: "projects/catch-test/secrets/billing-email/versions/1"}};

function harness(seed: Record<string, FakeData> = {}) {
  const db = new FakeFirestore({
    "organizers/org": {name: "Lantern Lane", ownerUserId: "owner"},
    "billingNoticeSettings/platform": settings,
    ...seed,
  });
  const sent: TransactionalEmail[] = [];
  const pushes: admin.messaging.Message[] = [];
  let reply: EmailSubmission = {kind: "accepted", providerMessageId: "re_1"};
  let now = end + 60_000;
  const deps: NoticeDeps = {
    db: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => now,
    verifiedEmail: async (uid) => uid === "owner" ? "owner@example.com" :
      null,
    hostTokens: async () => ["token-a"],
    sendPush: async (message) => {
      pushes.push(message);
    },
    emailSender: async () => ({submit: async (message) => {
      sent.push(message);
      return reply;
    }}),
  };
  return {db, deps, sent, pushes, setReply: (next: EmailSubmission) => {
    reply = next;
  }, setNow: (millis: number) => {
    now = millis;
  }};
}

const notice = (db: FakeFirestore, id: string) => db.getDoc(
  `organizerBillNotices/${id}`) as unknown as OrganizerBillNoticeDocument;

const sentBill = cycleBill({status: "sent", invoiceNumber: "2026-27/031",
  dueAtMillis: end + 15 * 24 * 60 * 60 * 1000, sentAtMillis: end,
  razorpayInvoice: {invoiceId: "inv_abc", url: "https://rzp.io/i/abc"}});

test("a cycle period reads in India time, last day inclusive", () => {
  assert.equal(billPeriodText(cycleBill()), "9 Nov – 8 Dec 2026");
  assert.equal(billPeriodText(cycleBill({periodKind: undefined,
    month: "2026-10"})), "October 2026");
});

test("an issued bill is emailed to the owner's verified address and pushed " +
  "without an amount", async () => {
  const {deps, sent, pushes} = harness({
    "organizerBills/org_c2026-11-09": sentBill as unknown as FakeData});
  await enqueueBillNotice(deps, sentBill, "issued");
  await enqueueBillNotice(deps, sentBill, "issued");
  const result = await deliverBillNotice(deps, "org_c2026-11-09_issued");
  assert.equal(result?.email.state, "accepted");
  assert.equal(result?.email.providerMessageId, "re_1");
  assert.equal(result?.push.state, "sent");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "owner@example.com");
  assert.match(sent[0].subject, /2026-27\/031 for 9 Nov – 8 Dec 2026/u);
  assert.match(sent[0].text, /Amount: ₹70/u);
  assert.match(sent[0].text, /No GST is charged/u);
  assert.match(sent[0].text, /https:\/\/rzp\.io\/i\/abc/u);
  const push = pushes[0] as admin.messaging.TokenMessage;
  assert.equal(push.notification?.title, "Catch bill issued");
  assert.equal(push.notification?.body,
    "Your Catch bill for 9 Nov – 8 Dec 2026 has been issued.");
  assert.ok(!/₹|https?:/u.test(JSON.stringify(push)));
  assert.equal(push.data?.appRole, "host");
  assert.equal(push.data?.type, "organizerBillIssued");
  // Delivering again sends nothing more.
  await deliverBillNotice(deps, "org_c2026-11-09_issued");
  assert.equal(sent.length, 1);
  assert.equal(pushes.length, 1);
});

test("without settings or a verified address, only push goes out",
  async () => {
    const {db, deps, sent} = harness({
      "organizerBills/org_c2026-11-09": sentBill as unknown as FakeData});
    db.deleteDoc("billingNoticeSettings/platform");
    await enqueueBillNotice(deps, sentBill, "issued");
    const result = await deliverBillNotice(deps, "org_c2026-11-09_issued");
    assert.equal(result?.email.state, "notConfigured");
    assert.equal(result?.push.state, "sent");
    assert.equal(sent.length, 0);
    db.setDoc("organizers/org", {name: "Lantern Lane", ownerUserId: "other"});
    db.setDoc("billingNoticeSettings/platform", settings);
    await enqueueBillNotice(deps, {...sentBill, reminders: [1]}, "reminder");
    assert.equal((await deliverBillNotice(deps, "org_c2026-11-09_reminder1"))
      ?.email.state, "noAddress");
  });

test("a deferred email is retried by the sweep; an unknown one never is",
  async () => {
    const {db, deps, sent, setReply, setNow} = harness({
      "organizerBills/org_c2026-11-09": sentBill as unknown as FakeData});
    setReply({kind: "deferred", reason: "rateLimited",
      retryAfterMillis: 120_000});
    await enqueueBillNotice(deps, sentBill, "issued");
    await deliverBillNotice(deps, "org_c2026-11-09_issued");
    assert.equal(notice(db, "org_c2026-11-09_issued").email.state, "deferred");
    setReply({kind: "accepted", providerMessageId: "re_2"});
    assert.equal(await retryDeferredBillNotices(deps), 0);
    setNow(end + 60 * 60_000);
    assert.equal(await retryDeferredBillNotices(deps), 1);
    assert.equal(notice(db, "org_c2026-11-09_issued").email.state, "accepted");
    assert.equal(notice(db, "org_c2026-11-09_issued").email.attempts, 2);
    setReply({kind: "unknown"});
    await enqueueBillNotice(deps, {...sentBill, reminders: [1]}, "reminder");
    await deliverBillNotice(deps, "org_c2026-11-09_reminder1");
    assert.equal(notice(db, "org_c2026-11-09_reminder1").email.state,
      "unknown");
    assert.equal(await retryDeferredBillNotices(deps), 0);
    assert.equal(sent.length, 3);
  });

test("a send that throws is retried, not lost", async () => {
  const {db, deps, sent, setNow} = harness({
    "organizerBills/org_c2026-11-09": sentBill as unknown as FakeData});
  let throws = true;
  const flaky: NoticeDeps = {...deps, emailSender: async () => ({
    submit: async (message) => {
      if (throws) throw new Error("socket hang up");
      sent.push(message);
      return {kind: "accepted", providerMessageId: "re_9"};
    }})};
  await enqueueBillNotice(flaky, sentBill, "issued");
  await deliverBillNotice(flaky, "org_c2026-11-09_issued");
  const first = notice(db, "org_c2026-11-09_issued");
  assert.equal(first.email.state, "deferred");
  assert.equal(first.push.state, "sent");
  throws = false;
  setNow(end + 60 * 60_000);
  assert.equal(await retryDeferredBillNotices(flaky), 1);
  assert.equal(notice(db, "org_c2026-11-09_issued").email.state, "accepted");
  assert.equal(sent.length, 1);
});

test("a bill paid before its notice went out is not announced", async () => {
  const {deps, sent, pushes} = harness({"organizerBills/org_c2026-11-09":
    {...sentBill, status: "paid"} as unknown as FakeData});
  await enqueueBillNotice(deps, sentBill, "issued");
  const result = await deliverBillNotice(deps, "org_c2026-11-09_issued");
  assert.equal(result?.email.state, "withheld");
  assert.equal(sent.length + pushes.length, 0);
});

test("a tools-only bill says so and the reminder names its due date", () => {
  const email = billNoticeEmail({bill: {...sentBill, plan: {kind: "toolsOnly",
    toolsOnlyFeeMinor: 500_000}, totalMinor: 500_000},
  notice: {noticeId: "org_c2026-11-09_reminder1", kind: "reminder"} as
    OrganizerBillNoticeDocument,
  from: `billing@${BRAND.senders.emailDomain}`, to: "owner@example.com",
  nowMillis: end});
  assert.match(email.subject, /^Reminder: Catch bill 2026-27\/031 is due /u);
  assert.match(email.text, /Tools-only plan for this billing cycle/u);
  assert.match(email.text, /Amount: ₹5,000/u);
});

test("the Razorpay invoice carries the bill, no Razorpay notifications and " +
  "the project tag", async () => {
  let created: Record<string, unknown> = {};
  const client = razorpayBillInvoices({invoices: {
    create: async (body: Record<string, unknown>) => {
      created = body;
      return {id: "inv_abc", short_url: "https://rzp.io/i/abc"};
    },
    fetch: async () => ({id: "inv_abc", status: "paid", amount_paid: 7_000,
      notes: {catchBillId: "org_c2026-11-09", catchProject: "catch-test"}}),
  }} as never, "catch-test");
  assert.deepEqual(await client.create(sentBill),
    {invoiceId: "inv_abc", url: "https://rzp.io/i/abc"});
  assert.equal(created.email_notify, 0);
  assert.equal(created.sms_notify, 0);
  assert.equal(created.partial_payment, 0);
  assert.deepEqual(created.line_items, [{name:
    "Catch ticketing commission, billing cycle 1", amount: 7_000,
  currency: "INR", quantity: 1}]);
  assert.match(String(created.receipt), /^2026-27\/031-[0-9a-f]{6}$/u);
  assert.deepEqual(await client.fetch("inv_abc"), {status: "paid",
    amountPaid: 7_000, billId: "org_c2026-11-09", project: "catch-test"});
  assert.equal(invoiceLineName({...sentBill, periodKind: undefined,
    month: "2026-10"}), "Catch ticketing commission, 2026-10");
});

class FakeInvoices implements BillInvoiceClient {
  created: string[] = [];
  paid = new Map<string, number>();
  async create(bill: OrganizerBillDocument) {
    this.created.push(bill.billId);
    return {invoiceId: "inv_abc", url: "https://rzp.io/i/abc"};
  }
  async fetch(invoiceId: string) {
    return {status: this.paid.has(invoiceId) ? "paid" : "issued",
      amountPaid: this.paid.get(invoiceId) ?? 0, billId: "org_c2026-11-09",
      project: "catch-test"};
  }
}

const noLinks: BillPaymentLinkClient = {
  create: async () => {
    throw new Error("links are only a fallback");
  },
  createForPlan: async () => {
    throw new Error("unused");
  },
  fetch: async () => {
    throw new Error("unused");
  },
  cancel: async () => undefined,
};

test("sending a bill issues a Razorpay invoice, queues the notice, and the " +
  "paid invoice closes the bill", async () => {
  const db = new FakeFirestore({
    "organizerBills/org_c2026-11-09": cycleBill() as unknown as FakeData,
  });
  const invoices = new FakeInvoices();
  const notices: string[] = [];
  const deps = {db: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => end + 1000, links: () => noLinks, invoices: () => invoices,
    notify: async (bill: OrganizerBillDocument, kind: string) => {
      notices.push(`${bill.billId}:${kind}:${bill.razorpayInvoice?.url}`);
    }};
  const request = {auth: {uid: "operator", token: {adminOwner: true}},
    data: {action: "send", month: null, organizerId: null,
      billId: "org_c2026-11-09", expectedRevision: 1, note: null}} as
    unknown as CallableRequest<unknown>;
  const result = await adminManageOrganizerBillsHandler(request, deps);
  assert.equal(result.month, "2026-12");
  const stored = db.getDoc("organizerBills/org_c2026-11-09") as unknown as
    OrganizerBillDocument;
  assert.equal(stored.status, "sent");
  assert.deepEqual(stored.razorpayInvoice, {invoiceId: "inv_abc",
    url: "https://rzp.io/i/abc"});
  assert.equal(stored.paymentLink, null);
  assert.deepEqual(notices,
    ["org_c2026-11-09:issued:https://rzp.io/i/abc"]);
  assert.equal(ownBillView(stored)?.paymentUrl, "https://rzp.io/i/abc");
  // A short payment does not close it; the full amount does, once.
  invoices.paid.set("inv_abc", 100);
  assert.equal(await markBillPaidFromInvoice(deps, "inv_abc", "catch-test"),
    false);
  invoices.paid.set("inv_abc", stored.totalMinor);
  assert.equal(await markBillPaidFromInvoice(deps, "inv_abc", "other"),
    false);
  assert.equal(await markBillPaidFromInvoice(deps, "inv_abc", "catch-test"),
    true);
  const paid = db.getDoc("organizerBills/org_c2026-11-09") as unknown as
    OrganizerBillDocument;
  assert.equal(paid.status, "paid");
  assert.equal(paid.paidVia, "invoice");
  assert.equal(await markBillPaidFromInvoice(deps, "inv_abc", "catch-test"),
    false);
});
