import type {Meta, StoryObj} from "@storybook/react-vite";
import {MarketingConsentBanner} from "../features/marketing/MarketingConsentBanner";
import {hostListings} from "./fixtures/hostListings";
import {
  ActivityMark as OrganizerActivityMark,
  StatusBadge as OrganizerStatusBadge,
} from "../features/organizers/OrganizerIdentity";
import type {HostListing} from "../features/organizers/types";
import {BadgeRow, ContentGrid} from "../shared/ui/primitives";

const unclaimedListing = requireListing("afterfly");
const verifiedListing = requireListing("sunday-table-club");
const claimedListing: HostListing = {
  ...verifiedListing,
  listingVariant: "unclaimedScraped",
  sourceConfidence: "medium",
  status: "claimed",
};

const meta = {
  title: "Marketing Website/Shared/Adapters",
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

export const MarketingConsentBannerAdapterStory: Story = {
  name: "Marketing consent adapter",
  parameters: {
    catchComponent: {
      id: "marketing_consent_banner_adapter",
      routeIds: ["home", "host", "claim", "claim_lookup", "not_found", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["app-shell-consent-state"],
    },
  },
  render: () => <MarketingConsentBanner />,
};

export const OrganizerActivityMarkAdapterStory: Story = {
  name: "Organizer activity mark adapter",
  parameters: {
    a11y: {test: "todo"},
    catchComponent: {
      id: "organizer_activity_mark_adapter",
      routeIds: ["home", "claim", "claim_lookup", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["listing-activity-derived"],
    },
  },
  render: () => (
    <ContentGrid variant="surface">
      <article>
        <OrganizerActivityMark listing={verifiedListing} size="lg" />
        <h3>{verifiedListing.name}</h3>
        <p>Activity copy is derived from generated listing data before rendering the shared mark.</p>
      </article>
      <article>
        <OrganizerActivityMark listing={unclaimedListing} size="lg" />
        <h3>{unclaimedListing.name}</h3>
        <p>Unclaimed public profiles still route through the same canonical visual primitive.</p>
      </article>
    </ContentGrid>
  ),
};

export const OrganizerStatusBadgeAdapterStory: Story = {
  name: "Organizer status badge adapter",
  parameters: {
    a11y: {test: "todo"},
    catchComponent: {
      id: "organizer_status_badge_adapter",
      routeIds: ["home", "claim", "claim_lookup", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["verified", "claimed", "unclaimed"],
    },
  },
  render: () => (
    <BadgeRow>
      <OrganizerStatusBadge listing={verifiedListing} />
      <OrganizerStatusBadge listing={claimedListing} />
      <OrganizerStatusBadge listing={unclaimedListing} compact />
    </BadgeRow>
  ),
};

function requireListing(slug: string) {
  const listing = hostListings.find((item) => item.slug === slug);
  if (!listing) {
    throw new Error(`Missing organizer listing fixture: ${slug}`);
  }
  return listing;
}
