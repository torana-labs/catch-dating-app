import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {createFormPaymentFixture} from "./formPaymentTestStore";
import {listOrganizerFormPaymentsHandler, projectLedgerRow,
  readResponsePayment} from
  "./formPaymentLedger";
import type {OrganizerFormResponseDocument} from
  "../../shared/generated/firestoreAdminTypes";

const data = {organizerId: "org", formId: "form", statuses: [],
  cursor: null, limit: 20};
function request(input: unknown): CallableRequest<unknown> {
  return {auth: {uid: "host"}, data: input} as CallableRequest<unknown>;
}

test("ledger checks manager and form ownership before listing payments",
  async () => {
    const h = createFormPaymentFixture();
    let managers = 0;
    const deps = {db: () => h.db, rateLimit: async () => undefined,
      requireManager: async (): Promise<void> => {
        managers++;
        throw new Error("Not manager");
      }};
    await assert.rejects(listOrganizerFormPaymentsHandler(request(data), deps),
      /Not manager/u);
    assert.equal(managers, 1);
    deps.requireManager = async () => {
      managers++;
    };
    await assert.rejects(listOrganizerFormPaymentsHandler(
      request({...data, organizerId: "other"}), deps), /Form not found/u);
    await assert.rejects(listOrganizerFormPaymentsHandler(
      request({...data, cursor: "foreign-or-malformed"}), deps),
    /cursor is invalid/u);
    await assert.rejects(listOrganizerFormPaymentsHandler(
      request({...data, limit: 10000}), deps));
  });

test("ledger projects money and references without private respondent state",
  async () => {
    const h = createFormPaymentFixture();
    const {payment, paymentId} = await h.reserve();
    const row = projectLedgerRow(paymentId, payment);
    assert.equal(row.amountPaise, 10000);
    assert.equal(row.responseId, null);
    assert.equal(row.providerPaymentId, null);
    assert.equal("identity" in row, false);
    assert.equal("respondentUid" in row, false);
    assert.equal("draftId" in row, false);
    assert.equal("answersHash" in row, false);
    assert.equal("connectionId" in row, false);
    assert.equal("accountId" in row, false);
  });

test("response payment rejects mismatched records at the frozen draft link",
  async () => {
    const h = createFormPaymentFixture();
    const {paymentId} = await h.reserve();
    h.capture(paymentId);
    await h.finalize(paymentId);
    const entry = [...h.store.records.entries()].find(([path]) =>
      path.startsWith("organizerFormResponses/"))!;
    const responseId = entry[0].split("/")[1];
    const response = entry[1] as unknown as OrganizerFormResponseDocument;
    const row = await readResponsePayment(h.db, responseId, response);
    assert.equal(row?.paymentId, paymentId);
    assert.equal(row?.status, "submitted");
    assert.equal(row?.responseId, responseId);
    assert.equal("identity" in row!, false);
    const fields = ["organizerId", "formId", "versionId",
      "respondentUid"] as const;
    for (const field of fields) {
      await assert.rejects(readResponsePayment(h.db, responseId,
        {...response, [field]: "foreign"}), /could not be loaded/u);
    }
    await assert.rejects(readResponsePayment(h.db, "other-response", response),
      /could not be loaded/u);
    assert.equal(await readResponsePayment(h.db, responseId,
      {...response, draftId: "free-draft"}), null);
    // Refunds remain visible without manufacturing a new application outcome.
    const path = `guestPayments/${paymentId}`;
    h.store.records.set(path, {...h.store.records.get(path),
      status: "refunded", refundedAmountPaise: 10000});
    const refunded = await readResponsePayment(h.db, responseId, response);
    assert.equal(refunded?.status, "refunded");
  });
