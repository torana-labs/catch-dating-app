import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {OrganizerBillDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  listOrganizerBillsHandler,
  ownBillView,
  type OwnBillDeps,
} from "./organizerOwnBills";

function bill(month: string, status: OrganizerBillDocument["status"],
  extra: Partial<OrganizerBillDocument> = {}): OrganizerBillDocument {
  return {schemaVersion: 1, billId: `org_${month}`, organizerId: "org",
    organizerName: "Lantern Lane", month, periodStartMillis: 1,
    periodEndMillis: 2, revision: 3, status,
    sales: {paymentCount: 3, eventCount: 2, grossMinor: 100_000,
      refundedMinor: 1_000, baseMinor: 99_000, providerFeeMinor: 500,
      providerTaxMinor: 90, unsnapshottedCount: 1},
    commission: {rateBasisPoints: 500, uncappedMinor: 4_950,
      capMinor: 1_000_000, capped: false, trialWaivedMinor: 0,
      amountMinor: 4_950},
    trialEndsAtMillis: null,
    terms: {platformRevision: 1, organizerRevision: 0, ownTerms: false},
    gst: {registered: false, rateBasisPoints: 0, amountMinor: 0},
    totalMinor: 4_950, invoiceNumber: "2026-27/031", dueAtMillis: 9,
    paymentLink: {linkId: "plink_abc", url: "https://rzp.io/l/abc"},
    sentAtMillis: 5, reminders: [{atMillis: 6, byUid: "staff"}],
    paidAtMillis: null, paidMinor: null, paidVia: null,
    writtenOffAtMillis: null,
    history: [{atMillis: 5, action: "sent", byUid: "staff", note: "internal"}],
    generatedAtMillis: 1, updatedAtMillis: 1, ...extra} as
    OrganizerBillDocument;
}

function deps(owner: string, bills: OrganizerBillDocument[]): OwnBillDeps {
  const db = {
    collection: (name: string) => name === "organizers" ? {
      doc: () => ({get: async () => ({data: () => (
        {ownerUserId: owner, hostUserIds: [owner, "manager"]})})}),
    } : {
      where: () => ({limit: () => ({get: async () => ({
        docs: bills.map((item) => ({data: () => item})),
      })})}),
    },
  };
  return {
    db: () => db as unknown as FirebaseFirestore.Firestore,
    checkRateLimit: async () => undefined,
  };
}

const request = (uid: string) => ({auth: {uid}, data: {organizerId: "org"}}) as
  unknown as CallableRequest<unknown>;

test("an unsent bill is never shown to its organizer", () => {
  assert.equal(ownBillView(bill("2026-10", "toSend")), null);
});

test("staff-only fields stay with staff", () => {
  const view = ownBillView(bill("2026-10", "sent"));
  const json = JSON.stringify(view);
  for (const hidden of ["staff", "internal", "reminders", "history", "revision",
    "linkId", "organizerName"]) {
    assert.ok(!json.includes(hidden), hidden);
  }
  assert.equal(view?.paymentUrl, "https://rzp.io/l/abc");
});

test("the payment link goes away once a bill is closed", () => {
  for (const status of ["paid", "writtenOff", "free"] as const) {
    const view = ownBillView(bill("2026-10", status));
    assert.equal(view?.paymentUrl, null, status);
  }
});

test("the owner reads sent and closed bills, newest month first", async () => {
  const result = await listOrganizerBillsHandler(request("owner"),
    deps("owner", [bill("2026-08", "free"), bill("2026-10", "sent"),
      bill("2026-11", "toSend"), bill("2026-09", "paid",
        {paidMinor: 4_950, paidAtMillis: 7})]));
  assert.deepEqual(result.bills.map((item) => item.month),
    ["2026-10", "2026-09", "2026-08"]);
});

test("a manager cannot read the owner's bills", async () => {
  await assert.rejects(listOrganizerBillsHandler(request("manager"),
    deps("owner", [bill("2026-10", "sent")])), {code: "permission-denied"});
});

test("signing in is required", async () => {
  await assert.rejects(listOrganizerBillsHandler(
    {data: {organizerId: "org"}} as unknown as CallableRequest<unknown>,
    deps("owner", [])), {code: "unauthenticated"});
});
