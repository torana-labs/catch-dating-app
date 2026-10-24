import {CatchText, CatchField} from "@catch/web-ui";
import {useEffect, useMemo, useState} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileWarning,
  FolderSearch,
  Lock,
  Search,
  Settings2,
} from "lucide-react";
import type {
  ExternalEventImportAction,
  ExternalEventImportExecutionAction,
  ExternalEventImportExecutionPlan,
  ExternalEventImportPlan,
} from "../../../shared/types/adminTypes";
import {
  AdminButton,
  AdminDecisionFooterShell,
  AdminLinkButton,
  AdminSecondaryDisclosure,
  AdminTableRow,
  AdminTag,
  AdminToolbar,
  AdminWorkbenchNote,
  CheckboxField,
  DataTable,
  EmptyState,
  Panel,
  QualityList,
  QualityRow,
  SearchField,
  SegmentedControl,
  StateRow,
  StatusChip,
  TableActionButton,
  AdminCommandRow,
  AdminCommandStack,
  AdminEyebrow,
  AdminTagList,
  AdminIntakeSection,
  AdminIntakeSectionTitle,
  AdminIntakeSourceList,
  AdminSearchCandidateHeader,
  AdminSearchCandidatePanel,
  AdminIntakeStateGrid,
  AdminMutedCell,
  AdminRowTitle,
  AdminTagRow,
} from "../../../shared/ui/AdminPrimitives";
import {type ExternalEventPublishRequest} from "../controllers/useEventPublishingController";
import {type ExternalEventImportReview} from "../controllers/eventPublishingHelpers";
import {eventPublishingEditorPanels} from "./eventPublishingEditorPanels";

type EventImportReadinessFilter =
  | "needsAction"
  | "writeReady"
  | "blocked"
  | "waitingReview"
  | "rejected"
  | "all";

interface EventImportReadinessRow {
  key: string;
  title: string;
  platform: string;
  status: ExternalEventImportAction["status"];
  executionStatus: ExternalEventImportExecutionAction["status"] | null;
  targetPath: string;
  candidateId: string;
  sourceEventKey: string;
  canonicalHostId: string;
  startTime: string | null;
  outboundLinkCount: number;
  primaryExternalUrl: string | null;
  blockers: string[];
  validationErrorCount: number;
  sourceActionId: string;
  publishReady: boolean;
}

