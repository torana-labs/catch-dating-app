import {CatchBadge, type CatchBadgeTone, CatchField} from "@catch/web-ui";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  ExternalLink,
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
  AdminTableRow,
  AdminToolbar,
  AdminWorkbenchStack,
  AlertRow,
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
  type DataQualityController,
  type DataQualityRow,
  type DataQualitySeverity,
  type DataQualitySourceId,
  useDataQualityController,
} from "../controllers/useDataQualityController";

const severityOptions = [
  {label: "All severities", value: "all"},
  {label: "Blocked", value: "blocked"},
  {label: "Warning", value: "warning"},
  {label: "Healthy", value: "healthy"},
];

export function DataQualityScreen({
  onBackToList,
  onError,
  onOpenOwningWorkflow,
  onSelectSignalId,
  selectedSignalId = null,
}: {
  onBackToList?: () => void;
  onError: (message: string | null) => void;
  onOpenOwningWorkflow?: (path: string) => void;
  onSelectSignalId?: (signalId: string) => void;
  selectedSignalId?: string | null;
}) {
  const controller = useDataQualityController({
    onError,
    onSelectSignalId,
    selectedSignalId,
  });
  return (
    <DataQualityWorkspace
      controller={controller}
      onBackToList={onBackToList}
      onOpenOwningWorkflow={onOpenOwningWorkflow}
    />
  );
}

export function DataQualityWorkspace({
  controller,
  onBackToList,
  onOpenOwningWorkflow,
}: {
  controller: DataQualityController;
  onBackToList?: () => void;
  onOpenOwningWorkflow?: (path: string) => void;
}) {
  if (controller.selectedSignalId) {
    return (
      <QualityDetailWorkspace
        controller={controller}
        onBackToList={onBackToList}
        onOpenOwningWorkflow={onOpenOwningWorkflow}
      />
    );
  }
  return (
    <AdminWorkbenchStack>
      <QualitySourceAlerts controller={controller} />
      <AdminMetricGrid ariaLabel="Data quality state">
        <AdminMetricCard label="Open issues" value={controller.metrics.openIssues} />
        <AdminMetricCard
          label="Blocked"
          tone={controller.metrics.blocked > 0 ? "attention" : "normal"}
          value={controller.metrics.blocked}
        />
        <AdminMetricCard label="Warnings" value={controller.metrics.warnings} />
        <AdminMetricCard label="Owners" value={controller.metrics.owners} />
      </AdminMetricGrid>
      <SourceHealthPanel controller={controller} />
      <Panel
        span={2}
        icon={<Database size={18} strokeWidth={1.9} />}
        title="Quality signals"
        action={controller.isLoading ? "Loading" : `${controller.filteredRows.length} shown`}
      >
        <AdminToolbar>
          <SearchField
            ariaLabel="Search data quality signals"
            icon={<Search size={16} strokeWidth={1.8} />}
            onChange={controller.setQuery}
            placeholder="Search signal, source, or owner"
            value={controller.query}
          />
          <CatchField
            recipe="select"
            title="Severity"
            onChanged={(value) => controller.setSeverityFilter((value ?? "") as DataQualitySeverity)}
            {...selectOptions(severityOptions)}
            value={controller.severityFilter}
          />
          <CatchField
            recipe="select"
            title="Owner"
            onChanged={(value) => controller.setOwnerFilter(value ?? "")}
            {...selectOptions([
              {label: "All owners", value: "all"},
              ...controller.ownerOptions.map((owner) => ({label: owner, value: owner})),
            ])}
            value={controller.ownerFilter}
          />
          <AdminButton
            disabled={controller.isLoading}
            icon={<RefreshCw size={15} strokeWidth={1.9} />}
            onClick={() => void controller.refresh()}
          >
            Refresh all sources
          </AdminButton>
        </AdminToolbar>
        <QualityTable onSelect={controller.select} rows={controller.filteredRows} />
      </Panel>
      <QualityBoundaryDisclosure />
    </AdminWorkbenchStack>
  );
}

