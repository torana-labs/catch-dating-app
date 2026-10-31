import {hashText} from "../../../../platform/canonical-json.mjs";
import {OperationsError, invariant} from "../../../../platform/errors.mjs";

// Batch web search, step one: one search-engine response for one planned
// discovery query becomes a normalized search-result batch. The batch keeps
// rank, title, URL and snippet only; the provider response itself never
// enters the batch, a snapshot or a work item.

export const SEARCH_RESULT_BATCH_VERSION = 1;
export const SEARCH_RESULT_SOURCES = Object.freeze([
  "custom_scraper",
  "fixture",
  "manual_google_search",
  "manual_web_search",
  "serp_api",
]);
export const MAX_SEARCH_RESULTS_PER_BATCH = 100;

const allowedSources = new Set(SEARCH_RESULT_SOURCES);
const activityKindByCategory = Object.freeze({
  board_game_social: "boardGameSocial",
  creator_community_host: "creatorCommunity",
  racket_sport_social: "racketSportSocial",
  singles_event_operator: "singlesEvent",
  social_run_club: "socialRun",
  supper_club: "supperOrganizer",
  venue_led_social: "venueLedSocial",
  walks_experiences: "walksExperiences",
});

/**
 * The planned discovery query a run key names, from a discovery plan
 * (`plan.discoveryPlan`) or any object with planned/skippedFresh entries.
 */
export function findDiscoveryPlanEntry(discoveryPlan, runKey) {
  const entries = [
    ...(discoveryPlan?.planned ?? []),
    ...(discoveryPlan?.skippedFresh ?? []),
  ];
  return entries.find((entry) => entry?.runKey === runKey) ?? null;
}

export function defaultBatchId(planEntry, capturedAt) {
  const target = planEntry.candidateId ??
    `${planEntry.categoryId}-${planEntry.citySlug}`;
  const suffix = planEntry.resultFingerprint ??
    hashText(String(planEntry.runKey)).slice(0, 16);
  return slugify(`${capturedAt}-${target}-${suffix}`);
}

export function buildSearchResultBatchFromCapture({
  capture,
  capturedAt,
  planEntry,
  source,
  sourcePlanId = null,
  maxResults = MAX_SEARCH_RESULTS_PER_BATCH,
}) {
  invariant(
    allowedSources.has(source),
    "INVALID_SEARCH_CAPTURE",
    `Unsupported search-result source: ${source}.`,
    {source: source ?? null}
  );
  invariant(
    /^\d{4}-\d{2}-\d{2}$/u.test(capturedAt ?? ""),
    "INVALID_SEARCH_CAPTURE",
    "Search capture date must be YYYY-MM-DD."
  );
  invariant(
    planEntry && typeof planEntry === "object" &&
      typeof planEntry.runKey === "string" && planEntry.runKey.length > 0 &&
      typeof planEntry.renderedQuery === "string" &&
      planEntry.renderedQuery.length > 0,
    "INVALID_SEARCH_CAPTURE",
    "A planned discovery query with a runKey and renderedQuery is required."
  );
  invariant(
    Number.isSafeInteger(maxResults) && maxResults > 0 &&
      maxResults <= MAX_SEARCH_RESULTS_PER_BATCH,
    "INVALID_SEARCH_CAPTURE",
    `Search batches keep between 1 and ${MAX_SEARCH_RESULTS_PER_BATCH} results.`
  );

  const rawResults = extractRawResults(capture);
  const results = rawResults
    .map((result, index) => capturedResultFor(result, index, capturedAt))
    .sort((left, right) => left.rank - right.rank)
    .slice(0, maxResults);
  invariant(
    results.length > 0,
    "SEARCH_CAPTURE_EMPTY",
    "Captured search result payload has no usable results."
  );
  const resultIds = new Set();
  for (const result of results) {
    invariant(
      !resultIds.has(result.resultId),
      "INVALID_SEARCH_CAPTURE",
      `Search capture repeats rank ${result.rank}.`
    );
    resultIds.add(result.resultId);
  }

  return {
    schemaVersion: SEARCH_RESULT_BATCH_VERSION,
    batchId: defaultBatchId(planEntry, capturedAt),
    createdAt: capturedAt,
    source,
    query: planEntry.renderedQuery,
    queryIntent: {
      activityKind: activityKindByCategory[planEntry.categoryId] ?? null,
      entityHint: planEntry.candidateName ?? null,
      marketSlug: planEntry.citySlug ?? null,
    },
    captureContext: {
      candidateId: planEntry.candidateId ?? null,
      categoryId: planEntry.categoryId ?? null,
      city: planEntry.city ?? null,
      citySlug: planEntry.citySlug ?? null,
      planKind: planEntry.planKind ?? null,
      providerResultCount: rawResults.length,
      resultFingerprint: planEntry.resultFingerprint ?? null,
      runKey: planEntry.runKey,
      sourcePlanId,
    },
    results,
    notes:
      `Captured from Operations discovery run key ${planEntry.runKey}. ` +
      "Raw provider payload is intentionally not persisted in the batch.",
  };
}

function extractRawResults(capture) {
  if (Array.isArray(capture)) return capture;
  if (Array.isArray(capture?.results)) return capture.results;
  if (Array.isArray(capture?.organic_results)) return capture.organic_results;
  if (Array.isArray(capture?.items)) return capture.items;
  throw new OperationsError(
    "INVALID_SEARCH_CAPTURE",
    "Raw search payload must contain results, organic_results, items, or be an array."
  );
}

function capturedResultFor(result, index, observedAt) {
  const rank = positiveInteger(result?.rank ?? result?.position ?? result?.index) ??
    index + 1;
  const title = trimmed(result?.title ?? result?.name);
  const url = trimmed(result?.url ?? result?.link ?? result?.href);
  const snippet = trimmed(
    result?.snippet ?? result?.description ?? result?.summary ?? result?.body
  );
  invariant(title, "INVALID_SEARCH_CAPTURE", `Result ${rank} is missing title.`);
  invariant(url, "INVALID_SEARCH_CAPTURE", `Result ${rank} is missing url/link.`);
  invariant(
    isAbsoluteHttpUrl(url),
    "INVALID_SEARCH_CAPTURE",
    `Result ${rank} has invalid URL: ${url.slice(0, 200)}`
  );
  return {
    resultId: `result-${rank}`,
    rank,
    title: title.slice(0, 500),
    url,
    snippet: snippet ? snippet.slice(0, 2000) : null,
    observedAt,
  };
}

function isAbsoluteHttpUrl(value) {
  if (value.length > 2000) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function trimmed(value) {
  const string = String(value ?? "").trim();
  return string.length > 0 ? string : null;
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}
