import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryHeading, StoryPage} from "../stories/websiteV2Story";
import {CatchBand, type CatchBandSpacing} from "./CatchBand";
import {CatchText} from "./CatchText";
import {grounds} from "./palette";

const meta = {
  title: "Web UI/CatchBand",
  component: CatchBand,
  args: {children: null},
} satisfies Meta<typeof CatchBand>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "host", "organizer_listing_canonical", "event_detail_canonical"];

const groundCopy = (ground: string) => (
  <StoryHeading
    eyebrow={`The ${ground} ground`}
    lead="Library text takes the ground's ink and secondary ink, so every pairing clears AA."
    title="Come on your own. Leave knowing a few more people."
  />
);

/** Every ground, at the regular rhythm. */
export const Grounds: Story = {
  parameters: {catchComponent: {id: "shared_band", routeIds: storyRoutes, states: ["grounds", "ink-dark-theme"]}},
  render: () => (
    <StoryPage>
      {grounds.map((ground) => (
        <CatchBand aria-label={`${ground} ground`} ground={ground} key={ground}>
          {groundCopy(ground)}
        </CatchBand>
      ))}
    </StoryPage>
  ),
};

const spacings: CatchBandSpacing[] = ["none", "compact", "regular", "spacious"];

/** The four rhythm roles; each steps down on a phone. */
export const Spacing: Story = {
  parameters: {catchComponent: {id: "shared_band", routeIds: storyRoutes, states: ["spacing-roles", "phone-rhythm"]}},
  render: () => (
    <StoryPage>
      {spacings.map((spacing, index) => (
        <CatchBand aria-label={`${spacing} spacing`} ground={index % 2 === 0 ? "paper" : "white"} key={spacing} pb={spacing} pt={spacing}>
          <CatchText as="h2" variant="displayS">{`${spacing[0].toUpperCase()}${spacing.slice(1)} rhythm`}</CatchText>
        </CatchBand>
      ))}
    </StoryPage>
  ),
};

/** `full` drops the content width and gutter, for rails that run to the edge. */
export const FullWidth: Story = {
  parameters: {catchComponent: {id: "shared_band", routeIds: storyRoutes, states: ["full-width"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Full width" ground="yellow" width="full">
        <CatchText as="p" variant="bodyL">This copy starts at the band's edge.</CatchText>
      </CatchBand>
    </StoryPage>
  ),
};

/** The homepage's "How a night works" opening on the ink ground. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_band", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "home/mumbai_live/1280", height: 380, y: 2753}}
      label="Ink band"
      phone={{capture: "home/mumbai_live/390", height: 420, y: 3994}}
      render={() => (
        <CatchBand aria-label="How a night works" ground="ink" pb="compact" pt="spacious">
          <StoryHeading
            eyebrow="How a night works"
            lead="Hosts plan the first ten minutes so you don't have to. Here's a Sunday run with Carter Road Runners."
            title="Come on your own. Leave knowing a few more people."
          />
        </CatchBand>
      )}
    />
  ),
};
