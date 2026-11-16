import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchComparisonTable} from "./CatchComparisonTable";
import {CatchRoot} from "./CatchRoot";

// Sample options and properties: no claim here describes a real product.
const sample = {
  kicker: "Side by side",
  title: "A sample comparison",
  lead: "A sample lead about what is compared.",
  columns: ["Our option", "First option", "Second option"],
  rows: [
    {label: "First property", cells: ["Offered", {text: "Not offered", status: "no" as const}, {text: "Not published", status: "unknown" as const}]},
    {label: "Second property", cells: ["Offered", "Offered", {text: "Not offered", status: "no" as const}]},
    {label: "A longer third property that wraps", cells: ["A longer sample cell that wraps onto two lines", "Offered", "Offered"]},
  ],
  highlightColumn: 0,
  source: "Source: sample public pages",
  checked: "Checked on a sample date",
};

const meta = {
  title: "Web UI/CatchComparisonTable",
  component: CatchComparisonTable,
  args: sample,
} satisfies Meta<typeof CatchComparisonTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every state: the highlighted column with statuses and the source line on paper; no highlight on the plain band; the ink band. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchComparisonTable {...sample} ground="paper" />
      <CatchComparisonTable {...sample} checked={undefined} highlightColumn={undefined} rowHeader="Property" title="No highlight, a row heading" />
      <CatchComparisonTable {...sample} ground="ink" title="On the ink band" />
    </CatchRoot>
  ),
};

/** The phone layout: each row stacks with its cells under their column names. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchComparisonTable {...sample} ground="paper" />
    </CatchRoot>
  ),
};

export const Highlighted: Story = {};
export const Plain: Story = {args: {highlightColumn: undefined}};
