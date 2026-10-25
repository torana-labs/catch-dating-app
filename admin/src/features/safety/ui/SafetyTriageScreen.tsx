import {CatchBadge, CatchField} from "@catch/web-ui";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Clock3,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  AdminButton,
  AdminDecisionFooterShell,
  AdminEditorGrid,
  AdminEditorPanel,
  AdminMetricCard,
  AdminMetricGrid,
  AdminRoadmapList,
  AdminRoadmapListItem,
  AdminSecondaryDisclosure,
  AdminSectionCaption,
  AdminStatusGrid,
  AdminTableRow,
  AdminToolbar,
  AdminWorkbenchStack,
  AdminWorkbenchNote,
  DataTable,
  EmptyState,
  Panel,
  QualityList,
  SearchField,
  SegmentedControl,
  StateRow,
  TableActionButton,
  AdminRowTitle,
  AdminTagRow,
} from "../../../shared/ui/AdminPrimitives";
import type {
  AdminSafetyTriageDecision,
  AdminSafetyTriageDetails,
} from
  "../../../shared/types/adminTypes";
import {displayAdminQueueTitle} from "../../../shared/ui/adminPresentation";
import {
  type SafetyAssignmentFormState,
  type SafetyDecisionFormState,
  type SafetyQueueKind,
  type SafetyTriageController,
  type SafetyTriageRow,
  useSafetyTriageController,
} from "../controllers/useSafetyTriageController";
const queueOptions: Array<{label: string; id: SafetyQueueKind}> = [
  {label: "All", id: "all"},
  {label: "User reports", id: "reports"},
  {label: "Moderation", id: "moderation"},
  {label: "Event reports", id: "event"},
];

export function SafetyTriageScreen({
  onBackToList,
  onError,
  onNotice,
  onSelectTargetPath,
  selectedTargetPath,
}: {
  onBackToList: () => void;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onSelectTargetPath: (targetPath: string) => void;
  selectedTargetPath: string | null;
}) {
  const controller = useSafetyTriageController({
    onError,
    onNotice,
    selectedTargetPath,
    onSelectedTargetPathChange: (targetPath) => {
      if (targetPath) {
        onSelectTargetPath(targetPath);
      } else {
        onBackToList();
      }
    },
  });
  return (
    <SafetyTriageWorkspace
      controller={controller}
      onBackToList={onBackToList}
      view={selectedTargetPath ? "detail" : "list"}
    />
  );
}

