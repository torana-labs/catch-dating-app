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
  it("lists only the format pages each city's document indexes, and none for a city without one", async () => {
    const formatPages = indore.formatPages as Record<string, {indexing: string}>;
    expect(formatPages.runClubs.indexing).toBe("index, follow");
    const paths = await readIndexedDiscoveryPaths(reader({[`cityPlans/${indoreCity.marketSlug}`]: indore}));
    expect(paths.filter((path) => !path.startsWith("/new-to-"))).toEqual(["/indore/run-clubs/"]);
    const withoutDocuments = await readIndexedDiscoveryPaths(reader({}));
    expect(withoutDocuments.filter((path) => !path.startsWith("/new-to-"))).toEqual([]);
  });

  it("lists every website city's new-to-the-city page, with or without its document (owner approval, 18 Nov 2026)", async () => {
    const newToCity = websiteCities.map((city) => `/new-to-${city.slug}/`);
    const paths = await readIndexedDiscoveryPaths(reader({[`cityPlans/${indoreCity.marketSlug}`]: indore}));
    expect(paths.filter((path) => path.startsWith("/new-to-"))).toEqual(newToCity);
    await expect(readIndexedDiscoveryPaths(reader({}))).resolves.toEqual(newToCity);
  });

  it("throws when the documents cannot be read, so the sitemap answers 503", async () => {
    await expect(readIndexedDiscoveryPaths(reader({}, true))).rejects.toThrow();
  });
});
