import {CatchBadge, CatchField} from "@catch/web-ui";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileWarning,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type {
  AccessApplicationDecision,
  AdminAccessApplicationDetails,
  AdminQueueItem,
} from "../../../shared/types/adminTypes";
import {
  AdminButton,
  AdminDecisionFooterShell,
  AdminDetailScreenStack,
  AdminDirectoryScreenStack,
  AdminEditorPanel,
  AdminEditorSection,
  AdminFieldGrid,
  AdminForm,
  AdminMetricCard,
  AdminMetricGrid,
  AdminMutedCell,
  AdminRoadmapList,
  AdminRoadmapListItem,
  AdminTableRow,
  AdminToolbar,
  AdminWorkbenchNote,
  DataTable,
  EmptyState,
  Panel,
  PageHeader,
  QualityList,
  SearchField,
  StateRow,
  TableActionButton,
  AdminRowTitle,
  AdminTagRow,
} from "../../../shared/ui/AdminPrimitives";
import {
  applicationUidFromTargetPath,
  type AccessReviewFormState,
  type AccessReviewController,
  useAccessReviewController,
} from "../controllers/useAccessReviewController";

export function AccessReviewScreen({
  onBackToList,
  onError,
  onNotice,
  onSelectApplicationUid,
  selectedApplicationUid,
}: {
  onBackToList: () => void;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onSelectApplicationUid: (applicationUid: string) => void;
  selectedApplicationUid: string | null;
}) {
  const controller = useAccessReviewController({
    onError,
    onNotice,
    onSelectedApplicationUidChange: (applicationUid) => {
      if (applicationUid) {
        onSelectApplicationUid(applicationUid);
      } else {
        onBackToList();
      }
    },
    selectedApplicationUid,
  });
  return (
    <AccessReviewWorkspace
      controller={controller}
      onBackToList={onBackToList}
    />
  );
}

export function AccessReviewWorkspace({
  controller,
  onBackToList = () => undefined,
}: {
  controller: AccessReviewController;
  onBackToList?: () => void;
}) {
  if (controller.selectedApplicationUid) {
    return (
      <AdminDetailScreenStack>
        <AdminButton
          icon={<ArrowLeft size={15} strokeWidth={1.9} />}
          onClick={onBackToList}
        >
          All launch access
        </AdminButton>
        <PageHeader
          actions={controller.selected ? (
            <CatchBadge label={controller.selected.status} />
          ) : null}
          title={controller.selected?.title ?? controller.selectedApplicationUid}
        />
        {controller.selectedUnavailable ? (
          <Panel
            icon={<FileWarning size={18} strokeWidth={1.9} />}
            title="Application unavailable"
            action="Retry available"
          >
            <EmptyState
              variant="workbench"
              icon={<FileWarning size={16} strokeWidth={1.9} />}
            >
              {controller.detailError ??
                "This application was not returned by the direct detail read."}
            </EmptyState>
            <AdminButton
              disabled={controller.isDetailLoading}
              icon={<RefreshCw size={15} strokeWidth={1.9} />}
              onClick={() => void controller.refreshDetail()}
            >
              Retry application read
            </AdminButton>
          </Panel>
        ) : (
          <>
            <AccessApplicantDetailPanel
              details={controller.selectedDetails}
              isLoading={controller.isDetailLoading}
              selected={controller.selected}
            />
            {controller.isDetailLoading ? null : (
              <AccessDecisionPanel
                decisionInFlight={controller.decisionInFlight}
                form={controller.form}
                selected={controller.selected}
                validationIssue={controller.validationIssue}
                onDecide={(decision) => void controller.decide(decision)}
                onFormChange={controller.setForm}
              />
            )}
          </>
        )}
      </AdminDetailScreenStack>
    );
  }

  return (
    <AdminDirectoryScreenStack>
      <AdminMetricGrid ariaLabel="Launch access queue scope" columns="auto">
        <AdminMetricCard label="Pending total" value={controller.pendingTotal} />
        <AdminMetricCard
          caption="Search and filters apply only to the returned preview."
          label="Preview rows"
          value={controller.rows.length}
        />
      </AdminMetricGrid>
      <Panel
        span={2}
        icon={<UserCheck size={18} strokeWidth={1.9} />}
        title="Pending applications"
        action={controller.isLoading ? "Loading" : `${controller.filteredRows.length} shown`}
      >
        <AdminToolbar>
          <SearchField
            ariaLabel="Search access applications"
            icon={<Search size={16} strokeWidth={1.8} />}
            onChange={controller.setQuery}
            placeholder="Search applicant, city, role, uid, source"
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
        <AccessTable
          rows={controller.filteredRows}
          onSelect={controller.select}
        />
        <AdminWorkbenchNote>
          Showing {controller.rows.length} of {controller.pendingTotal} pending
          applications. Source generated at {formatDateTime(controller.generatedAt)}.
        </AdminWorkbenchNote>
      </Panel>
    </AdminDirectoryScreenStack>
  );
}