export function SafetyTriageWorkspace({
  controller,
  onBackToList,
  view = controller.selected ? "detail" : "list",
}: {
  controller: SafetyTriageController;
  onBackToList?: () => void;
  view?: "list" | "detail";
}) {
  if (view === "detail") {
    return (
      <AdminWorkbenchStack>
        <AdminToolbar>
          <AdminButton
            icon={<ArrowLeft size={15} strokeWidth={1.9} />}
            onClick={onBackToList ?? (() => undefined)}
          >
            All safety cases
          </AdminButton>
          {controller.selected ? (
            <CatchBadge label={controller.selected.queueLabel} />
          ) : null}
        </AdminToolbar>
        {controller.selected ? (
          <>
            <SafetyDetailPanel
              detail={controller.selectedDetail}
              generatedAt={controller.generatedAt}
              isDetailLoading={controller.isDetailLoading}
              selected={controller.selected}
            />
            <SafetyActionRail
              assignmentForm={controller.assignmentForm}
              assignmentInFlight={controller.assignmentInFlight}
              assignmentValidationIssue={controller.assignmentValidationIssue}
              decisionForm={controller.decisionForm}
              decisionInFlight={controller.decisionInFlight}
              decisionValidationIssue={controller.decisionValidationIssue}
              onAssign={controller.assign}
              onAssignmentFormChange={controller.setAssignmentForm}
              onDecision={async (decision) => {
                const succeeded = await controller.decide(decision);
                if (succeeded) onBackToList?.();
                return succeeded;
              }}
              onDecisionFormChange={controller.setDecisionForm}
              selected={controller.selected}
            />
            <AdminSecondaryDisclosure summary="Policy guidance and action boundary">
              <AdminRoadmapList>
                <ChecklistRow text="Open source evidence before deciding." />
                <ChecklistRow text="Confirm the people, event, club, and channel context." />
                <ChecklistRow text="Only assignment and reviewed/dismissed status are available here." />
              </AdminRoadmapList>
              <QualityList>
                <StateRow label="Read source" value="adminGetSafetyTriageDetails" />
                <StateRow label="Mutations" value="assignment and reviewed/dismissed status with required notes" />
                <StateRow label="Unavailable" value="escalation, restriction, content removal, and durable reviewer timeline" />
              </QualityList>
            </AdminSecondaryDisclosure>
          </>
        ) : (
          <EmptyState
            variant="workbench"
            icon={<Clock3 size={16} strokeWidth={1.9} />}
          >
            {controller.isLoading ?
              "Loading the selected safety case." :
              "This safety case is no longer in the open queue."}
          </EmptyState>
        )}
      </AdminWorkbenchStack>
    );
  }

  return (
    <AdminWorkbenchStack>
      <Panel
        span={2}
        icon={<ShieldAlert size={18} strokeWidth={1.9} />}
        title="Safety triage"
        action={controller.isLoading ? "Loading" :
          `${controller.filteredRows.length} shown of ${controller.rows.length} preview rows`}
      >
        <AdminToolbar>
          <SegmentedControl<SafetyQueueKind>
            ariaLabel="Safety queue scope"
            options={queueOptions}
            value={controller.queueFilter}
            onChange={controller.setQueueFilter}
          />
          <SearchField
            ariaLabel="Search safety queues"
            icon={<Search size={16} strokeWidth={1.8} />}
            onChange={controller.setQuery}
            placeholder="Search loaded preview rows"
            value={controller.query}
          />
          <AdminButton
            disabled={controller.isLoading}
            icon={<RefreshCw size={15} strokeWidth={1.9} />}
            onClick={() => void controller.refresh()}
          >
            Refresh
          </AdminButton>
        </AdminToolbar>
        <AdminWorkbenchNote>
          Capped preview: up to five rows per source queue. Search applies only
          to these {controller.rows.length} loaded rows. Source generated at {formatDateTime(controller.generatedAt)}.
        </AdminWorkbenchNote>
        <SafetyTable
          rows={controller.filteredRows}
          onSelect={controller.select}
        />
      </Panel>
      <AdminMetricGrid ariaLabel="Authoritative open safety totals" columns={3}>
        <AdminMetricCard
          caption="Authoritative open member-report total."
          footer={`${returnedCount(controller.rows, "reports")} preview rows returned`}
          label="User reports"
          value={controller.metrics.reports}
        />
        <AdminMetricCard
          caption="Authoritative pending moderation total."
          footer={`${returnedCount(controller.rows, "moderation")} preview rows returned`}
          label="Moderation"
          value={controller.metrics.moderation}
        />
        <AdminMetricCard
          caption="Authoritative open event-report total."
          footer={`${returnedCount(controller.rows, "event")} preview rows returned`}
          label="Event reports"
          value={controller.metrics.eventReports}
        />
      </AdminMetricGrid>
    </AdminWorkbenchStack>
  );
}

