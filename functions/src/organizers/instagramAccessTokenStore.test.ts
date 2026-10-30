import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {InstagramAccessTokenSource} from "./instagramAccessTokenStore";
import {
  createInstagramTokenFixture,
  testAccountId,
  testSecretParent,
} from "./instagramAccessTokenTestStore";

const renewed = "IGAA-renewed-token-0000000000";
const pinned = "IGAA-pinned-token-00000000000";

test("a renewed token becomes a new version of the same secret", async () => {
  const h = createInstagramTokenFixture();
  const version = await h.store.addToken(renewed);
  assert.equal(version, `${testSecretParent}/versions/1`);
  assert.equal(await h.store.readToken(version), renewed);
});

test("only an exact version of this project's token secret is read",
  async () => {
    const h = createInstagramTokenFixture();
    h.versions.set("projects/other-project/secrets/" +
      "CATCH_INSTAGRAM_ACCESS_TOKEN/versions/1", renewed);
    h.versions.set("projects/catch-test-project/secrets/" +
      "CATCH_INSTAGRAM_APP_SECRET/versions/1", renewed);
    for (const version of [
      "projects/other-project/secrets/CATCH_INSTAGRAM_ACCESS_TOKEN/versions/1",
      "projects/catch-test-project/secrets/CATCH_INSTAGRAM_APP_SECRET/" +
        "versions/1",
      `${testSecretParent}/versions/latest`,
    ]) {
      await assert.rejects(h.store.readToken(version));
    }
  });

test("a refresh moves the record forward only from the revision it read",
  async () => {
    const h = createInstagramTokenFixture();
    const secretVersion = await h.store.addToken(renewed);
    assert.equal(await h.store.saveRefresh(testAccountId, null,
      {secretVersion, expiresAtMillis: 5_000, nowMillis: 1_000}), true);
    assert.deepEqual(h.record(), {accountId: testAccountId, secretVersion,
      expiresAt: Timestamp.fromMillis(5_000),
      refreshedAt: Timestamp.fromMillis(1_000),
      lastAttemptAt: Timestamp.fromMillis(1_000), lastErrorCode: null,
      revision: 1});
    // A second run that read no record lost the race.
    assert.equal(await h.store.saveRefresh(testAccountId, null,
      {secretVersion, expiresAtMillis: 9_000, nowMillis: 2_000}), false);
    assert.equal(h.record()?.revision, 1);
  });

test("a failure keeps the token unless Meta rejected it", async () => {
  const h = createInstagramTokenFixture();
  const secretVersion = await h.store.addToken(renewed);
  await h.store.saveRefresh(testAccountId, null,
    {secretVersion, expiresAtMillis: 5_000, nowMillis: 1_000});
  await h.store.saveFailure(testAccountId, 1,
    {code: "refreshFailed", dropToken: false, nowMillis: 2_000});
  assert.equal(h.record()?.secretVersion, secretVersion);
  assert.equal(h.record()?.lastErrorCode, "refreshFailed");
  assert.equal(h.record()?.revision, 2);
  await h.store.saveFailure(testAccountId, 2,
    {code: "refreshRejected", dropToken: true, nowMillis: 3_000});
  assert.equal(h.record()?.secretVersion, null);
  assert.equal(h.record()?.expiresAt, null);
  assert.deepEqual(h.record()?.refreshedAt, Timestamp.fromMillis(1_000));
});

test("the webhook uses the renewed token while it is valid", async () => {
  const h = createInstagramTokenFixture();
  const secretVersion = await h.store.addToken(renewed);
  await h.store.saveRefresh(testAccountId, null,
    {secretVersion, expiresAtMillis: 10 * 60 * 60_000, nowMillis: 0});
  let now = 0;
  const source = new InstagramAccessTokenSource(h.store, undefined, () => now);
  assert.equal(await source.token(testAccountId, pinned), renewed);
  // Within an hour of expiry the pinned token is the better bet.
  now = 9.5 * 60 * 60_000;
  assert.equal(await source.token(testAccountId, pinned), pinned);
});

test("the webhook falls back to the pinned token", async () => {
  const h = createInstagramTokenFixture();
  const fallbacks: string[] = [];
  let now = 0;
  const source = new InstagramAccessTokenSource(h.store,
    (reason) => fallbacks.push(reason), () => now);
  // No record yet.
  assert.equal(await source.token(testAccountId, pinned), pinned);
  assert.deepEqual(fallbacks, []);
  // A record whose version cannot be read.
  h.docs.set(`instagramAccessTokens/${testAccountId}`, {
    accountId: testAccountId,
    secretVersion: `${testSecretParent}/versions/7`,
    expiresAt: Timestamp.fromMillis(10 * 60 * 60_000), revision: 1,
  });
  now = 6 * 60_000;
  assert.equal(await source.token(testAccountId, pinned), pinned);
  assert.deepEqual(fallbacks, ["renewed-token-unavailable"]);
});

test("the webhook rereads the record every five minutes", async () => {
  const h = createInstagramTokenFixture();
  let now = 0;
  const source = new InstagramAccessTokenSource(h.store, undefined, () => now);
  assert.equal(await source.token(testAccountId, pinned), pinned);
  const secretVersion = await h.store.addToken(renewed);
  await h.store.saveRefresh(testAccountId, null,
    {secretVersion, expiresAtMillis: 10 * 60 * 60_000, nowMillis: 0});
  now = 4 * 60_000;
  assert.equal(await source.token(testAccountId, pinned), pinned);
  now = 5 * 60_000 + 1;
  assert.equal(await source.token(testAccountId, pinned), renewed);
});
