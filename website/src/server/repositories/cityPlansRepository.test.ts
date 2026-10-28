// @vitest-environment node
import fs from "node:fs";
import {describe, expect, it} from "vitest";
import {cityPlansAt, findCityPlans} from "./publicPageRepository";
import type {PublicReader} from "./publicReader";

type CityPlansDocument = Parameters<typeof cityPlansAt>[0];

const fixture = JSON.parse(fs.readFileSync(
  new URL("../../../../contracts/fixtures/valid/city_plans_doc.json", import.meta.url), "utf8")) as CityPlansDocument;

function reader(docs: Record<string, unknown>): PublicReader {
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const data = docs[`${name}/${id}`];
          return {id, exists: data !== undefined, data: () => data};
        },
      }),
    }),
  } as unknown as PublicReader;
}

describe("city plans reader", () => {
  it("reads one contract-valid city document", async () => {
    const city = await findCityPlans(reader({"cityPlans/indore": fixture}), "indore");
    expect(city?.status).toBe("live");
    expect(city?.plans.map(plan => plan.eventId)).toEqual(
      ["indore-run-1", "indore-quiz-1", "indore-dinner-1", "indore-crawl-1"]);
  });

  it("reads nothing for a missing, invalid, mismatched or unsafe city", async () => {
    const db = reader({
      "cityPlans/indore": fixture,
      "cityPlans/pune": {...fixture, citySlug: "pune", plans: [{...fixture.plans[0], activityKind: "singlesMixer"}]},
      "cityPlans/goa": {...fixture},
    });
    expect(await findCityPlans(db, "mumbai")).toBeNull();
    expect(await findCityPlans(db, "pune")).toBeNull();
    expect(await findCityPlans(db, "goa")).toBeNull();
    expect(await findCityPlans(db, "../indore")).toBeNull();
  });

  it("drops plans that ended since the build and keeps the built status", () => {
    const afterFirst = Date.parse("2026-05-16T03:00:00.000Z");
    const city = cityPlansAt(fixture, afterFirst);
    expect(city.status).toBe("live");
    expect(city.plans.map(plan => plan.eventId)).toEqual(["indore-quiz-1", "indore-dinner-1", "indore-crawl-1"]);
    expect(city.planCount).toBe(3);
    expect(city.formatCounts.run).toBe(0);
    expect(city.organizers[0].upcomingPlanCount).toBe(3);
    expect(city.organizers[0].nextPlan?.eventId).toBe("indore-quiz-1");
    expect(cityPlansAt(fixture, Date.parse("2026-05-14T00:00:00.000Z"))).toBe(fixture);
  });
});
