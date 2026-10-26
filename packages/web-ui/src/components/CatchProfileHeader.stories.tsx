import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchButton} from "./CatchButton";
import {CatchGrid} from "./CatchGrid";
import {CatchProfileHeader, type CatchProfileHeaderProps} from "./CatchProfileHeader";
import {CatchSplit} from "./CatchSplit";

const meta = {
  title: "Web UI/CatchProfileHeader",
  component: CatchProfileHeader,
  args: {name: "Lantern Lane Runners"},
} satisfies Meta<typeof CatchProfileHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["organizer_listing_canonical"];

const actions = (
  <CatchGrid columns={2} compactColumns={2} gap="inline">
    <CatchButton fullWidth label="Follow" onPressed={() => undefined} />
    <CatchButton fullWidth label="Share" onPressed={() => undefined} variant="secondary" />
  </CatchGrid>
);

const claimed: CatchProfileHeaderProps = {
  actions,
  coverAlt: "Runners on the promenade at sunset",
  coverUrl: "/assets/events/social-run-music-hero-960.jpg",
  headline: "Social runs along the sea face, Sundays at 6:30 and Wednesdays at 7. Coffee after, always.",
  meta: "Bandra West, Mumbai · @lanternlaneruns",
  monogram: "LL",
  monogramGround: "coral",
  name: "Lantern Lane Runners",
  stats: [{label: "followers", value: "2,140"}, {label: "★ · 186 reviews", value: "4.8"}, {label: "events hosted", value: "64"}],
  verifiedLabel: "Claimed by the organiser",
};

const generated: CatchProfileHeaderProps = {
  actions,
  headline: "Run club in Colaba hosting weekly social runs and monthly sunset runs.",
  meta: "Colaba, Mumbai · summarised from Luma and Instagram",
  monogram: "HL",
  name: "Harbour Line Run Club",
  stats: [{label: "waiting for the next event", value: "38"}, {label: "★ · 2 reviews", value: "4.5"}],
  tag: "Built from public pages · not claimed yet",
};

const inRail = (props: CatchProfileHeaderProps) => (
  <CatchSplit end={null} ratio="wideRail" start={<CatchProfileHeader {...props} />} />
);

/** A claimed organiser: cover photo, seal, stats and the follow and share actions. */
export const Claimed: Story = {
  parameters: {catchComponent: {id: "shared_profile_header", routeIds: storyRoutes, states: ["claimed", "cover-photo", "verified-seal", "actions"]}},
  render: () => <StoryPage><CatchBand aria-label="Claimed" pb="compact" pt="compact">{inRail(claimed)}</CatchBand></StoryPage>,
};

/** A page built from public pages: a ground cover, a white monogram and the not-claimed tag. */
export const Generated: Story = {
  parameters: {catchComponent: {id: "shared_profile_header", routeIds: storyRoutes, states: ["generated", "ground-cover", "tag"]}},
  render: () => <StoryPage><CatchBand aria-label="Generated" pb="compact" pt="compact">{inRail(generated)}</CatchBand></StoryPage>,
};

/** The organiser page's header, for a guest and before a claim. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_profile_header", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <>
      <ReferenceComparison
        desktop={{capture: "organizer/guest/1280", height: 440, width: 420, x: 100, y: 100}}
        label="Profile header, guest"
        phone={{capture: "organizer/guest/390", height: 450, width: 358, x: 16, y: 150}}
        render={() => <CatchProfileHeader {...claimed} />}
      />
      <ReferenceComparison
        desktop={{capture: "organizer/generated/1280", height: 470, width: 420, x: 100, y: 160}}
        label="Profile header, generated"
        render={() => <CatchProfileHeader {...generated} />}
      />
    </>
  ),
};
