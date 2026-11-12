import type {Meta, StoryObj} from "@storybook/react-vite";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchStoreButton, type CatchStoreButtonProps} from "./CatchStoreButton";

// The official badges the website hosts (website/public/assets/store-badges, with their provenance).
const appStoreBadge = new URL("../../../../website/public/assets/store-badges/app-store-download-on-the.svg", import.meta.url).href;
const googlePlayBadge = new URL("../../../../website/public/assets/store-badges/google-play-get-it-on.png", import.meta.url).href;

const meta = {
  title: "Web UI/CatchStoreButton",
  component: CatchStoreButton,
  args: {badgeSrc: appStoreBadge, href: "#", label: "Download on the App Store", store: "appStore"},
} satisfies Meta<typeof CatchStoreButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "host", "organizer_listing_canonical", "event_detail_canonical"];

const appStore: CatchStoreButtonProps = {badgeSrc: appStoreBadge, href: "#app-store", label: "Download on the App Store", store: "appStore"};
const googlePlay: CatchStoreButtonProps = {badgeSrc: googlePlayBadge, href: "#google-play", label: "Get it on Google Play", store: "googlePlay"};

const comingSoon = {
  appStore: {kicker: "Coming soon on the", store: "App Store", label: "Coming soon on the App Store"},
  googlePlay: {kicker: "Coming soon on", store: "Google Play", label: "Coming soon on Google Play"},
};

const pair = (size?: "m" | "l", live = true) => (
  <CatchGap direction="horizontal" size="inline" wrap>
    <CatchStoreButton {...appStore} comingSoon={comingSoon.appStore} href={live ? appStore.href : undefined} size={size} />
    <CatchStoreButton {...googlePlay} comingSoon={comingSoon.googlePlay} href={live ? googlePlay.href : undefined} size={size} />
  </CatchGap>
);

/** Both official badges at L (48px) and M (40px), and stores with no link yet (coming-soon chips with the badges' footprint) at both sizes. */
export const Stores: Story = {
  parameters: {catchComponent: {id: "shared_store_button", routeIds: storyRoutes, states: ["app-store", "google-play", "large", "medium", "pending"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Store badges" pb="compact" pt="compact">
        <CatchGap size="section">
          {pair("l")}
          {pair("m")}
          {pair("l", false)}
          {pair("m", false)}
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};

/** The badges are never recoloured: the same black artwork on ink and on a format colour. */
export const OnGrounds: Story = {
  parameters: {catchComponent: {id: "shared_store_button", routeIds: storyRoutes, states: ["on-ink", "on-accent"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="On ink" ground="ink" pb="compact" pt="compact">{pair("l")}</CatchBand>
      <CatchBand aria-label="On pink" ground="pink" pb="compact" pt="compact">{pair("l")}</CatchBand>
    </StoryPage>
  ),
};