function EventSupplyReadinessPanel({
  executionPlan,
  generatedAt,
  importPlan,
  isLoading,
  onPublishExternalEvent,
  onSelectSourceActionId,
  publishingExternalActionId,
  selectedSourceActionId,
  source,
}: {
  executionPlan: ExternalEventImportExecutionPlan | null;
  generatedAt: string | null;
  importPlan: ExternalEventImportPlan | null;
  isLoading: boolean;
  onPublishExternalEvent: (
    request: ExternalEventPublishRequest
  ) => Promise<boolean>;
  onSelectSourceActionId: (sourceActionId: string | null) => void;
  publishingExternalActionId: string | null;
  selectedSourceActionId: string | null;
  source: string | null;
}) {
  const [actionFilter, setActionFilter] =
    useState<EventImportReadinessFilter>("needsAction");
  const [actionQuery, setActionQuery] = useState("");
  const actionRows = useMemo(
    () => buildImportReadinessRows(importPlan, executionPlan),
    [executionPlan, importPlan]
  );
  const filteredActionRows = useMemo(
    () => filterImportReadinessRows(actionRows, actionFilter, actionQuery),
    [actionFilter, actionQuery, actionRows]
  );
  const visibleActionRows = filteredActionRows.slice(0, 50);
  const selectedRow = actionRows.find((row) =>
    row.sourceActionId === selectedSourceActionId) ?? null;
  const actionLabel = isLoading ? "Loading" : importPlan?.policy.status ?? "No plan";

  return (
    <Panel
      span={2}
      icon={<Settings2 size={18} strokeWidth={1.9} />}
      title="External import readiness"
      action={actionLabel}
    >
      {importPlan && executionPlan ? (
        <AdminSearchCandidatePanel>
          <AdminIntakeStateGrid>
            <StateRow label="Candidates" value={String(importPlan.summary.candidates)} />
            <StateRow label="Source" value={source ?? "unknown"} />
            <StateRow label="Generated" value={eventPublishingEditorPanels.formatDateTime(generatedAt)} />
            <StateRow
              label="Read-only drafts"
              value={String(
                importPlan.summary.proposedReadOnlyEvents ??
                  importPlan.summary.proposedCreates
              )}
            />
            <StateRow
              label="Merged links"
              value={String(importPlan.summary.mergedSourceLinks ?? 0)}
            />
            <StateRow label="Write-ready" value={String(importPlan.summary.writeReady)} />
            <StateRow label="Waiting review" value={String(importPlan.summary.waitingReview)} />
            <StateRow label="Blocked" value={String(importPlan.summary.blocked)} />
            <StateRow
              label="Preflight valid"
              value={String(
                executionPlan.summary.projectionValid ??
                  executionPlan.summary.payloadValid
              )}
            />
            <StateRow
              label="Preflight errors"
              value={String(
                executionPlan.summary.projectionInvalidCount ??
                  executionPlan.summary.payloadInvalid
              )}
            />
          </AdminIntakeStateGrid>

          <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
            <strong>
              {importPlan.policy.writeEnabled ?
                "Import writes enabled" :
                "Import writes disabled"}
            </strong>
            <span>{importPlan.policy.reason}</span>
            <span>
              Preflight: {executionPlan.policy.authorityModel} /{" "}
              {executionPlan.policy.reason}
            </span>
          </QualityRow>

          {selectedSourceActionId ? (
            <EventReadinessDetail
              executionPlan={executionPlan}
              importPlan={importPlan}
              onBack={() => onSelectSourceActionId(null)}
              onPublishExternalEvent={onPublishExternalEvent}
              publishingExternalActionId={publishingExternalActionId}
              row={selectedRow}
            />
          ) : (
            <>
              <AdminIntakeSection>
                <AdminIntakeSectionTitle>Readiness queue</AdminIntakeSectionTitle>
                <AdminToolbar>
                  <SegmentedControl<EventImportReadinessFilter>
                    ariaLabel="External import action filters"
                    options={[
                      {id: "needsAction", label: "Needs action"},
                      {id: "writeReady", label: "Write-ready"},
                      {id: "blocked", label: "Blocked"},
                      {id: "waitingReview", label: "Waiting"},
                      {id: "rejected", label: "Rejected"},
                      {id: "all", label: "All"},
                    ]}
                    value={actionFilter}
                    onChange={setActionFilter}
                  />
                  <SearchField
                    ariaLabel="Search import actions"
                    icon={<Search size={16} strokeWidth={1.8} />}
                    onChange={setActionQuery}
                    placeholder="Search loaded actions"
                    value={actionQuery}
                  />
                </AdminToolbar>
                <StateRow
                  label="Capped preview"
                  value={`${visibleActionRows.length} shown of ${filteredActionRows.length} matching actions`}
                />
                <EventImportReadinessTable
                  rows={visibleActionRows}
                  selectedSourceActionId={selectedSourceActionId}
                  onSelect={onSelectSourceActionId}
                />
              </AdminIntakeSection>

              <AdminSecondaryDisclosure summary="Diagnostics and operator commands">
                <AdminTagList>
                  {importPlan.guardrails.slice(0, 10).map((guardrail) => (
                    <AdminTag key={guardrail} tone="muted">
                      {guardrail.replaceAll("_", " ")}
                    </AdminTag>
                  ))}
                </AdminTagList>
                <AdminCommandStack>
                  {Object.entries({
                    ...importPlan.commands,
                    preflight: executionPlan.commands.preflight,
                  }).map(([label, command]) => (
                    <AdminCommandRow key={`${label}:${command}`}>
                      <span>{label}</span>
                      <code>{command}</code>
                    </AdminCommandRow>
                  ))}
                </AdminCommandStack>
                <AdminIntakeSourceList>
                  <StateRow
                    label="Candidate queue"
                    value={importPlan.generatedFrom.externalEventCandidateQueue}
                  />
                  <StateRow
                    label="Import plan"
                    value={executionPlan.generatedFrom.externalEventImportPlan}
                  />
                </AdminIntakeSourceList>
              </AdminSecondaryDisclosure>
            </>
          )}
        </AdminSearchCandidatePanel>
      ) : (
        <EmptyState
          variant="workbench"
          icon={<FolderSearch size={16} strokeWidth={1.9} />}
        >
          No external import readiness snapshot is available.
        </EmptyState>
      )}
    </Panel>
  );
}

