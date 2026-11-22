// @vitest-environment node
import fs from "node:fs";
import {describe, expect, it} from "vitest";
import {projectLivePublicCatchEvent} from "../features/organizers/publicCatchEventProjection";

/**
 * The live event list projects publicEvents copies in the browser with
 * projectLivePublicCatchEvent; Functions build the page read models with
 * their own projection (functions/src/publicPages/publicCatchEvent.ts),
 * which owns the golden output in contracts/fixtures/public_pages. Every
 * event that golden output publishes must project the same here.
 */
type Row = Record<string, unknown>;
interface SourceDocument {id: string; data: Row}
const fixtures = new URL("../../../contracts/fixtures/public_pages/", import.meta.url);
const read = (name: string) => JSON.parse(fs.readFileSync(new URL(name, fixtures), "utf8"));
const inputs = read("parity_inputs.json") as {now: number; cases: Array<{name: string; catchEvents: SourceDocument[]}>};
const expected = read("parity_expected.json") as Array<{name: string; catchEvents: Record<string, unknown>}>;

/** Admin SDK timestamps keep `_seconds` and `_nanoseconds` and add `toMillis`. */
function hydrate(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(hydrate);
  if (!value || typeof value !== "object") return value;
  const row = value as Row;
  const keys = Object.keys(row).sort();
  if (keys.length === 2 && keys[0] === "_nanoseconds" && keys[1] === "_seconds") {
    const millis = Number(row._seconds) * 1000 + Math.floor(Number(row._nanoseconds) / 1e6);
    return {...row, toMillis: () => millis};
  }
  return Object.fromEntries(Object.entries(row).map(([key, item]) => [key, hydrate(item)]));
}

describe("live event list parity with the page read models", () => {
  it("projects every published golden event identically", () => {
    let compared = 0;
    for (const parity of inputs.cases) {
      const golden = expected.find((item) => item.name === parity.name)?.catchEvents ?? {};
      for (const doc of parity.catchEvents) {
        if (!golden[doc.id]) continue;
        const projected = projectLivePublicCatchEvent(doc.id, hydrate(doc.data), inputs.now);
        expect(JSON.parse(JSON.stringify(projected)), `${parity.name}/${doc.id}`).toEqual(golden[doc.id]);
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(0);
  });
});
