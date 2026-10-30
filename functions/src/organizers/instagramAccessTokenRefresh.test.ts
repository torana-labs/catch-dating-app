import assert from "node:assert/strict";
import test from "node:test";
import {
  InstagramGraphTokenClient,
  InstagramTokenRefreshError,
  refreshInstagramAccessTokenHandler,
} from "./instagramAccessTokenRefresh";
import type {InstagramTokenClient} from "./instagramAccessTokenRefresh";
import {
  createInstagramTokenFixture,
  testAccountId,
  testSecretParent,
} from "./instagramAccessTokenTestStore";

const day = 24 * 60 * 60_000;
const sixtyDays = 60 * 24 * 60 * 60;
const pinned = "IGAA-pinned-token-00000000000";
const recorded = "IGAA-recorded-token-000000000";

type Reply = {token: string} | {error: InstagramTokenRefreshError};

/** Meta stand-in: each input token maps to a renewed token or an error. */
function metaClient(replies: Record<string, Reply>,
  owners: Record<string, string> = {}) {
  const refreshed: string[] = [];
  const client: InstagramTokenClient = {
    refresh: async (token) => {
      refreshed.push(token);
      const reply = replies[token];
      if (!reply) throw new InstagramTokenRefreshError("unknown", true);
      if ("error" in reply) throw reply.error;
      return {accessToken: reply.token, expiresInSeconds: sixtyDays};
    },
    accountId: async (token) => owners[token] ?? testAccountId,
  };
  return {client, refreshed};
}

async function withRecord(expiresInDays: number) {
  const h = createInstagramTokenFixture();
  const secretVersion = await h.store.addToken(recorded);
  await h.store.saveRefresh(testAccountId, null, {secretVersion,
    expiresAtMillis: 100 * day + expiresInDays * day, nowMillis: 0});
  return {...h, secretVersion};
}

function run(h: ReturnType<typeof createInstagramTokenFixture>,
  client: InstagramTokenClient, accountId = testAccountId) {
  return refreshInstagramAccessTokenHandler({accountId,
    pinnedToken: () => `${pinned}\n`, store: h.store, client,
    now: () => 100 * day});
}

const rejected = () => ({error: new InstagramTokenRefreshError("x", true)});
const unreachable = () => ({error: new InstagramTokenRefreshError("x", false)});

test("environments without Catch's account do nothing", async () => {
  const h = createInstagramTokenFixture();
  const meta = metaClient({});
  assert.deepEqual(await run(h, meta.client, " "), {outcome: "unconfigured"});
  assert.deepEqual(meta.refreshed, []);
  assert.equal(h.record(), undefined);
});

test("a token with more than 30 days left is left alone", async () => {
  const h = await withRecord(31);
  const meta = metaClient({});
  assert.deepEqual(await run(h, meta.client),
    {outcome: "current", expiresAtMillis: 131 * day});
  assert.deepEqual(meta.refreshed, []);
});

test("the first run renews the token pinned at deploy", async () => {
  const h = createInstagramTokenFixture();
  const meta = metaClient({[pinned]: {token: "IGAA-first-renewal-0000000"}});
  assert.deepEqual(await run(h, meta.client), {outcome: "refreshed",
    expiresAtMillis: 160 * day, source: "pinned"});
  assert.equal(h.record()?.secretVersion, `${testSecretParent}/versions/1`);
  assert.equal(h.versions.get(`${testSecretParent}/versions/1`),
    "IGAA-first-renewal-0000000");
  assert.equal(h.record()?.revision, 1);
});

test("the recorded token is renewed at 30 days left", async () => {
  const h = await withRecord(30);
  const meta = metaClient({[recorded]: {token: "IGAA-next-renewal-00000000"}});
  const result = await run(h, meta.client);
  assert.equal(result.outcome, "refreshed");
  assert.deepEqual(meta.refreshed, [recorded]);
  assert.equal(h.record()?.secretVersion, `${testSecretParent}/versions/2`);
  assert.equal(h.record()?.revision, 2);
});

test("a token pasted in by hand takes over from a dead recorded one",
  async () => {
    const h = await withRecord(10);
    const meta = metaClient({[recorded]: rejected(),
      [pinned]: {token: "IGAA-from-pasted-token-000"}});
    const result = await run(h, meta.client);
    assert.deepEqual(result, {outcome: "refreshed",
      expiresAtMillis: 160 * day, source: "pinned"});
    assert.deepEqual(meta.refreshed, [recorded, pinned]);
    assert.equal(h.record()?.lastErrorCode, null);
  });