function EventReadinessDetail({
  executionPlan,
  importPlan,
  onBack,
  onPublishExternalEvent,
  publishingExternalActionId,
  row,
}: {
  executionPlan: ExternalEventImportExecutionPlan;
  importPlan: ExternalEventImportPlan;
  onBack: () => void;
  onPublishExternalEvent: (
    request: ExternalEventPublishRequest
  ) => Promise<boolean>;
  publishingExternalActionId: string | null;
  row: EventImportReadinessRow | null;
}) {
  const [publishReviewNote, setPublishReviewNote] = useState("");
  const [publishChecklist, setPublishChecklist] = useState(
    initialExternalPublishChecklist
  );

  useEffect(() => {
    setPublishReviewNote("");
    setPublishChecklist(initialExternalPublishChecklist());
  }, [row?.sourceActionId]);

  if (!row) {
    return (
      <AdminIntakeSection>
        <AdminButton
          icon={<ArrowLeft size={15} strokeWidth={1.9} />}
          onClick={onBack}
        >
          Readiness queue
        </AdminButton>
        <EmptyState variant="workbench" icon={<FileWarning size={16} strokeWidth={1.9} />}>
          This action is not present in the current readiness snapshot.
        </EmptyState>
      </AdminIntakeSection>
    );
  }

  const checklistComplete = Object.values(publishChecklist).every(Boolean);
  const formDisabledReason = !publishReviewNote.trim() ?
    "Add a review note before publishing." :
    !checklistComplete ?
      "Complete every publication check before publishing." :
      undefined;
  const disabledReason = importPublishDisabledReason(
    row,
    formDisabledReason,
    publishingExternalActionId
  );
  const executionAction = executionPlan.actions.find((action) =>
    action.sourceActionId === row.sourceActionId) ?? null;
  const importAction = importPlan.actions.find((action) =>
    action.actionId === row.sourceActionId) ?? null;

  return (
    <AdminIntakeSection>
      <AdminButton
        icon={<ArrowLeft size={15} strokeWidth={1.9} />}
        onClick={onBack}
      >
        Readiness queue
      </AdminButton>
      <AdminSearchCandidateHeader>
        <div>
          <AdminEyebrow>{row.targetPath}</AdminEyebrow>
          <CatchText as="h3" variant="sectionTitle">{row.title}</CatchText>
        </div>
        <StatusChip tone={row.publishReady ? "ready" : ""}>
          {row.publishReady ? "ready" : "blocked"}
        </StatusChip>
      </AdminSearchCandidateHeader>
      <AdminIntakeStateGrid>
        <StateRow label="Source action" value={row.sourceActionId} />
        <StateRow label="Candidate" value={row.candidateId} />
        <StateRow label="Organizer" value={row.canonicalHostId} />
        <StateRow label="Starts" value={eventPublishingEditorPanels.formatDateTime(row.startTime)} />
        <StateRow label="Import status" value={row.status.replaceAll("_", " ")} />
        <StateRow
          label="Preflight"
          value={row.executionStatus?.replaceAll("_", " ") ?? "not available"}
        />
        <StateRow label="Validation errors" value={String(row.validationErrorCount)} />
        <StateRow label="Outbound links" value={String(row.outboundLinkCount)} />
      </AdminIntakeStateGrid>
      {row.primaryExternalUrl ? (
        <AdminLinkButton
          href={row.primaryExternalUrl}
          icon={<ExternalLink size={15} strokeWidth={1.9} />}
          label={`Open source for ${row.title}`}
          rel="noreferrer"
          target="_blank"
        >
          Open source evidence
        </AdminLinkButton>
      ) : null}
      {row.blockers.length > 0 ? (
        <QualityList>
          {row.blockers.map((blocker) => (
            <QualityRow key={blocker} tone="blocked" icon={<Lock size={15} strokeWidth={1.9} />}>
              <strong>{blocker.replaceAll("_", " ")}</strong>
              <span>Resolve this backed blocker before publication.</span>
            </QualityRow>
          ))}
        </QualityList>
      ) : null}
      {executionAction?.payloadValidation.errors.map((error) => (
        <QualityRow key={`${error.path}:${error.keyword}`} tone="blocked" icon={<FileWarning size={15} strokeWidth={1.9} />}>
          <strong>{error.path || "payload"}</strong>
          <span>{error.message}</span>
        </QualityRow>
      ))}
      <CatchField
        recipe="input"
        title="External publish review note"
        onChanged={setPublishReviewNote}
        inputHint="Why this event can be published as read-only external supply"
        maxLines={3}
        value={publishReviewNote}
      />
      <QualityList>
        <CheckboxField
          checked={publishChecklist.preflightActionReviewed}
          label="This action matches the latest preflight snapshot"
          onChange={(checked) => setPublishChecklist((current) => ({
            ...current,
            preflightActionReviewed: checked,
          }))}
        />
        <CheckboxField
          checked={publishChecklist.outboundLinksReviewed}
          label="Outbound event and source links were reviewed"
          onChange={(checked) => setPublishChecklist((current) => ({
            ...current,
            outboundLinksReviewed: checked,
          }))}
        />
        <CheckboxField
          checked={publishChecklist.noCatchBookingPaymentsWaitlist}
          label="No Catch booking, payments, reservations, or waitlist"
          onChange={(checked) => setPublishChecklist((current) => ({
            ...current,
            noCatchBookingPaymentsWaitlist: checked,
          }))}
        />
        <CheckboxField
          checked={publishChecklist.ownerSafeCopyReviewed}
          label="Owner-safe copy and attribution were reviewed"
          onChange={(checked) => setPublishChecklist((current) => ({
            ...current,
            ownerSafeCopyReviewed: checked,
          }))}
        />
      </QualityList>
      <QualityRow
        tone={disabledReason ? "warning" : "success"}
        icon={disabledReason ?
          <FileWarning size={15} strokeWidth={1.9} /> :
          <CheckCircle2 size={15} strokeWidth={1.9} />}
      >
        <strong>{disabledReason ? "Publish unavailable" : "Ready to publish"}</strong>
        <span>{disabledReason ?? "All backed preflight and operator checks are complete."}</span>
      </QualityRow>
      <AdminDecisionFooterShell sticky>
        <AdminWorkbenchNote>
          Publishes one read-only external record. Catch booking, payments, and waitlist stay unavailable.
        </AdminWorkbenchNote>
        <AdminButton
          disabled={Boolean(disabledReason)}
          icon={<CheckCircle2 size={15} strokeWidth={1.9} />}
          onClick={async () => {
            const published = await onPublishExternalEvent({
              sourceActionId: row.sourceActionId,
              targetPath: row.targetPath,
              reviewNote: publishReviewNote,
              checklist: publishChecklist,
            });
            if (published) onBack();
          }}
          title={disabledReason}
          variant="primary"
        >
          {publishingExternalActionId === row.sourceActionId ?
            "Publishing" :
            "Publish external event"}
        </AdminButton>
      </AdminDecisionFooterShell>
      <AdminSecondaryDisclosure summary="Source payload and diagnostics">
        <AdminIntakeSourceList>
          <StateRow label="Source event key" value={row.sourceEventKey} />
          <StateRow label="Import action" value={importAction?.action} />
          <StateRow label="Preflight callable" value={executionAction?.targetCallable} />
        </AdminIntakeSourceList>
      </AdminSecondaryDisclosure>
    </AdminIntakeSection>
  );
}

