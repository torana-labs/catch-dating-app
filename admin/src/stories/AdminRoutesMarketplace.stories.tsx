import {sampleMarketplace} from "../features/marketplace/api/marketplaceRepository";
import type {MarketplaceController} from "../features/marketplace/controllers/useMarketplaceController";
import {MarketplaceScreen} from "../features/marketplace/ui/MarketplaceScreen";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {noop} from "./adminRouteStoryKit";

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

const marketplaceController: MarketplaceController = {
  rangeDays: 30,
  marketId: null,
  data: sampleMarketplace({rangeDays: 30, marketId: null}),
  loadState: "ready",
  loadError: null,
  setRangeDays: noop,
  setMarketId: noop,
};

export const MarketplaceRouteStory: Story = {
  name: "Marketplace",
  parameters: {
    catchComponent: {
      id: "route_marketplace",
      states: ["by-city", "guest-cohorts", "bookings-each-week", "going-quiet"],
    },
  },
  render: () => <MarketplaceScreen controller={marketplaceController} onOpenOrganizer={noop} />,
};
