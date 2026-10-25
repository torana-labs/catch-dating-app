import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage, StoryTile} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGrid} from "./CatchGrid";
import type {Ground} from "./palette";

const meta = {
  title: "Web UI/CatchGrid",
  component: CatchGrid,
  args: {children: null, columns: 2},
} satisfies Meta<typeof CatchGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "host", "organizer_listing_canonical", "event_detail_canonical"];

const moments: {ground: Ground; kicker: string; title: string; body: string}[] = [
  {body: "212 runners", ground: "ink", kicker: "October", title: "Run & Rave"},
  {body: "rain or shine", ground: "yellow", kicker: "Since 2024", title: "64 runs"},
  {body: "Worli Sea Face", ground: "ink", kicker: "September", title: "Night 5K"},
  {body: "about a third come alone", ground: "mint", kicker: "On an average Sunday", title: "48 runners"},
];

const momentTiles = moments.map((moment) => <StoryTile key={moment.title} minHeight={200} {...moment} />);

const facts = [
  {body: "5:45 to 8:30 AM", kicker: "When", title: "Sun 23 Nov"},
  {body: "Bandra West, Mumbai", kicker: "Where", title: "Carter Road jetty"},
  {body: "Water, gels and breakfast", kicker: "Price", title: "₹299"},
].map((fact) => <StoryTile key={fact.kicker} {...fact} />);

const knowing = [
  {body: "Pace leaders, water and gels at 5K and 10K, bag drop, and breakfast after.", ground: "coral" as const, title: "What's included"},
  {body: "Running shoes, and a bottle if you like your own water.", ground: "paper" as const, title: "What to bring"},
  {body: "Flat promenade the whole way. Toilets at Bandstand.", ground: "mint" as const, title: "Accessibility"},
  {body: "Free cancellation up to 24 hours before.", ground: "indigo" as const, title: "Cancellation"},
].map((item) => <StoryTile key={item.title} {...item} />);

/** Four columns, two on a phone; three, one on a phone; and two, one on a phone. */
export const Columns: Story = {
  parameters: {catchComponent: {id: "shared_grid", routeIds: storyRoutes, states: ["columns", "compact-columns"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Four columns" pb="compact" pt="compact">
        <CatchGrid columns={4} compactColumns={2}>{momentTiles}</CatchGrid>
      </CatchBand>
      <CatchBand aria-label="Three columns" pb="compact" pt="compact">
        <CatchGrid columns={3} gap="inline">{facts}</CatchGrid>
      </CatchBand>
      <CatchBand aria-label="Two columns" pb="compact" pt="compact">
        <CatchGrid columns={2}>{knowing}</CatchGrid>
      </CatchBand>
    </StoryPage>
  ),
};

/** A list grid wraps each child in a list item; start alignment keeps natural heights. */
export const ListStartAligned: Story = {
  parameters: {catchComponent: {id: "shared_grid", routeIds: storyRoutes, states: ["list", "start-aligned"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="List grid" pb="compact" pt="compact">
        <CatchGrid align="start" aria-label="Good to know" as="ul" columns={2}>{knowing}</CatchGrid>
      </CatchBand>
    </StoryPage>
  ),
};

/** The organiser page's "What it's like" tiles: four across, two on a phone. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_grid", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "organizer/guest/1280", height: 240, width: 612, x: 568, y: 836}}
      label="Four-column grid"
      phone={{capture: "organizer/guest/390", height: 450, width: 358, x: 16, y: 2105}}
      render={() => <CatchGrid columns={4} compactColumns={2}>{momentTiles}</CatchGrid>}
    />
  ),
};
