import assert from "node:assert/strict";
import test from "node:test";
import {
  planDiscoveryFrontier,
  planDiscoveryQueries,
} from "../src/workflows/supply-intake/discovery-planner.mjs";

test("Mumbai discovery planning is deterministic and bounded by reviewed policy",
  async () => {
    const candidate = {
      candidateId: "courtside",
      displayName: "Courtside",
      categoryId: "racket_sport_social",
      citySlug: "mumbai",
      state: "candidate",
      priority: "p1",
    };
    const first = await planDiscoveryQueries({
      market: "mumbai",
      organizerCandidates: [candidate, candidate],
    });
    const second = await planDiscoveryQueries({
      market: "mumbai",
      organizerCandidates: [candidate, candidate],
    });

    assert.deepEqual(second, first);
    assert.equal(first.plannerId, "operations-supply-discovery-v1");
    assert.equal(first.market, "mumbai");
    assert.equal(
      first.planned.filter((entry) =>
        entry.planKind === "generic_city_category").length,
      9
    );
    assert.equal(
      first.planned.filter((entry) =>
        entry.planKind === "candidate_verification").length,
      5
    );
    assert.equal(new Set(first.planned.map((entry) => entry.runKey)).size, 14);
    assert.ok(first.planned.some((entry) =>
      entry.runKey ===
        "web_search|\"courtside\" mumbai|mumbai|racket_sport_social|courtside"
    ));
  });

test("four-lens frontier keeps cap closed while leader evidence is unknown", async () => {
  const policy = {
    minimumCensusSize: 2,
    topLeaderGateCount: 2,
    minimumSourceDomains: 2,
    cells: [{market: "sample-market", country: "sample-country", segment: "sample-segment"}],
    lenses: [
      {id: "web_press", source: "manual", queryTemplates: ["{segment} {city} press"]},
      {id: "social", source: "manual", queryTemplates: ["{segment} {city} social"]},
      {id: "event_calendar", source: "manual", queryTemplates: ["{segment} {city} events"]},
      {id: "app_directory", source: "manual", queryTemplates: ["{segment} {city} directory"]},
    ],
  };
  const empty = planDiscoveryFrontier({market: "sample-market", policy});
  assert.equal(empty.cells[0].capEligible, false);
  assert.equal(empty.cells[0].missingLenses.length, 4);
  assert.ok(empty.cells[0].unknowns.includes("top_leader_gate_unresolved"));
  const coverage = {
    "sample-segment": {
      reviewRevision: 1,
      reviewerId: "reviewer",
      inputRefs: ["source:coverage"],
      lenses: Object.fromEntries(policy.lenses.map((lens, index) => [
        lens.id,
        {usefulQueryCount: 1, queryRefs: [`query:${index}`], sourceDomains: [`source-${index}.test`]},
      ])),
      leaderCensus: {
        status: "complete",
        candidateFingerprints: ["one", "two"],
        prominenceEvidenceRefs: ["source:one"],
        presumedLeaderFingerprint: "one",
        runnerUpFingerprint: "two",
        stabilityConfirmed: true,
        topCandidateFingerprints: ["one", "two"],
        gateOutcomes: {
          one: {outcome: "pass", inputRefs: ["fact:one"]},
          two: {outcome: "hold_unresolved", inputRefs: ["fact:two"]},
        },
      },
    },
  };
  const unresolved = planDiscoveryFrontier({market: "sample-market", policy, coverage});
  assert.equal(unresolved.cells[0].capEligible, false);
  assert.deepEqual(unresolved.cells[0].missingLenses, []);
  coverage["sample-segment"].leaderCensus.gateOutcomes.two.outcome = "benchmark_pass";
  const complete = planDiscoveryFrontier({market: "sample-market", policy, coverage});
  assert.equal(complete.cells[0].capEligible, true);
  assert.deepEqual(complete.cells[0].unknowns, []);
  const repeatedCensus = structuredClone(coverage);
  repeatedCensus["sample-segment"].leaderCensus.candidateFingerprints = ["one", "one"];
  assert.equal(planDiscoveryFrontier({market: "sample-market", policy,
    coverage: repeatedCensus}).cells[0].capEligible, false);
  const sameLeader = structuredClone(coverage);
  sameLeader["sample-segment"].leaderCensus.runnerUpFingerprint = "one";
  assert.equal(planDiscoveryFrontier({market: "sample-market", policy,
    coverage: sameLeader}).cells[0].capEligible, false);
  const repeatedTop = structuredClone(coverage);
  repeatedTop["sample-segment"].leaderCensus.topCandidateFingerprints = ["one", "one"];
  assert.equal(planDiscoveryFrontier({market: "sample-market", policy,
    coverage: repeatedTop}).cells[0].capEligible, false);
  const ungatedLeader = structuredClone(coverage);
  ungatedLeader["sample-segment"].leaderCensus.topCandidateFingerprints = ["two", "one"];
  assert.equal(planDiscoveryFrontier({market: "sample-market", policy,
    coverage: ungatedLeader}).cells[0].capEligible, false);

  const configured = await planDiscoveryQueries({
    market: "mumbai",
    policyLoader: async () => ({
      categories: {cities: [{slug: "mumbai", name: "Mumbai"}]},
      matrix: {genericSearches: []},
      templates: [],
      marketMap: {...policy, cells: [{...policy.cells[0], market: "mumbai"}]},
    }),
  });
  assert.equal(configured.planned.length, 4);
  assert.equal(new Set(configured.planned.map((entry) => entry.lens)).size, 4);
  assert.ok(configured.planned.every((entry) => entry.planKind === "market_map_lens"));
});

test("candidate verification rejects out-of-market and unreviewed candidates",
  async () => {
    const result = await planDiscoveryQueries({
      market: "indore",
      organizerCandidates: [
        {
          candidateId: "wrong-market",
          displayName: "Wrong Market",
          citySlug: "mumbai",
          state: "candidate",
          priority: "p1",
        },
        {
          candidateId: "wrong-state",
          displayName: "Wrong State",
          citySlug: "indore",
          state: "raw",
          priority: "p1",
        },
        {
          candidateId: "wrong-priority",
          displayName: "Wrong Priority",
          citySlug: "indore",
          state: "candidate",
          priority: "p3",
        },
      ],
    });

    assert.equal(
      result.planned.filter((entry) =>
        entry.planKind === "candidate_verification").length,
      0
    );
    assert.ok(result.planned.length > 0);
    assert.ok(result.planned.every((entry) => entry.citySlug === "indore"));
  });
