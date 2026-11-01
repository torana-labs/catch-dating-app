import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchMetricSection} from "./CatchMetricSection";

const meta = {
  title: "Web UI/CatchMetricSection",
  component: CatchMetricSection,
  args: {metrics: []},
} satisfies Meta<typeof CatchMetricSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const metrics = [
  {label: "Waiting on you", value: "14", note: "3 over 2 days", noteTone: "warning" as const},
  {label: "Decided this week", value: "41"},
  {label: "Bookings this week", value: "312", note: "Up 18%", noteTone: "success" as const},
  {label: "Live organizers", value: "64", note: "9 new this month"},
];

/** catch.metric_strip on the web: number tiles with toned notes, and the inline strip. */
export const Contract: Story = {
  render: () => (
    <div style={{display: "grid", gap: 32, maxWidth: 900}}>
      <CatchMetricSection label="This week, tiles" metrics={metrics} />
      <CatchMetricSection label="This week, inline" metrics={metrics} recipe="inline" />
    </div>
  ),
};
