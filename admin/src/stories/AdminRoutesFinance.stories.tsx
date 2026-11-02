import {sampleFinanceMonth} from "../features/finance/api/financeMonthRepository";
import type {FinanceMonthController} from "../features/finance/controllers/useFinanceMonthController";
import {FinanceScreen} from "../features/finance/ui/FinanceScreen";
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

const financeMonthController: FinanceMonthController = {
  month: "2026-10",
  data: sampleFinanceMonth({month: "2026-10"}),
  loadState: "ready",
  loadError: null,
  isSaving: false,
  isExporting: false,
  actionError: null,
  setMonth: noop,
  saveCost: () => Promise.resolve(true),
  exportMonth: () => Promise.resolve(null),
};

export const FinanceMonthRouteStory: Story = {
  name: "Finance",
  parameters: {
    catchComponent: {
      id: "route_finance",
      states: ["month-line-by-line", "monthly-series", "costs"],
    },
  },
  render: () => <FinanceScreen controller={financeMonthController} latestMonth="2026-10" onExport={noop} onOpenBills={noop} />,
};
