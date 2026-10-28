import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchFormatTile, type CatchFormatTileProps} from "./CatchFormatTile";
import {CatchScroller} from "./CatchScroller";
import type {Format} from "./palette";

const meta = {
  title: "Web UI/CatchFormatTile",
  component: CatchFormatTile,
  args: {body: "", format: "run", href: "#", kicker: "", title: ""},
} satisfies Meta<typeof CatchFormatTile>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "visitor_discovery"];

type Tile = Omit<CatchFormatTileProps, "href" | "pressed" | "onPressed"> & {format: Format};
const tiles: Tile[] = [
  {body: "Pace groups and a first hello for every newcomer.", format: "run", kicker: "6 this week", title: "Run clubs",
    photoUrl: "/assets/events/social-run-music-hero-960.jpg"},
  {body: "Long tables, good food and new people.", format: "dinner", kicker: "4 this week", title: "Dinners",
    photoUrl: "/assets/marketing/home-dinner.jpg"},
  {body: "Teams, rounds and a room that’s in it together.", format: "games", kicker: "7 this week", title: "Games and quizzes"},
  {body: "Courts and partners, rotated by level.", format: "courts", kicker: "3 this week", title: "Pickleball"},
  {body: "Crawls and socials that move through the city.", format: "nightsOut", kicker: "3 this week", title: "Nights out"},
];

function FilterRail({kicker}: {kicker?: string}) {
  const [chosen, setChosen] = useState<Format | null>("games");
  return (
    <CatchScroller grow itemWidth="s" label="Formats">
      {tiles.map((tile) => (
        <CatchFormatTile {...tile} key={tile.format} kicker={kicker ?? tile.kicker}
          onPressed={() => setChosen(chosen === tile.format ? null : tile.format)} pressed={chosen === tile.format} />
      ))}
    </CatchScroller>
  );
}

/** Every format as a filter, one pressed; a plan photo where there is one, the accent alone otherwise. */
export const Formats: Story = {
  parameters: {catchComponent: {id: "shared_format_tile", routeIds: storyRoutes, states: ["run", "dinner", "games", "courts", "nights-out", "pressed", "accent-only", "photo"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Format tiles" pb="compact" pt="compact" width="full"><FilterRail /></CatchBand>
    </StoryPage>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const runs = canvas.getByRole("button", {name: /Run clubs/});
    await userEvent.click(runs);
    await expect(runs.getAttribute("aria-pressed")).toBe("true");
    await expect(canvas.getByRole("button", {name: /Games and quizzes/}).getAttribute("aria-pressed")).toBe("false");
  },
};

/** A launching-soon city's tiles, as links to Explore. */
export const ComingSoonLinks: Story = {
  parameters: {catchComponent: {id: "shared_format_tile", routeIds: storyRoutes, states: ["link", "coming-soon"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Format tiles in a city not yet open" pb="compact" pt="compact" width="full">
        <CatchScroller grow itemWidth="s" label="Formats coming to Pune">
          {tiles.map((tile) => <CatchFormatTile {...tile} href={`/explore/?format=${tile.format}`} key={tile.format} kicker="Coming to Pune" />)}
        </CatchScroller>
      </CatchBand>
    </StoryPage>
  ),
};

/** The board's format rail beside the library rendering, at both widths. */
export const BoardReference: Story = {
  parameters: {catchComponent: {id: "shared_format_tile", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "home/mumbai_live/1280", height: 360, y: 1130}}
      label="Format tiles"
      phone={{capture: "home/mumbai_live/390", height: 330, y: 1300}}
      render={() => <CatchBand aria-label="Format tiles" pb="none" pt="none" width="full"><FilterRail /></CatchBand>}
    />
  ),
};
