import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {commercialTermsRecords} from "../commercialTerms/testFixture";
import type {
  OrganizerBillDocument,
  OrganizerBillingCycleDocument,
} from "../shared/generated/firestoreAdminTypes";
import {FakeFirestore, type FakeData} from "../shared/testing/programFirestore";
import type {BillInvoiceClient} from "./billInvoices";
import type {BillPaymentLinkClient} from "./billPaymentLinks";
import {dayMillis} from "./hostTrial";
import {
  adminManageOrganizerBillsHandler,
  sendDueCycleBills,
  type BillDeps,
} from "./organizerBills";
import {
  autoSendAtFor,
  generateCycleBills,
  isReviewedCycleBill,
  staffReviewedCycles,
} from "./organizerCycleBills";

const ist = (5 * 60 + 30) * 60 * 1000;
// First event 10 Oct 2026, 12:00 IST; the 30-day trial ends 9 Nov, 12:00 IST.
const firstEvent = Date.UTC(2026, 9, 10, 12) - ist;
const trialEnd = firstEvent + 30 * dayMillis;
const cycle = 30 * dayMillis;
/** The end of cycle n (1 is the first cycle after the trial). */
const cycleEnd = (n: number) => trialEnd + n * cycle;

let paymentCount = 0;
function payment(atMillis: number, amountPaise: number,
  refundedAmountPaise = 0): Record<string, FakeData> {
  paymentCount++;
  return {[`guestPayments/p${paymentCount}`]: {
    purpose: "publicEvent", organizerId: "org",
    eventId: "ev1", capturedAt: Timestamp.fromMillis(atMillis), amountPaise,
    refundedAmountPaise, routing: {selection: {route: "razorpayOAuth"}}}};
}

function seed(extra: Record<string, FakeData> = {}): FakeFirestore {
  return new FakeFirestore({
    ...commercialTermsRecords(),
    "organizers/org": {name: "Lantern Lane", ownerUserId: "owner"},
    "organizerGrowthFacts/org": {organizerId: "org", milestones: {
      firstEventAt: Timestamp.fromMillis(firstEvent),
      firstPaidBookingAt: null}},
    ...extra,
  });
}