function SafetyActionRail({
  assignmentForm,
  assignmentInFlight,
  assignmentValidationIssue,
  decisionForm,
  decisionInFlight,
  decisionValidationIssue,
  onAssign,
  onAssignmentFormChange,
  onDecision,
  onDecisionFormChange,
  selected,
}: {
  assignmentForm: SafetyAssignmentFormState;
  assignmentInFlight: boolean;
  assignmentValidationIssue: string | null;
  decisionForm: SafetyDecisionFormState;
  decisionInFlight: AdminSafetyTriageDecision | null;
  decisionValidationIssue: string | null;
  onAssign: () => Promise<boolean>;
  onAssignmentFormChange: (value: SafetyAssignmentFormState) => void;
  onDecision: (decision: AdminSafetyTriageDecision) => Promise<boolean>;
  onDecisionFormChange: (value: SafetyDecisionFormState) => void;
  selected: SafetyTriageRow | null;
}) {
  const assignmentDisabled = !selected ||
    Boolean(assignmentValidationIssue) || assignmentInFlight;
  const decisionDisabled =
    !selected || Boolean(decisionValidationIssue) || Boolean(decisionInFlight);
  return (
    <Panel
      icon={<ShieldCheck size={18} strokeWidth={1.9} />}
      title="Assignment and decision"
      action="audited"
      span={2}
    >
      <QualityList>
        <CatchField
          recipe="input"
          title="Assignee UID"
          onChanged={(assigneeUid) =>
            onAssignmentFormChange({...assignmentForm, assigneeUid})
          }
          inputHint="reviewer_uid"
          value={assignmentForm.assigneeUid}
        />
        <CatchField
          recipe="input"
          title="Assignment note"
          onChanged={(note) =>
            onAssignmentFormChange({...assignmentForm, note})
          }
          inputHint="Why this owner should take the next action"
          maxLines={3}
          value={assignmentForm.note}
        />
        <StateRow label="Assignment check" value={assignmentValidationIssue ?? "Ready"} />
        <AdminButton
          disabled={assignmentDisabled}
          onClick={() => void onAssign()}
        >
          {assignmentInFlight ? "Saving assignment" : "Save assignment"}
        </AdminButton>
        <CatchField
          recipe="input"
          title="Review note"
          onChanged={(note) => onDecisionFormChange({note})}
          inputHint="Record the evidence checked and why this status is correct."
          maxLines={4}
          value={decisionForm.note}
        />
        <StateRow label="Decision check" value={decisionValidationIssue ?? "Ready"} />
        <AdminDecisionFooterShell sticky>
          <AdminWorkbenchNote>
            These actions only record reviewed or not-actionable status. They do
            not restrict accounts, remove content, or escalate the case.
          </AdminWorkbenchNote>
          <AdminButton
            disabled={decisionDisabled}
            onClick={() => void onDecision("review")}
            variant="primary"
          >
            {decisionInFlight === "review" ? "Reviewing" : "Mark reviewed"}
          </AdminButton>
          <AdminButton
            disabled={decisionDisabled}
            onClick={() => void onDecision("dismiss")}
          >
            {decisionInFlight === "dismiss" ?
              "Recording" :
              "Dismiss as not actionable"}
          </AdminButton>
        </AdminDecisionFooterShell>
      </QualityList>
    </Panel>
  );
}

function SafetyTable({
  onSelect,
  rows,
}: {
  onSelect: (row: SafetyTriageRow) => void;
  rows: SafetyTriageRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        variant="workbench"
        icon={<ShieldCheck size={16} strokeWidth={1.9} />}
      >
        No safety queue rows match this filter.
      </EmptyState>
    );
  }
  return (
    <DataTable ariaLabel="Safety triage queue" variant="workbench">
      <thead>
        <tr>
          <th>Queue item</th>
          <th>Status</th>
          <th>Created</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <AdminTableRow key={row.id}>
            <td>
              <AdminRowTitle>
                <strong>{displayAdminQueueTitle(row.title)}</strong>
                <span>{row.queueLabel} · {row.detail}</span>
              </AdminRowTitle>
            </td>
            <td>{row.status}</td>
            <td>{relativeTime(row.createdAt)}</td>
            <td>
              <TableActionButton onClick={() => onSelect(row)}>
                Open
              </TableActionButton>
            </td>
          </AdminTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}

