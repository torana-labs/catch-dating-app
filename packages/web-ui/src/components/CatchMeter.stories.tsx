import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {CatchMeter, catchMeterFills, catchMeterThicknesses} from "./CatchMeter";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const meta = {title: "Web UI/CatchMeter", component: CatchMeter, args: {value: 40, label: "Time left in the round"}} satisfies Meta<typeof CatchMeter>;

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

/** catch.meter: each kind, thickness and fill, on a tile and on a format colour, with its label shown. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="plain" padding="lg">
        <CatchStack gap={24} style={{maxWidth: 480}}>
          <State label="progress"><CatchMeter label="Time in this step" value={60} /></State>
          <State label="cap"><CatchMeter kind="cap" label="Catch fee this month" limit={80} value={55} /></State>
          <State label="segments"><CatchMeter kind="segments" label="Step 1 of 3" max={3} thickness={4} value={1} /></State>
          <State label="stack">
            <CatchMeter kind="stack" label="Where bookings came from" parts={[
              {label: "Instagram", value: 52, fill: "nightsOut"},
              {label: "Newsletter", value: 24, fill: "indigo"},
              {label: "Partners", value: 16, fill: "ink"},
              {label: "Other", value: 8, fill: "muted"},
            ]} value={0} />
          </State>
          <State label="thickness">{catchMeterThicknesses.map((thickness) => <CatchMeter key={thickness} label={`${thickness}px`} thickness={thickness} value={50} />)}</State>
          <State label="fills">{catchMeterFills.map((fill) => <CatchMeter fill={fill} format="games" key={fill} label={fill} value={70} />)}</State>
          <State label="on-tile"><CatchSurface><CatchMeter label="Visits: 180" showLabel thickness={8} value={180} max={180} /></CatchSurface></State>
          <State label="on-colour"><CatchSurface block="spotlight" color="run"><CatchMeter label="Time left in the round" thickness={6} value={40} /></CatchSurface></State>
          <State label="labelled"><CatchMeter label="Bookings: 24" max={180} showLabel thickness={8} value={24} /></State>
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};
