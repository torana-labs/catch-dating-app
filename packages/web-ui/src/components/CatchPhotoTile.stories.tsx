import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGrid} from "./CatchGrid";
import {CatchPhotoTile, type CatchPhotoTileProps} from "./CatchPhotoTile";

const meta = {
  title: "Web UI/CatchPhotoTile",
  component: CatchPhotoTile,
  args: {title: "Run & Rave, October"},
} satisfies Meta<typeof CatchPhotoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["organizer_listing_canonical"];
const photo = "/assets/events/social-run-music-hero-960.jpg";

const moments: (CatchPhotoTileProps & {key: string})[] = [
  {caption: "212 runners", imageAlt: "Runners laughing at the October Run & Rave", imageUrl: photo, key: "rave", title: "Run & Rave, October"},
  {caption: "rain or shine", figure: "64", ground: "yellow", key: "runs", title: "runs since 2024"},
  {caption: "Worli Sea Face", imageAlt: "Runners gathered after a night 5K", imageUrl: photo, key: "night", title: "Night 5K, September"},
  {caption: "about a third come alone", figure: "48", ground: "mint", key: "sunday", title: "runners on an average Sunday"},
];

const tiles = () => (
  <CatchGrid columns={4} compactColumns={2}>
    {moments.map(({key, ...tile}) => <CatchPhotoTile key={key} {...tile} />)}
  </CatchGrid>
);

/** Photo and ground tiles, with and without a figure, on a light and a dark band. */
export const States: Story = {
  parameters: {catchComponent: {id: "shared_photo_tile", routeIds: storyRoutes, states: ["photo", "ground", "figure", "phone-size"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact">{tiles()}</CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact">
        <CatchGrid columns={4} compactColumns={2}>
          <CatchPhotoTile caption="no photo, paper ground" title="A past run" />
          <CatchPhotoTile caption="a failed photo falls back" imageAlt="A missing photo" imageUrl="/assets/events/missing-photo.jpg" title="Night 5K" />
        </CatchGrid>
      </CatchBand>
    </StoryPage>
  ),
};

/** An empty slot a photo will fill, as a generated organiser page shows before a claim. */
export const Placeholder: Story = {
  parameters: {catchComponent: {id: "shared_photo_tile", routeIds: storyRoutes, states: ["placeholder"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Placeholder" pb="compact" pt="compact">
        <CatchGrid columns={4} compactColumns={2}>
          <CatchPhotoTile caption="since March 2025" figure="6" title="events on Luma" />
          <CatchPhotoTile caption="once the club claims the page" placeholder title="Photos go here" />
        </CatchGrid>
      </CatchBand>
    </StoryPage>
  ),
};

/** The organiser page's "What it's like" row. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_photo_tile", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "organizer/guest/1280", height: 228, width: 616, x: 566, y: 836}}
      label="Past moments"
      phone={{capture: "organizer/guest/390", height: 356, width: 366, x: 12, y: 2106}}
      render={tiles}
    />
  ),
};
