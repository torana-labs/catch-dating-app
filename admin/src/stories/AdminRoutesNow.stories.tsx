import {NowScreen} from "../features/now/ui/NowScreen";
import {buildNowModel} from "../features/now/controllers/useNowController";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {installReviewedQueueClock, noop, overview} from "./adminRouteStoryKit";

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

export const NowRouteStory: Story = {
  name: "Needs you",
  beforeEach: installReviewedQueueClock,
  parameters: {
    catchComponent: {
      id: "route_now",
      states: ["oldest-first", "by-kind", "data-sources", "stats"],
    },
  },
  render: () => (
    <NowScreen
      canOpen={() => true}
      dateLabel="Saturday, 3 July"
      error={null}
      isLoading={false}
      model={buildNowModel(overview, Date.parse("2026-07-03T09:30:00.000Z"))}
      onOpenItem={noop}
      onOpenKind={noop}
      onRefresh={noop}
    />
  ),
};
