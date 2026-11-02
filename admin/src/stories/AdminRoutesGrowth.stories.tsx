import type {GrowthKpiController, GrowthRangePreset, GrowthSignalRow, GrowthStage} from "../features/growth/controllers/useGrowthKpiController";
import type {HostAnalyticsTrendPoint} from "../shared/types/adminTypes";
import {AdminWorkspace} from "../shared/ui/AdminPrimitives";
import {GrowthKpiWorkspace} from "../features/growth/ui/GrowthKpiScreen";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {noop, setRangePreset} from "./adminRouteStoryKit";

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

const growthRows: GrowthSignalRow[] = [
  {
    id: "signupsThisWeek",
    stage: "acquisition",
    label: "Signups this week",
    value: 142,
    unit: "count",
    status: "ready",
    source: "adminGetOverview",
    sourceGeneratedAt: "2026-07-03T09:30:00.000Z",
    metricBasis: "Current calendar-week overview total.",
    range: "Current / overview-defined",
    timezone: "UTC",
    detail: "Launch demand created this week across Indore and Mumbai.",
  },
  {
    id: "pendingOrganizerClaims",
    stage: "supply",
    label: "Pending club claims",
    value: 9,
    unit: "count",
    status: "partial",
    source: "adminGetOverview",
    sourceGeneratedAt: "2026-07-03T09:30:00.000Z",
    metricBasis: "Current organizer-claim stock.",
    range: "Current / overview-defined",
    timezone: "UTC",
    detail: "Organizer claim demand waiting for review before publication.",
  },
  {
    id: "bookings",
    stage: "conversion",
    label: "Bookings",
    value: 74,
    unit: "count",
    status: "ready",
    source: "adminGetHostAnalytics",
    sourceGeneratedAt: "2026-07-03T09:35:00.000Z",
    metricBasis: "Selected-range host analytics summary.",
    range: "2026-06-04 to 2026-07-03 (day)",
    timezone: "UTC",
    detail: "Bookings confirmed by host analytics summary cards.",
  },
  {
    id: "checkoutConversionRate",
    stage: "conversion",
    label: "Checkout conversion rate",
    value: 38,
    unit: "percent",
    status: "partial",
    source: "adminGetHostAnalytics",
    sourceGeneratedAt: "2026-07-03T09:35:00.000Z",
    metricBasis: "Selected-range host analytics summary.",
    range: "2026-06-04 to 2026-07-03 (day)",
    timezone: "UTC",
    detail: "Conversion is usable for launch review but not yet channel-attributed.",
  },
  {
    id: "claimClicks",
    stage: "marketplace",
    label: "Claim clicks",
    value: 21,
    unit: "count",
    status: "ready",
    source: "adminGetHostAnalytics.discoverySummary",
    sourceGeneratedAt: "2026-07-03T09:35:00.000Z",
    metricBasis: "Selected-range discovery summary.",
    range: "2026-06-04 to 2026-07-03 (day)",
    timezone: "UTC",
    detail: "Organizer claim intent captured from public pages.",
  },
];

const growthTrend: HostAnalyticsTrendPoint[] = [
  {
    periodStart: "2026-06-20",
    periodEnd: "2026-06-26",
    metrics: {
      bookings: 25,
      checkedIn: 18,
      checkoutDropoff: 7,
      demand: 84,
      reviews: 12,
    },
  },
  {
    periodStart: "2026-06-27",
    periodEnd: "2026-07-03",
    metrics: {
      bookings: 49,
      checkedIn: 37,
      checkoutDropoff: 9,
      demand: 116,
      reviews: 19,
    },
  },
];

const growthController: GrowthKpiController = {
  filteredRows: growthRows,
  hostAnalyticsError: null,
  hostAnalyticsGeneratedAt: "2026-07-03T09:35:00.000Z",
  isHostAnalyticsLoading: false,
  isLoading: false,
  isOverviewLoading: false,
  loadedAt: "2026-07-03T09:40:00.000Z",
  metrics: growthMetrics(growthRows),
  overviewError: null,
  overviewGeneratedAt: "2026-07-03T09:30:00.000Z",
  query: "",
  rangePreset: "30d",
  rows: growthRows,
  selected: growthRows[1] ?? null,
  selectedSignalId: null,
  stageFilter: "all",
  trend: growthTrend,
  refresh: async () => {
    noop();
    return true;
  },
  refreshHostAnalytics: async () => {
    noop();
    return true;
  },
  refreshOverview: async () => {
    noop();
    return true;
  },
  select: (_row: GrowthSignalRow) => {
    noop();
  },
  setQuery: (_value: string) => {
    noop();
  },
  setRangePreset: (_value: GrowthRangePreset) => {
    noop();
  },
  setStageFilter: (_value: GrowthStage) => {
    noop();
  },
};

function growthMetrics(rows: GrowthSignalRow[]) {
  const value = (id: string) => rows.find((row) => row.id === id)?.value ?? 0;
  return {
    signupsThisWeek: value("signupsThisWeek"),
    completedProfiles: value("completedProfiles"),
    bookings: value("bookings"),
    attendanceRate: value("attendanceRate"),
  };
}

const renderGrowthWorkspace = () => (
  <AdminWorkspace>
    <GrowthKpiWorkspace controller={growthController} />
  </AdminWorkspace>
);

export const GrowthRouteStory: Story = {
  name: "Growth",
  parameters: {
    catchComponent: {
      id: "route_growth_kpi",
      states: ["signal-directory"],
    },
  },
  render: renderGrowthWorkspace,
};

export const GrowthWorkspaceStory: Story = {
  name: "Growth Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_growth_kpi",
      states: ["signal-directory"],
    },
  },
  render: renderGrowthWorkspace,
};
