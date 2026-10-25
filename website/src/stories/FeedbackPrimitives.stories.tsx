import type {Meta, StoryObj} from "@storybook/react-vite";
import {
  BadgeRow,
  ContentGrid,
  EmptyState,
  LiveStatus,
  ProcessStatusPanel,
  RouteLoadingState,
} from "../shared/ui/primitives";

const meta = {
  title: "Marketing Website/Shared/Feedback",
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

export const EmptyStateStory: Story = {
  name: "Empty states",
  parameters: {
    catchComponent: {
      id: "shared_empty_state",
      routeIds: ["home", "claim", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["default", "public-event", "organizer-results", "claim", "listing-review"],
    },
  },
  render: () => (
    <ContentGrid variant="surface">
      <EmptyState>
        <h3>No saved organizers yet.</h3>
        <p>Save a profile from the public directory to keep it in reach.</p>
      </EmptyState>
      <EmptyState variant="public-event">
        <h3>No public events are available.</h3>
        <p>Catch will show source-backed public events as soon as intake clears them.</p>
      </EmptyState>
      <EmptyState variant="organizer-results">
        <h3>No organizer profiles match those filters.</h3>
        <p>Try a wider city, format, or status filter.</p>
      </EmptyState>
      <EmptyState variant="claim">
        <h3>No claimable listing found.</h3>
        <p>Search by organizer name, city, format, or source event before starting a new packet.</p>
      </EmptyState>
    </ContentGrid>
  ),
};

export const LiveStatusStory: Story = {
  name: "Live status",
  parameters: {
    catchComponent: {
      id: "shared_live_status",
      routeIds: ["home", "host", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["polite-status"],
    },
  },
  render: () => <LiveStatus>Share link copied.</LiveStatus>,
};

export const RouteLoadingStateStory: Story = {
  name: "Route loading",
  parameters: {
    catchComponent: {
      id: "shared_route_loading_state",
      routeIds: ["home", "host", "claim", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["route-fallback"],
    },
  },
  render: () => <RouteLoadingState label="Loading organizer route" />,
};

export const BadgeRowStory: Story = {
  name: "Badge row",
  parameters: {
    catchComponent: {
      id: "shared_badge_row",
      routeIds: ["organizer_search", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["listing-badges"],
    },
  },
  render: () => (
    <BadgeRow
      items={[
        {label: "Source backed"},
        {label: "Upcoming events"},
        {label: "Owner claim open"},
      ]}
    />
  ),
};

export const ProcessStatusPanelStory: Story = {
  name: "Process status panel",
  parameters: {
    catchComponent: {
      id: "shared_process_status_panel",
      routeIds: ["claim", "claim_lookup"],
      states: ["claim-review-panel"],
    },
  },
  render: () => (
    <ProcessStatusPanel
      eyebrow="Claim status"
      mark="✓"
      title="We are reviewing this owner request."
      body="Catch checks source evidence before unlocking owner controls on public organizer pages."
      items={[
        {
          title: "Evidence packet",
          body: "Organizer name, role, proof links, and owner contact are attached.",
        },
        {
          title: "Safety review",
          body: "The public page remains claimable until the request is approved.",
        },
      ]}
      actions={[
        {href: "/claim/", label: "Search another page", variant: "secondary"},
        {href: "/host/", label: "Apply as host", variant: "primary"},
      ]}
    />
  ),
};
