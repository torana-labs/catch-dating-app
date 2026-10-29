import {hashValue} from "../../../platform/canonical-json.mjs";
import {invariant} from "../../../platform/errors.mjs";
import {
  bigramSimilarity,
  compactHandle,
  handleForKey,
  identityKeysForLink,
  isIdentityKeyString,
  keyNamespace,
  marketTokens,
  nameForm,
  nameKeyWithout,
  slugOrNull,
  tokenSimilarity,
} from "./normalize.mjs";

// Deterministic organizer matching for Supply Intake. Given one listing (or
// any organizer candidate) and the organizers Catch already lists, it ranks
// likely duplicates with the signals that produced each score and returns a
// match / ambiguous / none verdict. The verdict is advisory: it flags the
// listing for the reviewer, never merges records and never blocks approval.
//
// Ported from the retired organizer-intake source-mention resolver
// (source-mention-resolution-v1): the same weights for shared surface keys,
// exact names and markets, and the same auto-attach, probable-duplicate and
// human-review thresholds. Changes from the legacy scorecard, each because a
// legacy rule produced a wrong answer for organizer dedupe:
// - surface keys come from Supply Intake's normalizer, so two Instagram
//   profiles no longer match on the shared instagram.com domain;
// - name similarity is the better of token overlap and character bigrams and
//   weighs 0.5 instead of the event-title 0.22, so a near-name in the same
//   market reaches review instead of scoring as unrelated;
// - word-order, market-word and handle-as-name agreements score below an
//   exact name, so they flag for review but cannot match on their own;
// - different handles on the same platform and disjoint markets count
//   against a candidate.
// Every organizer is scored (one listing against the inventory), so the
// legacy pairwise blocking and oversized-block warnings are not needed.

export const ORGANIZER_MATCHING_POLICY = Object.freeze({
  schemaVersion: 1,
  policyId: "organizer-matching-v1",
  derivedFrom: "source-mention-resolution-v1",
  authority: "advisory",
  weights: Object.freeze({
    sharedIdentityKey: 0.95,
    exactName: 0.82,
    sameNameTokens: 0.7,
    sameNameWithoutMarket: 0.7,
    handleMatchesName: 0.7,
    nameSimilarity: 0.5,
    sameMarket: 0.12,
    differentMarket: -0.3,
    differentHandleSamePlatform: -0.12,
  }),
  thresholds: Object.freeze({
    match: 0.9,
    probable: 0.72,
    review: 0.45,
    similarName: 0.66,
  }),
  limits: Object.freeze({
    maxOrganizers: 10_000,
    defaultCandidates: 5,
    maxCandidates: 12,
  }),
});

export const POSSIBLE_DUPLICATE_GAP = "possible_duplicate_organizer";
export const POSSIBLE_DUPLICATE_TASK_FLAG = "possible_duplicate";
export const ORGANIZER_MATCH_VERDICTS = Object.freeze(["match", "ambiguous", "none"]);

const MAX_NAMES = 8;
const MAX_KEYS = 40;

/**
 * An organizer Catch already lists, as a read model supplies it:
 * {organizerId, name, aliases?, slug?, markets?, links?, identityKeys?,
 * instagramHandle?}. Links may be URLs or {url, normalizedKey}.
 */
export function normalizeOrganizerReference(organizer) {
  invariant(organizer && typeof organizer === "object", "INVALID_ORGANIZER_INVENTORY",
    "Each existing organizer must be an object.");
  invariant(typeof organizer.organizerId === "string" && organizer.organizerId.length > 0 &&
    organizer.organizerId.length <= 200, "INVALID_ORGANIZER_INVENTORY",
  "Each existing organizer needs a bounded organizerId.");
  const keys = new Set();
  for (const link of asArray(organizer.links)) for (const key of identityKeysForLink(link)) keys.add(key);
  for (const key of asArray(organizer.identityKeys)) if (isIdentityKeyString(key)) keys.add(key);
  const instagram = compactHandle(organizer.instagramHandle);
  if (instagram) keys.add(`instagram:${String(organizer.instagramHandle).trim().replace(/^@/, "").toLowerCase()}`);
  const names = boundedNames([organizer.name, ...asArray(organizer.aliases)]);
  return {
    organizerId: organizer.organizerId,
    name: typeof organizer.name === "string" ? organizer.name.slice(0, 500) : null,
    names,
    markets: boundedMarkets(organizer.markets),
    identityKeys: [...keys].sort().slice(0, MAX_KEYS),
    handles: handlesFor(keys, [organizer.slug]),
  };
}