function QualityDetailWorkspace({
  controller,
  onBackToList,
  onOpenOwningWorkflow,
}: {
  controller: DataQualityController;
  onBackToList?: () => void;
  onOpenOwningWorkflow?: (path: string) => void;
}) {
  return (
    <AdminWorkbenchStack>
      <AdminToolbar>
        <AdminButton icon={<ArrowLeft size={15} strokeWidth={1.9} />} onClick={onBackToList}>
          Back to Data quality
        </AdminButton>
        <AdminButton
          disabled={controller.isLoading}
          icon={<RefreshCw size={15} strokeWidth={1.9} />}
          onClick={() => void controller.refresh()}
        >
          Refresh sources
        </AdminButton>
      </AdminToolbar>
      <QualitySourceAlerts controller={controller} />
      {controller.selected ? (
        <QualityDetailPanel
          selected={controller.selected}
          onOpenOwningWorkflow={onOpenOwningWorkflow}
        />
      ) : controller.selectedUnavailable ? (
        <Panel
          span={2}
          icon={<AlertTriangle size={18} strokeWidth={1.9} />}
          title="Signal unavailable"
          action="No fallback selected"
        >
          <AlertRow
            icon={<AlertTriangle size={16} strokeWidth={1.9} />}
            title="This signal is not present in the available source reads"
            tone="warning"
          >
            Retry the failed source or return to the register. The workspace will
            not substitute a different signal.
          </AlertRow>
        </Panel>
      ) : (
        <EmptyState variant="workbench" icon={<Database size={16} strokeWidth={1.9} />}>
          Loading signal detail.
        </EmptyState>
      )}
      <SourceHealthPanel controller={controller} />
      <QualityBoundaryDisclosure />
    </AdminWorkbenchStack>
  );
}

function QualitySourceAlerts({controller}: {controller: DataQualityController}) {
  if (controller.isUnavailable) {
    return (
      <AlertRow
        icon={<AlertTriangle size={16} strokeWidth={1.9} />}
        title="All data-quality sources are unavailable"
        tone="blocked"
      >
        Retry individual source reads below. No synthetic signals are shown.
      </AlertRow>
    );
  }
  if (controller.isPartial) {
    return (
      <AlertRow
        icon={<AlertTriangle size={16} strokeWidth={1.9} />}
        title={`${controller.failedSources.length} source read${controller.failedSources.length === 1 ? "" : "s"} failed`}
        tone="warning"
      >
        Available signals remain visible. A source with cached data is labelled
        as a failed refresh rather than silently replaced.
      </AlertRow>
    );
  }
  return null;
}

function SourceHealthPanel({controller}: {controller: DataQualityController}) {
  return (
    <Panel
      span={2}
      icon={<ShieldCheck size={18} strokeWidth={1.9} />}
      title="Source health"
      action={`${controller.sourceHealth.filter((source) => source.loadState === "loaded").length}/${controller.sourceHealth.length} loaded`}
    >
      <DataTable ariaLabel="Data quality source health" variant="workbench">
        <thead>
          <tr>
            <th>Source</th>
            <th>Read</th>
            <th>Freshness</th>
            <th>Configuration</th>
            <th>Retry</th>
          </tr>
        </thead>
        <tbody>
          {controller.sourceHealth.map((source) => (
            <AdminTableRow key={source.sourceId}>
              <td>
                <AdminRowTitle>
                  <strong>{source.label}</strong>
                  <span>{source.error && source.hasCachedData ? "Refresh failed; showing last successful read" : formatDateTime(source.generatedAt)}</span>
                </AdminRowTitle>
              </td>
              <td>{source.loadState}</td>
              <td>{freshnessLabel(source.freshness)}</td>
              <td>{source.configuration.replaceAll("_", " ")}</td>
              <td>
                {source.error ? (
                  <TableActionButton onClick={() => void controller.retrySource(source.sourceId as DataQualitySourceId)}>
                    Retry source read
                  </TableActionButton>
                ) : "—"}
              </td>
            </AdminTableRow>
          ))}
        </tbody>
      </DataTable>
    </Panel>
  );
}

