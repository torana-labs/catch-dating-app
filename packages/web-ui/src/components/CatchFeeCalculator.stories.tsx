import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {CatchFeeCalculator} from "./CatchFeeCalculator";
import {CatchRoot} from "./CatchRoot";
import {CatchSurface} from "./CatchSurface";

const meta = {
  title: "Web UI/CatchFeeCalculator",
  component: CatchFeeCalculator,
  args: {
    label: "Sample amount",
    valueText: "[N]",
    value: 40,
    min: 0,
    max: 100,
    step: 10,
    onChange: () => undefined,
    minLabel: "[min]",
    maxLabel: "[max]",
    tiles: [{label: "First figure", value: "[N]", note: "what it is of"}, {label: "Second figure", value: "[N]%", note: "what it is of"}],
    fine: ["A first line of fine print.", "A second line of fine print."],
  },
} satisfies Meta<typeof CatchFeeCalculator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drawn for the ink ground: below the cap, and with the status line once the page says the cap is reached (the page works every figure out). */
function Live(args: Story["args"]) {
  const [value, setValue] = useState(40);
  return <CatchFeeCalculator {...(args as Required<NonNullable<Story["args"]>>)} onChange={setValue} status={value >= 80 ? "A sample status line." : undefined} value={value} valueText={`[${value}]`} />;
}

export const Contract: Story = {
  parameters: {catchComponent: {id: "shared_catch_fee_calculator", routeIds: ["host", "pricing"], states: ["below-cap", "capped"]}},
  render: (args) => (
    <CatchRoot theme="day">
      <CatchSurface block="band" color="ink">
        <Live {...args} />
        <CatchFeeCalculator {...args} status="A sample status line." value={100} valueText="[max]" />
      </CatchSurface>
    </CatchRoot>
  ),
};
