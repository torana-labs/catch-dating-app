import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {CatchRoot} from "./CatchRoot";
import {CatchTimelineSection, type CatchTimelineSectionProps} from "./CatchTimelineSection";

const moments = [
  {time: "First", title: "A first moment", body: "What happens at the first moment, in a sentence or two."},
  {time: "Second", title: "A second moment", body: "What happens at the second moment."},
  {time: "Third", title: "A third moment", body: "What happens at the third moment."},
];

const meta = {
  title: "Web UI/CatchTimelineSection",
  component: CatchTimelineSection,
  args: {title: "A sample night, moment by moment.", kicker: "Sample kicker", lead: "A sample lead.", moments, selected: 0, timelineLabel: "Sample moments"},
  parameters: {layout: "fullscreen"},
} satisfies Meta<typeof CatchTimelineSection>;

export default meta;
type Story = StoryObj<typeof meta>;

function Live(args: CatchTimelineSectionProps) {
  const [selected, setSelected] = useState(0);
  return <CatchTimelineSection {...args} onSelect={setSelected} selected={selected} />;
}

/** The night timeline on ink: each moment a button that opens it; and a plain list with one moment open. */
export const Contract: Story = {
  parameters: {catchComponent: {id: "shared_catch_timeline_section", routeIds: ["host"], states: ["interactive", "static"]}},
  render: (args) => (
    <CatchRoot theme="day">
      <Live {...args} />
      <CatchTimelineSection {...args} selected={1} title="The same night as a plain list." />
    </CatchRoot>
  ),
};
