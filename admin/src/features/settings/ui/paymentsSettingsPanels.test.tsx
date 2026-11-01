import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {CommercialTermsController} from "../controllers/useCommercialTermsController";
import type {PaymentRoutingController} from "../controllers/usePaymentRoutingController";
import type {PaymentSettingsController} from "../controllers/usePaymentSettingsController";
import {renderCreditEditor, renderPaymentsOverview} from "./paymentsSettingsPanels";

afterEach(cleanup);

const terms = {scope: "platform", organizerId: null, canManage: true, listing: null, loadState: "ready",
  loadError: null, editor: null, isSaving: false, searchText: "", searchState: "idle", searchMatches: [],
  refresh: vi.fn(), startEdit: vi.fn(), startFromOwnerDecision: vi.fn(), cancelEdit: vi.fn(), setField: vi.fn(),
  setInherited: vi.fn(), setReason: vi.fn(), review: vi.fn(() => true), backToEdit: vi.fn(),
  save: vi.fn(async () => true), setSearchText: vi.fn(), search: vi.fn()} as CommercialTermsController;
const routing = {canManage: true, policy: null, loadState: "loading", loadError: null, editor: null,
  isSaving: false, confirmed: false, refresh: vi.fn(), startEdit: vi.fn(), cancelEdit: vi.fn(),
  setPurpose: vi.fn(), review: vi.fn(() => true), backToEdit: vi.fn(), setTyped: vi.fn(),
  save: vi.fn(async () => true)} as PaymentRoutingController;

function money(): PaymentSettingsController {
  return {state: {revision: 2, settings: {gstRegistered: false, gstRateBasisPoints: 1800, billDueDayOfMonth: 15,
    nominatorCredit: {rateBasisPoints: 1000, months: 12, lapseDays: 90, minimumPayoutMinor: 50_000,
      payoutDayOfMonth: 10, earningRoles: ["partner", "guest", "organizer"]}},
  updatedAtMillis: null, updatedByUid: null, nextInvoiceNumber: "2026-27/032"},
  loadState: "ready", loadError: null, isSaving: false, saveError: null, save: vi.fn(async () => true)};
}

function renderPayments(value: PaymentSettingsController, onEdit = vi.fn(), onExport = vi.fn()) {
  render(<>{renderPaymentsOverview({terms, routing, money: value, isExporting: false, lastMonthLabel: "October", onEdit, onExport})}</>);
}

describe("Settings → Payments", () => {
  it("states the credit rule and the next invoice number", () => {
    renderPayments(money());
    expect(screen.getByText("10% of what the organizer pays Catch")).toBeTruthy();
    expect(screen.getByText("Next: 2026-27/032")).toBeTruthy();
    expect(screen.getByText("Off: bills carry no GST. Turn on only when the accountant says Catch must register.")).toBeTruthy();
  });

  it("turns GST on only after the dialog confirms", async () => {
    const value = money();
    renderPayments(value);
    fireEvent.click(screen.getByRole("checkbox", {name: "GST registered"}));
    expect(value.save).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", {name: "Turn GST on"}));
    expect(value.save).toHaveBeenCalledTimes(1);
    const change = vi.mocked(value.save).mock.calls[0]![0];
    expect(change(value.state!.settings).gstRegistered).toBe(true);
  });

  it("downloads the monthly export and opens the credit editor", () => {
    const onEdit = vi.fn();
    const onExport = vi.fn();
    renderPayments(money(), onEdit, onExport);
    fireEvent.click(screen.getByRole("button", {name: "Download"}));
    expect(onExport).toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", {name: "Change"})[0]!);
    expect(onEdit).toHaveBeenCalled();
  });

  it("saves a new credit rate and refuses one out of range", async () => {
    const value = money();
    const onDone = vi.fn();
    render(<>{renderCreditEditor(value, onDone)}</>);
    const rate = screen.getByRole("textbox", {name: /Credit, of what/u});
    fireEvent.change(rate, {target: {value: "80"}});
    expect((screen.getByRole("button", {name: "Save"}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(rate, {target: {value: "12.5"}});
    fireEvent.click(screen.getByRole("button", {name: "Save"}));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    const change = vi.mocked(value.save).mock.calls[0]![0];
    expect(change(value.state!.settings).nominatorCredit.rateBasisPoints).toBe(1250);
  });
});
