import assert from "node:assert/strict";
import test from "node:test";
import type {OrganizerBillDocument} from
  "../shared/generated/firestoreAdminTypes";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {ownBillView} from "../money/organizerOwnBills";
import {
  organizerBillView,
  reconcileOrganizerBillView,
} from "./organizerBillViewStore";

function bill(status: OrganizerBillDocument["status"],
  extra: Partial<OrganizerBillDocument> = {}): OrganizerBillDocument {
  return {schemaVersion: 1, billId: "org_2026-10", organizerId: "org",
    organizerName: "Lantern Lane", month: "2026-10", periodStartMillis: 1,
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

test("a sent bill's view is exactly the listOrganizerBills row", () => {
  const view = organizerBillView("org_2026-10", bill("sent"));
  assert.deepEqual(view, {organizerId: "org", billId: "org_2026-10",
    periodEndMillis: 2, month: "2026-10", bill: ownBillView(bill("sent")),
    version: 1});
  const json = JSON.stringify(view);
  for (const hidden of ["staff", "internal", "reminders", "history",
    "linkId", "organizerName"]) {
    assert.ok(!json.includes(hidden), hidden);
  }
});

test("an unsent, foreign-id or ownerless bill has no view", () => {
  assert.equal(organizerBillView("org_2026-10", bill("toSend")), null);
  assert.equal(organizerBillView("other_2026-10", bill("sent")), null);
  assert.equal(organizerBillView("org_2026-10",
    bill("sent", {organizerId: ""})), null);
  assert.equal(organizerBillView("org_2026-10", undefined), null);
});

test("the view follows the bill and drops its payment link once paid",
  async () => {
    const db = new AudienceTestStore({
      "organizerBills/org_2026-10": bill("toSend") as never,
    });
    await reconcileOrganizerBillView(db.asFirestore(), "org_2026-10");
    assert.equal(db.docs["hostOrganizerBillViews/org_2026-10"], undefined);

    db.docs["organizerBills/org_2026-10"] = bill("sent") as never;
    await reconcileOrganizerBillView(db.asFirestore(), "org_2026-10");
    const sent = db.docs["hostOrganizerBillViews/org_2026-10"] as {
      bill: {paymentUrl: string | null; status: string}};
    assert.equal(sent.bill.paymentUrl, "https://rzp.io/l/abc");

    db.docs["organizerBills/org_2026-10"] = bill("paid",
      {paidAtMillis: 10, paidMinor: 4_950}) as never;
    await reconcileOrganizerBillView(db.asFirestore(), "org_2026-10");
    const paid = db.docs["hostOrganizerBillViews/org_2026-10"] as {
      bill: {paymentUrl: string | null; status: string}};
    assert.equal(paid.bill.status, "paid");
    assert.equal(paid.bill.paymentUrl, null);

    delete db.docs["organizerBills/org_2026-10"];
    await reconcileOrganizerBillView(db.asFirestore(), "org_2026-10");
    assert.equal(db.docs["hostOrganizerBillViews/org_2026-10"], undefined);
  });

test("an unchanged bill writes nothing", async () => {
  const db = new AudienceTestStore({
    "organizerBills/org_2026-10": bill("sent") as never,
  });
  await reconcileOrganizerBillView(db.asFirestore(), "org_2026-10");
  const first = db.docs["hostOrganizerBillViews/org_2026-10"];
  await reconcileOrganizerBillView(db.asFirestore(), "org_2026-10");
  assert.equal(db.docs["hostOrganizerBillViews/org_2026-10"], first);
});
