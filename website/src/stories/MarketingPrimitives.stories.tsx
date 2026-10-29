import type {Meta, StoryObj} from "@storybook/react-vite";
import {Button, MarketingConsentBannerShell, MarketingLoopList} from "../shared/ui/primitives";
import {memberLoop} from "@content/marketing";

const meta = {
  title: "Marketing Website/Shared/Marketing Primitives",
  parameters: {
    catchComponentRegistry: {
      path: "design/website/components.json",
    },
    catchRouteContract: {
      path: "design/website/routes.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const MarketingLoopListStory: Story = {
  name: "Loop list",
  parameters: {
    catchComponent: {
      id: "shared_marketing_loop_list_shell",
      routeIds: ["home", "host"],
      states: ["member-loop", "host-loop"],
    },
  },
  render: () => (
    <MarketingLoopList
      items={memberLoop}
      variant="host"
    />
  ),
};

export const MarketingConsentBannerShellStory: Story = {
  name: "Consent banner shell",
  parameters: {
    catchComponent: {
      id: "shared_marketing_consent_banner_shell",
      routeIds: ["home", "host", "claim", "claim_lookup", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["action-row"],
    },
  },
  render: () => (
    <MarketingConsentBannerShell
      body="Catch uses essential cookies and privacy-safe analytics to understand which public routes are useful."
      actions={(
        <>
          <Button size="small" type="button">Accept</Button>
          <Button size="small" type="button" variant="ghost">Essential only</Button>
        </>
      )}
    />
  ),
};
