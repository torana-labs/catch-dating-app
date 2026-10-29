import {invariant} from "../../../../platform/errors.mjs";
import {
  emptySupplyInputSnapshot,
  finalizeSupplyInputSnapshot,
} from "../../input-snapshot.mjs";
import {surfaceFromUrl} from "../surfaces.mjs";
import {SEARCH_RESULT_BATCH_VERSION} from "./capture.mjs";

// Batch web search, step two: normalized search-result batches become
// organizer search candidates, the `organizerSearchCandidates` records an
// `ingest-input` snapshot carries. Every result URL is normalized by the
// Supply Intake surface classifier, so one organizer surface seen through
// several queries yields one candidate. Candidates are review work: nothing
// here creates an organizer or a listing.

export const SEARCH_CANDIDATE_QUEUE_VERSION = 1;

// The surface shape the Admin curation callable accepts
// (contracts/callables/admin_record_organizer_curation_payload.schema.json).
const CURATION_PLATFORMS = new Set([
  "bookMyShow",
  "district",
  "instagram",
  "linkedin",
  "luma",
  "news",
  "officialWebsite",
  "partiful",
  "sortMyScene",
  "userReport",
  "other",
]);

export function buildSearchResultCandidateQueue(batches, {dedupeIndex = null} = {}) {
  invariant(
    Array.isArray(batches),
    "INVALID_SEARCH_BATCH",
    "Search-result ingestion requires an array of batches."
  );
  const dedupeMatchesByKey = buildDedupeMatchesByKey(dedupeIndex);
  const observed = [];
  const errors = [];
  const warnings = [];
  const seenBatchIds = new Set();

  for (const batch of [...batches].sort(compareBatches)) {
    validateBatch(batch, errors, seenBatchIds);
    for (const result of [...(batch?.results ?? [])].sort((a, b) => a.rank - b.rank)) {
      const candidate = candidateForResult(batch, result, dedupeMatchesByKey, warnings);
      if (candidate) observed.push(candidate);
    }
  }

  const {candidates, duplicateKeys} = collapseDuplicateSurfaces(observed);
  return {
    schemaVersion: SEARCH_CANDIDATE_QUEUE_VERSION,
    generatedFrom: {
      batches: batches.map((batch) => batch?.batchId ?? null).filter(Boolean).sort(),
      dedupeIndexGeneratedAt: dedupeIndex?.generatedAt ?? null,
    },
    summary: {
      batches: batches.length,
      results: batches.reduce((sum, batch) => sum + (batch?.results?.length ?? 0), 0),
      observed: observed.length,
      candidates: candidates.length,
      collapsedDuplicates: observed.length - candidates.length,
      matchedExistingEntities: candidates.filter((candidate) =>
        candidate.existingEntityMatches.length > 0).length,
      duplicateNormalizedKeys: duplicateKeys.length,
      platforms: countBy(candidates, "platform"),
    },
    candidates,
    duplicateKeys,
    warnings: warnings.sort(),
    errors: errors.sort(),
  };
}

/**
 * A finalized Supply Intake input snapshot holding one market's search
 * candidates, ready for `ingest-input`. Candidates for other markets are left
 * out, and a queue with validation errors is refused.
 */
export function searchCandidateInputSnapshot(queue, {
  market,
  snapshotId,
  observedAt = null,
  sourceRunIds = [],
}) {
  invariant(
    queue?.schemaVersion === SEARCH_CANDIDATE_QUEUE_VERSION &&
      Array.isArray(queue.candidates) && Array.isArray(queue.errors),
    "INVALID_SEARCH_BATCH",
    "A search candidate queue is required."
  );
  invariant(
    queue.errors.length === 0,
    "INVALID_SEARCH_BATCH",
    "Search candidates with validation errors cannot enter an input snapshot.",
    {errors: queue.errors.slice(0, 20)}
  );
  const base = emptySupplyInputSnapshot(market);
  const {contentHash: _contentHash, ...content} = base;
  return finalizeSupplyInputSnapshot({
    ...content,
    snapshotId,
    observedAt,
    provenance: {source: "operations_batch_web_search", sourceRunIds: [...sourceRunIds]},
    organizerSearchCandidates: queue.candidates.filter((candidate) =>
      candidate.queryIntent?.marketSlug === market),
  });
}

function candidateForResult(batch, result, dedupeMatchesByKey, warnings) {
  let surface;
  try {
    surface = surfaceFromUrl(result.url);
  } catch (error) {
    warnings.push(`${batch.batchId}/${result.resultId}: ${error.message}`);
    return null;
  }
  const candidateId = `${batch.batchId}:${result.resultId}`;
  const matches = surface.normalizedKey ?
    (dedupeMatchesByKey.get(surface.normalizedKey) ?? []) :
    [];
  return {
    candidateId,
    batchId: batch.batchId,
    resultId: result.resultId,
    rank: result.rank,
    query: batch.query,
    queryIntent: batch.queryIntent,
    observedAt: result.observedAt,
    title: result.title,
    snippet: result.snippet ?? null,
    url: result.url,
    canonicalUrl: surface.url,
    platform: surface.platform,
    surfaceKind: surface.surfaceKind,
    normalizedKey: surface.normalizedKey,
    suggestedSurface: curationSurface(surface, {
      surfaceId: `${batch.batchId}-${result.resultId}`,
      candidateId,
      rank: result.rank,
      query: batch.query,
    }),
    existingEntityMatches: matches,
    reviewAction: reviewActionFor(surface, matches),
    diagnostics: diagnosticsFor(surface, matches),
  };
}

