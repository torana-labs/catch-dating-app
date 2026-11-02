import type {UserAnalyticsGranularity, UserAnalyticsQueryPayload, UserAnalyticsRangePreset} from "../shared/types/adminTypes";
import {buildUserLookupContract, type UserAnalyticsController} from "../features/users/controllers/useUserAnalyticsController";
import {sampleUserAnalyticsReport} from "../shared/api/sampleData";
import {AdminWorkspace} from "../shared/ui/AdminPrimitives";
import {UserAnalyticsWorkspace} from "../features/users/ui/UserAnalyticsScreen";
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

const userAnalyticsPayload: UserAnalyticsQueryPayload = {
  endDate: null,
  granularity: "day",
  rangePreset: "30d",
  startDate: null,
  userId: "user-1",
};

const userAnalyticsController: UserAnalyticsController = {
  endDate: "2026-07-03",
  errorMessage: null,
  granularity: "day",
  isLoading: false,
  lookupContract: buildUserLookupContract("users/user-1"),
  payload: userAnalyticsPayload,
  rangePreset: "30d",
  report: sampleUserAnalyticsReport(userAnalyticsPayload),
  startDate: "2026-06-04",
  userId: "users/user-1",
  viewState: "ready",
  load: async (_nextUserId?: string) => {
    noop();
    return true;
  },
  setEndDate: (_value: string) => {
    noop();
  },
  setGranularity: (_value: UserAnalyticsGranularity) => {
    noop();
  },
  setRangePreset: (_value: UserAnalyticsRangePreset) => {
    noop();
  },
  setStartDate: (_value: string) => {
    noop();
  },
  setUserId: (_value: string) => {
    noop();
  },
};

const renderUserAnalyticsWorkspace = () => (
  <AdminWorkspace>
    <UserAnalyticsWorkspace controller={userAnalyticsController} />
  </AdminWorkspace>
);

export const UserAnalyticsRouteStory: Story = {
  name: "Users",
  parameters: {
    catchComponent: {
      id: "route_user_analytics",
      states: ["aggregate-report"],
    },
  },
  render: renderUserAnalyticsWorkspace,
};

export const UserAnalyticsWorkspaceStory: Story = {
  name: "Users Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_user_analytics",
      states: ["aggregate-report"],
    },
  },
  render: renderUserAnalyticsWorkspace,
};
