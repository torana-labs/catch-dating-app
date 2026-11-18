/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {eventMarket, inferDraftMarket, openDraftMarket, openDraftMarkets} from "./market";

test("an event's locality, address, venue or coordinates name its market", () => {
  assert.equal(eventMarket({locality: "Mumbai"})?.marketId, "in-mh-mumbai");
  assert.equal(eventMarket({locality: "Bombay"})?.marketId, "in-mh-mumbai", "a catalog alias counts");
  assert.equal(eventMarket({address: "12 MG Road, Indore, Madhya Pradesh 452001"})?.marketId, "in-mp-indore");
  assert.equal(eventMarket({venue: "Giggle Yard | Bandra, Mumbai"})?.marketId, "in-mh-mumbai");
  assert.equal(eventMarket({latitude: 19.06, longitude: 72.83})?.marketId, "in-mh-mumbai", "Bandra is within Mumbai's radius");
  assert.equal(eventMarket({latitude: 18.52, longitude: 73.85})?.marketId, "in-mh-pune", "Pune is its own market");
  assert.equal(eventMarket({venue: "Bandra", latitude: null, longitude: null}), null);
  assert.equal(eventMarket({latitude: 0, longitude: 0}), null, "far from every market");
});

test("one market across the located events is the draft's; several or none leave it to the submitter", () => {
  const mumbai = inferDraftMarket([{locality: "Mumbai"}, {venue: "Bandra"}, {address: "Juhu, Mumbai"}]);
  assert.deepEqual(mumbai.kind === "market" ? mumbai.market.marketId : mumbai, "in-mh-mumbai");
  assert.deepEqual(inferDraftMarket([{locality: "Mumbai"}, {locality: "Indore"}]),
    {kind: "ambiguous", marketIds: ["in-mh-mumbai", "in-mp-indore"]});
  assert.deepEqual(inferDraftMarket([{venue: "Bandra"}]), {kind: "unknown"});
  const fallback = inferDraftMarket([{venue: "Bandra"}], "Indore");
  assert.equal(fallback.kind === "market" ? fallback.market.marketId : null, "in-mp-indore",
    "the organizer's own locality is the fallback when no event is located");
});

test("only open launch markets are offered or accepted", () => {
  const offered = openDraftMarkets();
  assert.ok(offered.length > 0 && offered.length <= 50);
  assert.ok(offered.some((market) => market.marketId === "in-mh-mumbai"));
  assert.equal(offered.some((market) => market.marketId === "in-ka-bengaluru"), false);
  assert.equal(openDraftMarket("Mumbai")?.marketId, "in-mh-mumbai");
  assert.equal(openDraftMarket("Bengaluru"), null);
  assert.equal(openDraftMarket("Atlantis"), null);
});
