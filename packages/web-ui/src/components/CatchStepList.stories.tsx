import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchGrid} from "./CatchGrid";
import {CatchStepList, type CatchStepRowData} from "./CatchStepList";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchStepList",
  component: CatchStepList,
  args: {steps: [{title: "Arrive"}, {title: "Check in"}]},
} satisfies Meta<typeof CatchStepList>;

export default meta;
type Story = StoryObj<typeof meta>;

function State({children, label}: {children: ReactNode; label: string}) {
  return (
    <CatchGap size="related">
      <CatchText as="span" color="ink2" variant="bodyS">{label}</CatchText>
      {children}
    </CatchGap>
  );
}

const plan: CatchStepRowData[] = [
  {body: "Bag drop opens. Find your pace group’s flag.", marker: "5:45", title: "Meet at the jetty"},
  {body: "Ten minutes, led by Kabir.", marker: "6:00", title: "Warm-up"},
  {body: "6:00, 6:45 and 7:30 per km, out to Bandstand and back twice.", marker: "6:10", tag: "15 km · flat", title: "15K in three pace groups"},
  {body: "Poha and coffee at the jetty, included.", marker: "7:50", title: "Stretch and breakfast"},
];

function States({accent}: {accent?: string}) {
  return (
    <CatchGrid columns={3} compactColumns={1}>
      <State label="numbered-trace">
        <CatchStepList steps={[
          {body: "Choose the event format and guest count.", title: "Pick your room"},
          {body: "Review attendance, private access, and reminders.", title: "Confirm the guest list"},
          {body: "Use check-in and post-event tools from the same flow.", title: "Host the moment"},
        ]} />
      </State>
      <State label="titles-only, accented">
        <CatchStepList accent="var(--catch-theme-success)" steps={[{title: "Arrive"}, {title: "Check in"}, {title: "Start the run"}]} />
      </State>
      <State label="timed, with a tag">
        <CatchStepList accent={accent} steps={plan} />
      </State>
    </CatchGrid>
  );
}

/**
 * catch.journey_steps on the web: numbered, titles only, accented, and timed
 * with a tag. The caller picks an accent that reads on its ground: the run
 * format's deep shade on light, the theme primary on dark.
 */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact"><States accent="var(--catch-format-run-deep)" /></CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact"><States /></CatchBand>
    </StoryPage>
  ),
};

/** The event page's plan for the morning. */
export const Reference: Story = {
  render: () => (
    <ReferenceComparison
      desktop={{capture: "event/catch_full/1280", height: 290, width: 660, x: 96, y: 1380}}
      label="Itinerary"
      phone={{capture: "event/catch_full/390", height: 360, width: 366, x: 12, y: 1810}}
      render={() => <CatchStepList accent="var(--catch-format-run-deep)" steps={plan} />}
    />
  ),
};
