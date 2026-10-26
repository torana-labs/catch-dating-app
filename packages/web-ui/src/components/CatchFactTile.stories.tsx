import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchFactTile, type CatchFactTileProps} from "./CatchFactTile";
import {CatchGrid} from "./CatchGrid";

const meta = {
  title: "Web UI/CatchFactTile",
  component: CatchFactTile,
  args: {label: "When", value: "Sun 23 Nov"},
} satisfies Meta<typeof CatchFactTile>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["organizer_listing_canonical", "event_detail_canonical"];

const facts: (CatchFactTileProps & {key: string})[] = [
  {key: "when", label: "When", note: "5:45 to 8:30 AM", value: "Sun 23 Nov"},
  {key: "where", label: "Where", note: "Bandra West, Mumbai", value: "Carter Road jetty"},
  {key: "price", label: "Price", note: "Water, gels and breakfast", value: "₹299"},
];

const stats: (CatchFactTileProps & {key: string})[] = [
  {key: "visits", label: "Visits", note: "+18% on September", noteTone: "positive", value: "3,412"},
  {key: "clicks", label: "Link clicks", note: "32% of visits", noteTone: "positive", value: "1,086"},
  {key: "bookings", label: "Booking clicks", note: "+24% on September", noteTone: "positive", value: "318"},
  {key: "follows", label: "New followers", note: "+9% on September", noteTone: "positive", value: "148"},
];

const factRow = () => (
  <CatchGrid columns={3} compactColumns={1} gap="inline">
    {facts.map(({key, ...fact}) => <CatchFactTile key={key} {...fact} />)}
  </CatchGrid>
);

const statRow = () => (
  <CatchGrid columns={4} compactColumns={2} gap="inline">
    {stats.map(({key, ...stat}) => <CatchFactTile emphasis="stat" ground="white" key={key} {...stat} />)}
  </CatchGrid>
);

/** Facts on paper and stats on white, with neutral and positive notes. */
export const States: Story = {
  parameters: {catchComponent: {id: "shared_fact_tile", routeIds: storyRoutes, states: ["fact", "stat", "positive-note", "no-note", "phone-size"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Facts" pb="compact" pt="compact">{factRow()}</CatchBand>
      <CatchBand aria-label="Stats" ground="paper" pb="compact" pt="compact">{statRow()}</CatchBand>
      <CatchBand aria-label="No note" pb="compact" pt="compact">
        <CatchGrid columns={3} compactColumns={1} gap="inline">
          <CatchFactTile label="Distance" value="15 km" />
          <CatchFactTile ground="mint" label="Pace groups" value="6:00 · 6:45 · 7:30" />
        </CatchGrid>
      </CatchBand>
    </StoryPage>
  ),
};

/** The event page's When, Where and Price, and the owner view's last 30 days. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_fact_tile", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <>
      <ReferenceComparison
        desktop={{capture: "event/catch_full/1280", height: 96, width: 660, x: 96, y: 806}}
        label="Event facts"
        phone={{capture: "event/catch_full/390", height: 288, width: 366, x: 12, y: 876}}
        render={factRow}
      />
      <ReferenceComparison
        desktop={{capture: "organizer/owner/1280", height: 120, width: 572, x: 588, y: 254}}
        label="Owner stats"
        phone={{capture: "organizer/owner/390", height: 214, width: 318, x: 36, y: 1978}}
        render={statRow}
      />
    </>
  ),
};