class FakeInvoices implements BillInvoiceClient {
  created: string[] = [];
  async create(bill: OrganizerBillDocument) {
    this.created.push(bill.billId);
    return {invoiceId: `inv_${this.created.length}`,
      url: `https://rzp.io/i/${this.created.length}`};
  }
  async fetch() {
    return {status: "issued", amountPaid: 0, billId: null,
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

interface Clock {
  now: number;
}

function harness(db: FakeFirestore, clock: Clock) {
  const invoices = new FakeInvoices();
  const notices: string[] = [];
  const deps: BillDeps = {
    db: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => clock.now, links: () => noLinks, invoices: () => invoices,
    notify: async (bill, kind) => {
      notices.push(`${bill.billId}:${kind}`);
    }};
  const call = (data: Record<string, unknown>) =>
    adminManageOrganizerBillsHandler({auth: {uid: "operator",
      token: {adminOwner: true}}, data: {month: null, organizerId: null,
      billId: null, expectedRevision: null, note: null, ...data}} as
      unknown as CallableRequest<unknown>, deps);
  return {deps, invoices, notices, call};
}

function bill(db: FakeFirestore, cycleNumber: number): OrganizerBillDocument {
  const found = [...db.docs].filter(([path]) =>
    path.startsWith("organizerBills/"))
    .map(([, data]) => data as unknown as OrganizerBillDocument)
    .find((item) => item.cycleNumber === cycleNumber);
  assert.ok(found, `cycle ${cycleNumber} has a bill`);
  return found;
}

function pointer(db: FakeFirestore): OrganizerBillingCycleDocument {
  return db.getDoc("organizerBillingCycles/org") as unknown as
    OrganizerBillingCycleDocument;
}

test("only a sent cycle bill counts toward the staff review", () => {
  assert.equal(staffReviewedCycles, 2);
  assert.equal(isReviewedCycleBill({periodKind: "cycle",
    sentAtMillis: 1}), true);
  // Free, prepaid tools-only and unsent bills were never sent.
  assert.equal(isReviewedCycleBill({periodKind: "cycle",
    sentAtMillis: null}), false);
  // Calendar months are not cycles.
  assert.equal(isReviewedCycleBill({periodKind: "calendarMonth",
    sentAtMillis: 1}), false);
  assert.equal(isReviewedCycleBill({periodKind: undefined,
    sentAtMillis: 1}), false);
  assert.equal(autoSendAtFor(1, 1000), null);
  assert.equal(autoSendAtFor(2, 1000), 1000 + dayMillis);
});

test("a host's first two cycle bills wait for staff; the third is sent " +
  "automatically the day after it is made", async () => {
  const db = seed({
    ...payment(cycleEnd(0) + dayMillis, 100_000),
    ...payment(cycleEnd(1) + dayMillis, 100_000),
    ...payment(cycleEnd(2) + dayMillis, 100_000),
  });
  const clock = {now: cycleEnd(1) + dayMillis};
  const {deps, notices, call, invoices} = harness(db, clock);

  assert.equal(await generateCycleBills(deps, null), 1);
  assert.equal(bill(db, 1).status, "toSend");
  assert.equal(bill(db, 1).autoSendAtMillis, null);
  assert.equal(await sendDueCycleBills(deps), 0);
  const first = await call({action: "list", organizerId: "org"});
  assert.deepEqual(first.billReview, {reviewedCycles: 0,
    reviewRequiredCycles: 2, hold: null, canHold: true});
  await call({action: "send", billId: bill(db, 1).billId,
    expectedRevision: bill(db, 1).revision});

  clock.now = cycleEnd(2) + dayMillis;
  assert.equal(await generateCycleBills(deps, null), 1);
  // One reviewed cycle so far: the second still waits.
  assert.equal(bill(db, 2).autoSendAtMillis, null);
  clock.now += 3 * dayMillis;
  assert.equal(await sendDueCycleBills(deps), 0);
  assert.equal(bill(db, 2).status, "toSend");
  await call({action: "send", billId: bill(db, 2).billId,
    expectedRevision: bill(db, 2).revision});

  clock.now = cycleEnd(3) + dayMillis;
  assert.equal(await generateCycleBills(deps, null), 1);
  const third = bill(db, 3);
  assert.equal(third.autoSendAtMillis, clock.now + dayMillis);
  // Not due on the day it is made.
  assert.equal(await sendDueCycleBills(deps), 0);
  // The next daily run, even firing a little early, sends it.
  clock.now += dayMillis - 30 * 60 * 1000;
  assert.equal(await sendDueCycleBills(deps), 1);
  const sent = bill(db, 3);
  assert.equal(sent.status, "sent");
  assert.ok(sent.invoiceNumber);
  assert.ok(sent.dueAtMillis);
  assert.equal(sent.razorpayInvoice?.url, "https://rzp.io/i/3");
  const last = sent.history[sent.history.length - 1];
  assert.equal(last.action, "sent");
  assert.equal(last.byUid, null);
  assert.match(last.note ?? "", /automatically/u);
  assert.deepEqual(notices, [`${bill(db, 1).billId}:issued`,
    `${bill(db, 2).billId}:issued`, `${sent.billId}:issued`]);
  assert.equal(invoices.created.length, 3);
  // Replaying the run sends nothing twice.
  assert.equal(await sendDueCycleBills(deps), 0);
  const review = await call({action: "list", organizerId: "org"});
  assert.equal(review.billReview?.reviewedCycles, 3);
});

test("a cycle with nothing to bill does not use up the review", async () => {
  const db = seed({
    ...payment(cycleEnd(0) + dayMillis, 100_000),
    // Cycle 2: a sale entirely refunded, so nothing to bill.
    ...payment(cycleEnd(1) + dayMillis, 100_000, 100_000),
    ...payment(cycleEnd(2) + dayMillis, 100_000),
  });
  const clock = {now: cycleEnd(1) + dayMillis};
  const {deps, call} = harness(db, clock);
  await generateCycleBills(deps, null);
  await call({action: "send", billId: bill(db, 1).billId,
    expectedRevision: bill(db, 1).revision});
  clock.now = cycleEnd(2) + dayMillis;
  // Nothing to bill: the pointer moves on without a bill.
  assert.equal(await generateCycleBills(deps, null), 0);
  assert.equal(pointer(db).nextCycleNumber, 3);
  clock.now = cycleEnd(3) + dayMillis;
  await generateCycleBills(deps, null);
  // Only one cycle was reviewed: the third waits for staff too.
  assert.equal(bill(db, 3).autoSendAtMillis, null);
});

/**
 * An organizer whose first two cycles staff already sent, with cycle 3 made
 * and due to go out automatically tomorrow.
 * @return {object} Database, clock and harness.
 */
async function reviewedOrganizer() {
  const db = seed({
    ...payment(cycleEnd(0) + dayMillis, 100_000),
    ...payment(cycleEnd(1) + dayMillis, 100_000),
    ...payment(cycleEnd(2) + dayMillis, 200_000),
  });
  const clock = {now: cycleEnd(1) + dayMillis};
  const tools = harness(db, clock);
  for (const n of [1, 2]) {
    clock.now = cycleEnd(n) + dayMillis;
    await generateCycleBills(tools.deps, null);
    await tools.call({action: "send", billId: bill(db, n).billId,
      expectedRevision: bill(db, n).revision});
  }
  clock.now = cycleEnd(3) + dayMillis;
  await generateCycleBills(tools.deps, null);
  return {db, clock, ...tools};
}

test("a hold on one bill stops it going out automatically until released",
  async () => {
    const {db, clock, deps, call} = await reviewedOrganizer();
    const third = bill(db, 3);
    await call({action: "hold", billId: third.billId,
      expectedRevision: third.revision, note: "Disputed refund"});
    const held = bill(db, 3);
    assert.equal(held.sendHold?.byUid, "operator");
    assert.equal(held.sendHold?.note, "Disputed refund");
    assert.equal(held.history[held.history.length - 1].action, "held");
    await assert.rejects(call({action: "hold", billId: held.billId,
      expectedRevision: held.revision}), /already on hold/u);
    clock.now += 2 * dayMillis;
    assert.equal(await sendDueCycleBills(deps), 0);
    assert.equal(bill(db, 3).status, "toSend");
    await call({action: "releaseHold", billId: held.billId,
      expectedRevision: held.revision});
    assert.equal(bill(db, 3).sendHold, null);
    assert.equal(await sendDueCycleBills(deps), 1);
    assert.equal(bill(db, 3).status, "sent");
  });

test("staff can still send a held bill, and a bill that waits for review " +
  "cannot be held", async () => {
  const {db, call} = await reviewedOrganizer();
  const third = bill(db, 3);
  await call({action: "hold", billId: third.billId,
    expectedRevision: third.revision});
  const held = bill(db, 3);
  await call({action: "send", billId: held.billId,
    expectedRevision: held.revision});
  assert.equal(bill(db, 3).status, "sent");
  assert.equal(bill(db, 3).sendHold, null);

  const fresh = seed({...payment(cycleEnd(0) + dayMillis, 100_000)});
  const clock = {now: cycleEnd(1) + dayMillis};
  const other = harness(fresh, clock);
  await generateCycleBills(other.deps, null);
  await assert.rejects(other.call({action: "hold",
    billId: bill(fresh, 1).billId, expectedRevision: bill(fresh, 1).revision}),
  /waits for staff/u);
});

test("an organizer hold stops every automatic send until released",
  async () => {
    const {db, clock, deps, call} = await reviewedOrganizer();
    const listed = await call({action: "holdOrganizer", organizerId: "org",
      note: "Chargeback under review"});
    assert.equal(listed.billReview?.hold?.note, "Chargeback under review");
    assert.deepEqual(listed.heldOrganizerIds, ["org"]);
    assert.equal(pointer(db).sendHold?.byUid, "operator");
    const month = await call({action: "list", month: bill(db, 3).month});
    assert.deepEqual(month.heldOrganizerIds, ["org"]);
    clock.now += 2 * dayMillis;
    assert.equal(await sendDueCycleBills(deps), 0);
    // A new cycle billed while held still writes the pointer with the hold.
    assert.equal(pointer(db).sendHold?.note, "Chargeback under review");
    await assert.rejects(call({action: "holdOrganizer", organizerId: "org"}),
      /already on hold/u);
    await call({action: "releaseOrganizerHold", organizerId: "org"});
    assert.equal(pointer(db).sendHold, null);
    assert.equal(await sendDueCycleBills(deps), 1);
  });

test("an organizer not yet billed for a cycle has nothing to hold",
  async () => {
    const db = seed();
    const {call} = harness(db, {now: trialEnd - dayMillis});
    const listed = await call({action: "list", organizerId: "org"});
    assert.deepEqual(listed.billReview, {reviewedCycles: 0,
      reviewRequiredCycles: 2, hold: null, canHold: false});
    await assert.rejects(call({action: "holdOrganizer", organizerId: "org"}),
      /not been billed for a cycle/u);
    // An organizer action names the organizer and nothing else.
    await assert.rejects(call({action: "holdOrganizer", organizerId: null}),
      /Invalid bill action/u);
    await assert.rejects(call({action: "holdOrganizer", organizerId: "org",
      month: "2026-11"}), /Invalid bill action/u);
  });

test("a refund made before the automatic send is counted in the bill sent",
  async () => {
    const {db, clock, deps} = await reviewedOrganizer();
    const before = bill(db, 3);
    assert.equal(before.totalMinor, 10_000);
    // Half of cycle 3's ₹2,000 sale is refunded before the bill goes out.
    const [path] = [...db.docs].find(([, data]) =>
      (data as {amountPaise?: number}).amountPaise === 200_000) ?? [];
    assert.ok(path);
    db.setDoc(path, {...db.getDoc(path), refundedAmountPaise: 100_000});
    clock.now += dayMillis;
    assert.equal(await sendDueCycleBills(deps), 1);
    const sent = bill(db, 3);
    assert.equal(sent.status, "sent");
    assert.equal(sent.totalMinor, 5_000);
  });