/** The organizer a Supply Intake listing describes, in the same shape. */
export function listingMatchSubject(listing, {market} = {}) {
  invariant(listing && typeof listing === "object" && listing.organizer && typeof listing.organizer === "object",
    "INVALID_ORGANIZER_MATCH_SUBJECT", "Organizer matching requires a Supply Intake listing.");
  const keys = new Set();
  for (const link of asArray(listing.organizer.links)) for (const key of identityKeysForLink(link)) keys.add(key);
  for (const key of asArray(listing.organizer.identityKeys)) if (isIdentityKeyString(key)) keys.add(key);
  // A seed URL the listing could not read still names the organizer.
  for (const url of asArray(listing.seed?.urls)) {
    for (const key of identityKeysForLink(url, {organizerRole: false})) keys.add(key);
  }
  const subjectMarket = market ?? listing.market ?? null;
  return {
    subjectId: typeof listing.listingId === "string" ? listing.listingId : null,
    names: boundedNames([listing.organizer.name, listing.seed?.name]),
    markets: boundedMarkets(subjectMarket ? [subjectMarket] : []),
    identityKeys: [...keys].sort().slice(0, MAX_KEYS),
    handles: handlesFor(keys, []),
  };
}

/** A generic candidate ({name, aliases?, urls?, identityKeys?, markets?}). */
export function candidateMatchSubject(candidate) {
  invariant(candidate && typeof candidate === "object", "INVALID_ORGANIZER_MATCH_SUBJECT",
    "Organizer matching requires a candidate object.");
  const keys = new Set();
  for (const url of asArray(candidate.urls)) for (const key of identityKeysForLink(url)) keys.add(key);
  for (const key of asArray(candidate.identityKeys)) if (isIdentityKeyString(key)) keys.add(key);
  return {
    subjectId: typeof candidate.id === "string" ? candidate.id : null,
    names: boundedNames([candidate.name, ...asArray(candidate.aliases)]),
    markets: boundedMarkets(candidate.markets),
    identityKeys: [...keys].sort().slice(0, MAX_KEYS),
    handles: handlesFor(keys, []),
  };
}

/**
 * Normalizes the inventory once so many listings can be matched against it.
 * Inputs are never mutated; the matcher holds only normalized copies.
 */
export function createOrganizerMatcher({organizers, policy = ORGANIZER_MATCHING_POLICY} = {}) {
  invariant(Array.isArray(organizers), "INVALID_ORGANIZER_INVENTORY", "Existing organizers must be an array.");
  invariant(organizers.length <= policy.limits.maxOrganizers, "ORGANIZER_INVENTORY_TOO_LARGE",
    `Organizer matching compares at most ${policy.limits.maxOrganizers} organizers.`,
    {count: organizers.length, maximum: policy.limits.maxOrganizers});
  const references = organizers.map(normalizeOrganizerReference)
    .sort((left, right) => left.organizerId.localeCompare(right.organizerId));
  for (let index = 1; index < references.length; index += 1) {
    invariant(references[index].organizerId !== references[index - 1].organizerId, "INVALID_ORGANIZER_INVENTORY",
      "Existing organizer ids must be unique.", {organizerId: references[index].organizerId});
  }
  const prepared = references.map((reference) => ({reference, forms: formsFor(reference.names)}));
  const inventoryHash = hashValue({policyId: policy.policyId, references});
  return Object.freeze({
    policyId: policy.policyId,
    inventoryHash,
    size: references.length,
    matchListing(listing, options = {}) {
      return evaluate(listingMatchSubject(listing, options), prepared, inventoryHash, policy, options);
    },
    matchCandidate(candidate, options = {}) {
      return evaluate(candidateMatchSubject(candidate), prepared, inventoryHash, policy, options);
    },
  });
}

/** One-shot form of createOrganizerMatcher(...).matchListing(listing). */
export function matchListingToOrganizers({listing, organizers, market, maxCandidates,
  policy = ORGANIZER_MATCHING_POLICY} = {}) {
  return createOrganizerMatcher({organizers, policy}).matchListing(listing, {market, maxCandidates});
}

