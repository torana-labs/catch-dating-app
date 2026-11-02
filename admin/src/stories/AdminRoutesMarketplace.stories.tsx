import {sampleHostAnalytics} from "../shared/api/sampleData";
import {AdminWorkspace} from "../shared/ui/AdminPrimitives";
import {MarketplaceScreen} from "../features/marketplace/ui/MarketplaceScreen";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {installReviewedQueueClock, noop, setGranularity, setRangePreset} from "./adminRouteStoryKit";

const meta = {
  title: "Admin Dashboard/Routes",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const hostAnalytics = sampleHostAnalytics;

export const MarketplaceRouteStory: Story = {
  name: "Marketplace",
  beforeEach: installReviewedQueueClock,
  parameters: {
    catchComponent: {
      id: "route_marketplace",
      states: ["default", "analytics-controls", "scoped-analytics"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <MarketplaceScreen
        analyticsOrganizerId=""
        analyticsEndDate="2026-07-03"
        analyticsEventId=""
        analyticsGranularity="day"
        analyticsRangePreset="30d"
        analyticsStartDate="2026-06-04"
        hostAnalytics={hostAnalytics}
        isLoading={false}
        onAnalyticsOrganizerIdChange={noop}
        onAnalyticsEndDateChange={noop}
        onAnalyticsEventIdChange={noop}
        onAnalyticsGranularityChange={setGranularity}
        onAnalyticsRangePresetChange={setRangePreset}
        onAnalyticsStartDateChange={noop}
        onClearAnalyticsScope={noop}
        onRefresh={noop}
      />
    </AdminWorkspace>
  ),
};
