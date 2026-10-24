import {CatchBadge, CatchField} from "@catch/web-ui";
import {
  Activity,
  ArrowLeft,
  Clock3,
  FileWarning,
  LineChart,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  AdminButton,
  AdminMetricCard,
  AdminMetricGrid,
  AdminRowTitle,
  AdminSecondaryDisclosure,
  AdminStatusGrid,
  AdminTableRow,
  AdminToolbar,
  AdminTrendSeries,
  AdminWorkbenchNote,
  AdminWorkbenchStack,
  DataTable,
  EmptyState,
  Panel,
  QualityList,
  SearchField,
  selectOptions,
  StateRow,
  TableActionButton,
} from "../../../shared/ui/AdminPrimitives";
import {
  type GrowthKpiController,
  type GrowthRangePreset,
  type GrowthSignalRow,
  type GrowthStage,
  useGrowthKpiController,
} from "../controllers/useGrowthKpiController";

const rangeOptions: Array<{label: string; value: GrowthRangePreset}> = [
  {label: "7d", value: "7d"},
  {label: "30d", value: "30d"},
  {label: "90d", value: "90d"},
  {label: "Month", value: "month"},
];

const stageOptions: Array<{label: string; value: GrowthStage}> = [
  {label: "All stages", value: "all"},
  {label: "Acquisition", value: "acquisition"},
  {label: "Supply", value: "supply"},
  {label: "Conversion", value: "conversion"},
  {label: "Marketplace", value: "marketplace"},
];

export function GrowthKpiScreen({
  onBackToList,
  onError,
  onSelectSignalId,
  selectedSignalId,
}: {
  onBackToList?: () => void;
  onError: (message: string | null) => void;
  onSelectSignalId?: (signalId: string) => void;
  selectedSignalId?: string | null;
}) {
  const controller = useGrowthKpiController({
    onError,
    onSelectSignalId,
    selectedSignalId,
  });
  return (
    <GrowthKpiWorkspace
      controller={controller}
      onBackToList={onBackToList}
    />
  );
}

export function GrowthKpiWorkspace({
  controller,
  onBackToList,
}: {
  controller: GrowthKpiController;
  onBackToList?: () => void;
}) {
  if (controller.selectedSignalId) {
    return (
      <AdminWorkbenchStack>
        <AdminToolbar>
          <AdminButton
            icon={<ArrowLeft size={15} strokeWidth={1.9} />}
            onClick={onBackToList}
          >
            Growth signals
          </AdminButton>
        </AdminToolbar>
        <Panel
          icon={<Activity size={18} strokeWidth={1.9} />}
          title={controller.selected?.label ?? "Signal unavailable"}
          action={controller.selected?.status ?? "current snapshot"}
          span={2}
        >
          <GrowthSignalDetail
            selected={controller.selected}
            selectedSignalId={controller.selectedSignalId}
          />
        </Panel>
      </AdminWorkbenchStack>
    );
  }

  return (
    <AdminWorkbenchStack>
      <AdminMetricGrid ariaLabel="Growth outcomes">
        <AdminMetricCard
          caption="Current calendar-week overview total."
          label="Signups this week"
          value={controller.metrics.signupsThisWeek}
        />
        <AdminMetricCard
          caption="Current overview snapshot."
          label="Completed profiles"
          value={controller.metrics.completedProfiles}
        />
        <AdminMetricCard
          caption={`Selected ${controller.rangePreset} host-analytics range.`}
          label="Bookings"
          value={controller.metrics.bookings}
        />
        <AdminMetricCard
          caption={`Selected ${controller.rangePreset} host-analytics range.`}
          label="Attendance rate"
          value={`${Math.round(controller.metrics.attendanceRate)}%`}
        />
      </AdminMetricGrid>

      <AdminStatusGrid>
        <StateRow
          label="Overview source generated at"
          value={formatDateTime(controller.overviewGeneratedAt)}
        />
        <StateRow
          label="Host analytics generated at"
          value={formatDateTime(controller.hostAnalyticsGeneratedAt)}
        />
        <StateRow label="Loaded at" value={formatDateTime(controller.loadedAt)} />
      </AdminStatusGrid>

      {controller.overviewError || controller.hostAnalyticsError ? (
        <Panel
          icon={<FileWarning size={18} strokeWidth={1.9} />}
          title="Partial growth data"
          action="successful source retained"
          span={2}
        >
          <QualityList>
            <StateRow label="Overview" value={controller.overviewError ?? "Loaded"} />
            <StateRow label="Host analytics" value={controller.hostAnalyticsError ?? "Loaded"} />
          </QualityList>
        </Panel>
      ) : null}

      <Panel
        span={2}
        icon={<LineChart size={18} strokeWidth={1.9} />}
        title="Growth signals"
        action={controller.isLoading ? "Loading" : `${controller.filteredRows.length} shown`}
      >
        <AdminToolbar>
          <SearchField
            ariaLabel="Search growth signals"
            icon={<Search size={16} strokeWidth={1.8} />}
            onChange={controller.setQuery}
            placeholder="Search metric, stage, basis, or source"
            value={controller.query}
          />
          <CatchField
            recipe="select"
            title="Stage"
            onChanged={(value) => controller.setStageFilter((value ?? "") as GrowthStage)}
            {...selectOptions(stageOptions)}
            value={controller.stageFilter}
          />
          <CatchField
            recipe="select"
            title="Host range"
            onChanged={(value) => controller.setRangePreset((value ?? "") as GrowthRangePreset)}
            {...selectOptions(rangeOptions)}
            value={controller.rangePreset}
          />
          <AdminButton
            disabled={controller.isLoading}
            icon={<RefreshCw size={15} strokeWidth={1.9} />}
            onClick={() => void controller.refresh()}
          >
            Refresh sources
          </AdminButton>
        </AdminToolbar>
        <AdminWorkbenchNote>
          The range control applies only to Host analytics. Overview signals keep
          their current/all-time contract and are labelled individually.
        </AdminWorkbenchNote>
        <GrowthSignalTable onSelect={controller.select} rows={controller.filteredRows} />
      </Panel>

      <Panel
        icon={<LineChart size={18} strokeWidth={1.9} />}
        title="Selected-range activity"
        action={controller.rangePreset}
        span={2}
      >
        <AdminTrendSeries
          ariaLabel="Selected-range booking and attendance activity"
          emptyLabel="No ranged activity buckets are available."
          points={controller.trend.map((point) => ({
            label: `${formatDate(point.periodStart)} – ${formatDate(point.periodEnd)}`,
            values: point.metrics,
          }))}
          series={[
            {id: "bookings", label: "Bookings"},
            {id: "checkedIn", label: "Checked in"},
          ]}
        />
      </Panel>

      <AdminSecondaryDisclosure summary="Data and action boundaries">
        <QualityList>
          <StateRow label="Sources" value="adminGetOverview and adminGetHostAnalytics" />
          <StateRow label="Mutations" value="None from Growth" />
          <StateRow label="Unavailable" value="funnel drop-off, cohort, attribution, referral, paid ROI, and retention claims" />
        </QualityList>
      </AdminSecondaryDisclosure>
    </AdminWorkbenchStack>
  );
}

