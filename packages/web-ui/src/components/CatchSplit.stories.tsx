import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryHeading, StoryPage, StoryPhoto, StoryTile} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchSplit, type CatchSplitRatio, type CatchSplitRailSide} from "./CatchSplit";

const meta = {
  title: "Web UI/CatchSplit",
  component: CatchSplit,
  args: {start: null, end: null},
} satisfies Meta<typeof CatchSplit>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "host", "organizer_listing_canonical", "event_detail_canonical"];

const layouts: {ratio: CatchSplitRatio; railSide?: CatchSplitRailSide; label: string}[] = [
  {label: "Even, 1:1", ratio: "even"},
  {label: "Seven to five", ratio: "sevenFive"},
  {label: "Narrow rail, end (380px)", ratio: "narrowRail", railSide: "end"},
  {label: "Wide rail, start (420px)", ratio: "wideRail", railSide: "start"},
];

/** Each ratio at the page width; below 840px every split stacks in source order. */
export const Ratios: Story = {
  parameters: {catchComponent: {id: "shared_split", routeIds: storyRoutes, states: ["ratios", "rails", "phone-stack"]}},
  render: () => (
    <StoryPage>
      {layouts.map(({label, ratio, railSide}) => (
        <CatchBand aria-label={label} ground="white" key={label} pb="compact" pt="compact">
          <CatchSplit
            end={<StoryTile body="The end column." ground="mint" minHeight={140} title={label} />}
            railSide={railSide}
            ratio={ratio}
            start={<StoryTile body="The start column." ground="paper" minHeight={140} title={label} />}
          />
        </CatchBand>
      ))}
    </StoryPage>
  ),
};

/** The three gap roles and the stretch alignment. */
export const GapsAndAlignment: Story = {
  parameters: {catchComponent: {id: "shared_split", routeIds: storyRoutes, states: ["gaps", "stretch"]}},
  render: () => (
    <StoryPage>
      {(["compact", "regular", "wide"] as const).map((gap) => (
        <CatchBand aria-label={`${gap} gap`} key={gap} pb="compact" pt="compact">
          <CatchSplit
            align="stretch"
            end={<StoryTile ground="indigo" title="Stretched to the taller column" />}
            gap={gap}
            start={<StoryTile body="A longer column sets the row height for both sides of the split." ground="paper" minHeight={180} title={`${gap} gap`} />}
          />
        </CatchBand>
      ))}
    </StoryPage>
  ),
};

const rail = (
  <CatchGap as="aside" aria-label="Carter Road Runners" size="related">
    <StoryPhoto alt="Runners on the promenade at sunset" aspectRatio="5 / 2" src="/assets/events/social-run-music-hero-960.jpg" />
    <StoryHeading lead="Social runs on Carter Road, Sundays at 6:30 and Wednesdays at 7. Coffee after, always." title="Carter Road Runners" />
    <StoryTile body="Sun 2 Nov, 6:30 AM · Carter Road jetty" ground="ink" kicker="Next up · in 2 days" title="Sunday Social Run" />
  </CatchGap>
);

const main = (
  <CatchGap size="section">
    <StoryHeading title="Coming up" />
    <StoryTile body="6:30 AM · Carter Road jetty" ground="coral" kicker="Sun 2 Nov" title="Sunday Social Run" />
    <StoryTile body="7:00 PM · Carter Road" ground="paper" kicker="Wed 5 Nov" title="Wednesday Tempo 6K" />
  </CatchGap>
);

/** The organiser page: a 420px rail beside the page's main column. */
export const OrganiserReference: Story = {
  parameters: {catchComponent: {id: "shared_split", routeIds: storyRoutes, states: ["board-reference-organiser"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "organizer/guest/1280", height: 560, y: 90}}
      label="Organiser page split"
      phone={{capture: "organizer/guest/390", height: 900, y: 140}}
      render={() => (
        <CatchBand aria-label="Organiser page" pt="compact">
          <CatchSplit end={main} ratio="wideRail" start={rail} />
        </CatchBand>
      )}
    />
  ),
};

/** The event page: the main column beside a 380px booking rail. */
export const EventReference: Story = {
  parameters: {catchComponent: {id: "shared_split", routeIds: storyRoutes, states: ["board-reference-event"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "event/catch_full/1280", height: 460, y: 220}}
      label="Event page split"
      phone={{capture: "event/catch_full/390", height: 700, y: 380}}
      render={() => (
        <CatchBand aria-label="Event page" pt="compact">
          <CatchSplit
            end={<StoryTile body="Sun 23 Nov · 5:45 to 8:30 AM" ground="white" kicker="₹299 per person" minHeight={320} title="Book 1 place" />}
            railSide="end"
            ratio="narrowRail"
            start={<StoryPhoto alt="Runners on the Carter Road promenade at sunrise" aspectRatio="16 / 10" src="/assets/events/social-run-music-hero-960.jpg" />}
          />
        </CatchBand>
      )}
    />
  ),
};
