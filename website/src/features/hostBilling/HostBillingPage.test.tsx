import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, expect, it, vi} from "vitest";
vi.mock("../../firebase", () => ({invokeHostBillingCallable: vi.fn(), watchWebsiteAccountAuthState: vi.fn(() => () => undefined)}));
vi.mock("../account/SignInSheet", async () => {
  const {CatchButton} = await import("@catch/web-ui");
  return {SignInButton: ({label}: {label: string}) => <CatchButton label={label} onPressed={() => undefined} />};
});
import {hostBillingCopy as copy} from "../../content/hostBilling";
import {HostBillingView} from "./HostBillingPage";
import type {HostBillingController} from "./useHostBillingController";

afterEach(cleanup);

const now = Date.parse("2026-12-20T12:00:00+05:30");
const day = 24 * 60 * 60 * 1000;
const prices = {toolsOnlyFeeMinor: 500_000, commissionRateBasisPoints: 500, commissionCapMinor: 1_000_000,
  cycleDays: 30, gstRegistered: false, gstRateBasisPoints: 1800};

function controller(extra: Partial<HostBillingController> = {}): HostBillingController {
  return {phase: "ready", user: null, organizers: [{organizerId: "lantern", organizerName: "Lantern Lane"}],
    organizerId: "lantern", selectOrganizer: vi.fn(),
    trial: {state: "active", startsAtMillis: now - 18 * day, endsAtMillis: now + 12 * day, daysLeft: 12},
    plan: {plan: "ticketing", status: "none", startsAtMillis: null, endsAtMillis: null},
    planView: {plan: {plan: "ticketing", status: "none", startsAtMillis: null, endsAtMillis: null}, revision: 0,
      paymentUrl: null, amountDueMinor: null, prices},
    bills: [{billId: "lantern_c2026-11-09", month: "2026-12", periodKind: "cycle",
      periodStartMillis: now - 41 * day, periodEndMillis: now - 11 * day, toolsOnly: false, status: "sent",
      salesMinor: 14_000_000, commissionMinor: 700_000, capped: false, gstMinor: 0, totalMinor: 700_000,
      invoiceNumber: "2026-27/031", dueAtMillis: now + 4 * day, paymentUrl: "https://rzp.io/i/abc", paidAtMillis: null}],
    acting: false, actionError: null, buyToolsOnly: vi.fn(), cancelToolsOnly: vi.fn(), openPayment: vi.fn(),
    refresh: vi.fn(), nowMillis: now, ...extra};
}

it("shows the trial, Catch's prices and a bill to pay from its invoice", () => {
  const props = controller();
  render(<HostBillingView {...props} />);
  expect(screen.getByRole("heading", {level: 1, name: copy.title})).toBeTruthy();
  expect(screen.getByText(/12 days left · ends/u)).toBeTruthy();
  expect(screen.getByText(/5% of your ticket sales after refunds, at most ₹10,000 per 30-day/u)).toBeTruthy();
  expect(screen.getByText(/₹5,000 per 30-day billing cycle, and no commission/u)).toBeTruthy();
  expect(screen.getByText(/not GST registered/u)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name: "Pay ₹7,000"}));
  expect(props.openPayment).toHaveBeenCalledWith("https://rzp.io/i/abc");
  fireEvent.click(screen.getByRole("button", {name: copy.plan.buy}));
  expect(props.buyToolsOnly).toHaveBeenCalled();
});

it("an unpaid tools-only purchase offers its payment and a way to cancel", () => {
  const props = controller({planView: {plan: {plan: "toolsOnly", status: "pendingPayment",
    startsAtMillis: now + 10 * day, endsAtMillis: null}, revision: 1, paymentUrl: "https://rzp.io/l/tools",
  amountDueMinor: 500_000, prices}});
  render(<HostBillingView {...props} />);
  expect(screen.queryByRole("button", {name: copy.plan.buy})).toBeNull();
  fireEvent.click(screen.getByRole("button", {name: "Pay ₹5,000"}));
  expect(props.openPayment).toHaveBeenCalledWith("https://rzp.io/l/tools");
  fireEvent.click(screen.getByRole("button", {name: copy.plan.cancelPending}));
  expect(props.cancelToolsOnly).toHaveBeenCalled();
});

it("signed out it offers sign-in; a manager is told only the owner sees billing", () => {
  render(<HostBillingView {...controller({phase: "signedOut", organizers: [], organizerId: null})} />);
  expect(screen.getByRole("button", {name: copy.signedOut.action})).toBeTruthy();
  cleanup();
  render(<HostBillingView {...controller({phase: "notOwner"})} />);
  expect(screen.getByText(copy.notOwner)).toBeTruthy();
});
