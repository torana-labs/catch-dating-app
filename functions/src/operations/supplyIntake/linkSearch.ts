/* eslint-disable max-len */
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {getApp} from "firebase-admin/app";
import type {Firestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {defineString} from "firebase-functions/params";

// Web search for a nomination whose own pages can't be read (an Instagram
// profile, a Linktree or Beacons page): one SerpApi query for the handle,
// whose result links the intake then reads like any other page. It runs only
// when acquisition_policy.json enables webSearch, the owner's
// batch_web_search_policy decision is accepted, and this environment pins a
// SerpApi key version. Each query is reserved against the month's cap in a
// transaction before it leaves the process.

/** The pinned SerpApi key, `projects/<project>/secrets/SERPAPI_API_KEY/versions/<n>`; blank keeps search off. */
export const serpApiKeyVersion = defineString("SERPAPI_KEY_VERSION", {default: ""});

const SEARCH_TIMEOUT_MS = 10_000;
const KEY_VERSION = /^projects\/[a-z][a-z0-9-]{4,28}[a-z0-9]\/secrets\/SERPAPI_API_KEY\/versions\/[1-9][0-9]*$/u;

export interface LinkSearchResult {url: string; title: string | null}

/** The port Supply Intake's gathering calls; null from search() means search is off. */
export interface LinkSearchPort {
  search(input: {runKey: string; query: string}): Promise<LinkSearchResult[] | null>;
}

export interface WebSearchPolicy {
  enabled: boolean;
  decisionId: string | null;
  maxResultsPerQuery: number;
  maxQueriesPerRun: number;
  maxQueriesPerMonth: number;
}

export interface LinkSearchDeps {
  db: Firestore;
  now: () => Date;
  usageCollection: string;
  decisionsCollection: string;
  keyVersion: string;
  /** Whether the stored decision is the owner's acceptance of this policy. */
  isAccepted: (decision: unknown) => boolean;
  readSecret?: (version: string) => Promise<string>;
  fetch?: typeof fetch;
}

/**
 * The search port for one intake run, or null when any switch is off. A
 * provider failure finds nothing rather than failing the nomination.
 */
export async function linkSearchFor(deps: LinkSearchDeps, policy: WebSearchPolicy): Promise<LinkSearchPort | null> {
  const keyVersion = deps.keyVersion.trim();
  if (!policy.enabled || !policy.decisionId || !keyVersion) return null;
  if (!KEY_VERSION.test(keyVersion)) throw new Error("SERPAPI_KEY_VERSION must pin a SERPAPI_API_KEY version.");
  const decision = (await deps.db.collection(deps.decisionsCollection).doc(policy.decisionId).get()).data();
  if (!deps.isAccepted(decision ?? null)) {
    logger.info("Web search is configured but its policy decision is not accepted; skipping.", {decisionId: policy.decisionId});
    return null;
  }
  let key: Promise<string> | null = null;
  let used = 0;
  return {
    search: async ({runKey, query}) => {
      if (used >= policy.maxQueriesPerRun) throw budgetExceeded("run");
      await reserve(deps, policy);
      used += 1;
      key ??= (deps.readSecret ?? readPinnedSecret)(keyVersion);
      try {
        return await serpApiSearch({apiKey: (await key).trim(), query, maxResults: policy.maxResultsPerQuery,
          fetch: deps.fetch ?? ((...args) => fetch(...args))});
      } catch (error) {
        logger.warn("Web search failed; the nomination continues without it.", {runKey,
          message: error instanceof Error ? error.message.slice(0, 200) : "unknown"});
        return [];
      }
    },
  };
}

/** Counts one query against the month's cap, or refuses past it. */
async function reserve(deps: LinkSearchDeps, policy: WebSearchPolicy): Promise<void> {
  const monthKey = deps.now().toISOString().slice(0, 7);
  const ref = deps.db.collection(deps.usageCollection).doc(`web-search-${monthKey}`);
  const allowed = await deps.db.runTransaction(async (tx) => {
    const usage = await tx.get(ref);
    const count = usage.exists ? Number((usage.data() as {networkRequests?: number}).networkRequests ?? 0) : 0;
    if (count >= policy.maxQueriesPerMonth) return false;
    tx.set(ref, {schemaVersion: 1, monthKey, networkRequests: count + 1, updatedAt: deps.now().toISOString()});
    return true;
  });
  if (!allowed) throw budgetExceeded("month");
}

function budgetExceeded(window: "run" | "month"): Error {
  return Object.assign(new Error(`Web search would exceed its ${window} cap.`), {code: "BUDGET_EXCEEDED"});
}

/** One Google query through SerpApi; only result links and titles come back. */
export async function serpApiSearch({apiKey, query, maxResults, fetch: fetchImpl}: {
  apiKey: string; query: string; maxResults: number; fetch: typeof fetch;
}): Promise<LinkSearchResult[]> {
  const url = new URL("https://serpapi.com/search.json");
  for (const [name, value] of Object.entries({engine: "google", q: query, num: String(maxResults),
    hl: "en", gl: "in", api_key: apiKey})) url.searchParams.set(name, value);
  const response = await fetchImpl(url, {signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS)});
  if (!response.ok) throw new Error(`SerpApi answered ${response.status}.`);
  const body = await response.json() as {organic_results?: Array<{link?: unknown; title?: unknown}>};
  return (Array.isArray(body.organic_results) ? body.organic_results : []).flatMap((result) =>
    typeof result.link === "string" && /^https?:\/\//u.test(result.link) ?
      [{url: result.link.slice(0, 2000), title: typeof result.title === "string" ? result.title.slice(0, 300) : null}] : [])
    .slice(0, maxResults);
}

async function readPinnedSecret(version: string): Promise<string> {
  const project = getApp().options.projectId || process.env.GCLOUD_PROJECT;
  if (!project || !version.startsWith(`projects/${project}/secrets/`)) throw new Error("SerpApi key project mismatch");
  const [value] = await new SecretManagerServiceClient().accessSecretVersion({name: version});
  const data = value.payload?.data;
  if (!data) throw new Error("SerpApi key unavailable");
  return typeof data === "string" ? data : Buffer.from(data).toString("utf8");
}
