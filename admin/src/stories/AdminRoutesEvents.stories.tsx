import {sampleExternalEventRows} from "../shared/api/sampleData";
import type {EventPublishingController} from "../features/events/controllers/useEventPublishingController";
import {AdminWorkspace} from "../shared/ui/AdminPrimitives";
import {EventPublishingWorkspace} from "../features/events/ui/EventPublishingScreen";
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

const externalEventRows = sampleExternalEventRows;

const selectedExternalEvent = externalEventRows[1] ?? externalEventRows[0] ?? null;

const eventController: EventPublishingController = {
  externalFilter: "reviewOpen",
  externalListGeneratedAt: "2026-07-03T09:58:00.000Z",
  externalQuery: "",
  externalRows: externalEventRows,
  filteredExternalRows: externalEventRows,
  isExternalDetailError: false,
  isExternalListLoading: false,
  isTakingDownExternalEvent: false,
  refreshExternalList: async () => {
    noop();
    return true;
  },
  selectExternalEvent: noop,
  selectedExternalEvent,
  selectedExternalEventId: selectedExternalEvent?.eventId ?? null,
  setExternalFilter: noop,
  setExternalQuery: noop,
  takedownExternalEvent: async () => {
    noop();
    return false;
  },
};

const renderEventPublishingDetail = () => (
  <AdminWorkspace>
    <EventPublishingWorkspace
      controller={eventController}
    />
  </AdminWorkspace>
);

export const EventPublishingRouteStory: Story = {
  name: "Events",
  parameters: {
    catchComponent: {
      id: "route_event_publishing",
      states: ["imported-takedown"],
    },
  },
  render: renderEventPublishingDetail,
};

export const EventPublishingWorkspaceStory: Story = {
  name: "Events Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_event_publishing",
      states: ["imported-takedown"],
    },
  },
  render: renderEventPublishingDetail,
};
