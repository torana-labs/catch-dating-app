import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {sampleManageOrganizerBills, sampleManagePaymentIssues} from "../api/moneySamples";
import type {BillsController} from "../controllers/useBillsController";
import type {MoneyIssuesController} from "../controllers/useMoneyIssuesController";
import {MoneyScreen, type MoneyView} from "./MoneyScreen";

afterEach(cleanup);

const now = Date.parse("2026-11-18T12:00:00+05:30");
const month = sampleManageOrganizerBills({action: "list", month: "2026-10", organizerId: null,
  billId: null, expectedRevision: null, note: null}, now);
const open = sampleManagePaymentIssues({action: "list", view: "open", issueId: null, note: null}, now);

function billsController(organizerId: string, overrides: Partial<BillsController> = {}): BillsController {
  return {month: "2026-10", data: month, loadState: "ready", loadError: null, filter: "all", search: "",
    rows: month.bills, selected: month.bills.find((bill) => bill.organizerId === organizerId) ?? null,
    isActing: false, actionError: null, setFilter: vi.fn(), setSearch: vi.fn(), select: vi.fn(),
    act: vi.fn(async () => true), generate: vi.fn(async () => true), ...overrides};
}

function issuesController(issueIndex: number, overrides: Partial<MoneyIssuesController> = {}): MoneyIssuesController {
  return {view: "open", data: open, loadState: "ready", loadError: null, kind: "all", search: "",
    rows: open.issues, selected: open.issues[issueIndex] ?? null, next: open.issues[issueIndex + 1] ?? null,
    isActing: false, actionError: null, lastOutcome: null, setView: vi.fn(), setKind: vi.fn(),
    setSearch: vi.fn(), select: vi.fn(), confirmBooking: vi.fn(async () => true),
    close: vi.fn(async () => true), ...overrides};
}

function renderMoney(view: MoneyView, bills: BillsController, issues: MoneyIssuesController,
  handlers: Partial<{onOpenBill: (billId: string) => void}> = {}) {
  return render(
    <MoneyScreen
      bills={bills}
      detailOpen
      issues={issues}
      nowMillis={now}
      onCloseDetail={vi.fn()}
      onOpenBill={handlers.onOpenBill ?? vi.fn()}
      onOpenSettings={vi.fn()}
      onSelectBill={vi.fn()}
      onSelectIssue={vi.fn()}
      onViewChange={vi.fn()}
      view={view}
    />
  );
}

describe("Money", () => {
  it("states a sent bill line by line and reminds with the note", () => {
    const bills = billsController("sample-lantern");
    renderMoney("bills", bills, issuesController(0));
    expect(screen.getByText("Commission at 4%")).toBeTruthy();
    expect(screen.getByText("None: Catch is not GST-registered yet")).toBeTruthy();
    expect(screen.getAllByText("Overdue 2 days").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("textbox", {name: /Note/u}), {target: {value: "Called Meher"}});
    fireEvent.click(screen.getByRole("button", {name: "Send a reminder"}));
    expect(bills.act).toHaveBeenCalledWith("remind", "Called Meher");
  });

  it("writes a bill off only after the dialog confirms", () => {
    const bills = billsController("sample-harbor");
    renderMoney("bills", bills, issuesController(0));
    fireEvent.click(screen.getByRole("button", {name: "Write off"}));
    expect(bills.act).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", {name: "Write off"}));
    expect(bills.act).toHaveBeenCalledWith("writeOff", "");
  });

  it("offers no decision on a paid bill", () => {
    renderMoney("bills", billsController("sample-afterfly"), issuesController(0));
    expect(screen.queryByRole("button", {name: "Send a reminder"})).toBeNull();
    expect(screen.queryByRole("button", {name: "Write off"})).toBeNull();
  });

  it("confirms a paid booking from the issue's decision bar", () => {
    const issues = issuesController(0);
    renderMoney("issues", billsController("sample-lantern"), issues);
    expect(screen.getByText("Then: Refund asked, not sent")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Confirm the booking"}));
    expect(issues.confirmBooking).toHaveBeenCalledWith("");
  });

  it("closes a refund issue only with a note saying what was done", () => {
    const issues = issuesController(1);
    renderMoney("issues", billsController("sample-lantern"), issues);
    const close = screen.getByRole("button", {name: "Close"}) as HTMLButtonElement;
    expect(close.disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", {name: /Note/u}), {target: {value: "Refunded in Razorpay"}});
    fireEvent.click(screen.getByRole("button", {name: "Close"}));
    expect(issues.close).toHaveBeenCalledWith("Refunded in Razorpay");
  });

  it("sends an unpaid-bill issue to its bill", () => {
    const onOpenBill = vi.fn();
    renderMoney("issues", billsController("sample-lantern"), issuesController(2), {onOpenBill});
    fireEvent.click(screen.getAllByRole("button", {name: "Open the bill"})[0]!);
    expect(onOpenBill).toHaveBeenCalledWith("sample-lantern_2026-10");
  });
});
