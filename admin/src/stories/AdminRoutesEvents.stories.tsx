import type {AdminEventDetails, AdminEventListRow} from "../shared/types/adminTypes";
import {sampleEventDetails, sampleExternalEventRows} from "../shared/api/sampleData";
import type {EventPublishingController} from "../features/events/controllers/useEventPublishingController";
import {formFromEventProfile} from "../features/events/controllers/eventPublishingHelpers";
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

const eventRows: AdminEventListRow[] =
  Object.values(sampleEventDetails).map(eventListRowFromDetails);

const externalEventRows = sampleExternalEventRows;

const selectedExternalEvent = externalEventRows[1] ?? externalEventRows[0] ?? null;

const eventController: EventPublishingController = {
  backToList: () => {
    noop();
  },
  diffRows: [],
  event: sampleEventDetails["mumbai-padel-mixer-1"] ?? null,
  eventId: "mumbai-padel-mixer-1",
  externalFilter: "reviewOpen",
  externalListGeneratedAt: "2026-07-03T09:58:00.000Z",
  externalQuery: "",
  externalRows: externalEventRows,
  filter: "launchCities",
  filteredExternalRows: externalEventRows,
  filteredRows: eventRows,
  form: sampleEventDetails["mumbai-padel-mixer-1"] ?
    formFromEventProfile(sampleEventDetails["mumbai-padel-mixer-1"]) :
    null,
  isDetailLoading: false,
  isExternalDetailError: false,
  isExternalListLoading: false,
  isListLoading: false,
  isSaving: false,
  isTakingDownExternalEvent: false,
  listGeneratedAt: "2026-07-03T09:55:00.000Z",
  openExternalSupply: () => {
    noop();
  },
  query: "",
  refreshExternalList: async () => {
    noop();
    return true;
  },
  refreshList: async () => {
    noop();
    return true;
  },
  rows: eventRows,
  save: async () => {
    noop();
    return true;
  },
  selectEvent: (_eventId) => {
    noop();
  },
  selectExternalEvent: (_value) => {
    noop();
  },
  selectedExternalEvent,
  selectedExternalEventId: selectedExternalEvent?.eventId ?? null,
  setEventId: (_value) => {
    noop();
  },
  setExternalFilter: (_value) => {
    noop();
  },
  setExternalQuery: (_value) => {
    noop();
  },
  setFilter: (_value) => {
    noop();
  },
  setForm: (_value) => {
    noop();
  },
  setQuery: (_value) => {
    noop();
  },
  takedownExternalEvent: async (_request) => {
    noop();
    return false;
  },
  validationIssues: [],
  view: "list",
};

function eventListRowFromDetails(event: AdminEventDetails): AdminEventListRow {
  return {
    activityKind: event.eventFormat.activityKind,
    activityLabel: event.eventFormat.label,
    availability: event.discovery.availability,
    bookedCount: event.bookedCount,
    capacityLimit: event.capacityLimit,
    citySlug: event.discovery.citySlug,
    organizerId: event.organizerId,
    crossPathsDiscoveryEnabled: event.crossPathsDiscoveryEnabled,
    currency: event.currency,
    eventId: event.eventId,
    meetingPoint: event.meetingPoint,
    organizerName: event.organizerName,
    priceInPaise: event.priceInPaise,
    searchIndexStatus: event.searchIndexStatus,
    startTime: event.startTime,
    status: event.status,
    title: event.title,
  };
}

const renderEventPublishingDetail = () => (
  <AdminWorkspace>
    <EventPublishingWorkspace
      controller={{...eventController, view: "detail"}}
    />
  </AdminWorkspace>
);

export const EventPublishingRouteStory: Story = {
  name: "Events",
  parameters: {
    catchComponent: {
      id: "route_event_publishing",
      states: ["canonical-detail"],
    },
  },
  render: renderEventPublishingDetail,
};

export const EventPublishingWorkspaceStory: Story = {
  name: "Events Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_event_publishing",
      states: ["canonical-detail"],
    },
  },
  render: renderEventPublishingDetail,
};

export const EventPublishingDetailStory: Story = {
  name: "Event detail",
  parameters: {
    catchComponent: {
      id: "workspace_event_publishing",
      states: ["canonical-detail"],
    },
  },
  render: renderEventPublishingDetail,
};
