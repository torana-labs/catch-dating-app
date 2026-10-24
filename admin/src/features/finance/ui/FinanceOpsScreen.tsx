import {CatchBadge, type CatchBadgeTone, CatchField} from "@catch/web-ui";
import {
  AlertTriangle,
  ArrowLeft,
  CircleDollarSign,
  Clock3,
  CreditCard,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  AdminButton,
  AdminMetricCard,
  AdminMetricGrid,
  AdminRoadmapList,
  AdminRoadmapListItem,
  AdminRowTitle,
  AdminSecondaryDisclosure,
  AdminTableRow,
  AdminTagList,
  AdminTagRow,
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
  type FinanceEvidenceState,
  type FinanceIssueKind,
  type FinanceIssueReview,
  type FinanceIssueRow,
  type FinanceOpsController,
  type FinanceSourceId,
  useFinanceOpsController,
} from "../controllers/useFinanceOpsController";
import {
  type MessagingBudgetController,
  useMessagingBudgetController,
} from "../controllers/useMessagingBudgetController";
import {
  type OrganizerEntitlementController,
  useOrganizerEntitlementController,
} from "../controllers/useOrganizerEntitlementController";
import {renderMessagingBudgetPanel} from "./messagingBudgetPanel";
import {renderOrganizerEntitlementPanel} from "./organizerEntitlementPanel";

const kindOptions: Array<{label: string; value: FinanceIssueKind}> = [
  {label: "All issues", value: "all"},
  {label: "Payments", value: "payment"},
  {label: "Events", value: "event"},
  {label: "Payouts", value: "payout"},
];

export function FinanceOpsScreen({
  actorUid,
  adminRoles,
  onBackToList,
  onError,
  onNotice,
  onSelectIssueId,
  selectedIssueId = null,
}: {
  actorUid: string;
  adminRoles: string[];
  onBackToList?: () => void;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onSelectIssueId?: (issueId: string) => void;
  selectedIssueId?: string | null;
}) {
  const controller = useFinanceOpsController({
    adminRoles,
    onError,
    onSelectIssueId,
    selectedIssueId,
  });
  const messagingBudgetController = useMessagingBudgetController({
    onError,
    onNotice,
  });
  const organizerEntitlementController = useOrganizerEntitlementController({
    actorUid,
    onError,
    onNotice,
  });
  return (
    <FinanceOpsWorkspace
      controller={controller}
      messagingBudgetController={messagingBudgetController}
      onBackToList={onBackToList}
      organizerEntitlementController={organizerEntitlementController}
    />
  );
}

export function FinanceOpsWorkspace({
  controller,
  messagingBudgetController,
  onBackToList,
  organizerEntitlementController,
}: {
  controller: FinanceOpsController;
  messagingBudgetController?: MessagingBudgetController;
  onBackToList?: () => void;
  organizerEntitlementController?: OrganizerEntitlementController;
}) {
  if (controller.selectedIssueId) {
    return (
      <FinanceDetailWorkspace
        controller={controller}
        onBackToList={onBackToList}
      />
    );
  }
  return (
    <AdminWorkbenchStack>
      <FinanceSourceAlerts controller={controller} />
      {messagingBudgetController ?
        renderMessagingBudgetPanel(messagingBudgetController) : null}
      {organizerEntitlementController ?
        renderOrganizerEntitlementPanel(organizerEntitlementController) : null}
      <AdminMetricGrid ariaLabel="Finance state">
        <AdminMetricCard
          caption="Current capped overview preview"
          label="Payment issues shown"
          value={metricValue(controller.metrics.paymentPreviewCount)}
        />
        <AdminMetricCard
          caption="Current overview metric"
          label="Failed payments"
          tone={(controller.metrics.failedPayments ?? 0) > 0 ? "attention" : "normal"}
          value={metricValue(controller.metrics.failedPayments)}
        />
        <AdminMetricCard
          caption="Current overview aggregate"
          label="Payout restrictions"
          value={metricValue(controller.metrics.payoutRestrictedHosts)}
        />
        <AdminMetricCard
          caption="30-day host event analytics"
          label="Event payment signals"
          value={metricValue(controller.metrics.eventIssueCount30d)}
        />
      </AdminMetricGrid>
      <Panel
        span={2}
        icon={<CircleDollarSign size={18} strokeWidth={1.9} />}
        title="Finance issues"
        action={controller.isLoading ? "Loading" : `${controller.filteredRows.length} shown`}
      >
        <AdminToolbar>
          <SearchField
            ariaLabel="Search finance issues"
            icon={<Search size={16} strokeWidth={1.8} />}
            onChange={controller.setQuery}
            placeholder="Search payment, event, or status"
            value={controller.query}
          />
          <CatchField
            recipe="select"
            title="Issue type"
            onChanged={(value) => controller.setKindFilter((value ?? "") as FinanceIssueKind)}
            {...selectOptions(kindOptions)}
            value={controller.kindFilter}
          />
          <AdminButton
            disabled={controller.isLoading}
            icon={<RefreshCw size={15} strokeWidth={1.9} />}
            onClick={() => void controller.refresh()}
          >
            Refresh
          </AdminButton>
        </AdminToolbar>
        <FinanceTable
          rows={controller.filteredRows}
          onSelect={controller.select}
        />
      </Panel>
      <FinanceSourceDisclosure controller={controller} />
    </AdminWorkbenchStack>
  );
}

