import assert from "node:assert/strict";
import {writeFileSync} from "node:fs";
import path from "node:path";
import test from "node:test";
import {projectLivePublicCatchEvent} from "./publicCatchEvent";
import {publicExternalEvent} from "./publicExternalEvent";
import {projectPublicOrganizer} from "./publicOrganizer";
import {
  parityInputs,
  type FixtureDocument,
} from "./publicPageTestFixtures";
import {publicEventAuthorized} from "./publicReadPolicy";
import {projectPublicReview} from "./publicReview";
import {liveMarkets} from "./rebuild";
import {contractFile} from "../shared/contractFixtures";

/**
 * parity_expected.json is the projections' golden output for the shared
 * inputs. The website no longer projects source documents, so these
 * projections own it: after a deliberate projection change, rewrite it with
 * UPDATE_PUBLIC_PAGE_FIXTURES=1 and review the diff.
 */
type Row = Record<string, unknown>;

function byId<T>(
  docs: FixtureDocument[], project: (id: string, data: Row) => T
): Record<string, T | null> {
  return Object.fromEntries(docs.map((doc) =>
    [doc.id, project(doc.id, doc.data) ?? null]));
}

test("the read models use the website's live event cities", () => {
  assert.deepEqual([...liveMarkets].sort(), parityInputs().liveMarkets);
});

test("the projections reproduce their golden output", () => {
  const inputs = parityInputs();
  const markets = new Set(inputs.liveMarkets);
  const actual = inputs.cases.map((parity) => ({
    name: parity.name,
    listing: projectPublicOrganizer(parity.organizer.id,
      parity.organizer.data, markets),
    catchEvents: byId(parity.catchEvents, (id, data) =>
      publicEventAuthorized(id, data) ?
        projectLivePublicCatchEvent(id, data, inputs.now) : null),
    externalEvents: byId(parity.externalEvents, (id, data) =>
      publicExternalEvent(id, data)),
    reviews: byId(parity.reviews, (id, data) =>
      projectPublicReview(id, data, parity.organizer.id)),
  }));
  if (process.env.UPDATE_PUBLIC_PAGE_FIXTURES === "1") {
    writeFileSync(path.resolve(__dirname, "..", "..", "..", "contracts",
      "fixtures", "public_pages", "parity_expected.json"),
    `${JSON.stringify(actual, null, 2)}\n`);
  }
  const expected = contractFile("fixtures/public_pages/parity_expected.json") as
    typeof actual;
  assert.equal(actual.length, expected.length);
  actual.forEach((parity, index) => {
    // Compare serialized output, as the page documents store it.
    assert.deepEqual(JSON.parse(JSON.stringify(parity)), expected[index],
      parity.name);
  });
});
