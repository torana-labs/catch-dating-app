import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {sampleMarketplace, type Marketplace} from "../api/marketplaceRepository";
import type {MarketplaceController} from "../controllers/useMarketplaceController";
import {MarketplaceScreen} from "./MarketplaceScreen";

afterEach(cleanup);

function controller(data: Marketplace | null, overrides: Partial<MarketplaceController> = {}): MarketplaceController {
  return {rangeDays: 30, marketId: null, data, loadState: data ? "ready" : "loading", loadError: null,
    setRangeDays: vi.fn(), setMarketId: vi.fn(), ...overrides};
}

describe("Marketplace", () => {
  it("shows each city, with an unlaunched one dashed", () => {
    render(<MarketplaceScreen controller={controller(sampleMarketplace({rangeDays: 30, marketId: null}))} onOpenOrganizer={vi.fn()} />);
    expect(screen.getByText("51 organizers live")).toBeTruthy();
    expect(screen.getByText("Not launched")).toBeTruthy();
    expect(screen.getByText("Up 9 on last week")).toBeTruthy();
  });

  it("opens an organizer going quiet, and picks a city and range", () => {
    const value = controller(sampleMarketplace({rangeDays: 30, marketId: null}));
    const onOpenOrganizer = vi.fn();
    render(<MarketplaceScreen controller={value} onOpenOrganizer={onOpenOrganizer} />);
    fireEvent.click(screen.getAllByRole("button", {name: "Open"})[0]!);
    expect(onOpenOrganizer).toHaveBeenCalledWith("sample-harbor");
    fireEvent.change(screen.getByRole("combobox", {name: "City"}), {target: {value: "indore"}});
    expect(value.setMarketId).toHaveBeenCalledWith("indore");
    fireEvent.click(screen.getByRole("tab", {name: "90 days"}));
    expect(value.setRangeDays).toHaveBeenCalledWith(90);
  });

  it("says when the warehouse cannot be read instead of showing zeros", () => {
    const data = {...sampleMarketplace({rangeDays: 30, marketId: null}), available: false, unavailableReason: "BigQuery is unavailable."};
    render(<MarketplaceScreen controller={controller(data)} onOpenOrganizer={vi.fn()} />);
    expect(screen.getByText("The marketplace numbers are not available")).toBeTruthy();
    expect(screen.queryByText("By city")).toBeNull();
  });
});