function evaluate(subject, prepared, inventoryHash, policy, {maxCandidates = policy.limits.defaultCandidates} = {}) {
  invariant(Number.isSafeInteger(maxCandidates) && maxCandidates > 0 && maxCandidates <= policy.limits.maxCandidates,
    "INVALID_ORGANIZER_MATCH_OPTIONS", `Organizer matching returns at most ${policy.limits.maxCandidates} candidates.`);
  const subjectForms = formsFor(subject.names);
  const subjectHash = hashValue({policyId: policy.policyId, subject});
  const base = {
    schemaVersion: 1,
    policyId: policy.policyId,
    authority: "advisory",
    autoMerge: false,
    blocksApproval: false,
    subject: {
      subjectId: subject.subjectId,
      names: subject.names,
      markets: subject.markets,
      identityKeys: subject.identityKeys,
    },
    organizersCompared: prepared.length,
    subjectHash,
    inventoryHash,
  };
  if (subjectForms.length === 0 && subject.identityKeys.length === 0) {
    return finish(base, "none", ["listing_has_no_identity"], []);
  }
  const scored = prepared
    .map(({reference, forms}) => scoreCandidate(subject, subjectForms, reference, forms, policy))
    .filter((candidate) => candidate.score >= policy.thresholds.review || candidate.sharedIdentityKeys.length > 0)
    .sort((left, right) => right.score - left.score || left.organizerId.localeCompare(right.organizerId));
  const [best, runnerUp] = scored;
  const candidates = scored.slice(0, maxCandidates).map((candidate) => ({...candidate,
    band: band(candidate.score, policy)}));
  if (!best || best.score < policy.thresholds.review) {
    return finish(base, "none", ["no_candidate_above_review_threshold"], candidates);
  }
  if (best.score >= policy.thresholds.match) {
    if (runnerUp && runnerUp.score >= policy.thresholds.match) {
      return finish(base, "ambiguous", ["multiple_strong_candidates"], candidates);
    }
    if (best.conflicts.length > 0) return finish(base, "ambiguous", ["strong_candidate_with_conflicts"], candidates);
    return finish(base, "match", ["unique_strong_candidate"], candidates);
  }
  return finish(base, "ambiguous", [best.score >= policy.thresholds.probable ? "probable_candidate" :
    "review_candidate"], candidates);
}

function finish(base, verdict, reasons, candidates) {
  return {
    ...base,
    verdict,
    reasons,
    flag: verdict === "none" ? null : {gap: POSSIBLE_DUPLICATE_GAP, taskFlag: POSSIBLE_DUPLICATE_TASK_FLAG},
    // The shape Supply Intake's guarded extraction router expects before it
    // allows an ambiguous_identity model fallback.
    identityScorecard: {
      evaluated: true,
      resolution: verdict === "match" ? "matched" : verdict === "ambiguous" ? "ambiguous" : "unmatched",
    },
    candidates,
  };
}

function scoreCandidate(subject, subjectForms, reference, referenceForms, policy) {
  const {weights, thresholds} = policy;
  const signals = [];
  const conflicts = [];
  let score = 0;

  const referenceKeys = new Set(reference.identityKeys);
  const sharedIdentityKeys = subject.identityKeys.filter((key) => referenceKeys.has(key));
  if (sharedIdentityKeys.length > 0) {
    score += weights.sharedIdentityKey;
    signals.push({code: "shared_identity_key", weight: weights.sharedIdentityKey, detail: sharedIdentityKeys.join(", ")});
  } else {
    const conflictingNamespaces = differentHandleNamespaces(subject.identityKeys, reference.identityKeys);
    if (conflictingNamespaces.length > 0) {
      score += weights.differentHandleSamePlatform;
      conflicts.push({code: "different_handle_same_platform", weight: weights.differentHandleSamePlatform,
        detail: conflictingNamespaces.join(", ")});
    }
  }

  const name = bestNameSignal(subject, subjectForms, reference, referenceForms, policy);
  if (name) {
    score += name.weight;
    signals.push(name);
  }

  if (subject.markets.length > 0 && reference.markets.length > 0) {
    const shared = subject.markets.filter((market) => reference.markets.includes(market));
    if (shared.length > 0) {
      score += weights.sameMarket;
      signals.push({code: "same_market", weight: weights.sameMarket, detail: shared.join(", ")});
    } else {
      score += weights.differentMarket;
      conflicts.push({code: "different_market", weight: weights.differentMarket,
        detail: `${subject.markets.join(", ")} vs ${reference.markets.join(", ")}`});
    }
  }

  const bounded = round(Math.max(0, Math.min(1, score)));
  return {
    organizerId: reference.organizerId,
    name: reference.name,
    markets: reference.markets,
    score: bounded,
    sharedIdentityKeys,
    signals,
    conflicts,
    rationale: rationale(bounded, signals, conflicts, sharedIdentityKeys, thresholds),
  };
}

