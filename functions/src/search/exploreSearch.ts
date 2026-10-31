import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import {defineSecret, defineString} from "firebase-functions/params";
import * as admin from "firebase-admin";
import {appCheckCallableOptionsWithSecrets} from
  "../shared/callableOptions";
import {normalizePayloadStrings} from
  "../shared/callablePayloadNormalization";
import {requireAuth} from "../shared/auth";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {ExploreSearchCallablePayload} from
  "../shared/generated/exploreSearchCallablePayload";
import type {ExploreSearchCallableResponse} from
  "../shared/generated/exploreSearchCallableResponse";
import {
  validateExploreSearchCallablePayload,
} from "../shared/generated/validators/exploreSearchInput";

export const algoliaAppId = defineString("ALGOLIA_APPLICATION_ID");
export const algoliaSearchApiKey = defineSecret("ALGOLIA_SEARCH_API_KEY");

const defaultLimit = 20;

type FetchImpl = typeof fetch;

interface ExploreSearchDeps {
  firestore: () => FirebaseFirestore.Firestore;
  fetchImpl: FetchImpl;
  now: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: ExploreSearchDeps = {
  firestore: () => admin.firestore(),
  fetchImpl: fetch,
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

interface AlgoliaMultiSearchResponse {
  results?: AlgoliaSearchResult[];
}

interface AlgoliaSearchResult {
  hits?: AlgoliaHit[];
}

interface AlgoliaHit {
  objectID?: string;
}

/**
 * Searches the Explore organizer and event indices through Algolia.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {ExploreSearchDeps} deps Injectable dependencies for tests.
 * @return {Promise<ExploreSearchCallableResponse>} Search hit ids.
 */
export async function exploreSearchHandler(
  request: CallableRequest<unknown>,
  deps: ExploreSearchDeps = defaultDeps
): Promise<ExploreSearchCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<ExploreSearchCallablePayload>(
    request,
    validateExploreSearchCallablePayload,
    normalizeExploreSearchPayload
  );
  await deps.checkRateLimit?.(deps.firestore(), uid, "exploreSearch", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

  return searchExploreWithAlgolia(payload, deps);
}

/**
 * Calls Algolia's multi-query endpoint for club and event matches.
 * @param {ExploreSearchCallablePayload} payload Normalized search payload.
 * @param {ExploreSearchDeps} deps Injectable dependencies.
 * @return {Promise<ExploreSearchCallableResponse>} Search hit ids.
 */
export async function searchExploreWithAlgolia(
  payload: ExploreSearchCallablePayload,
  deps: Pick<ExploreSearchDeps, "fetchImpl" | "now">
): Promise<ExploreSearchCallableResponse> {
  const body = buildAlgoliaExploreSearchBody(payload, deps.now());
  const response = await deps.fetchImpl(algoliaEndpoint(), {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "x-algolia-application-id": algoliaAppId.value(),
      "x-algolia-api-key": algoliaSearchApiKey.value(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new HttpsError(
      "unavailable",
      "Explore search is unavailable."
    );
  }

  const data = await response.json() as AlgoliaMultiSearchResponse;
  const [organizersResult, eventsResult] = data.results ?? [];
  const organizerIds = uniqueHitIds(organizersResult);
  return {
    organizerIds,
    eventIds: uniqueHitIds(eventsResult),
  };
}

/**
 * Builds the Algolia multi-search request for Explore search.
 * @param {ExploreSearchCallablePayload} payload Search payload.
 * @param {Date} now Current server time for event freshness.
 * @return {object} Algolia multi-search request.
 */
export function buildAlgoliaExploreSearchBody(
  payload: ExploreSearchCallablePayload,
  now: Date
) {
  const limit = payload.limit ?? defaultLimit;
  const marketId = normalizeSearchMarketId(payload.cityName);
  return {
    requests: [
      {
        indexName: organizersIndexName(),
        query: payload.query,
        hitsPerPage: limit,
        filters: marketId ?
          `locationMarketId:${quoteFilterValue(marketId)}` :
          "",
      },
      {
        indexName: eventsIndexName(),
        query: payload.query,
        hitsPerPage: limit,
        filters: eventFilters(marketId, now),
      },
    ],
    strategy: "none",
  };
}

/**
 * Trims Explore search payload strings before schema validation.
 * @param {unknown} data Raw callable payload.
 * @return {unknown} Normalized payload.
 */
function normalizeExploreSearchPayload(data: unknown): unknown {
  return normalizePayloadStrings(data, {
    stringFields: ["query", "cityName"],
  });
}

/**
 * Returns the Algolia REST endpoint for the configured app.
 * @return {string} Algolia multi-query endpoint.
 */
function algoliaEndpoint(): string {
  return `https://${algoliaAppId.value()}.algolia.net/1/indexes/*/queries`;
}

/**
 * Reads the organizer index name with a local-test fallback.
 * @return {string} Algolia organizers index name.
 */
export function organizersIndexName(): string {
  return process.env.ALGOLIA_ORGANIZERS_INDEX ||
    "organizers";
}

/**
 * Reads the event index name with a local-test fallback.
 * @return {string} Algolia events index name.
 */
export function eventsIndexName(): string {
  return process.env.ALGOLIA_EVENTS_INDEX || "events";
}

/**
 * Builds Algolia filters for upcoming event search.
 * @param {string | undefined} marketId Optional market filter.
 * @param {Date} now Current server time.
 * @return {string} Algolia filter expression.
 */
function eventFilters(marketId: string | undefined, now: Date): string {
  const filters = [`startTimeEpoch >= ${Math.floor(now.getTime() / 1000)}`];
  if (marketId) {
    filters.unshift(`discoveryMarketId:${quoteFilterValue(marketId)}`);
  }
  return filters.join(" AND ");
}

/**
 * Normalizes market ids used by Algolia Explore facet filters.
 * @param {string | null | undefined} value Raw market id.
 * @return {string | undefined} Lowercase market filter value.
 */
export function normalizeSearchMarketId(
  value: string | null | undefined
): string | undefined {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Escapes a string facet value for Algolia filter syntax.
 * @param {string} value Raw facet value.
 * @return {string} Quoted facet value.
 */
function quoteFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
}

/**
 * Extracts unique object ids from one Algolia result set.
 * @param {AlgoliaSearchResult | undefined} result Algolia result set.
 * @return {string[]} Unique hit ids.
 */
function uniqueHitIds(result: AlgoliaSearchResult | undefined): string[] {
  const ids = new Set<string>();
  for (const hit of result?.hits ?? []) {
    if (hit.objectID) ids.add(hit.objectID);
  }
  return Array.from(ids);
}

export const exploreSearch = onCall(
  appCheckCallableOptionsWithSecrets([algoliaSearchApiKey]),
  (request) => exploreSearchHandler(request)
);
