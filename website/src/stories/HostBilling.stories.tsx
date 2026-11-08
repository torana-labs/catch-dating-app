import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, within} from "storybook/test";
import {hostBillingCopy} from "../content/hostBilling";
import {HostBillingView} from "../features/hostBilling/HostBillingPage";
import type {Bill, PlanView} from "../features/hostBilling/hostBillingModel";
import type {HostBillingController} from "../features/hostBilling/useHostBillingController";

// The organizer owner's /host/billing/: drawn from the system (no board) and
// reviewed at the phone's 390 and a desktop's 1280. Every name and number is
// synthetic; prices follow the owner's 30 Oct terms.
const noop = () => undefined;
const now = Date.parse("2026-12-20T12:00:00+05:30");
const day = 24 * 60 * 60 * 1000;
const trialEnd = Date.parse("2026-11-09T12:00:00+05:30");

const ticketing: PlanView = {
  plan: {plan: "ticketing", status: "none", startsAtMillis: null, endsAtMillis: null},
  revision: 0, paymentUrl: null, amountDueMinor: null,
  prices: {toolsOnlyFeeMinor: 500_000, commissionRateBasisPoints: 500, commissionCapMinor: 1_000_000, cycleDays: 30,
    gstRegistered: false, gstRateBasisPoints: 1800},
};

const bills: Bill[] = [
  {billId: "lantern_c2026-11-09", month: "2026-12", periodKind: "cycle", periodStartMillis: trialEnd,
    periodEndMillis: trialEnd + 30 * day, toolsOnly: false, status: "sent", salesMinor: 14_000_000,
    commissionMinor: 700_000, capped: false, gstMinor: 0, totalMinor: 700_000, invoiceNumber: "2026-27/031",
    dueAtMillis: trialEnd + 45 * day, paymentUrl: "https://rzp.io/i/fixture", paidAtMillis: null},
  {billId: "lantern_2026-10", month: "2026-10", periodKind: "calendarMonth", periodStartMillis: null,
    periodEndMillis: null, toolsOnly: false, status: "free", salesMinor: 3_200_000, commissionMinor: 0, capped: false,
    gstMinor: 0, totalMinor: 0, invoiceNumber: null, dueAtMillis: null, paymentUrl: null, paidAtMillis: null},
];

const base: HostBillingController = {
  phase: "ready", user: null, organizers: [{organizerId: "lantern", organizerName: "Lantern Lane"}],
  organizerId: "lantern", selectOrganizer: noop,
  trial: {state: "ended", startsAtMillis: trialEnd - 30 * day, endsAtMillis: trialEnd, daysLeft: null},
  plan: ticketing.plan, planView: ticketing, bills, acting: false, actionError: null,
  buyToolsOnly: noop, cancelToolsOnly: noop, openPayment: noop, refresh: noop, nowMillis: now,
};

const viewports = {
  billingPhone: {name: "Host billing · phone 390", styles: {width: "390px", height: "900px"}, type: "mobile"},
  billingDesktop: {name: "Host billing · desktop 1280", styles: {width: "1280px", height: "900px"}, type: "desktop"},
} as const;
const desktop = {globals: {viewport: {value: "billingDesktop", isRotated: false}}};

const meta = {
  title: "Marketing Website/Host Billing",
  component: HostBillingView,
  parameters: {viewport: {options: viewports}},
  globals: {viewport: {value: "billingPhone", isRotated: false}},
  args: base,
} satisfies Meta<typeof HostBillingView>;
export default meta;
type Story = StoryObj<typeof meta>;

const states = ["signed-out", "loading", "ticketing", "trial-active", "tools-only-pending", "tools-only-active",
  "not-owner", "failed"];

/** Ticketing after the trial: a bill to pay from its invoice, and a free month. */
export const Ticketing: Story = {
  parameters: {catchRoute: {id: "host_billing", path: "/host/billing/", reviewStates: states,
    stateCoverage: {storybook: states, manual: []}}},
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {level: 1, name: hostBillingCopy.title})).toBeVisible();
    await expect(canvas.getByRole("button", {name: hostBillingCopy.plan.buy})).toBeEnabled();
    await expect(canvas.getByRole("button", {name: "Pay ₹7,000"})).toBeEnabled();
  },
};
export const TicketingDesktop: Story = {...desktop};
export const TrialActive: Story = {args: {trial: {state: "active", startsAtMillis: now - 18 * day,
  endsAtMillis: now + 12 * day, daysLeft: 12}, bills: []}};
export const ToolsOnlyPending: Story = {args: {planView: {...ticketing, revision: 1, paymentUrl: "https://rzp.io/l/fixture",
  amountDueMinor: 500_000, plan: {plan: "toolsOnly", status: "pendingPayment", startsAtMillis: trialEnd + 60 * day,
    endsAtMillis: null}}}};
export const ToolsOnlyActive: Story = {args: {planView: {...ticketing, revision: 2, plan: {plan: "toolsOnly",
  status: "active", startsAtMillis: trialEnd + 30 * day, endsAtMillis: null}}}};
export const ToolsOnlyActiveDesktop: Story = {...desktop, args: ToolsOnlyActive.args};
export const SignedOut: Story = {args: {phase: "signedOut", organizers: [], organizerId: null}};
export const Loading: Story = {args: {phase: "loading"}};
export const NotOwner: Story = {args: {phase: "notOwner"}};
export const Failed: Story = {args: {phase: "failed"}};
