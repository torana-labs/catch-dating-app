import assert from "node:assert/strict";
import test from "node:test";
import {projectLivePublicCatchEvent} from "./publicCatchEvent";
import {publicExternalEvent} from "./publicExternalEvent";
import {projectPublicOrganizer} from "./publicOrganizer";
import {
  parityInputs,
  readPublicPageFixture,
  type FixtureDocument,
} from "./publicPageTestFixtures";
import {publicEventAuthorized} from "./publicReadPolicy";
import {projectPublicReview} from "./publicReview";
import {liveMarkets} from "./rebuild";

/**
 * The website reader owns parity_expected.json
 * (website/src/server/publicPageParity.test.ts writes it). The read-model
 * port must reproduce it exactly from the same inputs.
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

test("the port reproduces the website reader's projections", () => {
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
  const expected = readPublicPageFixture("parity_expected.json") as
    typeof actual;
  assert.equal(actual.length, expected.length);
  actual.forEach((parity, index) => {
    // Compare serialized output, as the page documents store it.
    assert.deepEqual(JSON.parse(JSON.stringify(parity)), expected[index],
      parity.name);
  });
});
