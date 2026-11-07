import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState, type ReactNode} from "react";
import {CatchRangeInput, type CatchRangeInputValue} from "./CatchRangeInput";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const meta = {title: "Web UI/CatchRangeInput", component: CatchRangeInput, args: {label: "Your ticket sales this month"}} satisfies Meta<typeof CatchRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

function State({label, children}: {label: string; children: ReactNode}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone="secondary" variant="label-kicker">{label}</CatchText>
      {children}
    </CatchStack>
  );
}

function Controlled({initial, ...rest}: {initial: CatchRangeInputValue; label: string; max: number; step: number}) {
  const [value, setValue] = useState(initial);
  return (
    <CatchStack gap={8}>
      <CatchText numeric variant="label-action">{Array.isArray(value) ? value.join(" to ") : String(value)}</CatchText>
      <CatchRangeInput {...rest} onChange={setValue} value={value} />
    </CatchStack>
  );
}

/** catch.range_slider on the web: one value, a range, and the track on a tile. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="plain" padding="lg">
        <CatchStack gap={24} style={{maxWidth: 420}}>
          <State label="single"><Controlled initial={120000} label="Your ticket sales this month" max={500000} step={10000} /></State>
          <State label="range"><Controlled initial={[20, 50]} label="Group size" max={150} step={5} /></State>
          <State label="on-tile"><CatchSurface><CatchRangeInput defaultValue={30} label="Distance" /></CatchSurface></State>
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};
