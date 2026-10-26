import fs from "node:fs";
import path from "node:path";

/** The shared public page parity corpus, with timestamps hydrated. */
export type Row = Record<string, unknown>;
export interface FixtureDocument {
  id: string;
  data: Row;
}
export interface ParityCase {
  name: string;
  organizer: FixtureDocument;
  catchEvents: FixtureDocument[];
  externalEvents: FixtureDocument[];
  reviews: FixtureDocument[];
}

const fixtures = path.resolve(__dirname, "..", "..", "..", "contracts",
  "fixtures", "public_pages");

export function readPublicPageFixture(name: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(fixtures, name), "utf8"));
}

/** Admin SDK timestamps keep _seconds and _nanoseconds and add toMillis. */
export class FixtureTimestamp {
  constructor(readonly _seconds: number, readonly _nanoseconds: number) {}
  toMillis() {
    return this._seconds * 1000 + Math.floor(this._nanoseconds / 1e6);
  }
}

export function hydrate(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(hydrate);
  if (!value || typeof value !== "object") return value;
  const row = value as Row;
  const keys = Object.keys(row).sort();
  if (keys.length === 2 && keys[0] === "_nanoseconds" &&
      keys[1] === "_seconds" && typeof row._seconds === "number" &&
      typeof row._nanoseconds === "number") {
    return new FixtureTimestamp(row._seconds, row._nanoseconds);
  }
  return Object.fromEntries(Object.entries(row)
    .map(([key, item]) => [key, hydrate(item)]));
}

export interface ParityInputs {
  now: number;
  liveMarkets: string[];
  cases: ParityCase[];
}

export function parityInputs(): ParityInputs {
  const inputs = readPublicPageFixture("parity_inputs.json") as ParityInputs;
  const cases = inputs.cases.map((parity) => ({
    ...parity,
    organizer: hydrateDocument(parity.organizer),
    catchEvents: parity.catchEvents.map(hydrateDocument),
    externalEvents: parity.externalEvents.map(hydrateDocument),
    reviews: parity.reviews.map(hydrateDocument),
  }));
  return {...inputs, cases};
}

function hydrateDocument(doc: FixtureDocument): FixtureDocument {
  return {id: doc.id, data: hydrate(doc.data) as Row};
}

export function parityCase(name: string): ParityCase {
  const found = parityInputs().cases.find((parity) => parity.name === name);
  if (!found) throw new Error(`Unknown parity case: ${name}`);
  return found;
}
