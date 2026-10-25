// @vitest-environment node
import fs from "node:fs";
import {describe, expect, it} from "vitest";
import {activeEventLiveCities} from "../content/markets";
import {projectLivePublicCatchEvent} from "../features/organizers/publicCatchEventProjection";
import {publicExternalEvent} from "./publicExternalEvent";
import {projectPublicOrganizer} from "./publicOrganizerProjection";
import {publicEventAuthorized} from "./publicReadPolicy";
import {projectPublicReview} from "./publicReviewProjection";

/**
 * Functions build the organizer and event page read models with a port of
 * this reader (functions/src/publicPages). Both run the shared inputs and
 * must produce parity_expected.json, which this reader owns: a change here
 * updates the file with `vitest -u`, and the Functions parity test then
 * fails until the port matches.
 */
type Row = Record<string, unknown>;
interface SourceDocument {id: string; data: Row}
interface ParityCase {
  name: string;
  organizer: SourceDocument;
  catchEvents: SourceDocument[];
  externalEvents: SourceDocument[];
  reviews: SourceDocument[];
}
const fixtures = new URL("../../../contracts/fixtures/public_pages/", import.meta.url);
const inputs = JSON.parse(fs.readFileSync(new URL("parity_inputs.json", fixtures), "utf8")) as {
  now: number; liveMarkets: string[]; cases: ParityCase[];
};

/** Admin SDK timestamps keep `_seconds` and `_nanoseconds` and add `toMillis`. */
class FixtureTimestamp {
  constructor(readonly _seconds: number, readonly _nanoseconds: number) {}
  toMillis() {return this._seconds * 1000 + Math.floor(this._nanoseconds / 1e6);}
}

function hydrate(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(hydrate);
  if (!value || typeof value !== "object") return value;
  const row = value as Row;
  const keys = Object.keys(row).sort();
  if (keys.length === 2 && keys[0] === "_nanoseconds" && keys[1] === "_seconds" &&
      typeof row._seconds === "number" && typeof row._nanoseconds === "number") {
    return new FixtureTimestamp(row._seconds, row._nanoseconds);
  }
  return Object.fromEntries(Object.entries(row).map(([key, item]) => [key, hydrate(item)]));
}

const byId = <T>(docs: SourceDocument[], project: (doc: SourceDocument) => T) =>
  Object.fromEntries(docs.map((doc) => [doc.id, project({id: doc.id, data: hydrate(doc.data) as Row}) ?? null]));

describe("public page read-model parity", () => {
  it("uses the website's live event cities", () => {
    expect(activeEventLiveCities.map((city) => city.slug).sort()).toEqual(inputs.liveMarkets);
  });

  it("matches the shared expected projections", async () => {
    const markets = new Set(inputs.liveMarkets);
    const expected = inputs.cases.map((parity) => ({
      name: parity.name,
      listing: projectPublicOrganizer(parity.organizer.id, hydrate(parity.organizer.data), markets),
      catchEvents: byId(parity.catchEvents, ({id, data}) => publicEventAuthorized(id, data) ?
        projectLivePublicCatchEvent(id, data, inputs.now) : null),
      externalEvents: byId(parity.externalEvents, ({id, data}) => publicExternalEvent(id, data)),
      reviews: byId(parity.reviews, ({id, data}) => projectPublicReview(id, data, parity.organizer.id)),
    }));
    // The corpus must exercise both outcomes of every projector.
    expect(expected.some((parity) => parity.listing)).toBe(true);
    expect(expected.some((parity) => !parity.listing)).toBe(true);
    for (const key of ["catchEvents", "externalEvents", "reviews"] as const) {
      const outcomes = expected.flatMap((parity) => Object.values(parity[key]));
      expect(outcomes.some(Boolean)).toBe(true);
      expect(outcomes.some((outcome) => outcome === null)).toBe(true);
    }
    await expect(`${JSON.stringify(expected, null, 2)}\n`)
      .toMatchFileSnapshot("../../../contracts/fixtures/public_pages/parity_expected.json");
  });
});