function AccessTable({
  onSelect,
  rows,
}: {
  onSelect: (row: AdminQueueItem) => void;
  rows: AdminQueueItem[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        variant="workbench"
        icon={<CheckCircle2 size={16} strokeWidth={1.9} />}
      >
        No pending access applications match this filter.
      </EmptyState>
    );
  }
  return (
    <DataTable ariaLabel="Access applications" variant="workbench">
      <thead>
        <tr>
          <th>Applicant</th>
          <th>Signal</th>
          <th>Status</th>
          <th>Created</th>
          <th>Select</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <AdminTableRow key={row.id}>
            <td>
              <AdminRowTitle>
                <strong>{row.title}</strong>
                <span>{applicationUidFromTargetPath(row.targetPath) ?? row.id}</span>
              </AdminRowTitle>
            </td>
            <td>{row.detail}</td>
            <td><CatchBadge label={row.status} /></td>
            <td>{formatDateTime(row.createdAt)}</td>
            <td>
              <TableActionButton onClick={() => onSelect(row)}>
                Review
              </TableActionButton>
            </td>
          </AdminTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}

function AccessApplicantDetailPanel({
  details,
  isLoading,
  selected,
}: {
  details: AdminAccessApplicationDetails | null;
  isLoading: boolean;
  selected: AdminQueueItem | null;
}) {
  return (
    <Panel
      icon={<UserCheck size={18} strokeWidth={1.9} />}
      title="Applicant detail"
      action={isLoading ? "Loading" : details?.status ?? "No application"}
    >
      {details ? (
        <QualityList>
          <StateRow label="Why Catch" value={details.whyCatch} />
          <StateRow
            label="Event interests"
            value={<TagList values={details.eventTypes} />}
          />
          <StateRow
            label="Availability"
            value={<TagList values={details.availabilityWindows} />}
          />
          <StateRow label="City" value={details.city} />
          <StateRow label="Role" value={details.role} />
          <StateRow
            label="Wants to host"
            value={details.wantsToHost ? "yes" : "no"}
          />
          <StateRow label="Invite code" value={details.inviteCode} />
          <StateRow label="Instagram" value={details.instagramHandle} />
          <StateRow label="Referral" value={details.referralSource} />
          <StateRow label="Submissions" value={String(details.submissionCount)} />
          <StateRow label="Submitted" value={formatDateTime(details.submittedAt)} />
          <StateRow label="Record updated" value={formatDateTime(details.updatedAt)} />
          <StateRow label="Source record" value={details.targetPath} />
          <DuplicateSignals signals={details.duplicateSignals} />
        </QualityList>
      ) : (
        <EmptyState
          variant="workbench"
          icon={<Clock3 size={16} strokeWidth={1.9} />}
        >
          {isLoading ?
            "Loading applicant detail." : selected ?
            "Loading applicant detail." :
            "Select an access application to inspect source detail."}
        </EmptyState>
      )}
    </Panel>
  );
}

function TagList({values}: {values: string[]}) {
  if (values.length === 0) return "none";
  return (
    <AdminTagRow as="span">
      {values.map((value) => (
        <CatchBadge key={value} label={formatLabel(value)} />
      ))}
    </AdminTagRow>
  );
}

function DuplicateSignals({
  signals,
}: {
  signals: AdminAccessApplicationDetails["duplicateSignals"];
}) {
  if (signals.length === 0) {
    return (
      <AdminRoadmapListItem>
        <CheckCircle2 size={15} strokeWidth={1.9} />
        <span>No deterministic overlap signals found.</span>
      </AdminRoadmapListItem>
    );
  }
  return (
    <AdminRoadmapList>
      {signals.map((signal) => (
        <AdminRoadmapListItem key={signal.id}>
          <FileWarning size={15} strokeWidth={1.9} />
          <span>
            <strong>{signal.label}</strong> · {signal.count} overlaps ·{" "}
            {signal.value}
            {signal.sampleTargetPaths.length > 0 ? (
              <AdminMutedCell>
                {" "}({signal.sampleTargetPaths.join(", ")})
              </AdminMutedCell>
            ) : null}
          </span>
        </AdminRoadmapListItem>
      ))}
    </AdminRoadmapList>
  );
}

function AccessDecisionPanel({
  decisionInFlight,
  form,
  onDecide,
  onFormChange,
  selected,
  validationIssue,
}: {
  decisionInFlight: AccessApplicationDecision | null;
  form: AccessReviewFormState;
  onDecide: (decision: AccessApplicationDecision) => void;
  onFormChange: (form: AccessReviewFormState) => void;
  selected: AdminQueueItem | null;
  validationIssue: string | null;
}) {
  const isDeciding = decisionInFlight !== null;
  const isDecisionDisabled = isDeciding || Boolean(validationIssue);
  return (
    <AdminEditorPanel
      icon={<ShieldCheck size={18} strokeWidth={1.9} />}
      title="Decision"
      action={selected?.status ?? "No application"}
    >
      {selected ? (
        <AdminForm variant="publishing" onSubmit={(event) => {
          event.preventDefault();
        }}>
          <AdminEditorSection>
            <legend>Decision inputs</legend>
            <AdminFieldGrid columns={1}>
              <CatchField
                recipe="input"
                title="Cohort ID (optional)"
                onChanged={(cohortId) => onFormChange({...form, cohortId})}
                inputHint="indore-founders"
                value={form.cohortId}
              />
              <CatchField
                recipe="input"
                title="Review note"
                onChanged={(note) => onFormChange({...form, note})}
                maxLines={5}
                value={form.note}
              />
            </AdminFieldGrid>
            {validationIssue ? (
              <AdminRoadmapListItem>
                <FileWarning size={15} strokeWidth={1.9} />
                <span>{validationIssue}</span>
              </AdminRoadmapListItem>
            ) : null}
          </AdminEditorSection>
          <AdminDecisionFooterShell sticky>
            <AdminWorkbenchNote>
              This records an audited access decision. It does not invite or
              notify the applicant.
            </AdminWorkbenchNote>
            <AdminTagRow>
              <AdminButton
                disabled={isDecisionDisabled}
                icon={<CheckCircle2 size={15} strokeWidth={1.9} />}
                onClick={() => onDecide("approve")}
                variant="primary"
              >
                {decisionInFlight === "approve" ?
                  "Approving for profile" :
                  "Approve for profile"}
              </AdminButton>
              <AdminButton
                disabled={isDecisionDisabled}
                icon={<FileWarning size={15} strokeWidth={1.9} />}
                onClick={() => onDecide("deny")}
              >
                {decisionInFlight === "deny" ?
                  "Recording decision" :
                  "Not selected yet"}
              </AdminButton>
            </AdminTagRow>
          </AdminDecisionFooterShell>
        </AdminForm>
      ) : (
        <EmptyState
          variant="workbench"
          icon={<Clock3 size={16} strokeWidth={1.9} />}
        >
          Select an access application to review.
        </EmptyState>
      )}
    </AdminEditorPanel>
  );
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

function formatLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
