import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchFeeExamples} from "./CatchFeeExamples";
import {CatchRoot} from "./CatchRoot";
import {CatchSurface} from "./CatchSurface";

const examples = [
  {title: "A first worked example", value: "[N] a session", body: "How the first figure is reached."},
  {title: "A second worked example", value: "[N] a dinner", body: "How the second figure is reached."},
  {title: "A third worked example", value: "[N]"},
];

const meta = {
  title: "Web UI/CatchFeeExamples",
  component: CatchFeeExamples,
  args: {examples},
  parameters: {layout: "fullscreen"},
} satisfies Meta<typeof CatchFeeExamples>;

export default meta;
type Story = StoryObj<typeof meta>;

/** White ring cards on white and two across on paper (/pricing/), and the translucent cards on ink (the fee band). */
export const Contract: Story = {
  parameters: {catchComponent: {id: "shared_catch_fee_examples", routeIds: ["host", "pricing"], states: ["day", "two-columns", "ink"]}},
  render: (args) => (
    <CatchRoot theme="day">
      <CatchSurface block="band"><CatchFeeExamples {...args} /></CatchSurface>
      <CatchSurface block="band" color="tile"><CatchFeeExamples {...args} columns={2} examples={examples.slice(0, 2)} /></CatchSurface>
      <CatchSurface block="band" color="ink"><CatchFeeExamples {...args} on="ink" /></CatchSurface>
    </CatchRoot>
  ),
};
