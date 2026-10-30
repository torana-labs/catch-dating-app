import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {requireReadyFormPaymentConnection} from "./formPaymentConnectionPolicy";
import {BRAND} from "../../shared/generated/brand";

const now = Timestamp.fromMillis(1000);
const connection: NonNullable<Parameters<
  typeof requireReadyFormPaymentConnection>[0]> = {
    organizerId: "organizer", provider: "razorpay", mode: "test",
    status: "ready",
    accountId: "acc_merchant", publicToken: "rzp_test_oauth_public",
    secretVersionResource: "projects/catch-test/secrets/FORM_TOKENS/versions/1",
    tokenExpiresAt: Timestamp.fromMillis(10000), webhookId: "webhook1",
    webhookUrl: `${BRAND.web.origin}/form-payments/webhook/connection`,
    webhookVerifiedAt: now, connectedByUid: "host", revision: 1,
    refreshLeaseUntil: null, createdAt: now, updatedAt: now,
    disconnectedAt: null, lastErrorCode: null,
  };

test("paid publication requires a ready same-organizer merchant and webhook",
  () => {
    assert.equal(requireReadyFormPaymentConnection(connection, "organizer",
      1000), connection);
    assert.throws(() => requireReadyFormPaymentConnection(null, "organizer",
      1000), /Connect Razorpay/u);
    for (const patch of [{organizerId: "other"},
      {status: "connecting" as const}, {status: "needsAttention" as const},
      {status: "disconnected" as const}, {publicToken: "rzp_live_oauth_public"},
      {webhookVerifiedAt: null}, {webhookId: null},
      {secretVersionResource: null}, {tokenExpiresAt: now},
      {disconnectedAt: now}, {lastErrorCode: "revoked"}]) {
      assert.throws(() => requireReadyFormPaymentConnection({
        ...connection, ...patch}, "organizer", 1000), /Connect Razorpay/u);
    }
  });
