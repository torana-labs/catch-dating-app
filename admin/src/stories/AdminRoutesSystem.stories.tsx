import {sampleHostAnalytics} from "../shared/api/sampleData";
import {sampleEventIntakeBridge, sampleMarketingOpsBridge} from "../shared/api/sampleOperationalData";
import {healthSource, systemSignals, type SystemSignal} from "../features/system/controllers/systemHealth";
import {activityRow, type SystemActivityRow} from "../features/system/controllers/useSystemController";
import {SystemScreen} from "../features/system/ui/SystemScreen";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {actionExecutionRows, noop, overview} from "./adminRouteStoryKit";

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

const signals = systemSignals({
  eventIntake: sampleEventIntakeBridge,
  hostAnalytics: sampleHostAnalytics,
  marketingBridge: sampleMarketingOpsBridge,
  overview,
});
const fresh = {generatedAt: overview.generatedAt, hasData: true, failed: false, isLoading: false};
const sources = [
  healthSource("overview", fresh),
  healthSource("host-analytics", fresh),
  healthSource("marketing-bridge", {...fresh, hasData: false, generatedAt: null, failed: true}),
  healthSource("event-intake", fresh),
];

function SystemStory({selected = null, selectedSignal = null}: {
  selected?: SystemActivityRow | null;
  selectedSignal?: SystemSignal | null;
}) {
  const rows = actionExecutionRows.map(activityRow);
  return (
    <SystemScreen
      activityError={null}
      canOpenPath={() => true}
      counts={{
        everyone: rows.length,
        people: rows.filter((row) => !row.automatic).length,
        automatic: rows.filter((row) => row.automatic).length,
        problems: rows.filter((row) => row.problem).length,
      }}
      filter="everyone"
      hasMore
      isActivityLoading={false}
      isLoadingMore={false}
      onFilterChanged={noop}
      onLoadMore={noop}
      onOpenPath={noop}
      onQueryChanged={noop}
      onRefresh={noop}
      onRetrySource={noop}
      onRowSelected={noop}
      onSignalSelected={noop}
      query=""
      rows={rows}
      selected={selected}
      selectedSignal={selectedSignal}
      signals={signals}
      sources={sources}
    />
  );
}

export const SystemRouteStory: Story = {
  name: "System",
  parameters: {
    catchComponent: {
      id: "route_system",
      states: ["activity", "filters", "health", "load-more", "failed-source", "signals"],
    },
  },
  render: () => <SystemStory />,
};

export const SystemReceiptRouteStory: Story = {
  name: "System: an unclear action's receipt",
  parameters: {
    catchComponent: {
      id: "route_system",
      states: ["receipt", "unclear-result"],
    },
  },
  render: () => {
    const unclear = actionExecutionRows.find((record) => record.status === "indeterminate");
    return <SystemStory selected={unclear ? activityRow(unclear) : null} />;
  },
};

export const SystemSignalRouteStory: Story = {
  name: "System: a data problem",
  parameters: {
    catchComponent: {
      id: "route_system",
      states: ["signal"],
    },
  },
  render: () => <SystemStory selectedSignal={signals[0] ?? null} />,
};