function initialExternalPublishChecklist() {
  return {
    preflightActionReviewed: false,
    outboundLinksReviewed: false,
    noCatchBookingPaymentsWaitlist: false,
    ownerSafeCopyReviewed: false,
  };
}

function EventImportReadinessTable({
  onSelect,
  rows,
  selectedSourceActionId,
}: {
  onSelect: (sourceActionId: string) => void;
  rows: EventImportReadinessRow[];
  selectedSourceActionId: string | null;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        variant="workbench"
        icon={<CheckCircle2 size={16} strokeWidth={1.9} />}
      >
        No import actions match this readiness filter.
      </EmptyState>
    );
  }

  return (
    <DataTable ariaLabel="Event import readiness" variant="workbench">
      <thead>
        <tr>
          <th>Candidate</th>
          <th>Organizer / time</th>
          <th>Status</th>
          <th>Preflight</th>
          <th>Evidence</th>
          <th>Source</th>
          <th>Review</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
            <AdminTableRow
              key={row.key}
              selected={row.sourceActionId === selectedSourceActionId}
            >
              <td>
                <AdminRowTitle>
                  <strong>{row.title}</strong>
                  <span>{row.targetPath}</span>
                </AdminRowTitle>
              </td>
              <td>
                <AdminRowTitle compact>
                  <span>{row.canonicalHostId}</span>
                  <span>{eventPublishingEditorPanels.formatDateTime(row.startTime)}</span>
                </AdminRowTitle>
              </td>
              <td>
                <AdminTagRow>
                  <AdminTag tone={row.status === "write_ready" ? "muted" : "neutral"}>
                    {row.status.replaceAll("_", " ")}
                  </AdminTag>
                  <AdminTag tone="muted">{row.platform}</AdminTag>
                </AdminTagRow>
              </td>
              <td>
                <AdminRowTitle compact>
                  <span>{row.executionStatus?.replaceAll("_", " ") ?? "not preflighted"}</span>
                  <span>
                    {row.validationErrorCount} validation error
                    {row.validationErrorCount === 1 ? "" : "s"}
                  </span>
                </AdminRowTitle>
              </td>
              <td>
                <AdminRowTitle compact>
                  <span>{row.candidateId}</span>
                  <span>
                    {row.blockers.length} blocker
                    {row.blockers.length === 1 ? "" : "s"} ·{" "}
                    {row.outboundLinkCount} link
                    {row.outboundLinkCount === 1 ? "" : "s"}
                  </span>
                </AdminRowTitle>
              </td>
              <td>
                {row.primaryExternalUrl ? (
                  <AdminLinkButton
                    href={row.primaryExternalUrl}
                    icon={<ExternalLink size={15} strokeWidth={1.9} />}
                    label={`Open source for ${row.title}`}
                    rel="noreferrer"
                    target="_blank"
                    variant="icon"
                  />
                ) : (
                  <AdminMutedCell>none</AdminMutedCell>
                )}
              </td>
              <td>
                <TableActionButton
                  onClick={() => onSelect(row.sourceActionId)}
                >
                  Review
                </TableActionButton>
              </td>
            </AdminTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}

