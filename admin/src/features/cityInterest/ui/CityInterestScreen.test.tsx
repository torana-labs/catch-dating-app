import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {sampleCityInterest, type CityInterest} from "../api/cityInterestRepository";
import type {CityInterestController} from "../controllers/useCityInterestController";
import {CityInterestScreen} from "./CityInterestScreen";

afterEach(cleanup);

const controller = (data: CityInterest | null, loadState: CityInterestController["loadState"] = data ? "ready" : "loading"):
  CityInterestController => ({data, loadState, loadError: null});

describe("Interest by city", () => {
  it("lists each city with its people and 7- and 30-day change, busiest first", () => {
    render(<CityInterestScreen controller={controller(sampleCityInterest())} />);
    const rows = screen.getAllByRole("row").slice(1).map((row) => row.textContent ?? "");
    expect(rows[0]).toContain(sampleCityInterest().cities[0]!.label);
    expect(rows[0]).toContain("31 (+9)");
    expect(screen.getByText("Other (India)")).toBeTruthy();
    expect(screen.getByText("Not in the catalog")).toBeTruthy();
    expect(screen.getByText("Same as the 7 days before")).toBeTruthy();
    expect(screen.getByText("Up 89 on the 30 days before")).toBeTruthy();
  });

  it("says no one is waiting yet instead of an empty table", () => {
    render(<CityInterestScreen controller={controller({...sampleCityInterest(), cities: [],
      totals: {total: 0, last7: 0, previous7: 0, last30: 0, previous30: 0}})} />);
    expect(screen.getByText("No one is waiting yet")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows a load failure", () => {
    render(<CityInterestScreen controller={{data: null, loadState: "error", loadError: "Permission denied."}} />);
    expect(screen.getByText("Permission denied.")).toBeTruthy();
  });
});