test("a transient failure keeps the recorded token for the next try",
  async () => {
    const h = await withRecord(20);
    const meta = metaClient({[recorded]: unreachable(),
      [pinned]: unreachable()});
    assert.deepEqual(await run(h, meta.client), {outcome: "failed",
      code: "refreshFailed", expiresAtMillis: 120 * day});
    assert.equal(h.record()?.secretVersion, h.secretVersion);
    assert.equal(h.record()?.lastErrorCode, "refreshFailed");
  });

test("a rejected recorded token stops serving the webhook", async () => {
  const h = await withRecord(20);
  const meta = metaClient({[recorded]: rejected(), [pinned]: rejected()});
  assert.deepEqual(await run(h, meta.client), {outcome: "failed",
    code: "refreshRejected", expiresAtMillis: null});
  assert.equal(h.record()?.secretVersion, null);
});

test("a token for another account is never stored", async () => {
  const h = createInstagramTokenFixture();
  const meta = metaClient({[pinned]: {token: "IGAA-someone-else-00000000"}},
    {"IGAA-someone-else-00000000": "17841499999999999"});
  assert.deepEqual(await run(h, meta.client), {outcome: "failed",
    code: "accountMismatch", expiresAtMillis: null});
  assert.equal(h.versions.size, 0);
});

test("a missing Secret Manager grant is recorded", async () => {
  const h = createInstagramTokenFixture();
  h.secrets.failAdd = true;
  const meta = metaClient({[pinned]: {token: "IGAA-unsaved-renewal-00000"}});
  assert.deepEqual(await run(h, meta.client), {outcome: "failed",
    code: "secretWriteFailed", expiresAtMillis: null});
  assert.equal(h.record()?.lastErrorCode, "secretWriteFailed");
});

function recordingFetch(status: number, body: unknown) {
  const calls: Array<{url: string; init: RequestInit}> = [];
  const fetchImpl = (async (url: URL, init: RequestInit) => {
    calls.push({url: url.toString(), init});
    return new Response(JSON.stringify(body), {status});
  }) as unknown as typeof fetch;
  return {calls, fetchImpl};
}

test("the Meta client calls the documented refresh endpoint", async () => {
  const {calls, fetchImpl} = recordingFetch(200, {
    access_token: "IGAA-renewed-by-meta-0000", token_type: "bearer",
    expires_in: 5183944});
  const client = new InstagramGraphTokenClient("v26.0", fetchImpl);
  assert.deepEqual(await client.refresh(pinned), {
    accessToken: "IGAA-renewed-by-meta-0000", expiresInSeconds: 5183944});
  const url = new URL(calls[0].url);
  assert.equal(url.origin + url.pathname,
    "https://graph.instagram.com/refresh_access_token");
  assert.equal(url.searchParams.get("grant_type"), "ig_refresh_token");
  assert.equal(url.searchParams.get("access_token"), pinned);
});

test("the Meta client reads the token's account with a header",
  async () => {
    const {calls, fetchImpl} = recordingFetch(200,
      {user_id: testAccountId, id: "26000000000000001"});
    const client = new InstagramGraphTokenClient("v26.0", fetchImpl);
    assert.equal(await client.accountId(pinned), testAccountId);
    assert.equal(calls[0].url,
      "https://graph.instagram.com/v26.0/me?fields=user_id");
    assert.equal((calls[0].init.headers as Record<string, string>)
      .Authorization, `Bearer ${pinned}`);
  });

test("Meta's invalid-token error is told apart and never echoed",
  async () => {
    const invalid = recordingFetch(400, {error: {
      message: `Invalid OAuth access token ${pinned}`, type: "OAuthException",
      code: 190}});
    await assert.rejects(new InstagramGraphTokenClient("v26.0",
      invalid.fetchImpl).refresh(pinned), (error: Error) =>
      error instanceof InstagramTokenRefreshError && error.rejected &&
        !error.message.includes(pinned));
    const limited = recordingFetch(400, {error: {code: 4}});
    await assert.rejects(new InstagramGraphTokenClient("v26.0",
      limited.fetchImpl).refresh(pinned), (error: Error) =>
      error instanceof InstagramTokenRefreshError && !error.rejected);
    const short = recordingFetch(200,
      {access_token: "IGAA-renewed-by-meta-0000", expires_in: 3600});
    await assert.rejects(new InstagramGraphTokenClient("v26.0",
      short.fetchImpl).refresh(pinned), InstagramTokenRefreshError);
  });