function FinanceDetailWorkspace({
  controller,
  onBackToList,
}: {
  controller: FinanceOpsController;
  onBackToList?: () => void;
}) {
  return (
    <AdminWorkbenchStack>
      <AdminToolbar>
        <AdminButton
          icon={<ArrowLeft size={15} strokeWidth={1.9} />}
          onClick={onBackToList}
        >
          Back to finance issues
        </AdminButton>
        <AdminButton
          disabled={controller.isLoading}
          icon={<RefreshCw size={15} strokeWidth={1.9} />}
          onClick={() => void controller.refresh()}
        >
          Refresh evidence
        </AdminButton>
      </AdminToolbar>
      <FinanceSourceAlerts controller={controller} />
      {controller.selected ? (
        <>
          <FinanceDetailPanel
            selected={controller.selected}
            review={controller.selectedReview}
          />
          <FinanceReconciliationPanel review={controller.selectedReview} />
        </>
      ) : controller.selectedUnavailable ? (
        <Panel
          span={2}
          icon={<AlertTriangle size={18} strokeWidth={1.9} />}
          title="Issue unavailable"
          action="Not in current sources"
        >
          <AlertRow
            icon={<AlertTriangle size={16} strokeWidth={1.9} />}
            title="This deep link is outside the current source previews"
            tone="warning"
          >
            Finance has no point-read issue contract yet. Return to the list or
            retry the sources; no substitute record has been selected.
          </AlertRow>
        </Panel>
      ) : (
        <EmptyState variant="workbench" icon={<Clock3 size={16} strokeWidth={1.9} />}>
          Loading finance evidence.
        </EmptyState>
      )}
      <FinanceSourceDisclosure controller={controller} />
    </AdminWorkbenchStack>
  );
}

function FinanceSourceAlerts({controller}: {controller: FinanceOpsController}) {
  if (controller.isUnavailable) {
    return (
      <AlertRow
        icon={<AlertTriangle size={16} strokeWidth={1.9} />}
        title="Finance sources unavailable"
        tone="blocked"
      >
        Retry the failed sources below. No issue data is being inferred from a
        different workflow.
      </AlertRow>
    );
  }
  if (controller.isPartial) {
    return (
      <AlertRow
        icon={<AlertTriangle size={16} strokeWidth={1.9} />}
        title="Partial finance view"
        tone="warning"
      >
        One source failed. Available rows and metrics retain their source scope;
        unavailable values show a dash.
      </AlertRow>
    );
  }
  if (controller.malformedCount > 0) {
    return (
      <AlertRow
        icon={<AlertTriangle size={16} strokeWidth={1.9} />}
        title={`${controller.malformedCount} malformed source record${controller.malformedCount === 1 ? "" : "s"} omitted`}
        tone="warning"
      >
        Records missing identifiers, titles, or numeric payment signals are not
        rendered as actionable issues.
      </AlertRow>
    );
  }
  return null;
}

function FinanceSourceDisclosure({controller}: {controller: FinanceOpsController}) {
  return (
    <AdminSecondaryDisclosure summary="Source status, scope, and authority boundary">
      <AdminWorkbenchStack compact>
        {controller.sources.map((source) => (
          <Panel
            key={source.id}
            icon={<ShieldCheck size={17} strokeWidth={1.9} />}
            title={source.label}
            action={source.status}
          >
            <QualityList>
              <StateRow label="Scope" value={source.scope} />
              <StateRow label="Generated" value={formatDateTime(source.generatedAt)} />
              <StateRow label="Loaded" value={formatDateTime(source.loadedAt)} />
              {source.error ? <StateRow label="Error" value={source.error} /> : null}
            </QualityList>
            {source.status === "error" ? (
              <AdminButton onClick={() => void controller.retrySource(source.id as FinanceSourceId)}>
                Retry source
              </AdminButton>
            ) : null}
          </Panel>
        ))}
        <AlertRow
          icon={<ShieldCheck size={16} strokeWidth={1.9} />}
          title="Read-only reconciliation"
          tone="neutral"
        >
          Refund, retry, payout release, restriction clearing, settlement edits,
          and every money-moving action remain unavailable.
        </AlertRow>
      </AdminWorkbenchStack>
    </AdminSecondaryDisclosure>
  );
}