function curationSurface(surface, {surfaceId, candidateId, rank, query}) {
  const curatable = CURATION_PLATFORMS.has(surface.platform);
  const platform = curatable ? surface.platform : "other";
  return {
    surfaceId: surfaceId.slice(0, 180),
    platform,
    surfaceKind: surface.surfaceKind,
    url: surface.url,
    normalizedKey: surface.normalizedKey,
    role: surface.role,
    status: surface.status,
    confidence: {...surface.confidence},
    crawl: {
      eventDiscoveryStatus: "disabled",
      policy: platform === "other" ? "blocked" : "manualOnly",
      supportsEventExtraction: surface.extraction?.supportsEventExtraction === true,
    },
    evidenceRefs: [{
      type: "hostDiscoveryRun",
      ref: candidateId.slice(0, 240),
      description: `Web search result ${rank} for: ${query}`.slice(0, 400),
    }],
    notes: surface.notes,
  };
}

function reviewActionFor(surface, matches) {
  if (surface.platform === "news") return "supporting_evidence_only";
  if (!surface.normalizedKey) return "needs_manual_url_resolution";
  if (matches.length > 0) return "attach_to_existing_or_curate";
  if (surface.platform === "officialWebsite") return "verify_ownership_before_attach";
  return "create_or_merge_candidate";
}

function diagnosticsFor(surface, matches) {
  const diagnostics = [];
  if (surface.platform === "officialWebsite") {
    diagnostics.push("first_party_claim_requires_manual_confirmation");
  }
  if (surface.platform === "news") diagnostics.push("press_result_is_not_identity_key");
  if (!surface.normalizedKey) diagnostics.push("no_identity_dedupe_key");
  if (matches.length > 1) diagnostics.push("normalized_key_matches_multiple_entities");
  if (!CURATION_PLATFORMS.has(surface.platform)) {
    diagnostics.push("surface_platform_not_curatable");
  }
  return diagnostics;
}

// One candidate per organizer surface: the first observation (by batch id,
// then rank) is kept and the rest are reported. A result without an identity
// key (press, content URLs) collapses only on its exact canonical URL.
function collapseDuplicateSurfaces(observed) {
  const groups = new Map();
  for (const candidate of observed) {
    const key = candidate.normalizedKey ?? `url:${candidate.canonicalUrl}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
  }
  const candidates = [];
  const duplicateKeys = [];
  for (const [key, group] of groups) {
    candidates.push(group[0]);
    if (group.length < 2) continue;
    duplicateKeys.push({
      normalizedKey: group[0].normalizedKey ?? null,
      canonicalUrl: group[0].canonicalUrl,
      keptCandidateId: group[0].candidateId,
      candidateIds: group.map((candidate) => candidate.candidateId).sort(),
      groupKey: key,
    });
  }
  return {
    candidates,
    duplicateKeys: duplicateKeys
      .sort((a, b) => a.groupKey.localeCompare(b.groupKey))
      .map(({groupKey: _groupKey, ...entry}) => entry),
  };
}

function buildDedupeMatchesByKey(dedupeIndex) {
  const matches = new Map();
  for (const key of dedupeIndex?.dedupeKeys ?? []) {
    if (key?.type !== "surface" || typeof key.value !== "string" ||
      typeof key.entityId !== "string") continue;
    if (!matches.has(key.value)) matches.set(key.value, []);
    matches.get(key.value).push({
      entityId: key.entityId,
      strength: key.strength,
      reason: key.reason,
    });
  }
  for (const [key, values] of matches.entries()) {
    matches.set(key, values.sort((a, b) => a.entityId.localeCompare(b.entityId)));
  }
  return matches;
}

function countBy(items, field) {
  const counts = {};
  for (const item of items) {
    const key = item[field] ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function compareBatches(left, right) {
  return String(left?.batchId ?? "").localeCompare(String(right?.batchId ?? ""));
}

function validateBatch(batch, errors, seenBatchIds) {
  const id = batch?.batchId ?? "<unknown>";
  if (batch?.schemaVersion !== SEARCH_RESULT_BATCH_VERSION) {
    errors.push(`${id}: schemaVersion must be ${SEARCH_RESULT_BATCH_VERSION}.`);
  }
  if (!isSlug(batch?.batchId)) errors.push(`${id}: invalid batchId.`);
  if (seenBatchIds.has(batch?.batchId)) errors.push(`${id}: duplicate batchId.`);
  seenBatchIds.add(batch?.batchId);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(batch?.createdAt ?? "")) {
    errors.push(`${id}: createdAt must be YYYY-MM-DD.`);
  }
  if (!batch?.queryIntent || typeof batch.queryIntent !== "object") {
    errors.push(`${id}: queryIntent is required.`);
  } else if (!/^[a-z][a-z0-9-]{1,49}$/u.test(batch.queryIntent.marketSlug ?? "")) {
    errors.push(`${id}: queryIntent.marketSlug is required.`);
  }
  if (!Array.isArray(batch?.results)) {
    errors.push(`${id}: results must be an array.`);
    return;
  }
  const resultIds = new Set();
  for (const result of batch.results) {
    if (!isSlug(result?.resultId)) errors.push(`${id}: invalid resultId ${result?.resultId}.`);
    if (resultIds.has(result?.resultId)) errors.push(`${id}: duplicate resultId ${result?.resultId}.`);
    resultIds.add(result?.resultId);
    if (!Number.isInteger(result?.rank) || result.rank < 1) {
      errors.push(`${id}/${result?.resultId}: rank must be a positive integer.`);
    }
  }
}

function isSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(String(value ?? ""));
}
