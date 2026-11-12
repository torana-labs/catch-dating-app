import {describe, expect, it} from "vitest";
import {twentyFiveCityCatalog, twoCityCatalog} from "../../../stories/fixtures/homeCatalogs";
import {footerCities} from "./cityChrome";

describe("footer cities", () => {
  it("lists open cities, then More cities", () => {
    const links = footerCities(twoCityCatalog.cities);
    expect(links.map((link) => link.href)).toEqual(["/mumbai/", "/cities/"]);
    expect(links[0].note).toMatch(/^(New|1 plan this week|\d+ plans this week)$/u);
  });

  it("says launching soon once for each country with no city open", () => {
    const labels = footerCities(twentyFiveCityCatalog.cities).map((link) => link.label);
    expect(labels.slice(-3)).toEqual(["Launching soon in Nepal", "Launching soon in United States", "More cities →"]);
    expect(labels.filter((label) => label.startsWith("Launching soon"))).toHaveLength(2);
  });
});