function GrowthSignalTable({
  onSelect,
  rows,
}: {
  onSelect: (row: GrowthSignalRow) => void;
  rows: GrowthSignalRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState variant="workbench" icon={<Clock3 size={16} strokeWidth={1.9} />}>
        No growth signals match this filter.
      </EmptyState>
    );
  }
  return (
    <DataTable ariaLabel="Growth signals" variant="workbench">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Stage</th>
          <th>Value</th>
          <th>Status</th>
          <th>Source / range</th>
          <th>Open</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <AdminTableRow key={row.id}>
            <td>
              <AdminRowTitle>
                <strong>{row.label}</strong>
                <span>{row.metricBasis}</span>
              </AdminRowTitle>
            </td>
            <td>{row.stage}</td>
            <td>{formatValue(row.value, row.unit)}</td>
            <td>
              <CatchBadge tone={row.status === "ready" ? "success" : "warning"} label={row.status} />
            </td>
            <td>
              <AdminRowTitle compact>
                <span>{row.source}</span>
                <span>{row.range}</span>
              </AdminRowTitle>
            </td>
            <td>
              <TableActionButton onClick={() => onSelect(row)}>Open</TableActionButton>
            </td>
          </AdminTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}

function GrowthSignalDetail({
  selected,
  selectedSignalId,
}: {
  selected: GrowthSignalRow | null;
  selectedSignalId: string;
}) {
  if (!selected) {
    return (
      <EmptyState variant="workbench" icon={<FileWarning size={16} strokeWidth={1.9} />}>
        Signal {selectedSignalId} is unavailable in the current source snapshot.
      </EmptyState>
    );
  }
  return (
    <QualityList>
      <StateRow label="Metric" value={selected.label} />
      <StateRow label="Stage" value={selected.stage} />
      <StateRow label="Value" value={formatValue(selected.value, selected.unit)} />
      <StateRow label="Status" value={selected.status} />
      <StateRow label="Source" value={selected.source} />
      <StateRow label="Source generated at" value={formatDateTime(selected.sourceGeneratedAt)} />
      <StateRow label="Metric basis" value={selected.metricBasis} />
      <StateRow label="Range" value={selected.range} />
      <StateRow label="Timezone" value={selected.timezone} />
      <StateRow label="Interpretation" value={selected.detail} />
    </QualityList>
  );
}

function formatValue(value: number, unit: GrowthSignalRow["unit"]): string {
  if (unit === "percent") return `${value}%`;
  if (unit === "money_minor") {
    return new Intl.NumberFormat("en-IN", {
      currency: "INR",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(value / 100);
  }
  if (unit === "rating") return value.toFixed(1);
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {day: "2-digit", month: "short"})
    .format(date);
}

function formatDateTime(value: string | null): string {
  if (!value) return "unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
