import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {sampleGrowth, sampleNominatorCredits} from "../api/growthSamples";
import type {GrowthController, GrowthView} from "../controllers/useGrowthController";
import {GrowthScreen} from "./GrowthScreen";

afterEach(cleanup);

const growth = sampleGrowth({range: "12m"});
const credits = sampleNominatorCredits({action: "list", nominatorUid: null, note: null});

function controller(view: GrowthView, overrides: Partial<GrowthController> = {}): GrowthController {
  const selectedNominator = growth.nominators[0] ?? null;
  return {view, range: "12m", data: growth, credits, loadState: "ready", loadError: null,
    nominatorFilter: "all", bestFilter: "all", search: "", nominators: growth.nominators, best: growth.best,
    selectedNominator, selectedCredit: credits.nominators.find((row) => row.nominatorUid === selectedNominator?.uid) ?? null,
    isActing: false, actionError: null, setView: vi.fn(), setRange: vi.fn(), setNominatorFilter: vi.fn(),
    setBestFilter: vi.fn(), setSearch: vi.fn(), selectNominator: vi.fn(),
    approveCredit: vi.fn(async () => true), markCreditPaid: vi.fn(async () => true), ...overrides};
}

function renderGrowth(value: GrowthController, onViewChange = vi.fn()) {
  render(<GrowthScreen controller={value} detailOpen onCloseDetail={vi.fn()} onSelectNominator={vi.fn()} onViewChange={onViewChange} />);
}

describe("Growth", () => {
  it("shows cohorts from listing to first event", () => {
    renderGrowth(controller("cohorts"));
    expect(screen.getByText("From listing to first event")).toBeTruthy();
    expect(screen.getAllByText("June 2026")).toHaveLength(2);
    expect(screen.getByText("Too early")).toBeTruthy();
  });

  it("says ads have brought no paying organizer yet, and why spend may be missing", () => {
    renderGrowth(controller("channels"));
    expect(screen.getByText("By channel")).toBeTruthy();
    expect(screen.getAllByText("None yet").length).toBeGreaterThan(0);
    expect(screen.getByText("Google Ads is not connected")).toBeTruthy();
  });

  it("approves a nominator's owed credit from the decision bar", () => {
    const value = controller("nominators");
    renderGrowth(value);
    const owed = growth.nominators[0]!.creditOwedMinor / 100;
    fireEvent.click(screen.getByRole("button", {name: `Approve ₹${owed.toLocaleString("en-IN")}`}));
    expect(value.approveCredit).toHaveBeenCalledWith("");
  });

  it("ranks the best organizers with their trend", () => {
    renderGrowth(controller("best"));
    expect(screen.getByRole("table", {name: "Best organizers"})).toBeTruthy();
    expect(screen.getAllByText(/^(Growing|Falling) \d+%$/u).length).toBeGreaterThan(0);
  });

  it("switches views through the header", () => {
    const onViewChange = vi.fn();
    renderGrowth(controller("cohorts"), onViewChange);
    fireEvent.change(screen.getByRole("combobox", {name: "Growth views"}), {target: {value: "best"}});
    expect(onViewChange).toHaveBeenCalledWith("best");
  });
});