function importPublishDisabledReason(
  row: EventImportReadinessRow,
  publishDisabledReason: string | undefined,
  publishingExternalActionId: string | null
): string | undefined {
  if (publishingExternalActionId) {
    return publishingExternalActionId === row.sourceActionId ?
      "External event publish is already in progress." :
      "Wait for the current external event publish to finish.";
  }
  if (!row.publishReady) {
    if (row.blockers.length > 0) {
      return `Resolve ${row.blockers.length} import blocker${
        row.blockers.length === 1 ? "" : "s"
      } before publishing.`;
    }
    if (row.validationErrorCount > 0) {
      return `Resolve ${row.validationErrorCount} preflight validation error${
        row.validationErrorCount === 1 ? "" : "s"
      } before publishing.`;
    }
    if (row.status !== "write_ready") {
      return `Import action is ${row.status.replaceAll("_", " ")}.`;
    }
    if (row.executionStatus !== "would_publish_read_only") {
      return `Preflight is ${
        row.executionStatus?.replaceAll("_", " ") ?? "not available"
      }.`;
    }
    return "Regenerate event supply readiness before publishing.";
  }
  return publishDisabledReason;
}

function buildImportReadinessRows(
  importPlan: ExternalEventImportPlan | null,
  executionPlan: ExternalEventImportExecutionPlan | null
): EventImportReadinessRow[] {
  const publishPolicyEnabled =
    importPlan?.policy.writeEnabled === true &&
    executionPlan?.policy.writeEnabled === true &&
    executionPlan.policy.authorityModel === "admin_import_service";
  const executionBySourceActionId = new Map(
    (executionPlan?.actions ?? []).map((action) => [
      action.sourceActionId,
      action,
    ])
  );
  return (importPlan?.actions ?? []).map((action) => {
    const executionAction =
      executionBySourceActionId.get(action.actionId) ?? null;
    const draft = action.proposedReadOnlyEventDraft;
    const primaryLink =
      draft.booking.externalLinks.find((link) => link.primary) ??
      draft.booking.externalLinks[0] ??
      null;
    const blockers = uniqueStrings([
      ...action.blockers,
      ...(executionAction?.blockers ?? []),
      ...(publishPolicyEnabled ? [] : ["external_event_import_policy_disabled"]),
    ]);
    const validationErrorCount =
      (executionAction?.projectionValidation?.errors.length ?? 0) +
      (executionAction?.payloadValidation.errors.length ?? 0);
    const executionStatus = executionAction?.status ?? null;
    return {
      key: action.actionId,
      title: draft.title || draft.eventId,
      platform: action.platform,
      status: action.status,
      executionStatus,
      targetPath: action.targetPath,
      candidateId: action.candidateId,
      sourceEventKey: action.sourceEventKey,
      canonicalHostId: draft.canonicalHostId,
      startTime: draft.startTime,
      outboundLinkCount: draft.booking.externalLinks.length,
      primaryExternalUrl: primaryLink?.url ?? null,
      blockers,
      validationErrorCount,
      sourceActionId: action.actionId,
      publishReady:
        action.status === "write_ready" &&
        executionStatus === "would_publish_read_only" &&
        publishPolicyEnabled &&
        blockers.length === 0 &&
        validationErrorCount === 0 &&
        executionAction?.projectionValidation?.valid === true &&
        executionAction?.payloadValidation.valid === true,
    };
  });
}

