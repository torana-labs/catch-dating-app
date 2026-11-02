import type {DataQualityController, DataQualityRow, DataQualitySeverity} from "../features/data-quality/controllers/useDataQualityController";
import {AdminWorkspace} from "../shared/ui/AdminPrimitives";
import {DataQualityWorkspace} from "../features/data-quality/ui/DataQualityScreen";
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

const dataQualityRows: DataQualityRow[] = [
  {
    id: "overview-club-claims",
    sourceId: "overview",
    source: "Overview",
    category: "Platform signal",
    label: "Organizer claim queue",
    state: "blocked",
    severity: "blocked",
    detail: "3 organizer claims need canonical owner validation before publication.",
    stateDefinition: "State is provided by the admin overview read model.",
    owner: "Admin ops",
    runbook: "admin > Organizers > Claim review",
    nextAction: "Resolve claim identity conflicts before enabling public claim CTAs.",
    updatedAt: "2026-07-03T08:30:00.000Z",
    freshness: "current",
    timestampLabel: "Current by 7-day heuristic",
    owningWorkflowPath: "/inbox",
  },
  {
    id: "host-analytics-booking-window",
    sourceId: "host-analytics",
    source: "Host analytics",
    category: "Analytics signal",
    label: "Booking attribution",
    state: "warning",
    severity: "warning",
    detail: "Analytics range uses a generated local-preview bridge older than the current launch week.",
    stateDefinition: "State is provided by the fixed 30-day host analytics read.",
    owner: "Growth ops",
    runbook: "admin > Growth > Host analytics",
    nextAction: "Regenerate the host analytics bridge before launch reporting.",
    updatedAt: "2026-07-02T12:00:00.000Z",
    freshness: "stale",
    timestampLabel: "Stale heuristic (>7 days)",
    owningWorkflowPath: "/growth",
  },
  {
    id: "generated-marketing-bridge",
    sourceId: "marketing-bridge",
    source: "Marketing bridge",
    category: "Source freshness",
    label: "Marketing ops bridge",
    state: "ok",
    severity: "healthy",
    detail: "Generated today for Indore launch week content packaging.",
    stateDefinition: "Stale is a client heuristic when generatedAt is more than 7 days old.",
    owner: "Marketing ops",
    runbook: "marketingOpsDashboards/current",
    nextAction: "No action; generated bridge is fresh enough for the launch workspace.",
    updatedAt: "2026-07-03T09:15:00.000Z",
    freshness: "current",
    timestampLabel: "Current by 7-day heuristic",
    owningWorkflowPath: "/marketing",
  },
];

const dataQualityController: DataQualityController = {
  failedSources: [],
  filteredRows: dataQualityRows,
  isLoading: false,
  isPartial: false,
  isUnavailable: false,
  metrics: dataQualityMetrics(dataQualityRows),
  ownerFilter: "all",
  ownerOptions: ["Admin ops", "Growth ops", "Marketing ops"],
  query: "",
  rows: dataQualityRows,
  selected: null,
  selectedSignalId: null,
  selectedUnavailable: false,
  severityFilter: "all",
  sourceHealth: [
    "overview",
    "host-analytics",
    "marketing-bridge",
    "event-intake",
  ].map((sourceId) => ({
    sourceId: sourceId as DataQualityRow["sourceId"],
    label: sourceId.replaceAll("-", " "),
    loadState: "loaded" as const,
    freshness: "current" as const,
    configuration: sourceId.includes("bridge") || sourceId === "event-intake" ?
      "configured" as const : "not_applicable" as const,
    generatedAt: "2026-07-03T09:30:00.000Z",
    loadedAt: "2026-07-03T09:30:05.000Z",
    error: null,
    hasCachedData: true,
  })),
  refresh: async () => {
    noop();
    return true;
  },
  retrySource: async () => true,
  select: (_row: DataQualityRow) => {
    noop();
  },
  setOwnerFilter: (_value: string) => {
    noop();
  },
  setQuery: (_value: string) => {
    noop();
  },
  setSeverityFilter: (_value: DataQualitySeverity) => {
    noop();
  },
};

function dataQualityMetrics(rows: DataQualityRow[]) {
  return {
    openIssues: rows.filter((row) => row.severity !== "healthy").length,
    blocked: rows.filter((row) => row.severity === "blocked").length,
    warnings: rows.filter((row) => row.severity === "warning").length,
    owners: new Set(rows.map((row) => row.owner)).size,
  };
}

const renderDataQualityWorkspace = () => (
  <AdminWorkspace>
    <DataQualityWorkspace controller={dataQualityController} />
  </AdminWorkspace>
);

export const DataQualityRouteStory: Story = {
  name: "Data Quality",
  parameters: {
    catchComponent: {
      id: "route_data_quality",
      states: ["source-register"],
    },
  },
  render: renderDataQualityWorkspace,
};

export const DataQualityWorkspaceStory: Story = {
  name: "Data Quality Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_data_quality",
      states: ["source-register"],
    },
  },
  render: renderDataQualityWorkspace,
};
