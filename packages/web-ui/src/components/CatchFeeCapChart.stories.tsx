import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchFeeCapChart} from "./CatchFeeCapChart";
import {CatchRoot} from "./CatchRoot";
import {CatchSplitSection} from "./CatchSplitSection";

const meta = {
  title: "Web UI/CatchFeeCapChart",
  component: CatchFeeCapChart,
  args: {
    parts: [{label: "The stretch the fee is charged on", share: 2}, {label: "The rest of the cycle", share: 3}],
    examples: [{title: "A first amount", value: "[N]", body: "How it is reached."}, {title: "A second amount", value: "[N]", body: "How it is reached."}],
  },
  parameters: {layout: "fullscreen"},
} satisfies Meta<typeof CatchFeeCapChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The cap chart as the cap band's second column on paper (/pricing/). */
export const Contract: Story = {
  parameters: {catchComponent: {id: "shared_catch_fee_cap_chart", routeIds: ["pricing"], states: ["in-split"]}},
  render: (args) => (
    <CatchRoot theme="day">
      <CatchSplitSection ground="paper" kicker="Sample kicker" lead="A sample lead." media={<CatchFeeCapChart {...args} />} title="A sample headline." />
    </CatchRoot>
  ),
};
