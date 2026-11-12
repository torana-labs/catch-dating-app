import {renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {mumbaiLiveCatalog, twentyFiveCityCatalog} from "../../stories/fixtures/homeCatalogs";
import {useCitiesPageController} from "./useCitiesPageController";

describe("useCitiesPageController", () => {
  it("links open cities to their page and the rest to the launch notice", () => {
    const navigate = vi.fn();
    const {result} = renderHook(() => useCitiesPageController(mumbaiLiveCatalog, navigate));
    const [india] = result.current.groups;
    expect(india.note).toBeUndefined();
    const mumbai = india.rows.find((row) => row.slug === "mumbai")!;
    expect(mumbai).toMatchObject({live: true, href: "/mumbai/"});
    const pune = india.rows.find((row) => row.slug === "pune")!;
    expect(pune).toMatchObject({live: false, href: "/?city=pune#whats-on", note: "Launching soon"});
    result.current.chooseCity("indore");
    expect(navigate).toHaveBeenCalledWith("/indore/");
  });

  it("says launching soon once for a country with no city open", () => {
    const {result} = renderHook(() => useCitiesPageController(twentyFiveCityCatalog, vi.fn()));
    const nepal = result.current.groups.find((group) => group.isoCode === "NP")!;
    expect(nepal.note).toBe("Launching soon in Nepal");
    expect(nepal.rows.every((row) => row.note === undefined)).toBe(true);
    expect(result.current.groups.map((group) => group.isoCode)).toEqual(["IN", "NP", "AU", "US"]);
  });
});