function QualityTable({
  onSelect,
  rows,
}: {
  onSelect: (row: DataQualityRow) => void;
  rows: DataQualityRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState variant="workbench" icon={<CheckCircle2 size={16} strokeWidth={1.9} />}>
        No available signals match these filters.
      </EmptyState>
    );
  }
  return (
    <DataTable ariaLabel="Data-quality signals" variant="workbench">
      <thead>
        <tr>
          <th>Signal</th>
          <th>Severity</th>
          <th>Owner</th>
          <th>Freshness</th>
          <th>Open</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <AdminTableRow key={row.id}>
            <td>
              <AdminRowTitle>
                <strong>{row.label}</strong>
                <span>{row.source} · {row.category}</span>
              </AdminRowTitle>
            </td>
            <td><CatchBadge recipe="status" tone={riskTone(row)} label={row.severity} /></td>
            <td>{row.owner}</td>
            <td>{row.timestampLabel}</td>
            <td><TableActionButton onClick={() => onSelect(row)}>Review</TableActionButton></td>
          </AdminTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}

function QualityDetailPanel({
  onOpenOwningWorkflow,
  selected,
}: {
  onOpenOwningWorkflow?: (path: string) => void;
  selected: DataQualityRow;
}) {
  return (
    <Panel
      span={2}
      icon={<Database size={18} strokeWidth={1.9} />}
      title={selected.label}
      action={selected.severity}
    >
      <AlertRow
        icon={<ShieldCheck size={16} strokeWidth={1.9} />}
        title="Read-only governance signal"
        tone="neutral"
      >
        Resolve the underlying workflow; this screen does not acknowledge,
        backfill, mutate records, or claim a job execution result.
      </AlertRow>
      <QualityList>
        <StateRow label="Source" value={selected.source} />
        <StateRow label="Category" value={selected.category} />
        <StateRow label="Source state" value={selected.state} />
        <StateRow label="Severity" value={<CatchBadge recipe="status" tone={riskTone(selected)} label={selected.severity} />} />
        <StateRow label="Owner" value={selected.owner} />
        <StateRow label="Freshness" value={selected.timestampLabel} />
        <StateRow label="Generated" value={formatDateTime(selected.updatedAt)} />
        <StateRow label="State definition" value={selected.stateDefinition} />
        <StateRow label="Evidence" value={selected.detail} />
        <StateRow label="Runbook" value={selected.runbook} />
        <StateRow label="Next action" value={selected.nextAction} />
      </QualityList>
      {selected.owningWorkflowPath ? (
        <AdminButton
          icon={<ExternalLink size={15} strokeWidth={1.9} />}
          onClick={() => onOpenOwningWorkflow?.(selected.owningWorkflowPath!)}
          variant="primary"
        >
          Open owning workflow
        </AdminButton>
      ) : null}
    </Panel>
  );
}

function QualityBoundaryDisclosure() {
  return (
    <AdminSecondaryDisclosure summary="Read-only boundary and source definitions">
      <QualityList>
        <StateRow label="Mutations" value="None from Data quality" />
        <StateRow label="Stale" value="Client heuristic when source generatedAt is more than 7 days old" />
        <StateRow label="Configuration" value="Run-plan and policy configuration; not scheduler execution telemetry" />
        <StateRow label="Not available" value="Acknowledgement, backfill progress, last-run receipts, or remediation actions" />
      </QualityList>
    </AdminSecondaryDisclosure>
  );
}

function riskTone(row: DataQualityRow): CatchBadgeTone {
  return row.severity === "blocked" ? "danger" : row.severity === "warning" ? "warning" : "success";
}

function freshnessLabel(value: DataQualityRow["freshness"]): string {
  return value === "stale" ? "Stale heuristic (>7 days)" :
    value === "current" ? "Current" : "Unknown";
}

function formatDateTime(value: string | null): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Malformed timestamp";
  return new Intl.DateTimeFormat("en-IN", {dateStyle: "medium", timeStyle: "short"}).format(date);
}
