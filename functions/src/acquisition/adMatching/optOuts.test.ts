import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {FakeFirestore} from "../../shared/testing/programFirestore";
import {
  hashedEmail,
  hashedPhone,
} from "../adConversions/hostConversions";
import {hostDeliveryRecords} from "../adConversions/deliveries";
import {
  activeAdMatchingOptOutIds,
  adMatchingDigestsFromContact,
  adMatchingKeys,
  adMatchingOptOutId,
  inAdMatchingOptOuts,
  isAdMatchingOptedOut,
} from "./optOuts";

const sha = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

test("typed contact details hash to the digests the queue sends", () => {
  const typed = adMatchingDigestsFromContact({phone: " 98765-43210 ",
    email: "  Host@Example.COM "});
  assert.equal(typed.phoneSha256, hashedPhone("+919876543210"));
  assert.equal(typed.emailSha256, hashedEmail("host@example.com"));
  const [record] = hostDeliveryRecords({organizerId: "org-1",
    conversion: "organizer_signup",
    organizer: {ownership: {state: "claimed", ownerUserId: "host-1"}},
    owner: {phoneNumber: "+919876543210", email: "host@example.com"},
    nowMillis: Date.parse("2026-11-17T12:00:00Z")});
  assert.equal(record.matching.phoneSha256, typed.phoneSha256);
  assert.equal(record.matching.emailSha256, typed.emailSha256);
  assert.deepEqual(adMatchingKeys(record.matching), adMatchingKeys(typed));
  // With a country code, a 00 prefix, or not a complete number.
  assert.equal(adMatchingDigestsFromContact({phone: "+91 98765 43210",
    email: null}).phoneSha256, typed.phoneSha256);
  assert.equal(adMatchingDigestsFromContact({phone: "12345",
    email: "nope"}).phoneSha256, null);
  assert.equal(adMatchingDigestsFromContact({phone: null,
    email: "nope"}).emailSha256, null);
});

test("opt-out IDs are domain-separated from the digests themselves", () => {
  const digest = hashedPhone("+919876543210")!;
  const id = adMatchingOptOutId("phone", digest);
  assert.equal(id, sha(`catch-ad-matching-opt-out-v1:phone:${digest}`));
  assert.notEqual(id, digest);
  assert.notEqual(id, adMatchingOptOutId("email", digest));
  assert.match(id, /^[a-f0-9]{64}$/u);
  assert.deepEqual(adMatchingKeys({phoneSha256: "not-a-digest",
    emailSha256: null}), []);
});

test("only active records opt a person out", async () => {
  const phone = hashedPhone("+919876543210")!;
  const email = hashedEmail("host@example.com")!;
  const db = new FakeFirestore({
    [`adMatchingOptOuts/${adMatchingOptOutId("phone", phone)}`]:
      {status: "active"},
    [`adMatchingOptOuts/${adMatchingOptOutId("email", email)}`]:
      {status: "removed"},
  }) as never;
  assert.equal(await isAdMatchingOptedOut(db, {phoneSha256: phone}), true);
  assert.equal(await isAdMatchingOptedOut(db, {emailSha256: email}), false);
  assert.equal(await isAdMatchingOptedOut(db,
    {phoneSha256: null, emailSha256: email}), false);
  const ids = await activeAdMatchingOptOutIds(db);
  assert.deepEqual([...ids], [adMatchingOptOutId("phone", phone)]);
  assert.equal(inAdMatchingOptOuts(ids, {phoneSha256: null,
    emailSha256: email}), false);
  assert.equal(inAdMatchingOptOuts(ids, {phoneSha256: phone,
    emailSha256: email}), true);
});
