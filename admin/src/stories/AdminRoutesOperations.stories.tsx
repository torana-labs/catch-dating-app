import type {AdminActionExecutionsController} from "../features/operations/controllers/useAdminActionExecutionsController";
import {AdminWorkspace} from "../shared/ui/AdminPrimitives";
import {AdminActionExecutionsWorkspace} from "../features/operations/ui/AdminActionExecutionsScreen";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {actionExecutionRows, noop} from "./adminRouteStoryKit";

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

const actionExecutionsController: AdminActionExecutionsController = {
  actionFilter: "all",
  generatedAt: "2026-07-23T08:30:00.000Z",
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  query: "",
  rows: actionExecutionRows,
  statusFilter: "all",
  visibleRows: actionExecutionRows,
  loadMore: async () => false,
  refresh: async () => true,
  setActionFilter: (_value) => {
    noop();
  },
  setQuery: (_value) => {
    noop();
  },
  setStatusFilter: (_value) => {
    noop();
  },
};

const renderAdminActionExecutionsWorkspace = () => (
  <AdminWorkspace>
    <AdminActionExecutionsWorkspace controller={actionExecutionsController} />
  </AdminWorkspace>
);

export const AdminActionExecutionsRouteStory: Story = {
  name: "Agent Activity",
  parameters: {
    catchComponent: {
      id: "route_admin_action_executions",
      states: ["bounded-receipt-register"],
    },
  },
  render: renderAdminActionExecutionsWorkspace,
};

export const AdminActionExecutionsWorkspaceStory: Story = {
  name: "Agent Activity Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_admin_action_executions",
      states: ["bounded-receipt-register"],
    },
  },
  render: renderAdminActionExecutionsWorkspace,
};
