import assert from "node:assert/strict";
import test from "node:test";
import {FileOperationsStore} from "../src/platform/storage/file-store.mjs";
import {createSupplyModelFallback, loadSupplyModelPolicy} from "../src/workflows/supply-intake/model-fallback.mjs";
import {
  ORGANIZER_MATCHING_POLICY,
  POSSIBLE_DUPLICATE_GAP,
  POSSIBLE_DUPLICATE_TASK_FLAG,
  adjudicateOrganizerMatch,
  createOrganizerMatcher,
  matchListingToOrganizers,
  organizerAdjudicationRequest,
  organizerReferenceFromDocument,
} from "../src/workflows/supply-intake/organizer-matching/index.mjs";
import {temporaryDirectory} from "./helpers.mjs";

const NOW = "2026-10-29T00:00:00.000Z";

const INVENTORY = Object.freeze([
  {organizerId: "org-mumbai-run-club", name: "Mumbai Run Club", markets: ["mumbai"],
    links: ["https://www.instagram.com/mumbairunclub/"]},
  {organizerId: "org-bombay-board-gamers", name: "Bombay Board Gamers", markets: ["mumbai"],
    links: ["https://lu.ma/calendar/bombay-board-gamers", "https://bombayboardgamers.in"]},
  {organizerId: "org-bandra-run-club", name: "Bandra Run Club", markets: ["mumbai"],
    links: ["https://instagram.com/bandrarunclub"]},
  {organizerId: "org-delhi-run-club", name: "Delhi Run Club", markets: ["delhi-ncr"]},
  {organizerId: "org-linktree-crew", name: "Supper Crew", markets: ["mumbai"], links: ["https://linktr.ee/suppercrew"]},
]);

function listing({name = null, seedName = null, links = [], seedUrls = [], market = "mumbai"} = {}) {
  return {
    listingId: "intake-nom-1",
    market,
    seed: {name: seedName, urls: seedUrls, notes: null, categories: []},
    organizer: {name, links: links.map((url) => ({url})), identityKeys: []},
  };
}

function match(input, organizers = INVENTORY) {
  return matchListingToOrganizers({listing: listing(input), organizers});
}

test("an exact Instagram handle matches across URL variants", () => {
  for (const url of [
    "https://instagram.com/mumbairunclub",
    "https://m.instagram.com/MumbaiRunClub?igshid=abc123",
    "http://www.instagram.com/mumbairunclub/?utm_source=ig_web_copy_link",
    "instagram.com/@mumbairunclub",
  ]) {
    const result = match({name: "MRC", links: [url]});
    assert.equal(result.verdict, "match", url);
    assert.deepEqual(result.reasons, ["unique_strong_candidate"]);
    assert.equal(result.candidates[0].organizerId, "org-mumbai-run-club");
    assert.deepEqual(result.candidates[0].sharedIdentityKeys, ["instagram:mumbairunclub"]);
    assert.equal(result.candidates[0].band, "match");
    assert.match(result.candidates[0].rationale, /same page instagram:mumbairunclub/);
  }
});

test("Luma calendar and website URL variants resolve to the same identity key", () => {
  const luma = match({links: ["https://luma.com/bombay-board-gamers?utm_campaign=share"]});
  assert.equal(luma.verdict, "match");
  assert.deepEqual(luma.candidates[0].sharedIdentityKeys, ["luma:calendar:bombay-board-gamers"]);

  const site = match({name: "BBG", links: ["http://www.bombayboardgamers.in/events/#next"]});
  assert.equal(site.verdict, "match");
  assert.deepEqual(site.candidates[0].sharedIdentityKeys, ["domain:bombayboardgamers.in"]);

  // An unread seed URL still names the organizer.
  const seeded = match({seedUrls: ["https://lu.ma/calendar/Bombay-Board-Gamers"]});
  assert.equal(seeded.verdict, "match");
});

test("a shared host matches only the exact page, never the domain", () => {
  const other = match({name: "Brunch Gang", links: ["https://linktr.ee/brunchgang"]});
  assert.equal(other.verdict, "none");
  assert.equal(other.candidates.length, 0);

  const same = match({name: "SC", links: ["https://linktr.ee/suppercrew?utm_source=ig"]});
  assert.equal(same.verdict, "match");
  assert.deepEqual(same.candidates[0].sharedIdentityKeys, ["url:https://linktr.ee/suppercrew"]);
});

test("an exact name in the same market matches; punctuation, case and articles do not matter", () => {
  for (const name of ["Mumbai Run Club", "MUMBAI RUN-CLUB", "The Mumbai Run Club", "MumbaiRunClub"]) {
    const result = match({name});
    assert.equal(result.verdict, "match", name);
    assert.equal(result.candidates[0].organizerId, "org-mumbai-run-club");
    assert.equal(result.candidates[0].score, 0.94);
    assert.deepEqual(result.candidates[0].signals.map((signal) => signal.code), ["exact_name", "same_market"]);
  }
});

