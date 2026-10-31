import assert from "node:assert/strict";
import test from "node:test";
import {providerFeesUpdate} from "./formPayments/razorpayPaymentProvider";
import {paymentProviderFees} from "./paymentValidation";

const payment = {id: "pay_1", orderId: "order_1", amount: 50_000,
  currency: "INR", status: "captured" as const, captured: true,
  amountRefunded: 0};

test("a captured payment stores Razorpay's fee and tax once", () => {
  assert.deepEqual(providerFeesUpdate({...payment, fee: 1_180, tax: 180},
    undefined), {providerFees: {feePaise: 1_180, taxPaise: 180}});
  assert.deepEqual(providerFeesUpdate({...payment, fee: 1_180, tax: null},
    undefined), {providerFees: {feePaise: 1_180, taxPaise: 0}});
  // Already stored, not captured, or not reported: nothing to write.
  assert.deepEqual(providerFeesUpdate({...payment, fee: 1_180, tax: 180},
    {feePaise: 1, taxPaise: 0}), {});
  assert.deepEqual(providerFeesUpdate({...payment, status: "authorized",
    captured: false, fee: 1_180, tax: 180}, undefined), {});
  assert.deepEqual(providerFeesUpdate({...payment, fee: null}, undefined), {});
});

test("a native payment entity's fee and tax ride on the booking", () => {
  assert.deepEqual(paymentProviderFees({fee: 708, tax: 108}),
    {providerFees: {feePaise: 708, taxPaise: 108}});
  assert.deepEqual(paymentProviderFees({fee: null}), {});
  assert.deepEqual(paymentProviderFees({fee: -1, tax: 2}), {});
  assert.deepEqual(paymentProviderFees({fee: 1.5}), {});
});
