// @vitest-environment node
import fs from "node:fs";
import {describe, expect, it} from "vitest";
import {websiteCities} from "../content/markets";
import {readIndexedDiscoveryPaths} from "./discoverySitemap";
import type {PublicReader} from "./repositories/publicReader";

const indore = JSON.parse(fs.readFileSync(
  new URL("../../../contracts/fixtures/valid/city_plans_doc.json", import.meta.url), "utf8")) as Record<string, unknown>;
const indoreCity = websiteCities.find((city) => city.slug === "indore")!;

function reader(docs: Record<string, unknown>, fail = false): PublicReader {
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          if (fail) throw new Error("unavailable");
          const data = docs[`${name}/${id}`];
          return {id, exists: data !== undefined, data: () => data};
        },
      }),
    }),
  } as unknown as PublicReader;
}

describe("readIndexedDiscoveryPaths", () => {
  it("lists only the format pages each city's document indexes, and nothing for a city without one", async () => {
    const formatPages = indore.formatPages as Record<string, {indexing: string}>;
    expect(formatPages.runClubs.indexing).toBe("index, follow");
    await expect(readIndexedDiscoveryPaths(reader({[`cityPlans/${indoreCity.marketSlug}`]: indore})))
      .resolves.toEqual(["/indore/run-clubs/"]);
    await expect(readIndexedDiscoveryPaths(reader({}))).resolves.toEqual([]);
  });

  it("never lists a new-to-the-city page", async () => {
    const paths = await readIndexedDiscoveryPaths(reader({[`cityPlans/${indoreCity.marketSlug}`]: indore}));
    expect(paths.some((path) => path.startsWith("/new-to-"))).toBe(false);
  });

  it("throws when the documents cannot be read, so the sitemap answers 503", async () => {
    await expect(readIndexedDiscoveryPaths(reader({}, true))).rejects.toThrow();
  });
});
