import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, userEvent, within} from "storybook/test";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryHeading, StoryPage, StoryTile} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchScroller, type CatchScrollerItemWidth} from "./CatchScroller";
import type {Ground} from "./palette";

const meta = {
  title: "Web UI/CatchScroller",
  component: CatchScroller,
  args: {children: null, label: "Formats"},
} satisfies Meta<typeof CatchScroller>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "host"];

const formats: {ground: Ground; kicker: string; title: string; body: string}[] = [
  {body: "Pace groups and a first hello for every newcomer.", ground: "coral", kicker: "6 this week", title: "Run clubs"},
  {body: "Long tables, good food and new people.", ground: "pink", kicker: "4 this week", title: "Dinners"},
  {body: "Teams, rounds and a room that's in it together.", ground: "yellow", kicker: "7 this week", title: "Games and quizzes"},
  {body: "Courts and partners, rotated by level.", ground: "mint", kicker: "3 this week", title: "Pickleball"},
  {body: "Crawls and socials that move through the city.", ground: "magenta", kicker: "3 this week", title: "Nights out"},
];

const tiles = (count = formats.length) =>
  Array.from({length: count}, (_, index) => formats[index % formats.length]).map((format, index) => (
    <StoryTile key={`${format.title}-${index}`} minHeight={300} {...format} />
  ));

const widths: CatchScrollerItemWidth[] = ["s", "m", "l"];

/** The three item widths, each on a page-edge rail in a full-width band. */
export const ItemWidths: Story = {
  parameters: {catchComponent: {id: "shared_scroller", routeIds: storyRoutes, states: ["item-widths", "page-edge"]}},
  render: () => (
    <StoryPage>
      {widths.map((itemWidth) => (
        <CatchBand aria-label={`${itemWidth} items`} key={itemWidth} pb="compact" pt="compact" width="full">
          <CatchScroller itemWidth={itemWidth} label={`Formats, ${itemWidth} items`}>{tiles(8)}</CatchScroller>
        </CatchBand>
      ))}
    </StoryPage>
  ),
};

/** Items grow to share the row while they fit, then scroll. */
export const Grow: Story = {
  parameters: {catchComponent: {id: "shared_scroller", routeIds: storyRoutes, states: ["grow"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Growing items" pb="compact" pt="compact" width="full">
        <CatchScroller grow itemWidth="s" label="Formats">{tiles()}</CatchScroller>
      </CatchBand>
    </StoryPage>
  ),
};

/** The rail is one focusable region, so the keyboard can scroll it. */
export const Keyboard: Story = {
  parameters: {catchComponent: {id: "shared_scroller", routeIds: storyRoutes, states: ["keyboard-focus", "no-edge"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Keyboard" pb="compact" pt="compact" width="full">
        <CatchScroller edge="none" label="Formats">{tiles(8)}</CatchScroller>
      </CatchBand>
    </StoryPage>
  ),
  play: async ({canvasElement}) => {
    const region = within(canvasElement).getByRole("region", {name: "Formats"});
    await userEvent.tab();
    await expect(region).toHaveFocus();
  },
};

/** The homepage's format tiles. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_scroller", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "home/mumbai_live/1280", height: 620, y: 900}}
      label="Format rail"
      phone={{capture: "home/mumbai_live/390", height: 640, y: 1330}}
      render={() => (
        <>
          <CatchBand aria-label="Something for every kind of evening" pb="compact" pt="spacious">
            <StoryHeading
              eyebrow="Something for every kind of evening"
              lead="Tap a format to see what's on. Every plan has a host who's there on the night."
              title="Start with what you feel like doing."
            />
          </CatchBand>
          <CatchBand aria-label="Formats" pb="spacious" pt="none" width="full">
            <CatchScroller grow itemWidth="s" label="Formats">{tiles()}</CatchScroller>
          </CatchBand>
        </>
      )}
    />
  ),
};
