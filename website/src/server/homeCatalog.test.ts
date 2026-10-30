// @vitest-environment node
import fs from "node:fs";
import {describe, expect, it, vi} from "vitest";
import {activeMarket} from "../content/markets";
import {hostListings} from "../features/organizers/data";
import type {HostListing} from "../features/organizers/types";
import type {PublicReader} from "./repositories/publicReader";

const {assemblePublicCatalog, publicReader} = vi.hoisted(() => ({assemblePublicCatalog: vi.fn(), publicReader: vi.fn()}));
vi.mock("./publicCatalog", () => ({assemblePublicCatalog, publicReader}));

import {assembleHomeCatalog, readHomeCatalog} from "./homeCatalog";

const readAt = Date.parse("2026-05-14T00:00:00.000Z");
const indore = JSON.parse(fs.readFileSync(
  new URL("../../../contracts/fixtures/valid/city_plans_doc.json", import.meta.url), "utf8")) as Record<string, unknown>;

function reader(docs: Record<string, unknown>, fail: boolean | "hang" = false): PublicReader {
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          if (fail === "hang") await new Promise(() => undefined);
          if (fail) throw new Error("unavailable");
          const data = docs[`${name}/${id}`];
          return {id, exists: data !== undefined, data: () => data};
        },
      }),
    }),
  } as unknown as PublicReader;
}

const mumbaiListing: HostListing = {...hostListings[0], id: "home-club", name: "Preview Club", city: "Mumbai", citySlug: "mumbai",
  path: "/organizers/preview-club/", authority: {...hostListings[0].authority, publishStatus: "published", claimState: "claimed"},
  catchEvents: ["one", "two", "three", "four"].map((id, index) => ({
    id, role: "Hosted event", title: id, summary: "", activityKind: "socialRun", timeline: "upcoming",
    startTime: new Date(readAt + (index + 1) * 864e5).toISOString(), endTime: null, date: "Soon", location: "Park",
    capacityLimit: 20, bookedCount: 1, checkedInCount: 0, waitlistedCount: 0, priceLabel: "Free", publicRegistrationEnabled: true,
  }))};

describe("homepage catalog", () => {
  it("reads each city's read model and builds a city without one from the public catalog", async () => {
    assemblePublicCatalog.mockResolvedValue({listings: [mumbaiListing], readAt});
    const catalog = await assembleHomeCatalog(reader({"cityPlans/indore": indore}), "indore", readAt);
    expect(catalog.cities.map((city) => [city.slug, city.status])).toEqual([
      ["mumbai", "live"], ["indore", "live"], ["delhi", "launchingSoon"], ["bangalore", "launchingSoon"],
      ["pune", "launchingSoon"], ["hyderabad", "launchingSoon"],
    ]);
    expect(catalog.selected.slug).toBe("indore");
    expect(catalog.plans.plans.map((plan) => plan.eventId)).toEqual(["indore-run-1", "indore-quiz-1", "indore-dinner-1", "indore-crawl-1"]);
    expect(catalog.liveCity?.slug).toBe("mumbai");
    // The catalog is read once, for every city without a document.
    expect(assemblePublicCatalog).toHaveBeenCalledTimes(1);
    expect(catalog.phase).toBeUndefined();
  });

  it("chooses the featured city when none or an unknown one is asked for", async () => {
    assemblePublicCatalog.mockResolvedValue({listings: [], readAt});
    expect((await assembleHomeCatalog(reader({}), undefined, readAt)).selected.slug).toBe("mumbai");
    expect((await assembleHomeCatalog(reader({}), "atlantis", readAt)).selected.slug).toBe("mumbai");
  });

  it("keeps a launched city live but unavailable when nothing can be read", async () => {
    assemblePublicCatalog.mockRejectedValue(new Error("unavailable"));
    const catalog = await assembleHomeCatalog(reader({}, true), "mumbai", readAt, activeMarket.cities);
    expect(catalog.phase).toBe("unavailable");
    expect(catalog.plans.status).toBe("live");
    expect(catalog.cities.find((city) => city.slug === "pune")?.status).toBe("launchingSoon");
  });

  it("reads as unavailable at once when there is no reader, without trying the catalog", async () => {
    const catalog = await assembleHomeCatalog(null, "mumbai", readAt);
    expect(catalog.phase).toBe("unavailable");
    expect(catalog.plans.status).toBe("live");
    expect(assemblePublicCatalog).not.toHaveBeenCalled();
  });

  it("reads as unavailable when the reader cannot be built, such as without credentials", async () => {
    publicReader.mockRejectedValue(new Error("PUBLIC_READER_CREDENTIALS_UNAVAILABLE"));
    const catalog = await readHomeCatalog("mumbai");
    expect(catalog.phase).toBe("unavailable");
    expect(catalog.selected.slug).toBe("mumbai");
  });

  it("gives up on a read that does not answer by the public read deadline", async () => {
    vi.useFakeTimers();
    try {
      const pending = assembleHomeCatalog(reader({}, "hang"), "mumbai", readAt);
      await vi.advanceTimersByTimeAsync(8_000);
      const catalog = await pending;
      expect(catalog.phase).toBe("unavailable");
      expect(catalog.plans.status).toBe("live");
    } finally {
      vi.useRealTimers();
    }
  });
});
