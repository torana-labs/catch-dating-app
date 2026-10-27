import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchStoreButton, type CatchStoreButtonProps} from "./CatchStoreButton";

const meta = {
  title: "Web UI/CatchStoreButton",
  component: CatchStoreButton,
  args: {href: "#", label: "App Store", store: "appStore"},
} satisfies Meta<typeof CatchStoreButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "organizer_listing_canonical", "event_detail_canonical"];

const appStore: CatchStoreButtonProps = {
  accessibleLabel: "Download on the App Store",
  href: "#app-store",
  kicker: "Download on the",
  label: "App Store",
  store: "appStore",
};

const googlePlay: CatchStoreButtonProps = {
  accessibleLabel: "Get it on Google Play",
  href: "#google-play",
  kicker: "Get it on",
  label: "Google Play",
  store: "googlePlay",
};

const pair = (size?: "m" | "l", kicker = true) => (
  <CatchGap direction="horizontal" size="inline" wrap>
    <CatchStoreButton {...appStore} kicker={kicker ? appStore.kicker : undefined} size={size} />
    <CatchStoreButton {...googlePlay} kicker={kicker ? googlePlay.kicker : undefined} size={size} />
  </CatchGap>
);

/** Both stores at L and M, with and without the kicker line. */
export const Stores: Story = {
  parameters: {catchComponent: {id: "shared_store_button", routeIds: storyRoutes, states: ["app-store", "google-play", "large", "medium", "with-kicker", "label-only"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Store buttons" pb="compact" pt="compact">
        <CatchGap size="section">
          {pair("l")}
          {pair("m")}
          {pair("l", false)}
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};

/** The fill inverts on the ink ground and stays ink on an accent. */
export const OnGrounds: Story = {
  parameters: {catchComponent: {id: "shared_store_button", routeIds: storyRoutes, states: ["on-ink", "on-accent"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="On ink" ground="ink" pb="compact" pt="compact">{pair("l")}</CatchBand>
      <CatchBand aria-label="On pink" ground="pink" pb="compact" pt="compact">{pair("l")}</CatchBand>
    </StoryPage>
  ),
};

/** The homepage hero's store buttons. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_store_button", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "home/mumbai_live/1280", height: 70, width: 345, x: 62, y: 695}}
      label="Store buttons"
      phone={{capture: "home/mumbai_live/390", height: 70, width: 345, x: 14, y: 600}}
      render={() => pair("l")}
    />
  ),
};