// Only the strongest name agreement counts, so two spellings of one name
// cannot add up to an identity match.
function bestNameSignal(subject, subjectForms, reference, referenceForms, policy) {
  const {weights, thresholds} = policy;
  if (subjectForms.length === 0 && subject.handles.length === 0) return null;
  for (const left of subjectForms) {
    for (const right of referenceForms) {
      if (left.key === right.key) {
        return {code: "exact_name", weight: weights.exactName, detail: right.name};
      }
    }
  }
  for (const left of subjectForms) {
    for (const right of referenceForms) {
      if (left.form.tokens.join(" ") === right.form.tokens.join(" ")) {
        return {code: "same_name_tokens", weight: weights.sameNameTokens, detail: right.name};
      }
    }
  }
  const dropped = [...new Set(subject.markets.flatMap(marketTokens))];
  for (const left of subjectForms) {
    for (const right of referenceForms) {
      const leftKey = nameKeyWithout(left.form, dropped) ?? left.key;
      const rightKey = nameKeyWithout(right.form, dropped) ?? right.key;
      if (leftKey === rightKey) {
        return {code: "same_name_without_market", weight: weights.sameNameWithoutMarket, detail: right.name};
      }
    }
  }
  const handleMatch = handleNameMatch(subject.handles, referenceForms) ??
    handleNameMatch(reference.handles, subjectForms);
  if (handleMatch) {
    return {code: "handle_matches_name", weight: weights.handleMatchesName, detail: handleMatch};
  }
  let best = 0;
  let bestName = null;
  for (const left of subjectForms) {
    for (const right of referenceForms) {
      const similarity = Math.max(tokenSimilarity(left.form.tokens, right.form.tokens),
        bigramSimilarity(left.key, right.key));
      if (similarity > best) {
        best = similarity;
        bestName = right.name;
      }
    }
  }
  if (best <= 0) return null;
  const weight = round(weights.nameSimilarity * best);
  return {code: best >= thresholds.similarName ? "similar_name" : "name_overlap", weight,
    detail: `${bestName} (${round(best)})`};
}

function handleNameMatch(handles, forms) {
  for (const handle of handles) {
    for (const form of forms) {
      if (handle === form.key || handle === form.form.text.replace(/ /g, "")) return `${handle} ~ ${form.name}`;
    }
  }
  return null;
}

// Two different handles on the same platform suggest two organizers. A site
// with several domains is common, so websites do not count.
function differentHandleNamespaces(leftKeys, rightKeys) {
  const namespaces = (keys) => new Set(keys.map(keyNamespace).filter((namespace) => namespace && namespace !== "domain"));
  const right = namespaces(rightKeys);
  return [...namespaces(leftKeys)].filter((namespace) => right.has(namespace)).sort();
}

function rationale(score, signals, conflicts, sharedIdentityKeys, thresholds) {
  const parts = [];
  if (sharedIdentityKeys.length > 0) parts.push(`same page ${sharedIdentityKeys.join(", ")}`);
  const named = signals.filter((signal) => signal.code !== "shared_identity_key").map((signal) => signal.code);
  if (named.length > 0) parts.push(`matches ${named.join(", ")}`);
  if (conflicts.length > 0) parts.push(`conflicts ${conflicts.map((conflict) => conflict.code).join(", ")}`);
  const lead = score >= thresholds.match ? "likely the same organizer" :
    score >= thresholds.review ? "possibly the same organizer" : "weak overlap";
  return `${lead} (${score}): ${parts.join("; ") || "no material overlap"}`;
}

function band(score, policy) {
  if (score >= policy.thresholds.match) return "match";
  if (score >= policy.thresholds.probable) return "probable";
  if (score >= policy.thresholds.review) return "review";
  return "low";
}

function formsFor(names) {
  return names.map((name) => ({name, form: nameForm(name)}))
    .filter((entry) => entry.form)
    .map((entry) => ({name: entry.name, form: entry.form, key: entry.form.key}));
}

function handlesFor(keys, extra) {
  const handles = new Set();
  for (const key of keys) {
    const handle = handleForKey(key);
    if (handle) handles.add(handle);
  }
  for (const value of extra) {
    const handle = compactHandle(value);
    if (handle) handles.add(handle);
  }
  return [...handles].sort();
}

function boundedNames(values) {
  const names = [];
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    const name = value.trim().slice(0, 200);
    if (!names.includes(name)) names.push(name);
  }
  return names.slice(0, MAX_NAMES);
}

function boundedMarkets(values) {
  return [...new Set(asArray(values).map(slugOrNull).filter(Boolean))].sort().slice(0, 8);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * Maps an `organizers/{organizerId}` document to the reference shape, for a
 * trusted read model. Only identity fields are read; contact, ownership and
 * host fields are ignored.
 */
export function organizerReferenceFromDocument(organizerId, document) {
  const page = document?.publicPage ?? null;
  return {
    organizerId,
    name: typeof document?.name === "string" ? document.name : null,
    slug: typeof page?.slug === "string" ? page.slug : null,
    markets: typeof page?.citySlug === "string" ? [page.citySlug] : [],
    instagramHandle: typeof document?.instagramHandle === "string" ? document.instagramHandle : null,
    links: asArray(document?.publicSources).map((source) => source?.href).filter((href) => typeof href === "string"),
  };
}