test("near-name collisions flag for review but never match", () => {
  const spelling = match({name: "Mumbai Running Club"});
  assert.equal(spelling.verdict, "ambiguous");
  assert.deepEqual(spelling.reasons, ["review_candidate"]);
  assert.equal(spelling.candidates[0].organizerId, "org-mumbai-run-club");
  assert.equal(spelling.candidates[0].signals[0].code, "similar_name");
  assert.ok(spelling.candidates[0].score < ORGANIZER_MATCHING_POLICY.thresholds.probable);

  const reordered = match({name: "Run Club Mumbai"});
  assert.equal(reordered.verdict, "ambiguous");
  assert.deepEqual(reordered.reasons, ["probable_candidate"]);
  assert.equal(reordered.candidates[0].signals[0].code, "same_name_tokens");

  const withoutMarket = match({name: "Bombay Board Gamers Mumbai"});
  assert.equal(withoutMarket.verdict, "ambiguous");
  assert.equal(withoutMarket.candidates[0].signals[0].code, "same_name_without_market");

  const handleAsName = match({name: "Game Nights", links: ["https://instagram.com/bombayboardgamers"]});
  assert.equal(handleAsName.verdict, "ambiguous");
  assert.equal(handleAsName.candidates[0].signals[0].code, "handle_matches_name");

  // A different handle on the same platform counts against a near name.
  const distinct = match({name: "Mumbai Running Club", links: ["https://instagram.com/mumbairunningclub"]});
  assert.equal(distinct.verdict, "none");

  // Neighbourhood clubs that share only the generic words stay apart.
  assert.equal(match({name: "Juhu Run Club"}).verdict, "none");
});

test("ambiguity: several strong candidates, conflicts, or a name in another market", () => {
  const duplicatedInventory = [...INVENTORY, {organizerId: "org-mrc-copy", name: "MRC",
    markets: ["mumbai"], identityKeys: ["instagram:mumbairunclub"]}];
  const several = match({links: ["https://instagram.com/mumbairunclub"]}, duplicatedInventory);
  assert.equal(several.verdict, "ambiguous");
  assert.deepEqual(several.reasons, ["multiple_strong_candidates"]);
  assert.deepEqual(several.candidates.slice(0, 2).map((candidate) => candidate.organizerId),
    ["org-mrc-copy", "org-mumbai-run-club"]);

  const elsewhere = match({name: "Mumbai Run Club", market: "pune"});
  assert.equal(elsewhere.verdict, "ambiguous");
  assert.deepEqual(elsewhere.candidates[0].conflicts.map((conflict) => conflict.code), ["different_market"]);

  const expanding = match({name: "Mumbai Run Club", links: ["https://instagram.com/mumbairunclub"], market: "pune"});
  assert.equal(expanding.verdict, "ambiguous");
  assert.deepEqual(expanding.reasons, ["strong_candidate_with_conflicts"]);
  assert.equal(expanding.identityScorecard.resolution, "ambiguous");
});

test("no match: unrelated organizers, empty inventory, and a listing with no identity", () => {
  const unrelated = match({name: "Sunday Supper Society", links: ["https://instagram.com/sundaysupper"]});
  assert.equal(unrelated.verdict, "none");
  assert.deepEqual(unrelated.reasons, ["no_candidate_above_review_threshold"]);
  assert.equal(unrelated.flag, null);
  assert.equal(unrelated.identityScorecard.resolution, "unmatched");

  assert.equal(match({name: "Mumbai Run Club"}, []).verdict, "none");
  const anonymous = match({});
  assert.equal(anonymous.verdict, "none");
  assert.deepEqual(anonymous.reasons, ["listing_has_no_identity"]);

  // Event pages describe an organizer's events, not the organizer.
  const eventOnly = match({}, [{organizerId: "org-event", name: "Event Host",
    identityKeys: ["luma:event:abc"], links: ["https://district.in/events/abc"]}]);
  assert.equal(eventOnly.verdict, "none");
});

test("the verdict is advisory and deterministic, and inputs are not mutated", () => {
  const inventory = structuredClone(INVENTORY);
  const before = structuredClone(inventory);
  const reversed = [...inventory].reverse();
  const first = matchListingToOrganizers({listing: listing({name: "Mumbai Run Club"}), organizers: inventory});
  const second = matchListingToOrganizers({listing: listing({name: "Mumbai Run Club"}), organizers: reversed});
  assert.deepEqual(first, second);
  assert.deepEqual(inventory, before);
  assert.equal(first.authority, "advisory");
  assert.equal(first.autoMerge, false);
  assert.equal(first.blocksApproval, false);
  assert.deepEqual(first.flag, {gap: POSSIBLE_DUPLICATE_GAP, taskFlag: POSSIBLE_DUPLICATE_TASK_FLAG});
  assert.match(first.inventoryHash, /^[a-f0-9]{64}$/);
  assert.match(first.subjectHash, /^[a-f0-9]{64}$/);

  const matcher = createOrganizerMatcher({organizers: inventory});
  assert.equal(matcher.size, inventory.length);
  assert.deepEqual(matcher.matchListing(listing({name: "Mumbai Run Club"})), first);
  assert.equal(matcher.matchCandidate({name: "Bandra Run Club", markets: ["mumbai"]}).verdict, "match");
});

