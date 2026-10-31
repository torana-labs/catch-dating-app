import assert from "node:assert/strict";
import test from "node:test";
import {createFormPaymentFixture} from "./formPaymentTestStore";
import {projectFormPayment} from "./formPaymentProjection";
import type {GetOrganizerFormPaymentCallableResponse} from
  "../../shared/generated/getOrganizerFormPaymentCallableResponse";
import {contractValidator} from "../../shared/contractTestValidators";

const validateGetOrganizerFormPaymentCallableResponse =
  contractValidator<GetOrganizerFormPaymentCallableResponse>(
    "GetOrganizerFormPaymentCallableResponse"
  );

test("checkout projection is owner-bound, closed on expiry and secret-free",
  async () => {
    const h = createFormPaymentFixture();
    const {paymentId, payment} = await h.reserve();
    const ready = {...payment, status: "checkoutReady" as const,
      providerOrderId: "order_one"};
    const input = {db: h.db, paymentId, payment: ready,
      respondentUid: "person", now: 1000};
    await assert.rejects(projectFormPayment({...input,
      respondentUid: "other"}), /unavailable/u);
    const output = await projectFormPayment(input);
    assert.ok(validateGetOrganizerFormPaymentCallableResponse(output));
    assert.equal(output.checkout?.amountPaise, 10000);
    assert.equal(output.receipt, null);
    assert.equal(JSON.stringify(output).includes("secretVersion"), false);
    assert.equal(JSON.stringify(output).includes("accessToken"), false);
    assert.equal((await projectFormPayment({...input,
      now: payment.checkoutExpiresAt.toMillis()})).checkout, null);
    h.store.records.set("organizerPaymentConnections/connection", {
      ...h.store.records.get("organizerPaymentConnections/connection"),
      status: "disconnected"});
    assert.equal((await projectFormPayment(input)).checkout, null);
  });

test("only a real submitted response exposes completion; paid alone does not",
  async () => {
    const h = createFormPaymentFixture();
    const {paymentId} = await h.reserve();
    h.capture(paymentId);
    const read = () => h.store.records.get(
      `organizerFormPayments/${paymentId}`)!;
    const project = () => projectFormPayment({db: h.db, paymentId,
      payment: read() as unknown as Parameters<
        typeof projectFormPayment>[0]["payment"],
      respondentUid: "person", now: 1000});
    assert.equal((await project()).receipt, null);
    await h.finalize(paymentId);
    const completed = await project();
    assert.ok(validateGetOrganizerFormPaymentCallableResponse(completed));
    assert.equal(completed.receipt?.completion.title, "Received");
    assert.equal(completed.checkout, null);
    assert.equal(completed.receipt?.withdrawalToken, null);
    const responsePath = `organizerFormResponses/${read().responseId}`;
    h.store.records.set(responsePath, {...h.store.records.get(responsePath),
      respondentUid: "other"});
    await assert.rejects(project(), /unavailable/u);
  });
