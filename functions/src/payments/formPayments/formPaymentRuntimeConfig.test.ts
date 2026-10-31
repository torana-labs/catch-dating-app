import assert from "node:assert/strict";
import test from "node:test";
import {FormPaymentRuntimeConfig} from "./formPaymentRuntimeConfig";

const version = "projects/catch-test/secrets/FORM_PARTNER/versions/1";
const read = (data: unknown, name = version) =>
  async () => ({name, data: JSON.stringify(data)});
const config = {schema: "catch.form-razorpay-partner/v1",
  clientId: "client", clientSecret: "private", mode: "test",
  credentialSecretId: "FORM_MERCHANT_CREDENTIALS"};

test("unconfigured, foreign and floating config references never read secrets",
  async () => {
    let reads = 0;
    const loader = new FormPaymentRuntimeConfig("catch-test", async () => {
      reads++;
      return {name: version, data: JSON.stringify(config)};
    });
    for (const ref of ["", version.replace("catch-test", "foreign-project"),
      version.replace("/1", "/latest"), version.replace("/1", "/01")]) {
      await assert.rejects(loader.load(ref), /not configured/u);
    }
    assert.equal(reads, 0);
  });

test("configuration owns the callback and bounds credential caching",
  async () => {
    let reads = 0;
    let now = 1000;
    const loader = new FormPaymentRuntimeConfig("catch-test", async () => {
      reads++;
      return {name: version, data: JSON.stringify(config)};
    }, () => now);
    const [first, second] = await Promise.all([loader.load(version),
      loader.load(version)]);
    assert.equal(reads, 1);
    assert.equal(first.callbackUrl,
      "https://asia-south1-catch-test.cloudfunctions.net/" +
      "organizerFormPaymentOauthCallback");
    assert.equal(first.mode, "test");
    assert.equal(second.webhookBaseUrl,
      "https://asia-south1-catch-test.cloudfunctions.net/" +
      "organizerFormPaymentWebhook");
    now += 60_000;
    await loader.load(version);
    assert.equal(reads, 2);
  });

test("failed config loads are sanitized and retryable", async () => {
  let calls = 0;
  const loader = new FormPaymentRuntimeConfig("catch-test", async () => {
    if (calls++ === 0) throw new Error("Backend error private-secret");
    return {name: version, data: JSON.stringify(config)};
  });
  await assert.rejects(loader.load(version), (error: Error) => {
    assert.equal(error.message.includes("private-secret"), false);
    return true;
  });
  assert.equal((await loader.load(version)).mode, "test");
  for (const patch of [{mode: "unknown"}, {callbackUrl: "https://foreign.test"},
    {credentialSecretId: "../OTHER"}, {clientSecret: " "}, {schema: "other"}]) {
    await assert.rejects(new FormPaymentRuntimeConfig("catch-test",
      read({...config, ...patch})).load(version), /not configured/u);
  }
});

test("concurrent readers cannot expose secret errors", async () => {
  const loader = new FormPaymentRuntimeConfig("catch-test", async () => {
    throw new Error("private-secret-backend-error");
  });
  const results = await Promise.allSettled([loader.load(version),
    loader.load(version)]);
  for (const result of results) {
    assert.equal(result.status, "rejected");
    if (result.status === "rejected") {
      assert.match(String(result.reason), /not configured/u);
      assert.doesNotMatch(String(result.reason), /private-secret/u);
    }
  }
});

test("the newest version is read at runtime and recorded exactly",
  async () => {
    const names: string[] = [];
    let stored = 1;
    let now = 1000;
    const loader = new FormPaymentRuntimeConfig("catch-test", async (name) => {
      names.push(name);
      return {name: "projects/123456/secrets/FORM_RAZORPAY_PARTNER_CONFIG/" +
        `versions/${stored}`, data: JSON.stringify(config)};
    }, () => now);
    assert.equal(await loader.configured(), true);
    assert.equal((await loader.load()).version,
      "projects/catch-test/secrets/FORM_RAZORPAY_PARTNER_CONFIG/versions/1");
    assert.deepEqual(names, ["projects/catch-test/secrets/" +
      "FORM_RAZORPAY_PARTNER_CONFIG/versions/latest"]);
    stored = 2;
    now += 60_000;
    assert.equal((await loader.load()).version,
      "projects/catch-test/secrets/FORM_RAZORPAY_PARTNER_CONFIG/versions/2");
    // A record keeps reading the version it was created under.
    const pinned =
      "projects/catch-test/secrets/FORM_RAZORPAY_PARTNER_CONFIG/versions/1";
    stored = 1;
    assert.equal((await loader.load(pinned)).version, pinned);
  });

test("no stored version, or another secret answering, is unconfigured",
  async () => {
    const missing = new FormPaymentRuntimeConfig("catch-test", async () => {
      throw new Error("NOT_FOUND private-secret");
    });
    assert.equal(await missing.configured(), false);
    await assert.rejects(missing.load(), /not configured/u);
    const foreign = new FormPaymentRuntimeConfig("catch-test",
      read(config, "projects/1/secrets/OTHER/versions/3"));
    assert.equal(await foreign.configured(), false);
    const mismatched = new FormPaymentRuntimeConfig("catch-test",
      read(config, version.replace("/1", "/2")));
    await assert.rejects(mismatched.load(version), /not configured/u);
  });
