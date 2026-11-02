import {activityRow, healthRows} from "../features/system/controllers/useSystemController";
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

export const SystemRouteStory: Story = {
  name: "System",
  parameters: {
    catchComponent: {
      id: "route_system",
      states: ["activity", "filters", "health"],
    },
  },
  render: () => {
    const rows = actionExecutionRows.map(activityRow);
    return (
      <SystemScreen
        activityError={null}
        counts={{
          everyone: rows.length,
          people: rows.filter((row) => !row.automatic).length,
          automatic: rows.filter((row) => row.automatic).length,
          problems: rows.filter((row) => row.problem).length,
        }}
        filter="everyone"
        health={healthRows(overview)}
        healthError={null}
        isActivityLoading={false}
        onFilterChanged={noop}
        onQueryChanged={noop}
        onRefresh={noop}
        query=""
        rows={rows}
      />
    );
  },
};