test("the inventory is validated and bounded", () => {
  assert.throws(() => createOrganizerMatcher({organizers: [{name: "No id"}]}), {code: "INVALID_ORGANIZER_INVENTORY"});
  assert.throws(() => createOrganizerMatcher({organizers: [INVENTORY[0], INVENTORY[0]]}),
    {code: "INVALID_ORGANIZER_INVENTORY"});
  assert.throws(() => createOrganizerMatcher({organizers: Array.from({length: 10_001},
    (_, index) => ({organizerId: `org-${index}`, name: `Organizer ${index}`}))}), {code: "ORGANIZER_INVENTORY_TOO_LARGE"});
  assert.throws(() => matchListingToOrganizers({listing: listing({name: "x"}), organizers: [], maxCandidates: 13}),
    {code: "INVALID_ORGANIZER_MATCH_OPTIONS"});
  assert.throws(() => matchListingToOrganizers({listing: {}, organizers: []}), {code: "INVALID_ORGANIZER_MATCH_SUBJECT"});
});

test("an organizers document maps to a reference without contact fields", () => {
  const reference = organizerReferenceFromDocument("org-42", {
    name: "Bombay Board Gamers", instagramHandle: "@BombayBoardGamers", email: "host@example.com",
    phoneNumber: "+910000000000", publicPage: {slug: "bombay-board-gamers", citySlug: "mumbai"},
    publicSources: [{href: "https://lu.ma/calendar/bombay-board-gamers"}, {href: null}],
  });
  assert.deepEqual(reference, {organizerId: "org-42", name: "Bombay Board Gamers", slug: "bombay-board-gamers",
    markets: ["mumbai"], instagramHandle: "@BombayBoardGamers", links: ["https://lu.ma/calendar/bombay-board-gamers"]});
  const result = match({name: "Board Game Nights", links: ["https://instagram.com/bombayboardgamers"]}, [reference]);
  assert.equal(result.verdict, "match");
  assert.deepEqual(result.candidates[0].sharedIdentityKeys, ["instagram:bombayboardgamers"]);
});

test("model adjudication is refused by the shipped disabled policy", async () => {
  const policy = await loadSupplyModelPolicy();
  assert.equal(policy.provider.enabled, false);
  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  const router = createSupplyModelFallback({policy, store, clock: () => new Date(NOW)});
  const ambiguous = match({name: "Run Club Mumbai"});
  await assert.rejects(adjudicateOrganizerMatch({result: ambiguous, router, observedAt: NOW}),
    {code: "MODEL_DISABLED"});
  assert.equal((await store.listModelRuleCandidates()).length, 0);
});

test("only an ambiguous verdict is eligible, and a proposal never changes the verdict", async () => {
  assert.throws(() => organizerAdjudicationRequest({result: match({name: "Mumbai Run Club"}), observedAt: NOW}),
    {code: "ORGANIZER_ADJUDICATION_NOT_ELIGIBLE"});
  assert.throws(() => organizerAdjudicationRequest({result: match({name: "Nobody"}), observedAt: NOW}),
    {code: "ORGANIZER_ADJUDICATION_NOT_ELIGIBLE"});

  const ambiguous = match({name: "Run Club Mumbai"});
  const request = organizerAdjudicationRequest({result: ambiguous, observedAt: NOW});
  assert.equal(request.reason, "ambiguous_identity");
  assert.equal(request.deterministic.identityScorecard.resolution, "ambiguous");
  assert.match(request.artifactHash, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(request.input.excerpt, /submittedBy|uid|email|phone/);

  const proposals = [
    {status: "resolved", candidateKey: "org-mumbai-run-club", rationale: "Same club."},
    {status: "resolved", candidateKey: "org-invented", rationale: "Hallucinated."},
  ];
  const results = [];
  for (const identityResolution of proposals) {
    const router = {resolve: async (routed) => {
      assert.deepEqual(routed, request);
      return {route: "model_cache", authority: "proposal_only", reviewRequired: true,
        output: {fields: [], identityResolution, abstained: false, uncertainties: []}};
    }};
    results.push(await adjudicateOrganizerMatch({result: ambiguous, router, observedAt: NOW}));
  }
  assert.deepEqual(results[0], {authority: "proposal_only", reviewRequired: true, verdict: "ambiguous",
    route: "model_cache", proposal: {status: "resolved", organizerId: "org-mumbai-run-club", rationale: "Same club."},
    proposalRejected: null});
  assert.equal(results[1].proposal, null);
  assert.equal(results[1].proposalRejected, "candidate_not_in_scorecard");
  assert.equal(ambiguous.verdict, "ambiguous");
});
