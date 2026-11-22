import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import {AdSpendError, adSpendCost, spendDays} from "./adSpend";
import {
  adSpendMode,
  runAdSpendImport,
  type AdSpendImportDeps,
} from "./adSpendImport";
import {fetchGoogleAdSpend} from "./googleAdSpend";
import {fetchMetaAdSpend} from "./metaAdSpend";

// 22 Nov 2026, 05:30 India time.
const now = Date.parse("2026-11-22T00:00:00Z");
const day = 24 * 60 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status});
const asFetch = (impl: (url: string, init?: RequestInit) =>
  Promise<Response>) => impl as unknown as typeof fetch;
const code = (value: string) => (error: unknown) =>
  error instanceof AdSpendError && error.code === value;

test("a month's days run to today while it runs, and none for a future one",
  () => {
    assert.deepEqual(spendDays("2026-11", now),
      {since: "2026-11-01", until: "2026-11-22"});
    assert.deepEqual(spendDays("2026-10", now),
      {since: "2026-10-01", until: "2026-10-31"});
    assert.equal(spendDays("2026-12", now), null);
  });

test("Meta spend reads campaign rows into paise from Graph v26.0", async () => {
  let url = "";
  let auth = "";
  const rows = await fetchMetaAdSpend({accessToken: "t", adAccountId:
    "act_123", month: "2026-11", nowMillis: now,
  fetchImpl: asFetch(async (input, init) => {
    url = input;
    auth = new Headers(init?.headers).get("Authorization") ?? "";
    return json({data: [
      {campaign_name: "Host launch · Mumbai", spend: "31500.00",
        account_currency: "INR"},
      {campaign_name: "Claim your page", spend: "11200.5",
        account_currency: "INR"}]});
  })});
  assert.deepEqual(rows, [
    {campaignName: "Host launch · Mumbai", spendMinor: 3_150_000},
    {campaignName: "Claim your page", spendMinor: 1_120_050}]);
  assert.equal(auth, "Bearer t");
  assert.match(url, /^https:\/\/graph\.facebook\.com\/v26\.0\/act_123\//u);
  assert.match(decodeURIComponent(url),
    /insights\?.*level=campaign.*"since":"2026-11-01","until":"2026-11-22"/u);
});

test("Meta spend refuses what it cannot total in rupees", async () => {
  const meta = (body: unknown, status = 200) => fetchMetaAdSpend({
    accessToken: "t", adAccountId: "act_1", month: "2026-10", nowMillis: now,
    fetchImpl: asFetch(async () => json(body, status))});
  await assert.rejects(fetchMetaAdSpend({accessToken: "t", adAccountId: "123",
    month: "2026-10", nowMillis: now}), code("meta_account_invalid"));
  await assert.rejects(meta({error: {}}, 400), code("meta_http_400"));
  await assert.rejects(meta({rows: []}), code("meta_malformed"));
  await assert.rejects(meta({data: [{spend: "-1"}]}), code("meta_malformed"));
  await assert.rejects(meta({data: [{spend: "10", account_currency: "USD"}]}),
    code("meta_currency_not_inr"));
  await assert.rejects(meta({data: [], paging: {next: "https://x.test"}}),
    code("meta_too_many_campaigns"));
  await assert.rejects(fetchMetaAdSpend({accessToken: "t", adAccountId:
    "act_1", month: "2026-10", nowMillis: now,
  fetchImpl: asFetch(async () => {
    throw new Error("socket");
  })}), code("meta_transport"));
  assert.deepEqual(await meta({data: []}), []);
});

test("Google spend sums campaign days across pages into paise", async () => {
  const requests: Array<{url: string; body: {query: string;
    pageToken?: string}; auth: string | null}> = [];
  const pages = [
    {results: [
      {customer: {currencyCode: "INR"}, campaign: {id: "11", name: "Search"},
        segments: {date: "2026-11-01"}, metrics: {costMicros: "1500000000"}},
      {customer: {currencyCode: "INR"}, campaign: {id: "22", name: "Brand"},
        segments: {date: "2026-11-01"}, metrics: {costMicros: "123456"}},
    ], nextPageToken: "page-2"},
    {results: [
      {customer: {currencyCode: "INR"}, campaign: {id: "11", name: "Search"},
        segments: {date: "2026-11-02"}, metrics: {costMicros: "250000000"}},
    ]},
  ];
  const rows = await fetchGoogleAdSpend({accessToken: "g",
    customerId: "1016806229", month: "2026-11", nowMillis: now,
    fetchImpl: asFetch(async (url, init) => {
      requests.push({url, body: JSON.parse(String(init?.body)),
        auth: new Headers(init?.headers).get("Authorization")});
      return json(pages[requests.length - 1]);
    })});
  assert.deepEqual(rows, [
    {campaignName: "Search", spendMinor: 175_000},
    {campaignName: "Brand", spendMinor: 12}]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, "https://googleads.googleapis.com/v24/" +
    "customers/1016806229/googleAds:search");
  assert.equal(requests[0].auth, "Bearer g");
  assert.match(requests[0].body.query, /metrics\.cost_micros/u);
  assert.match(requests[0].body.query,
    /segments\.date BETWEEN '2026-11-01' AND '2026-11-22'/u);
  assert.equal(requests[0].body.pageToken, undefined);
  assert.equal(requests[1].body.pageToken, "page-2");
});

test("Google spend refuses what it cannot total in rupees", async () => {
  const google = (body: unknown, status = 200) => fetchGoogleAdSpend({
    accessToken: "g", customerId: "1016806229", month: "2026-10",
    nowMillis: now, fetchImpl: asFetch(async () => json(body, status))});
  await assert.rejects(fetchGoogleAdSpend({accessToken: "g",
    customerId: "101-680-6229", month: "2026-10", nowMillis: now}),
  code("google_customer_invalid"));
  await assert.rejects(google({error: {}}, 403), code("google_http_403"));
  await assert.rejects(google({results: {}}), code("google_malformed"));
  await assert.rejects(google({results: [{customer: {currencyCode: "USD"},
    campaign: {id: "1"}, metrics: {costMicros: "1"}}]}),
  code("google_currency_not_inr"));
  await assert.rejects(google({results: [], nextPageToken: "again"}),
    code("google_too_many_rows"));
  // An account without spend returns no results key at all.
  assert.deepEqual(await google({fieldMask: "metrics.costMicros"}), []);
});

test("ad spend imports only when the mode says live", () => {
  assert.equal(adSpendMode("live"), "live");
  for (const value of ["", "off", "LIVE", "validate"]) {
    assert.equal(adSpendMode(value), "off");
  }
});

/** Fake platforms: Meta and Google spend, counting requests. */
function platforms(input: {metaStatus?: number; googleStatus?: number} = {}) {
  const calls = {meta: 0, google: 0, metaMonths: [] as string[]};
  const fetchImpl = asFetch(async (url, init) => {
    if (url.startsWith("https://graph.facebook.com/")) {
      calls.meta += 1;
      calls.metaMonths.push(JSON.parse(new URL(url).searchParams
        .get("time_range") ?? "{}").since.slice(0, 7));
      return json({data: [{campaign_name: "Hosts", spend: "4820.25",
        account_currency: "INR"}]}, input.metaStatus);
    }
    calls.google += 1;
    assert.match(String(init?.body), /SELECT/u);
    return json({results: [{customer: {currencyCode: "INR"},
      campaign: {id: "7", name: "Search"}, segments: {date: "2026-11-02"},
      metrics: {costMicros: "990000000"}}]}, input.googleStatus);
  });
  return {calls, fetchImpl};
}

function deps(db: FakeFirestore, fetchImpl: typeof fetch, at = now,
  extra: Partial<AdSpendImportDeps> = {}): AdSpendImportDeps {
  return {db: db as never, mode: "live", now: () => at,
    metaToken: async () => "meta-token", googleToken: async () => "g-token",
    fetchImpl, ...extra};
}

/** Last month already imported, so a run past the 3rd reads this month. */
function settledDb(): FakeFirestore {
  const october = (platform: "meta" | "google") => adSpendCost({platform,
    month: "2026-10", rows: [{campaignName: "Old", spendMinor: 100}],
    nowMillis: now - 20 * day});
  return new FakeFirestore({
    "platformCosts/2026-10_ads_meta": october("meta") as never,
    "platformCosts/2026-10_ads_google": october("google") as never,
  });
}

test("off reads no credential, calls no platform and writes nothing",
  async () => {
    const db = new FakeFirestore();
    const {calls, fetchImpl} = platforms();
    const outcomes = await runAdSpendImport(deps(db, fetchImpl, now, {
      mode: "off", metaToken: async () => assert.fail("token read"),
      googleToken: async () => assert.fail("token read")}));
    assert.deepEqual(outcomes, []);
    assert.deepEqual(calls, {meta: 0, google: 0, metaMonths: []});
    assert.deepEqual(db.paths(), []);
  });

test("a live run stores this month's Meta and Google spend", async () => {
  const db = settledDb();
  const {calls, fetchImpl} = platforms();
  const outcomes = await runAdSpendImport(deps(db, fetchImpl));
  assert.deepEqual(outcomes.map((entry) => [entry.platform, entry.month,
    entry.outcome, entry.amountMinor]), [
    ["meta", "2026-11", "imported", 482_025],
    ["google", "2026-11", "imported", 99_000]]);
  assert.deepEqual(db.get("platformCosts/2026-11_ads_meta"), {
    schemaVersion: 1, costId: "2026-11_ads_meta", month: "2026-11",
    category: "ads_meta", amountMinor: 482_025, source: "meta_api",
    note: "1 campaign", updatedAtMillis: now, updatedByUid: null});
  assert.equal(db.get("platformCosts/2026-11_ads_google")?.source,
    "google_ads_api");
  assert.equal(db.get("platformCosts/2026-11_ads_google")?.category,
    "ads_google");
  assert.deepEqual([calls.meta, calls.google], [1, 1]);
});

test("a second run the same day calls nothing and changes nothing; the next " +
  "day refreshes", async () => {
  const db = settledDb();
  const {calls, fetchImpl} = platforms();
  await runAdSpendImport(deps(db, fetchImpl));
  const first = db.get("platformCosts/2026-11_ads_meta");
  const again = await runAdSpendImport(deps(db, fetchImpl, now + 60_000));
  assert.deepEqual(again.map((entry) => entry.outcome),
    ["imported_today", "imported_today"]);
  assert.deepEqual([calls.meta, calls.google], [1, 1]);
  assert.deepEqual(db.get("platformCosts/2026-11_ads_meta"), first);
  const tomorrow = await runAdSpendImport(deps(db, fetchImpl, now + day));
  assert.deepEqual(tomorrow.map((entry) => entry.outcome),
    ["imported", "imported"]);
  assert.deepEqual([calls.meta, calls.google], [2, 2]);
  assert.equal(db.get("platformCosts/2026-11_ads_meta")?.updatedAtMillis,
    now + day);
});

test("early in a month, and while it was never imported, last month is " +
  "read too", async () => {
  // 2 Dec: November may still settle.
  const db = settledDb();
  const {calls, fetchImpl} = platforms();
  const december = Date.parse("2026-12-02T00:00:00Z");
  await runAdSpendImport(deps(db, fetchImpl, december));
  assert.deepEqual(calls.metaMonths, ["2026-12", "2026-11"]);
  assert.ok(db.get("platformCosts/2026-11_ads_google"));
  // Mid-month with no October row: October is filled once, then left.
  const fresh = new FakeFirestore();
  const second = platforms();
  await runAdSpendImport(deps(fresh, second.fetchImpl));
  assert.deepEqual(second.calls.metaMonths, ["2026-11", "2026-10"]);
  await runAdSpendImport(deps(fresh, second.fetchImpl, now + day));
  assert.deepEqual(second.calls.metaMonths,
    ["2026-11", "2026-10", "2026-11"]);
});

test("a hand-entered total is replaced by the imported one", async () => {
  const db = settledDb();
  db.put("platformCosts/2026-11_ads_meta", {schemaVersion: 1,
    costId: "2026-11_ads_meta", month: "2026-11", category: "ads_meta",
    amountMinor: 1, source: "manual", note: null, updatedAtMillis: now,
    updatedByUid: "owner"});
  const {fetchImpl} = platforms();
  const [meta] = await runAdSpendImport(deps(db, fetchImpl));
  assert.equal(meta.outcome, "imported");
  assert.equal(meta.replacedManual, true);
  assert.equal(db.get("platformCosts/2026-11_ads_meta")?.source, "meta_api");
});

test("one platform failing leaves the other imported and logs only a code",
  async () => {
    const db = settledDb();
    const {calls, fetchImpl} = platforms({googleStatus: 403});
    const outcomes = await runAdSpendImport(deps(db, fetchImpl, now, {
      metaToken: async () => {
        throw new Error("secret-value-must-not-appear");
      }}));
    assert.deepEqual(outcomes.map((entry) => [entry.platform, entry.outcome,
      entry.code]), [
      ["meta", "failed", "meta_credential_unavailable"],
      ["google", "failed", "google_http_403"]]);
    assert.equal(calls.meta, 0);
    assert.doesNotMatch(JSON.stringify(outcomes), /secret-value/u);
    assert.deepEqual(db.paths("platformCosts/2026-11"), []);
    const retry = platforms();
    const recovered = await runAdSpendImport(deps(db, retry.fetchImpl));
    assert.deepEqual(recovered.map((entry) => entry.outcome),
      ["imported", "imported"]);
  });
