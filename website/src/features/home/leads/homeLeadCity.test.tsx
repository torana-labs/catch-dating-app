import {describe, expect, it} from "vitest";
import {homeLeadCityFields} from "./homeLeadCity";

describe("homeLeadCityFields", () => {
  it("names a catalog city by id, country and how the site reached it, and an unlisted one by its label alone", () => {
    expect(homeLeadCityFields({label: "Mumbai", slug: "mumbai", source: "picked"}))
      .toEqual({city: "Mumbai", cityId: "in-mh-mumbai", countryIsoCode: "IN", citySource: "picked"});
    expect(homeLeadCityFields({label: "Mumbai", slug: "mumbai"})).toEqual({city: "Mumbai", cityId: "in-mh-mumbai", countryIsoCode: "IN"});
    expect(homeLeadCityFields({label: "Atlantis", slug: "atlantis", source: "picked"})).toEqual({city: "Atlantis"});
  });
});