function SafetyDetailPanel({
  detail,
  generatedAt,
  isDetailLoading,
  selected,
}: {
  detail: AdminSafetyTriageDetails | null;
  generatedAt: string | null;
  isDetailLoading: boolean;
  selected: SafetyTriageRow | null;
}) {
  return (
    <AdminEditorPanel
      icon={<ShieldAlert size={18} strokeWidth={1.9} />}
      title={selected ? displayAdminQueueTitle(selected.title) : "Safety case"}
      action={detail?.assignment.severity ?? "Loading"}
    >
      {selected ? (
        <QualityList>
          <StateRow label="Queue" value={selected.queueLabel} />
          <StateRow label="Target" value={selected.targetPath} />
          <StateRow label="Status" value={selected.status} />
          <StateRow label="Detail" value={selected.detail} />
          <StateRow
            label="Detail read"
            value={isDetailLoading ? "Loading" : detail ? "Loaded" : "Unavailable"}
          />
          {detail ? (
            <>
              <StateRow label="Summary" value={detail.summary} />
              <StateRow label="Severity" value={detail.assignment.severity} />
              <StateRow label="SLA" value={formatSla(detail)} />
              <StateRow label="SLA policy" value={detail.sla.policy} />
              <StateRow label="Owner team" value={detail.assignment.ownerTeam} />
              <StateRow
                label="Assignee"
                value={detail.assignment.assigneeUid ?? "Unassigned"}
              />
              <StateRow label="Primary user" value={detail.primaryUserId} />
              <StateRow label="Secondary user" value={detail.secondaryUserId} />
              <StateRow label="Event" value={detail.eventId} />
              <StateRow label="Club" value={detail.clubId} />
              <StateRow label="Source" value={detail.source} />
              <StateRow label="Context" value={detail.contextId} />
              <StateRow
                label="Prior history"
                value={<PriorHistoryList detail={detail} />}
              />
              <StateRow
                label="Outcome guidance"
                value={<OutcomeGuidanceList detail={detail} />}
              />
              {detail.evidence.map((item) => (
                <StateRow
                  key={`${item.label}-${item.value}`}
                  label={`Evidence: ${item.label}`}
                  value={formatEvidence(item)}
                />
              ))}
              {detail.fields.map((field) => (
                <StateRow
                  key={`${field.label}-${field.value}`}
                  label={field.label}
                  value={field.value}
                />
              ))}
            </>
          ) : null}
          <StateRow label="Created" value={formatDateTime(selected.createdAt)} />
          <StateRow label="Record updated at" value={formatDateTime(detail?.updatedAt ?? null)} />
          <StateRow label="Source generated at" value={formatDateTime(generatedAt)} />
          {detail?.nextActions.length ? (
            <AdminRoadmapList>
              {detail.nextActions.map((action) => (
                <ChecklistRow key={action} text={action} />
              ))}
            </AdminRoadmapList>
          ) : null}
        </QualityList>
      ) : (
        <EmptyState
          variant="workbench"
          icon={<Clock3 size={16} strokeWidth={1.9} />}
        >
          Select a safety queue row to inspect.
        </EmptyState>
      )}
    </AdminEditorPanel>
  );
}

function PriorHistoryList({detail}: {detail: AdminSafetyTriageDetails}) {
  if (detail.priorHistory.length === 0) {
    return "No related safety history found";
  }
  return (
    <AdminTagRow as="span">
      {detail.priorHistory.map((signal) => (
        <CatchBadge key={signal.id} label={`${signal.label}: ${signal.count}`} />
      ))}
    </AdminTagRow>
  );
}

function OutcomeGuidanceList({detail}: {detail: AdminSafetyTriageDetails}) {
  if (detail.outcomeGuidance.length === 0) return "No guidance available";
  return (
    <AdminRoadmapList>
      {detail.outcomeGuidance.map((item) => (
        <AdminRoadmapListItem key={item.id}>
          <ShieldCheck size={15} strokeWidth={1.9} />
          <span>
            <strong>{item.label}</strong> · {formatGuidanceStatus(item.actionStatus)}
            <br />
            {item.detail}
          </span>
        </AdminRoadmapListItem>
      ))}
    </AdminRoadmapList>
  );
}

function ChecklistRow({text}: {text: string}) {
  return (
    <AdminRoadmapListItem>
      <ShieldCheck size={15} strokeWidth={1.9} />
      <span>{text}</span>
    </AdminRoadmapListItem>
  );
}

function formatSla(detail: AdminSafetyTriageDetails): string {
  const dueAt = detail.sla.dueAt ?
    ` by ${formatDateTime(detail.sla.dueAt)}` :
    "";
  return `${detail.sla.state}${dueAt}`;
}

function formatEvidence(
  item: AdminSafetyTriageDetails["evidence"][number]
): string {
  const source = item.sourcePath ? ` (${item.sourcePath})` : "";
  const sensitivity = item.sensitive ? " sensitive preview" : "";
  return `${item.value}${source}${sensitivity}`;
}

function formatGuidanceStatus(
  status: AdminSafetyTriageDetails["outcomeGuidance"][number]["actionStatus"]
): string {
  if (status === "needs_contract") return "needs contract";
  return status;
}

function returnedCount(
  rows: SafetyTriageRow[],
  queueKind: SafetyTriageRow["queueKind"]
): number {
  return rows.filter((row) => row.queueKind === queueKind).length;
}

function relativeTime(value: string | null): string {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.round(diffMs / 3600000);
  if (Math.abs(diffHours) < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
