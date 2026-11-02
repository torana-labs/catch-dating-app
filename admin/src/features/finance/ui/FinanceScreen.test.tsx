import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {sampleFinanceMonth} from "../api/financeMonthRepository";
import type {FinanceMonthController} from "../controllers/useFinanceMonthController";
import {FinanceScreen} from "./FinanceScreen";

afterEach(cleanup);

function controller(overrides: Partial<FinanceMonthController> = {}): FinanceMonthController {
  return {month: "2026-10", data: sampleFinanceMonth({month: "2026-10"}), loadState: "ready", loadError: null,
    isSaving: false, isExporting: false, actionError: null, setMonth: vi.fn(),
    saveCost: vi.fn(async () => true), exportMonth: vi.fn(async () => null), ...overrides};
}

describe("Finance", () => {
  it("states the month line by line, with GST off", () => {
    render(<FinanceScreen controller={controller()} latestMonth="2026-10" onExport={vi.fn()} onOpenBills={vi.fn()} />);
    expect(screen.getByText("Ticket sales through Catch")).toBeTruthy();
    expect(screen.getByText("What Catch earned")).toBeTruthy();
    expect(screen.getByText("Not registered yet, so bills carry none. Settings → Payments")).toBeTruthy();
  });

  it("enters a cost by hand in rupees", () => {
    const value = controller();
    render(<FinanceScreen controller={value} latestMonth="2026-10" onExport={vi.fn()} onOpenBills={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", {name: "Change"})[0]!);
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox", {name: /Amount/u}), {target: {value: "4600"}});
    fireEvent.click(within(dialog).getByRole("button", {name: "Save"}));
    expect(value.saveCost).toHaveBeenCalledWith(expect.any(String), 4600, expect.any(String));
  });

  it("exports for the accountant and offers the last four months", () => {
    const onExport = vi.fn();
    const value = controller();
    render(<FinanceScreen controller={value} latestMonth="2026-10" onExport={onExport} onOpenBills={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", {name: "Export for the accountant"}));
    expect(onExport).toHaveBeenCalled();
    fireEvent.change(screen.getByRole("combobox", {name: "Month"}), {target: {value: "2026-08"}});
    expect(value.setMonth).toHaveBeenCalledWith("2026-08");
  });
});
