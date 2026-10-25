import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchDateTile, type CatchDateTileProps} from "./CatchDateTile";
import {CatchGap} from "./CatchGap";
import {grounds} from "./palette";

const meta = {
  title: "Web UI/CatchDateTile",
  component: CatchDateTile,
  args: {day: "2", month: "Nov", weekday: "Sun"},
} satisfies Meta<typeof CatchDateTile>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["organizer_listing_canonical", "event_detail_canonical"];

/** Every ground; tiles shrink on a phone. */
export const Grounds: Story = {
  parameters: {catchComponent: {id: "shared_date_tile", routeIds: storyRoutes, states: ["grounds", "phone-size"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Date tiles" pb="compact" pt="compact">
        <CatchGap direction="horizontal" size="related" wrap>
          {grounds.map((ground, index) => (
            <CatchDateTile dateTime={`2026-11-${String(index + 2).padStart(2, "0")}`} day={String(index + 2)} ground={ground} key={ground} month="Nov" weekday="Sun" />
          ))}
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};

const upcoming: CatchDateTileProps[] = [
  {dateTime: "2026-11-02", day: "2", ground: "coral", month: "Nov", weekday: "Sun"},
  {dateTime: "2026-11-05", day: "5", ground: "paper", month: "Nov", weekday: "Wed"},
  {dateTime: "2026-11-15", day: "15", ground: "indigo", month: "Nov", weekday: "Sat"},
  {dateTime: "2026-11-23", day: "23", ground: "mint", month: "Nov", weekday: "Sun"},
  {dateTime: "2026-11-30", day: "30", ground: "paper", month: "Nov", weekday: "Sun"},
];

/** The organiser page's "Coming up" column of dates. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_date_tile", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "organizer/guest/1280", height: 540, width: 90, x: 560, y: 175}}
      label="Date tiles"
      phone={{capture: "organizer/guest/390", height: 625, width: 64, x: 12, y: 1365}}
      render={(pageWidth) => (
        <CatchGap size={pageWidth < 840 ? "majorSection" : "section"}>
          {upcoming.map((tile) => <CatchDateTile key={tile.dateTime} {...tile} />)}
        </CatchGap>
      )}
    />
  ),
};
