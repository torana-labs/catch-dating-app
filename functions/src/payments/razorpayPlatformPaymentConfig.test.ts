import {strict as assert} from "node:assert";
import {test} from "node:test";
import {RazorpayPlatformPaymentConfigLoader} from
  "./razorpayPlatformPaymentConfig";

const version = "projects/catch-test/secrets/PLATFORM_PAYMENTS/versions/1";
const config = {schema: "catch.razorpay-platform-payments/v1", mode: "test",
  platformAccountId: "acc_catch", keyId: "rzp_test_platform",
  keySecret: "secret", webhookSecret: "webhook-secret",
  feeBasisPoints: {formFee: 0, eventAdmission: 0}};

test("Route profile uses a pinned same-project version", async () => {
  const reads: string[] = [];
  const loader = new RazorpayPlatformPaymentConfigLoader("catch-test",
    async (ref) => {
      reads.push(ref); return JSON.stringify(config);
    });
  const [first, second] = await Promise.all([
    loader.load(version), loader.load(version),
  ]);
  assert.equal(first.keyId, "rzp_test_platform");
  assert.deepEqual(first, second);
  assert.deepEqual(reads, [version]);
  for (const invalid of ["", version.replace("/1", "/latest"),
    version.replace("catch-test", "foreign-project")]) {
    await assert.rejects(loader.load(invalid), /not configured/);
  }
  assert.deepEqual(reads, [version]);
});

test("profile rejects mismatched mode and implicit commissions", async () => {
  for (const patch of [{mode: "live"}, {feeBasisPoints: {formFee: 0}},
    {feeBasisPoints: {formFee: -1, eventAdmission: 0}},
    {webhookSecret: ""}, {clientSecret: "oauth-is-separate"}]) {
    const loader = new RazorpayPlatformPaymentConfigLoader("catch-test",
      async () => JSON.stringify({...config, ...patch}));
    await assert.rejects(loader.load(version), /not configured/);
  }
  const loader = new RazorpayPlatformPaymentConfigLoader("catch-test",
    async () => {
      throw new Error("private provider credentials");
    });
  await assert.rejects(loader.load(version), (error: Error) =>
    !error.message.includes("private"));
});

test("profile accepts an optional host membership fee and nothing else",
  async () => {
    const withMembership = new RazorpayPlatformPaymentConfigLoader(
      "catch-test", async () => JSON.stringify({...config,
        feeBasisPoints: {formFee: 0, eventAdmission: 0,
          hostMembership: 750}}));
    assert.equal((await withMembership.load(version)).feeBasisPoints
      .hostMembership, 750);
    for (const feeBasisPoints of [
      {formFee: 0, eventAdmission: 0, hostMembership: 10000},
      {formFee: 0, eventAdmission: 0, membership: 500},
    ]) {
      const loader = new RazorpayPlatformPaymentConfigLoader("catch-test",
        async () => JSON.stringify({...config, feeBasisPoints}));
      await assert.rejects(loader.load(version), /not configured/);
    }
  });
