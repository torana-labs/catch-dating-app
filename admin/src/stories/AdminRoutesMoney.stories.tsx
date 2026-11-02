import {sampleManageOrganizerBills, sampleManagePaymentIssues} from "../features/money/api/moneySamples";
import type {BillsController} from "../features/money/controllers/useBillsController";
import type {MoneyIssuesController} from "../features/money/controllers/useMoneyIssuesController";
import {MoneyScreen} from "../features/money/ui/MoneyScreen";
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

const moneyClock = Date.parse("2026-11-18T12:00:00+05:30");

const moneyBills = sampleManageOrganizerBills({
  action: "list", month: "2026-10", organizerId: null, billId: null, expectedRevision: null, note: null,
});

const moneyIssues = sampleManagePaymentIssues({action: "list", view: "open", issueId: null, note: null});

const billsByOrganizer = [...moneyBills.bills].sort((a, b) => a.organizerName.localeCompare(b.organizerName));

const moneyBillsController: BillsController = {
  month: "2026-10",
  data: moneyBills,
  loadState: "ready",
  loadError: null,
  filter: "all",
  search: "",
  rows: billsByOrganizer,
  selected: billsByOrganizer.find((bill) => bill.organizerId === "sample-lantern") ?? null,
  isActing: false,
  actionError: null,
  setFilter: noop,
  setSearch: noop,
  select: noop,
  act: () => Promise.resolve(true),
  generate: () => Promise.resolve(true),
};

const moneyIssuesController: MoneyIssuesController = {
  view: "open",
  data: moneyIssues,
  loadState: "ready",
  loadError: null,
  kind: "all",
  search: "",
  rows: moneyIssues.issues,
  selected: moneyIssues.issues[0] ?? null,
  next: moneyIssues.issues[1] ?? null,
  isActing: false,
  actionError: null,
  lastOutcome: null,
  setView: noop,
  setKind: noop,
  setSearch: noop,
  select: noop,
  confirmBooking: () => Promise.resolve(true),
  close: () => Promise.resolve(true),
};

export const MoneyRouteStory: Story = {
  name: "Money",
  parameters: {
    catchComponent: {
      id: "route_money",
      states: ["bills-queue", "bill-inspector", "decision-bar"],
    },
  },
  render: () => (
    <MoneyScreen
      bills={moneyBillsController}
      detailOpen
      issues={moneyIssuesController}
      nowMillis={moneyClock}
      onCloseDetail={noop}
      onOpenBill={noop}
      onOpenSettings={noop}
      onSelectBill={noop}
      onSelectIssue={noop}
      onViewChange={noop}
      view="bills"
    />
  ),
};
