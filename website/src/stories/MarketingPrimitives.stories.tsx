import {CatchBadge} from "@catch/web-ui";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {ActivityMark, Button, FeaturedOrganizerCardGrid, MarketingConsentBannerShell, MarketingLoopList, type ActivityMeta, type FeaturedOrganizerCardItem} from "../shared/ui/primitives";
import {memberLoop} from "@content/marketing";

const appStoreItems = [
  {
    href: "",
    kicker: "Download on the",
    label: "App Store",
    platform: "ios" as const,
  },
  {
    href: "",
    kicker: "Get it on",
    label: "Google Play",
    platform: "android" as const,
  },
];

const dinnerActivity: ActivityMeta = {
  label: "Dinner",
  short: "DN",
  token: "var(--activity-dinner)",
};

const runActivity: ActivityMeta = {
  label: "Run club",
  short: "SR",
  token: "var(--activity-run)",
};

const featuredOrganizerItems: FeaturedOrganizerCardItem[] = [
  {
    activity: (
      <ActivityMark
        activity={dinnerActivity}
        listing={{logo: {text: "ST"}, status: "verified"}}
      />
    ),
    activityColor: "var(--activity-dinner)",
    detail: "Dinner clubs, hosted introductions, and owner responses.",
    href: "/organizers/club-sales-sunday-table/",
    name: "Sunday Table Club",
    status: <CatchBadge recipe="solidStatus" label="Verified on Catch" />,
  },
  {
    activity: (
      <ActivityMark
        activity={runActivity}
        listing={{logo: {text: "AF"}, status: "unclaimed"}}
      />
    ),
    activityColor: "var(--activity-run)",
    detail: "Source-backed run socials ready for owner claim review.",
    href: "/organizers/afterfly/",
    name: "Afterfly",
    status: <CatchBadge recipe="functional" label="Claimable" />,
  },
];

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

export const FeaturedOrganizerCardGridStory: Story = {
  name: "Featured organizer cards",
  parameters: {
    catchComponent: {
      id: "shared_featured_organizer_card_shell",
      routeIds: ["home", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["organizer-cards"],
    },
  },
  render: () => (
    <FeaturedOrganizerCardGrid items={featuredOrganizerItems} />
  ),
};
