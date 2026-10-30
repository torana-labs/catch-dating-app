/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import {FakeFirestore} from "../testFirestore";
import {linkSearchFor, serpApiSearch, type WebSearchPolicy} from "./linkSearch";

const NOW = new Date("2026-10-30T09:00:00.000Z");
const KEY = "projects/catch-dating-app-64e51/secrets/SERPAPI_API_KEY/versions/1";
const policy: WebSearchPolicy = {enabled: true, decisionId: "policy-batch-web-search-policy",
  maxResultsPerQuery: 10, maxQueriesPerRun: 1, maxQueriesPerMonth: 2};

function setup({accepted = true, used = 0, status = 200} = {}) {
  const db = new FakeFirestore();
  db.write("organizerPolicyGapReviewDecisions/policy-batch-web-search-policy", {decisionStatus: accepted ? "accepted" : "held"});
  if (used) db.write("supplyIntakeUsage/web-search-2026-10", {schemaVersion: 1, monthKey: "2026-10", networkRequests: used, updatedAt: NOW.toISOString()});
  const requests: URL[] = [];
  let secretReads = 0;
  const deps = {db: db as unknown as Firestore, now: () => NOW, usageCollection: "supplyIntakeUsage",
    decisionsCollection: "organizerPolicyGapReviewDecisions", keyVersion: KEY,
    isAccepted: (decision: unknown) => (decision as {decisionStatus?: string} | null)?.decisionStatus === "accepted",
    readSecret: async () => {
      secretReads += 1;
      return "secret-key\n";
    },
    fetch: (async (url: URL) => {
      requests.push(url);
      return new Response(JSON.stringify({organic_results: [{link: "https://lu.ma/blrdroid", title: "BlrDroid"},
        {link: "javascript:alert(1)"}, {title: "no link"}]}), {status});
    }) as unknown as typeof fetch};
  return {db, deps, requests, reads: () => secretReads};
}

test("a configured, accepted search sends one Google query for the handle and counts it against the month", async () => {
  const t = setup();
  const port = await linkSearchFor(t.deps, policy);
  assert.ok(port);
  assert.deepEqual(await port.search({runKey: "nom-1|search-1", query: "\"blrdroid\""}),
    [{url: "https://lu.ma/blrdroid", title: "BlrDroid"}]);
  const sent = t.requests[0];
  assert.deepEqual([sent.origin + sent.pathname, sent.searchParams.get("engine"), sent.searchParams.get("q"),
    sent.searchParams.get("api_key"), sent.searchParams.get("num")],
  ["https://serpapi.com/search.json", "google", "\"blrdroid\"", "secret-key", "10"]);
  assert.equal(t.db.read("supplyIntakeUsage/web-search-2026-10")?.networkRequests, 1);
  // One query per intake run.
  await assert.rejects(port.search({runKey: "nom-1|search-2", query: "x"}), {code: "BUDGET_EXCEEDED"});
  assert.deepEqual([t.requests.length, t.reads()], [1, 1]);
});

test("the monthly cap refuses before anything leaves the process", async () => {
  const t = setup({used: 2});
  const port = await linkSearchFor(t.deps, policy);
  await assert.rejects(port!.search({runKey: "nom-1|search-1", query: "x"}), {code: "BUDGET_EXCEEDED"});
  assert.deepEqual([t.requests.length, t.reads()], [0, 0]);
  assert.equal(t.db.read("supplyIntakeUsage/web-search-2026-10")?.networkRequests, 2);
});

test("search is off unless the policy, the owner's decision and a pinned key all allow it", async () => {
  assert.equal(await linkSearchFor(setup().deps, {...policy, enabled: false}), null);
  assert.equal(await linkSearchFor(setup().deps, {...policy, decisionId: null}), null);
  assert.equal(await linkSearchFor({...setup().deps, keyVersion: " "}, policy), null);
  assert.equal(await linkSearchFor(setup({accepted: false}).deps, policy), null);
  await assert.rejects(linkSearchFor({...setup().deps, keyVersion: "projects/x/secrets/OTHER/versions/1"}, policy),
    /must pin a SERPAPI_API_KEY version/u);
});

test("a provider failure finds nothing instead of failing the nomination", async () => {
  const t = setup({status: 429});
  const port = await linkSearchFor(t.deps, policy);
  assert.deepEqual(await port!.search({runKey: "nom-1|search-1", query: "x"}), []);
  await assert.rejects(serpApiSearch({apiKey: "k", query: "x", maxResults: 10, fetch: t.deps.fetch}), /SerpApi answered 429/u);
});