function FinanceTable({
  onSelect,
  rows,
}: {
  onSelect: (row: FinanceIssueRow) => void;
  rows: FinanceIssueRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState variant="workbench" icon={<Clock3 size={16} strokeWidth={1.9} />}>
        No available finance issues match this filter.
      </EmptyState>
    );
  }
  return (
    <DataTable ariaLabel="Finance issues" variant="workbench">
      <thead>
        <tr>
          <th>Issue</th>
          <th>Scope</th>
          <th>Severity</th>
          <th>Status</th>
          <th>Review</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <AdminTableRow key={row.id}>
            <td>
              <AdminRowTitle>
                <strong>{row.title}</strong>
                <span>{row.detail}</span>
              </AdminRowTitle>
            </td>
            <td>{row.sourceScope}</td>
            <td><CatchBadge tone={riskTone(row.severity)} label={row.severity} /></td>
            <td>{row.status}</td>
            <td><TableActionButton onClick={() => onSelect(row)}>Review</TableActionButton></td>
          </AdminTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}

function FinanceDetailPanel({
  review,
  selected,
}: {
  review: FinanceIssueReview | null;
  selected: FinanceIssueRow;
}) {
  return (
    <Panel
      span={2}
      icon={<CircleDollarSign size={18} strokeWidth={1.9} />}
      title={selected.title}
      action={selected.status}
    >
      <QualityList>
        <StateRow label="Issue type" value={selected.kind} />
        <StateRow label="Source scope" value={selected.sourceScope} />
        <StateRow label="Target" value={selected.targetPath} />
        <StateRow label="Created/start" value={formatDateTime(selected.createdAt)} />
        <StateRow label="Manual next step" value={selected.nextAction} />
      </QualityList>
      {review ? (
        <>
          <AlertRow
            icon={<ShieldCheck size={16} strokeWidth={1.9} />}
            title={review.statusLabel}
            tone={reviewTone(review.actionStatus)}
          >
            {review.statusDetail}
          </AlertRow>
          <AdminTagRow>
            <CatchBadge label={review.actionStatus.replaceAll("_", " ")} />
            <CatchBadge label="read only" />
          </AdminTagRow>
          <QualityList>
            {review.fieldEvidence.map((field) => (
              <StateRow
                key={field.label}
                label={`${field.label} · ${evidenceLabel(field.state)}`}
                value={field.value}
              />
            ))}
          </QualityList>
        </>
      ) : null}
    </Panel>
  );
}

function FinanceReconciliationPanel({review}: {review: FinanceIssueReview | null}) {
  if (!review) return null;
  return (
    <Panel
      span={2}
      icon={<CreditCard size={18} strokeWidth={1.9} />}
      title="Required reconciliation evidence"
      action="Manual provider handoff"
    >
      <QualityList>
        <StateRow label="Source model" value={review.sourceModel} />
        <StateRow label="Provider" value={review.provider} />
        <StateRow label="Authority" value={review.sourceOfTruth} />
        <StateRow label="Reconciliation" value={review.reconciliationStatus} />
        <StateRow label="Mutation boundary" value={review.mutationBoundary} />
      </QualityList>
      <AdminRoadmapList>
        {review.requiredEvidence.map((item) => (
          <AdminRoadmapListItem key={item}>
            <ShieldCheck size={15} strokeWidth={1.9} />
            <span>{item}</span>
          </AdminRoadmapListItem>
        ))}
      </AdminRoadmapList>
      <AdminTagList>
        {review.blockedActions.map((action) => <CatchBadge key={action} label={action} />)}
      </AdminTagList>
    </Panel>
  );
}

function metricValue(value: number | null): string {
  return value === null ? "—" : new Intl.NumberFormat("en-IN").format(value);
}

function evidenceLabel(state: FinanceEvidenceState): string {
  return state === "source" ? "source" : state === "inferred" ? "inferred" : "unknown";
}

function riskTone(severity: FinanceIssueRow["severity"]): CatchBadgeTone {
  return severity === "high" ? "danger" : "warning";
}

function reviewTone(status: FinanceIssueReview["actionStatus"]): "neutral" | "warning" | "success" | "blocked" {
  return status === "needs_finance_contract" ? "blocked" :
    status === "aggregate_only" ? "warning" : "neutral";
}

function formatDateTime(value: string | null): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Malformed timestamp";
  return new Intl.DateTimeFormat("en-IN", {dateStyle: "medium", timeStyle: "short"}).format(date);
}
