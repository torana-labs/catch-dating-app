import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchMetricTile} from "./CatchMetricTile";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const meta = {title: "Web UI/CatchMetricTile", component: CatchMetricTile, args: {label: "Catch fee", value: "₹6,000"}} satisfies Meta<typeof CatchMetricTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The system Stat: tiles in an equal row (one with a meter), inline in a floating card and a spotlight, and facts. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="plain" padding="lg">
        <CatchStack gap={24}>
          <CatchText tone="secondary" variant="label-kicker">tile</CatchText>
          <CatchStack direction="row" equal gap={12}>
            <CatchMetricTile label="Catch fee" note="5% until the cap" value="₹6,000" />
            <CatchMetricTile label="Your effective rate" note="of this month’s ticket sales" value="5%" />
            <CatchMetricTile label="Booked" meter={{value: 24, max: 40, label: "24 of 40 booked"}} note="16 places left" noteTone="success" value="24" />
          </CatchStack>
          <CatchText tone="secondary" variant="label-kicker">inline</CatchText>
          <CatchSurface block="floating">
            <CatchStack direction="row" equal gap={16}>
              <CatchMetricTile label="of visitors booked" layout="inline" value="13%" />
              <CatchMetricTile label="in ticket sales" layout="inline" value="₹14,400" />
              <CatchMetricTile label="per visit" layout="inline" value="₹80" />
            </CatchStack>
          </CatchSurface>
          <CatchSurface block="spotlight" color="games">
            <CatchStack direction="row" equal gap={16}>
              <CatchMetricTile label="booked" layout="inline" value="26" />
              <CatchMetricTile label="tables" layout="inline" value="4" />
            </CatchStack>
          </CatchSurface>
          <CatchText tone="secondary" variant="label-kicker">fact</CatchText>
          <CatchStack direction="row" equal gap={8}>
            <CatchMetricTile label="When" layout="fact" note="Doors 7:30" value="Tue 3 Nov · 7:30 PM" />
            <CatchMetricTile label="Where" layout="fact" value="Harbour Room" />
          </CatchStack>
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};
