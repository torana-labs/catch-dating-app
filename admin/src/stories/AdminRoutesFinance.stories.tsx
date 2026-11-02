import {buildFinanceIssueReview, type FinanceIssueKind, type FinanceIssueRow, type FinanceOpsController} from "../features/finance/controllers/useFinanceOpsController";
import {AdminWorkspace} from "../shared/ui/AdminPrimitives";
import {FinanceOpsWorkspace} from "../features/finance/ui/FinanceOpsScreen";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {noop} from "./adminRouteStoryKit";

const meta = {
  title: "Admin Dashboard/Routes",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const financeRows: FinanceIssueRow[] = [
  {
    id: "payment-refundfailed-pune-1",
    kind: "payment",
    title: "Manual refund needed",
    detail: "Refund failed for a charged booking after event cancellation.",
    status: "refundFailed",
    targetPath: "payments/pay_manual_refund_1",
    createdAt: "2026-07-03T06:20:00.000Z",
    amountMinor: 250000,
    currency: "INR",
    severity: "high",
    nextAction: "Open the provider record before retry, refund, or manual follow-up.",
    sourceScope: "Current capped overview payment preview",
    amountEvidence: "inferred",
    providerEvidence: "inferred",
  },
  {
    id: "event-mumbai-padel-payments",
    kind: "event",
    title: "Mumbai padel mixer payments",
    detail: "2 failed, 1 refunded, 6 checkout drop-off.",
    status: "failed",
    targetPath: "events/mumbai-padel-mixer-1",
    createdAt: "2026-07-05T13:30:00.000Z",
    amountMinor: 1840000,
    currency: "INR",
    severity: "high",
    nextAction: "Use event and provider records to reconcile payment state before action.",
    sourceScope: "30-day host event analytics",
    amountEvidence: "source",
    providerEvidence: "unknown",
  },
  {
    id: "payout-restricted-hosts",
    kind: "payout",
    title: "Payout restricted hosts",
    detail: "3 host accounts need provider review.",
    status: "restricted",
    targetPath: "metrics/payoutRestrictedHosts",
    createdAt: "2026-07-03T09:45:00.000Z",
    amountMinor: null,
    currency: "INR",
    severity: "medium",
    nextAction: "Inspect provider authority before changing payout or settlement state.",
    sourceScope: "Current overview aggregate",
    amountEvidence: "unknown",
    providerEvidence: "unknown",
  },
];

const selectedFinanceRow = financeRows[0] ?? null;

const financeController: FinanceOpsController = {
  filteredRows: financeRows,
  isLoading: false,
  isPartial: false,
  isUnavailable: false,
  kindFilter: "all",
  malformedCount: 0,
  metrics: {
    paymentPreviewCount: 5,
    failedPayments: 6,
    payoutRestrictedHosts: 3,
    eventIssueCount30d: 1,
  },
  query: "",
  rows: financeRows,
  selected: selectedFinanceRow,
  selectedIssueId: selectedFinanceRow?.id ?? null,
  selectedReview: selectedFinanceRow ?
    buildFinanceIssueReview(selectedFinanceRow) :
    null,
  selectedUnavailable: false,
  sources: [
    {
      id: "overview",
      label: "Overview payment preview",
      scope: "Current capped overview preview and current payout restriction metrics",
      status: "ready",
      generatedAt: "2026-07-03T09:45:00.000Z",
      loadedAt: "2026-07-03T09:45:05.000Z",
      error: null,
    },
    {
      id: "hostAnalytics",
      label: "Event payment analytics",
      scope: "30-day host analytics, weekly granularity",
      status: "ready",
      generatedAt: "2026-07-03T09:44:00.000Z",
      loadedAt: "2026-07-03T09:45:05.000Z",
      error: null,
    },
  ],
  refresh: async () => {
    noop();
    return true;
  },
  retrySource: async () => true,
  select: (_row: FinanceIssueRow) => {
    noop();
  },
  setKindFilter: (_value: FinanceIssueKind) => {
    noop();
  },
  setQuery: (_value: string) => {
    noop();
  },
};

const renderFinanceWorkspace = () => (
  <AdminWorkspace>
    <FinanceOpsWorkspace controller={financeController} />
  </AdminWorkspace>
);

export const FinanceRouteStory: Story = {
  name: "Finance",
  parameters: {
    catchComponent: {
      id: "route_finance_ops",
      states: ["issue-detail"],
    },
  },
  render: renderFinanceWorkspace,
};

export const FinanceWorkspaceStory: Story = {
  name: "Finance Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_finance_ops",
      states: ["issue-detail"],
    },
  },
  render: renderFinanceWorkspace,
};
