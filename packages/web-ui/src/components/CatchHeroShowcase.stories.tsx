import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchDeviceFrame} from "./CatchDeviceFrame";
import {CatchHeroShowcase, type CatchHeroShowcaseProps} from "./CatchHeroShowcase";
import {CatchSplit} from "./CatchSplit";

const meta = {
  title: "Web UI/CatchHeroShowcase",
  component: CatchHeroShowcase,
  args: {device: null, ground: "pink"},
} satisfies Meta<typeof CatchHeroShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home"];

const showcase: CatchHeroShowcaseProps = {
  device: (
    <CatchDeviceFrame kind="iphone" tilt="left">
      <img alt="The Catch app showing tonight's plans" src="/assets/app-screenshots/member-event-discovery.png" />
    </CatchDeviceFrame>
  ),
  ground: "pink",
  stickers: [
    {ground: "white", label: "Run club · Fri 6:30 AM", labelAccent: "coral", title: "Carter Road Social Run"},
    {ground: "ink", label: "Pickleball · Sat 5:00 PM", labelAccent: "mint", title: "Pickleball Social"},
    {ground: "yellow", label: "Nights out · Fri 7:30 PM", title: "Friday Bandra Pub Crawl"},
  ],
};

/** The hero art in its column at 1280, and alone at 390 where the stickers leave. */
export const Panel: Story = {
  parameters: {catchComponent: {id: "shared_hero_showcase", routeIds: storyRoutes, states: ["with-stickers", "compact", "no-stickers"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Hero showcase" pb="compact" pt="compact">
        <CatchSplit end={<CatchHeroShowcase {...showcase} />} start={<CatchHeroShowcase {...showcase} ground="mint" stickers={[]} />} />
      </CatchBand>
    </StoryPage>
  ),
};

/** The board's hero art beside the library rendering, at both widths. */
export const BoardReference: Story = {
  parameters: {catchComponent: {id: "shared_hero_showcase", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "home/mumbai_live/1280", height: 640, width: 620, x: 660, y: 100}}
      label="Hero showcase"
      phone={{capture: "home/mumbai_live/390", height: 480, width: 350, x: 20, y: 480}}
      render={() => <CatchHeroShowcase {...showcase} />}
    />
  ),
};
