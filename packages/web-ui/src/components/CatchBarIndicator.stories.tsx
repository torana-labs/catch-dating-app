import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchBarIndicator} from "./CatchBarIndicator";

const meta = {
  title: "Web UI/CatchBarIndicator",
  component: CatchBarIndicator,
  args: {label: "Pages read", maxValue: 2000, value: 812},
} satisfies Meta<typeof CatchBarIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** catch.mini_bar_chart on the web: one bar against a maximum, and weekly bars with the running week outlined. */
export const Contract: Story = {
  args: meta.args,
  render: () => (
    <div style={{display: "grid", gap: 32, maxWidth: 480}}>
      <CatchBarIndicator label="Pages read this month" maxValue={2000} value={812} />
      <CatchBarIndicator
        bars={[{label: "6 Oct", value: 18}, {label: "13 Oct", value: 24}, {label: "20 Oct", value: 31}, {label: "27 Oct", value: 12, partial: true}]}
        label="Claims each week"
        recipe="chart"
      />
    </div>
  ),
};