function filterImportReadinessRows(
  rows: EventImportReadinessRow[],
  filter: EventImportReadinessFilter,
  query: string
): EventImportReadinessRow[] {
  const tokens = query.toLowerCase().trim().split(/\s+/u).filter(Boolean);
  return rows.filter((row) => {
    if (!importReadinessRowMatchesFilter(row, filter)) return false;
    if (tokens.length === 0) return true;
    const haystack = [
      row.title,
      row.platform,
      row.status,
      row.executionStatus,
      row.targetPath,
      row.candidateId,
      row.sourceEventKey,
      row.canonicalHostId,
      row.startTime,
      row.primaryExternalUrl,
      ...row.blockers,
    ]
      .filter((item): item is string => typeof item === "string")
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

function importReadinessRowMatchesFilter(
  row: EventImportReadinessRow,
  filter: EventImportReadinessFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "writeReady") {
    return row.status === "write_ready" ||
      row.executionStatus === "would_publish_read_only";
  }
  if (filter === "blocked") {
    return row.status === "blocked" ||
      row.executionStatus === "blocked" ||
      row.executionStatus === "projection_invalid" ||
      row.executionStatus === "schema_invalid" ||
      row.blockers.length > 0 ||
      row.validationErrorCount > 0;
  }
  if (filter === "waitingReview") return row.status === "waiting_review";
  if (filter === "rejected") return row.status === "rejected";
  return row.status === "blocked" ||
    row.status === "waiting_review" ||
    row.status === "rejected" ||
    row.executionStatus === "blocked" ||
    row.executionStatus === "projection_invalid" ||
    row.executionStatus === "schema_invalid" ||
    row.blockers.length > 0 ||
    row.validationErrorCount > 0;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function importReviewToneClass(status: ExternalEventImportReview["status"]):
  "success" | "warning" | "blocked" {
  if (
    status === "publishedExternal" ||
    status === "preflightReady" ||
    status === "mergedDuplicate"
  ) {
    return "success";
  }
  if (status === "blocked" || status === "rejected") return "blocked";
  return "warning";
}

export const eventPublishingReadinessPanels = {
  EventSupplyReadinessPanel,
  EventImportReadinessTable,
  importPublishDisabledReason,
  buildImportReadinessRows,
  filterImportReadinessRows,
  importReadinessRowMatchesFilter,
  uniqueStrings,
  importReviewToneClass,
};
