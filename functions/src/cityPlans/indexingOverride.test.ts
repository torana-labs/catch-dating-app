import assert from "node:assert/strict";
import test from "node:test";
import {buildCityPlans, type CityMarket} from "./cityPlansModel";
import {
  applyFormatPageIndexingOverride,
  discoveryIndexingConfig,
  parseDiscoveryIndexingConfig,
  readFormatPageIndexingOverride,
} from "./indexingOverride";

const now = Date.parse("2026-11-19T06:00:00.000Z");
const indore: CityMarket = {slug: "indore", label: "Indore",
  launchStatus: "launched"};

/** A city whose run club page has met the bar and studio page has not. */
function plans() {
  const built = buildCityPlans({market: indore, now, organizerPages: [],
    joiningOrganizers: []});
  return {...built, formatPages: {...built.formatPages,
    runClubs: {...built.formatPages.runClubs, organizerCount: 4,
      indexing: "index, follow" as const}}};
}

test("with no override document, or the switch off, the bar decides", () => {
  for (const data of [undefined, {forceNoindex: false},
    {forceNoindex: false, reason: "Pilot resumed", updatedBy: "owner"}]) {
    const override = parseDiscoveryIndexingConfig(data);
    assert.equal(override.forceNoindex, false, JSON.stringify(data));
    const city = plans();
    assert.equal(applyFormatPageIndexingOverride(city, override), city);
    assert.equal(city.formatPages.runClubs.indexing, "index, follow");
  }
});

test("with the switch on, every format page is noindex whatever its counts",
  () => {
    const override = parseDiscoveryIndexingConfig(
      {forceNoindex: true, reason: "Pause trigger"});
    assert.deepEqual(override, {forceNoindex: true, source: "on"});
    const city = plans();
    const forced = applyFormatPageIndexingOverride(city, override);
    assert.ok(Object.values(forced.formatPages).every((page) =>
      page.indexing === "noindex, follow"));
    // Counts are kept; only the indexing decision changes.
    assert.equal(forced.formatPages.runClubs.organizerCount, 4);
    assert.deepEqual(Object.keys(forced.formatPages),
      Object.keys(city.formatPages));
    assert.equal(city.formatPages.runClubs.indexing, "index, follow");
  });

test("a malformed override document fails closed", () => {
  for (const data of [null, "true", [], {}, {forceNoindex: "false"},
    {forceNoindex: false, extra: 1}]) {
    assert.deepEqual(parseDiscoveryIndexingConfig(data),
      {forceNoindex: true, source: "invalid"}, JSON.stringify(data));
  }
});

test("the override is read from config/discoveryIndexing", async () => {
  const reads: string[] = [];
  const db = (stored: unknown) => ({
    collection: (collection: string) => ({doc: (id: string) => ({
      get: async () => {
        reads.push(`${collection}/${id}`);
        return {exists: stored !== undefined, data: () => stored};
      },
    })}),
  }) as unknown as FirebaseFirestore.Firestore;
  assert.deepEqual(await readFormatPageIndexingOverride(db(undefined)),
    {forceNoindex: false, source: "absent"});
  assert.deepEqual(await readFormatPageIndexingOverride(
    db({forceNoindex: true})), {forceNoindex: true, source: "on"});
  assert.deepEqual(reads, Array(2).fill(
    `${discoveryIndexingConfig.collection}/` +
    discoveryIndexingConfig.document));
});
