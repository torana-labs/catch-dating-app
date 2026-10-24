import {CatchText, CatchField} from "@catch/web-ui";
import {useState} from "react";
import {CheckCircle2, Clock3, FileWarning, Lock} from "lucide-react";
import {
  AdminButton,
  AdminCommandRow,
  AdminCommandStack,
  AdminEyebrow,
  AdminGuardrailList,
  AdminIntakeDecisionActions,
  AdminIntakeDecisionBox,
  AdminIntakeDecisionState,
  AdminIntakeGate,
  AdminIntakeGateList,
  AdminIntakeSection,
  AdminIntakeSectionTitle,
  AdminIntakeStateGrid,
  AdminOrganizerCurationControlGrid,
  AdminOrganizerCurationControlSection,
  AdminOrganizerIntakeBadges,
  AdminOrganizerIntakeCard,
  AdminOrganizerIntakeCardHeader,
  AdminOrganizerIntakeCheckboxField,
  AdminOrganizerIntakeCurationPanel,
  AdminOrganizerIntakeSurfaceGrid,
  AdminOrganizerLocationResolutionForm,
  AdminOrganizerSurfaceList,
  AdminOrganizerSurfaceRow,
  AdminSearchCandidateActions,
  AdminSearchCandidateCard,
  AdminSearchCandidateHeader,
  AdminSearchCandidateList,
  AdminSearchCandidatePanel,
  AdminSurfacePreview,
  AdminTag,
  AdminTagList,
  EmptyState,
  QualityRow,
  selectOptions,
  StateRow,
  StatusChip,
} from "../../../../shared/ui/AdminPrimitives";
import {
  decisionLabel,
  eventDecisionLabel,
  intakeChecklistForDecision,
  locationResolutionFormFromTask,
  publicationPacketReady,
} from "../controllers/organizerIntakeHelpers";
import type {
  AdminDecideOrganizerEventCandidateResponse,
  AdminDecideOrganizerIntakeResponse,
  AdminRecordOrganizerCurationResponse,
  AdminResolveOrganizerEventLocationResponse,
  OrganizerCurationOperation,
  OrganizerEventCandidateDecision,
  OrganizerEventBlockerResolution,
  OrganizerEventImportBlockerCode,
  OrganizerIntakeDecision,
  OrganizerSurfaceDecision,
} from "../../../../shared/types/adminTypes";
import type * as Intake from "../types/organizerIntakeTypes";
import {
  blockerResolutionsFromChoices,
  governedBlockersForCandidate,
  renderOrganizerEventBlockerResolutionFields,
  type BlockerResolutionChoices,
} from "./organizerEventBlockerControls";

const organizerCurationOperations: OrganizerCurationOperation[] = [
  "surface_decision",
  "split_surface",
  "merge_entity",
  "suppress_entity",
];

const organizerSurfaceDecisions: OrganizerSurfaceDecision[] = [
  "reject_wrong_entity",
  "accept_primary",
  "accept_secondary",
  "mark_ambiguous",
  "mark_historical",
];

function OrganizerExternalEventCandidateQueueView({
  decisionInFlight,
  localDecisions,
  notes,
  onDecision,
  onNoteChange,
  queue,
}: {
  decisionInFlight: Record<string, OrganizerEventCandidateDecision>;
  localDecisions: Record<string, AdminDecideOrganizerEventCandidateResponse>;
  notes: Record<string, string>;
  onDecision: (
    candidate: Intake.OrganizerExternalEventCandidate,
    decision: OrganizerEventCandidateDecision,
    blockerResolutions: OrganizerEventBlockerResolution[]
  ) => void;
  onNoteChange: (candidateId: string, note: string) => void;
  queue: Intake.OrganizerExternalEventCandidateQueue;
}) {
  const visibleCandidates = queue.candidates.slice(0, 8);
  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Batches" value={String(queue.summary.batches)} />
        <StateRow label="Events" value={String(queue.summary.events)} />
        <StateRow label="Candidates" value={String(queue.summary.candidates)} />
        <StateRow label="Blocked" value={String(queue.summary.blocked)} />
        <StateRow label="Reviewed" value={String(queue.summary.reviewed ?? 0)} />
        <StateRow
          label="Approved"
          value={String(queue.summary.approvedForImport ?? 0)}
        />
        <StateRow label="Held" value={String(queue.summary.held ?? 0)} />
        <StateRow label="Rejected" value={String(queue.summary.rejected ?? 0)} />
      </AdminIntakeStateGrid>
      <QualityRow tone="warning" icon={<Clock3 size={16} strokeWidth={1.9} />}>
        <strong>{queue.policy.importWritesEnabled ? "Import writes enabled" : "Import writes disabled"}</strong>
        <span>{queue.policy.reason}</span>
      </QualityRow>
      <AdminTagList>
        {Object.entries(queue.summary.platforms).length === 0 ? (
          <AdminTag tone="muted">no provider batches</AdminTag>
        ) : (
          Object.entries(queue.summary.platforms)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([platform, count]) => (
              <AdminTag key={platform}>
                {platform} x{count}
              </AdminTag>
            ))
        )}
      </AdminTagList>
      {queue.errors.length > 0 || queue.warnings.length > 0 ? (
        <AdminIntakeSection>
          <AdminIntakeSectionTitle>Event Diagnostics</AdminIntakeSectionTitle>
          <AdminIntakeGateList>
            {[...queue.errors, ...queue.warnings].map((message) => (
              <AdminIntakeGate tone="blocked" key={message}>
                <FileWarning size={15} strokeWidth={1.9} />
                <div>
                  <strong>{message}</strong>
                </div>
              </AdminIntakeGate>
            ))}
          </AdminIntakeGateList>
        </AdminIntakeSection>
      ) : null}
      <AdminSearchCandidateList>
        {visibleCandidates.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={16} strokeWidth={1.9} />}>
            No external event candidates
          </EmptyState>
        ) : (
          visibleCandidates.map((candidate) => (
            <OrganizerExternalEventCandidateCard
              blockerCodes={governedBlockersForCandidate(candidate, queue)}
              candidate={candidate}
              inFlightDecision={decisionInFlight[candidate.candidateId]}
              key={candidate.candidateId}
              localDecision={localDecisions[candidate.candidateId]}
              note={notes[candidate.candidateId] ?? ""}
              onDecision={(decision, blockerResolutions) =>
                onDecision(candidate, decision, blockerResolutions)}
              onNoteChange={(note) => onNoteChange(candidate.candidateId, note)}
            />
          ))
        )}
      </AdminSearchCandidateList>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Event Commands</AdminIntakeSectionTitle>
        <AdminCommandStack>
          {Object.entries(queue.commands).map(([label, command]) => (
            <AdminCommandRow key={label}>
              <span>{label}</span>
              <code>{command}</code>
            </AdminCommandRow>
          ))}
        </AdminCommandStack>
      </AdminIntakeSection>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerExternalEventImportPlanView({
  plan,
}: {
  plan: Intake.OrganizerExternalEventImportPlan;
}) {
  const visibleActions = plan.actions.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Candidates" value={String(plan.summary.candidates)} />
        <StateRow
          label="Read-only events"
          value={String(plan.summary.proposedReadOnlyEvents ?? plan.summary.proposedCreates)}
        />
        <StateRow label="Merged links" value={String(plan.summary.mergedSourceLinks ?? 0)} />
        <StateRow label="Write-ready" value={String(plan.summary.writeReady)} />
        <StateRow label="Blocked" value={String(plan.summary.blocked)} />
        <StateRow label="Waiting" value={String(plan.summary.waitingReview)} />
        <StateRow label="Rejected" value={String(plan.summary.rejected)} />
      </AdminIntakeStateGrid>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>{plan.policy.writeEnabled ? "Writes enabled" : "Writes disabled"}</strong>
        <span>{plan.policy.reason}</span>
      </QualityRow>
      <AdminTagList>
        {plan.guardrails.map((guardrail) => (
          <AdminTag key={guardrail} tone="muted">
            {guardrail}
          </AdminTag>
        ))}
      </AdminTagList>
      <AdminSearchCandidateList>
        {visibleActions.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={16} strokeWidth={1.9} />}>
            No event import actions
          </EmptyState>
        ) : (
          visibleActions.map((action) => (
            <AdminSearchCandidateCard key={action.actionId}>
              <AdminSearchCandidateHeader>
                <div>
                  <AdminEyebrow>
                    {action.platform} / {action.status}
                  </AdminEyebrow>
                  <CatchText as="h3" variant="sectionTitle">{action.proposedReadOnlyEventDraft.eventId}</CatchText>
                </div>
                <StatusChip tone={action.status === "write_ready" ? "ready" : ""}>
                  {action.action.replaceAll("_", " ")}
                </StatusChip>
              </AdminSearchCandidateHeader>

              <AdminIntakeStateGrid>
                <StateRow label="Candidate" value={action.candidateId} />
                <StateRow label="Target" value={action.targetPath} />
                <StateRow
                  label="Organizer"
                  value={action.proposedReadOnlyEventDraft.canonicalHostId}
                />
                <StateRow label="Starts" value={action.proposedReadOnlyEventDraft.startTime} />
                <StateRow label="Ends" value={action.proposedReadOnlyEventDraft.endTime ?? "unknown"} />
                <StateRow label="Activity" value={action.proposedReadOnlyEventDraft.activity.activityKind} />
                <StateRow
                  label="Outbound links"
                  value={String(action.proposedReadOnlyEventDraft.booking.externalLinks.length)}
                />
                <StateRow
                  label="Catch booking"
                  value={action.proposedReadOnlyEventDraft.booking.catchBookingEnabled ? "enabled" : "disabled"}
                />
              </AdminIntakeStateGrid>

              <AdminTagList>
                {action.proposedReadOnlyEventDraft.booking.externalLinks.map((link) => (
                  <AdminTag key={`${link.platform}-${link.url}`} tone="ready">
                    {link.platform} outbound
                  </AdminTag>
                ))}
                {action.blockers.map((blocker) => (
                  <AdminTag key={blocker} tone="muted">
                    {blocker}
                  </AdminTag>
                ))}
                {action.duplicateCandidateIds.map((candidateId) => (
                  <AdminTag key={candidateId} tone="muted">
                    duplicate {candidateId}
                  </AdminTag>
                ))}
              </AdminTagList>
            </AdminSearchCandidateCard>
          ))
        )}
      </AdminSearchCandidateList>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Import Commands</AdminIntakeSectionTitle>
        <AdminCommandStack>
          {Object.entries(plan.commands).map(([label, command]) => (
            <AdminCommandRow key={label}>
              <span>{label}</span>
              <code>{command}</code>
            </AdminCommandRow>
          ))}
        </AdminCommandStack>
      </AdminIntakeSection>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerExternalEventLocationResolutionView({
  forms,
  inFlight,
  localResolutions,
  onFormChange,
  onResolve,
  queue,
}: {
  forms: Record<string, Intake.OrganizerLocationResolutionFormState>;
  inFlight: Record<string, boolean>;
  localResolutions: Record<string, AdminResolveOrganizerEventLocationResponse>;
  onFormChange: (
    taskId: string,
    form: Intake.OrganizerLocationResolutionFormState
  ) => void;
  onResolve: (task: Intake.OrganizerExternalEventLocationResolutionTask) => void;
  queue: Intake.OrganizerExternalEventLocationResolutionQueue;
}) {
  const visibleTasks = queue.tasks.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Candidates" value={String(queue.summary.candidates)} />
        <StateRow label="Tasks" value={String(queue.summary.tasks)} />
        <StateRow label="Missing coords" value={String(queue.summary.missingExactCoordinates)} />
        <StateRow label="Missing text" value={String(queue.summary.missingLocationText)} />
        <StateRow label="Provider disabled" value={String(queue.summary.providerDisabled)} />
        <StateRow label="Provider" value={queue.policy.provider} />
      </AdminIntakeStateGrid>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>
          {queue.policy.providerLookupEnabled ? "Provider lookup enabled" : "Provider lookup disabled"}
        </strong>
        <span>{queue.policy.reason}</span>
      </QualityRow>
      <AdminTagList>
        {queue.guardrails.map((guardrail) => (
          <AdminTag key={guardrail} tone="muted">
            {guardrail}
          </AdminTag>
        ))}
      </AdminTagList>
      <AdminSearchCandidateList>
        {visibleTasks.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={16} strokeWidth={1.9} />}>
            No event location resolution tasks
          </EmptyState>
        ) : (
          visibleTasks.map((task) => {
            const form = forms[task.taskId] ??
              locationResolutionFormFromTask(task);
            const localResolution = localResolutions[task.candidateId];
            return (
              <AdminSearchCandidateCard key={task.taskId}>
                <AdminSearchCandidateHeader>
                  <div>
                    <AdminEyebrow>
                      {task.platform} / {task.resolutionState}
                    </AdminEyebrow>
                    <CatchText as="h3" variant="sectionTitle">{task.title}</CatchText>
                  </div>
                  <StatusChip>
                    {task.countryCode}
                  </StatusChip>
                </AdminSearchCandidateHeader>
                <AdminIntakeStateGrid>
                  <StateRow label="Candidate" value={task.candidateId} />
                  <StateRow label="Entity" value={task.entityId} />
                  <StateRow label="Starts" value={task.startAt} />
                  <StateRow label="Query" value={task.resolutionQuery || "missing"} />
                  <StateRow label="Name" value={task.sourceLocation.name ?? "missing"} />
                  <StateRow label="Address" value={task.sourceLocation.address ?? "missing"} />
                  <StateRow
                    label="Local decision"
                    value={localResolution?.resolutionStatus ?? "not recorded"}
                  />
                </AdminIntakeStateGrid>
                <AdminTagList>
                  {task.blockers.map((blocker) => (
                    <AdminTag key={blocker} tone="muted">
                      {blocker}
                    </AdminTag>
                  ))}
                </AdminTagList>
                <AdminOrganizerLocationResolutionForm>
                  <CatchField
                    recipe="input"
                    title="Name"
                    onChanged={(name) =>
                      onFormChange(task.taskId, {...form, name})}
                    value={form.name}
                  />
                  <CatchField
                    recipe="input"
                    title="Address"
                    onChanged={(address) =>
                      onFormChange(task.taskId, {...form, address})}
                    value={form.address}
                  />
                  <CatchField
                    recipe="input"
                    title="Place ID"
                    onChanged={(placeId) =>
                      onFormChange(task.taskId, {...form, placeId})}
                    value={form.placeId}
                  />
                  <CatchField
                    recipe="input"
                    title="Latitude"
                    onChanged={(latitude) =>
                      onFormChange(task.taskId, {...form, latitude})}
                    value={form.latitude}
                    keyboardType="decimal"
                  />
                  <CatchField
                    recipe="input"
                    title="Longitude"
                    onChanged={(longitude) =>
                      onFormChange(task.taskId, {...form, longitude})}
                    value={form.longitude}
                    keyboardType="decimal"
                  />
                  <CatchField
                    recipe="input"
                    title="Resolution notes"
                    onChanged={(notes) =>
                      onFormChange(task.taskId, {...form, notes})}
                    value={form.notes}
                  />
                  <CatchField
                    recipe="input"
                    title="Review note"
                    onChanged={(note) =>
                      onFormChange(task.taskId, {...form, note})}
                    maxLines={2}
                    value={form.note}
                  />
                </AdminOrganizerLocationResolutionForm>
                <AdminSearchCandidateActions>
                  <AdminButton
                    disabled={
                      inFlight[task.taskId] === true ||
                      localResolution?.resolutionStatus === "resolved"
                    }
                    onClick={() => onResolve(task)}
                  >
                    {localResolution?.resolutionStatus === "resolved" ?
                      "Resolved" :
                      inFlight[task.taskId] ? "Saving..." : "Resolve location"}
                  </AdminButton>
                </AdminSearchCandidateActions>
              </AdminSearchCandidateCard>
            );
          })
        )}
      </AdminSearchCandidateList>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Location Commands</AdminIntakeSectionTitle>
        <AdminCommandStack>
          {Object.entries(queue.commands).map(([label, command]) => (
            <AdminCommandRow key={label}>
              <span>{label}</span>
              <code>{command}</code>
            </AdminCommandRow>
          ))}
        </AdminCommandStack>
      </AdminIntakeSection>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerExternalEventImportExecutionPlanView({
  plan,
}: {
  plan: Intake.OrganizerExternalEventImportExecutionPlan;
}) {
  const visibleActions = plan.actions.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Import actions" value={String(plan.summary.importActions)} />
        <StateRow
          label="Read-only actions"
          value={String(plan.summary.readOnlyActions ?? plan.summary.createActions)}
        />
        <StateRow
          label="Would publish"
          value={String(plan.summary.wouldPublishReadOnly ?? plan.summary.wouldCreate)}
        />
        <StateRow label="Blocked" value={String(plan.summary.blocked)} />
        <StateRow
          label="Projection invalid"
          value={String(plan.summary.projectionInvalid ?? plan.summary.schemaInvalid)}
        />
        <StateRow
          label="Projection errors"
          value={String(plan.summary.projectionInvalidCount ?? plan.summary.payloadInvalid)}
        />
      </AdminIntakeStateGrid>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>
          {plan.policy.writeEnabled ? "Execution writes enabled" : "Execution writes disabled"}
        </strong>
        <span>
          {plan.policy.authorityModel} / {plan.policy.reason}
        </span>
      </QualityRow>
      <AdminTagList>
        {plan.guardrails.map((guardrail) => (
          <AdminTag key={guardrail} tone="muted">
            {guardrail}
          </AdminTag>
        ))}
      </AdminTagList>
      <AdminSearchCandidateList>
        {visibleActions.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={16} strokeWidth={1.9} />}>
            No event import execution actions
          </EmptyState>
        ) : (
          visibleActions.map((action) => (
            <AdminSearchCandidateCard key={action.actionId}>
              <AdminSearchCandidateHeader>
                <div>
                  <AdminEyebrow>
                    {(action.targetWriter ?? action.targetCallable ?? "read-only projection")} / {action.status}
                  </AdminEyebrow>
                  <CatchText as="h3" variant="sectionTitle">{action.readOnlyEventProjection?.eventId ?? action.createEventPayload?.eventId ?? action.sourceActionId}</CatchText>
                </div>
                <StatusChip tone={action.status === "would_publish_read_only" ? "ready" : ""}>
                  {action.sourceAction.replaceAll("_", " ")}
                </StatusChip>
              </AdminSearchCandidateHeader>

              <AdminIntakeStateGrid>
                <StateRow label="Candidate" value={action.candidateId} />
                <StateRow label="Target" value={action.targetPath} />
                <StateRow
                  label="Organizer"
                  value={action.readOnlyEventProjection?.canonicalHostId ?? action.createEventPayload?.clubId ?? action.entityId}
                />
                <StateRow
                  label="Starts"
                  value={action.readOnlyEventProjection?.startTime ?? String(action.createEventPayload?.startTimeMillis ?? "invalid")}
                />
                <StateRow
                  label="Outbound links"
                  value={String(action.readOnlyEventProjection?.booking.externalLinks.length ?? 0)}
                />
                <StateRow
                  label="Projection"
                  value={(action.projectionValidation ?? action.payloadValidation).valid ? "valid" : "invalid"}
                />
              </AdminIntakeStateGrid>

              <AdminTagList>
                {action.blockers.map((blocker) => (
                  <AdminTag key={blocker} tone="muted">
                    {blocker}
                  </AdminTag>
                ))}
              </AdminTagList>

              {(action.projectionValidation?.errors ?? action.payloadValidation.errors).length > 0 ? (
                <AdminIntakeSection>
                  <AdminIntakeSectionTitle>Projection errors</AdminIntakeSectionTitle>
                  <AdminGuardrailList>
                    {(action.projectionValidation?.errors ?? action.payloadValidation.errors).map((error, index) => (
                      <QualityRow
                        key={`${error.path}-${error.keyword}-${index}`}
                        tone="warning"
                        icon={<FileWarning size={16} strokeWidth={1.9} />}>
                        <strong>{error.path}</strong>
                        <span>{error.message}</span>
                      </QualityRow>
                    ))}
                  </AdminGuardrailList>
                </AdminIntakeSection>
              ) : null}
            </AdminSearchCandidateCard>
          ))
        )}
      </AdminSearchCandidateList>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Preflight Commands</AdminIntakeSectionTitle>
        <AdminCommandStack>
          {Object.entries(plan.commands).map(([label, command]) => (
            <AdminCommandRow key={label}>
              <span>{label}</span>
              <code>{command}</code>
            </AdminCommandRow>
          ))}
        </AdminCommandStack>
      </AdminIntakeSection>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerExternalEventCandidateCard({
  blockerCodes,
  candidate,
  inFlightDecision,
  localDecision,
  note,
  onDecision,
  onNoteChange,
}: {
  blockerCodes: OrganizerEventImportBlockerCode[];
  candidate: Intake.OrganizerExternalEventCandidate;
  inFlightDecision?: OrganizerEventCandidateDecision;
  localDecision?: AdminDecideOrganizerEventCandidateResponse;
  note: string;
  onDecision: (
    decision: OrganizerEventCandidateDecision,
    blockerResolutions: OrganizerEventBlockerResolution[]
  ) => void;
  onNoteChange: (note: string) => void;
}) {
  const generatedDecision = candidate.reviewDecision?.decision ?? null;
  const submittedDecision = localDecision?.decision ?? generatedDecision;
  const isDeciding = Boolean(inFlightDecision);
  const [resolutionChoices, setResolutionChoices] = useState<
    BlockerResolutionChoices
  >({});
  const blockerResolutions = blockerResolutionsFromChoices(
    blockerCodes,
    resolutionChoices,
    note
  );
  const approvalReady = note.trim().length > 0 &&
    blockerResolutions.length === blockerCodes.length;

  return (
    <AdminSearchCandidateCard>
      <AdminSearchCandidateHeader>
        <div>
          <AdminEyebrow>
            {candidate.platform} / {candidate.reviewStatus}
          </AdminEyebrow>
          <CatchText as="h3" variant="sectionTitle">{candidate.title}</CatchText>
        </div>
        <StatusChip tone={candidate.reviewStatus === "approved_for_import" ? "ready" : ""}>
          {candidate.entityId}
        </StatusChip>
      </AdminSearchCandidateHeader>
      <AdminIntakeStateGrid>
        <StateRow label="Candidate" value={candidate.candidateId} />
        <StateRow label="Surface" value={candidate.surfaceId} />
        <StateRow label="Starts" value={candidate.startAt} />
        <StateRow label="Ends" value={candidate.endAt ?? "unknown"} />
        <StateRow label="Location" value={eventCandidateLocation(candidate)} />
        <StateRow label="Import" value={`${candidate.importReadiness} / ${candidate.importState}`} />
      </AdminIntakeStateGrid>
        <AdminTagList>
        {[...new Set([...candidate.blockers, ...blockerCodes])].map((blocker) => (
          <AdminTag key={blocker} tone="muted">{blocker}</AdminTag>
        ))}
        {candidate.diagnostics.map((diagnostic) => (
          <AdminTag key={diagnostic} tone="muted">{diagnostic}</AdminTag>
        ))}
      </AdminTagList>
      {submittedDecision ? (
        <AdminIntakeDecisionState>
          <CheckCircle2 size={16} strokeWidth={1.9} />
          <div>
            <strong>{eventDecisionLabel(submittedDecision)}</strong>
            <span>
              {localDecision ?
                `${localDecision.decisionPath} / ${localDecision.importState}` :
                `Decision present in ${candidate.reviewDecision?.eventReviewBatchId}`}
            </span>
          </div>
        </AdminIntakeDecisionState>
      ) : (
        <AdminIntakeDecisionBox>
          <CatchField
            recipe="input"
            title="Event review note"
            onChanged={onNoteChange}
            maxLines={3}
            value={note}
          />
          {renderOrganizerEventBlockerResolutionFields({
            blockerCodes,
            choices: resolutionChoices,
            disabled: isDeciding,
            onChange: setResolutionChoices,
          })}
          <AdminIntakeDecisionActions>
            <AdminButton
              disabled={isDeciding || !approvalReady}
              onClick={() =>
                onDecision("approve_for_import", blockerResolutions)}
              variant="primary"
            >
              {inFlightDecision === "approve_for_import" ?
                "Approving" :
                "Approve future import"}
            </AdminButton>
            <AdminButton
              disabled={isDeciding}
              onClick={() => onDecision("hold", [])}
            >
              {inFlightDecision === "hold" ? "Holding" : "Hold"}
            </AdminButton>
            <AdminButton
              disabled={isDeciding}
              onClick={() => onDecision("reject", [])}
            >
              {inFlightDecision === "reject" ? "Rejecting" : "Reject"}
            </AdminButton>
          </AdminIntakeDecisionActions>
        </AdminIntakeDecisionBox>
      )}
    </AdminSearchCandidateCard>
  );
}

function OrganizerIntakeCard({
  curationForm,
  curationInFlight,
  curationResult,
  entityOptions,
  inFlightDecision,
  item,
  localDecision,
  manualReportsAcknowledged,
  note,
  onCurationFormChange,
  onCurationSubmit,
  onDecision,
  onManualReportsAcknowledgedChange,
  onNoteChange,
  publicationPacket,
}: {
  curationForm: Intake.OrganizerCurationFormState;
  curationInFlight: boolean;
  curationResult?: AdminRecordOrganizerCurationResponse;
  entityOptions: Intake.OrganizerIntakeItem[];
  inFlightDecision?: OrganizerIntakeDecision;
  item: Intake.OrganizerIntakeItem;
  localDecision?: AdminDecideOrganizerIntakeResponse;
  manualReportsAcknowledged: boolean;
  note: string;
  onCurationFormChange: (form: Intake.OrganizerCurationFormState) => void;
  onCurationSubmit: (form: Intake.OrganizerCurationFormState) => void;
  onDecision: (decision: OrganizerIntakeDecision) => void;
  onManualReportsAcknowledgedChange: (checked: boolean) => void;
  onNoteChange: (note: string) => void;
  publicationPacket?: Intake.OrganizerPublicationReviewPacket;
}) {
  const platformEntries = Object.entries(item.surfaceSummary.platforms)
    .sort(([left], [right]) => left.localeCompare(right));
  const commandEntries = [
    [
      "Approve public",
      publicationPacket?.adminDecision.command ?? item.decisionCommands.approvePublic,
    ],
    ["Hold", item.decisionCommands.hold],
    ["Suppress", item.decisionCommands.suppress],
  ];
  const generatedDecision = item.reviewDecision?.decision ?? null;
  const submittedDecision = localDecision?.decision ?? generatedDecision;
  const approvalReady = Object.values(
    intakeChecklistForDecision(item, "approve_public")
  ).every(Boolean) && publicationPacketReady(publicationPacket);
  const manualReportCount =
    publicationPacket?.evidenceSummary.manualReportsWithoutArtifacts ?? 0;
  const isDeciding = Boolean(inFlightDecision);

  return (
    <AdminOrganizerIntakeCard>
      <AdminOrganizerIntakeCardHeader>
        <div>
          <AdminEyebrow>
            {item.priority} / {item.taskType.replaceAll("_", " ")}
          </AdminEyebrow>
          <CatchText as="h3" variant="sectionTitle">{item.displayName}</CatchText>
        </div>
        <AdminOrganizerIntakeBadges>
          <StatusChip tone={item.projectionStatus}>
            {item.projectionStatus}
          </StatusChip>
          <StatusChip>{item.relationshipToCatch}</StatusChip>
        </AdminOrganizerIntakeBadges>
      </AdminOrganizerIntakeCardHeader>
      <AdminIntakeStateGrid>
        <StateRow label="Entity ID" value={item.entityId} />
        <StateRow label="Canonical" value={item.canonicalPath} />
        <StateRow label="Website" value={`${item.publishStatus} / ${item.indexStatus}`} />
        <StateRow label="App" value={item.appVisibility} />
      </AdminIntakeStateGrid>
      {item.curation ? (
        <AdminOrganizerIntakeCurationPanel>
          <AdminIntakeSectionTitle>Curation</AdminIntakeSectionTitle>
          <AdminTagList>
            {item.curation.attachedSurfaces.map((surface) => (
              <AdminTag key={`attached-${surface.surfaceId}`}>
                attached {surface.surfaceId}
              </AdminTag>
            ))}
            {item.curation.mergedFrom.map((entityId) => (
              <AdminTag key={`merged-${entityId}`}>
                merged {entityId}
              </AdminTag>
            ))}
            {item.curation.mergedInto ? (
              <AdminTag tone="muted">
                merged into {item.curation.mergedInto}
              </AdminTag>
            ) : null}
            {item.curation.suppressed ? (
              <AdminTag tone="muted">
                suppressed
              </AdminTag>
            ) : null}
            {item.curation.surfaceDecisions.map((decision) => (
              <AdminTag key={`${decision.surfaceId}-${decision.decision}`}>
                {decision.surfaceId}: {decision.decision}
              </AdminTag>
            ))}
            {item.curation.splitSurfaces.map((split) => (
              <AdminTag key={`${split.surfaceId}-${split.newEntityId}`} tone="muted">
                split {split.surfaceId} to {split.newEntityId}
              </AdminTag>
            ))}
          </AdminTagList>
        </AdminOrganizerIntakeCurationPanel>
      ) : null}
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Markets</AdminIntakeSectionTitle>
        <AdminTagList>
          {item.markets.map((market) => (
            <AdminTag key={market.marketSlug}>
              {market.displayName} / {market.eventFilter.citySlug}
            </AdminTag>
          ))}
          {item.legacyPaths.map((path) => (
            <AdminTag key={path} tone="muted">{path}</AdminTag>
          ))}
        </AdminTagList>
      </AdminIntakeSection>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Surface Inventory</AdminIntakeSectionTitle>
        <AdminOrganizerIntakeSurfaceGrid>
          <StateRow label="Active" value={String(item.surfaceSummary.active)} />
          <StateRow label="Candidate" value={String(item.surfaceSummary.candidate)} />
          <StateRow label="Ambiguous" value={String(item.surfaceSummary.ambiguous)} />
          <StateRow label="Rejected" value={String(item.surfaceSummary.rejected)} />
        </AdminOrganizerIntakeSurfaceGrid>
        <AdminTagList>
          {platformEntries.map(([platform, count]) => (
            <AdminTag key={platform}>
              {platform} x{count}
            </AdminTag>
          ))}
        </AdminTagList>
        <AdminOrganizerSurfaceList>
          {item.surfaces.map((surface) => (
            <AdminOrganizerSurfaceRow key={surface.surfaceId}>
              <div>
                <strong>{surface.surfaceId}</strong>
                <span>
                  {surface.platform} / {surface.surfaceKind} / {surface.status}
                </span>
              </div>
              <span>{surface.role}</span>
            </AdminOrganizerSurfaceRow>
          ))}
        </AdminOrganizerSurfaceList>
      </AdminIntakeSection>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Review Gates</AdminIntakeSectionTitle>
        <AdminIntakeGateList>
          {item.gates.map((gate) => (
            <AdminIntakeGate
              tone={gate.passed ? "passed" : "blocked"}
              key={gate.id}
            >
              {gate.passed ? (
                <CheckCircle2 size={15} strokeWidth={1.9} />
              ) : (
                <FileWarning size={15} strokeWidth={1.9} />
              )}
              <div>
                <strong>{gate.id}</strong>
                <span>{gate.description}</span>
              </div>
            </AdminIntakeGate>
          ))}
        </AdminIntakeGateList>
      </AdminIntakeSection>
      <OrganizerCurationControl
        form={curationForm}
        inFlight={curationInFlight}
        item={item}
        localCuration={curationResult}
        onChange={onCurationFormChange}
        onSubmit={onCurationSubmit}
        targetOptions={entityOptions}
      />
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Admin Decision</AdminIntakeSectionTitle>
        {publicationPacket ? (
          <QualityRow
            tone={publicationPacketReady(publicationPacket) ? "" : "warning"}
            icon={publicationPacketReady(publicationPacket) ? (
              <CheckCircle2 size={16} strokeWidth={1.9} />
            ) : (
              <FileWarning size={16} strokeWidth={1.9} />
            )}>
            <strong>{publicationPacket.status.replaceAll("_", " ")}</strong>
            <span>
              {manualReportCount > 0 ?
                `${manualReportCount} manual report(s) require reviewer acknowledgement.` :
                publicationPacket.recommendedAction}
            </span>
          </QualityRow>
        ) : (
          <QualityRow tone="warning" icon={<FileWarning size={16} strokeWidth={1.9} />}>
            <strong>Publication packet missing</strong>
            <span>Regenerate organizer intake before public approval.</span>
          </QualityRow>
        )}
        {submittedDecision ? (
          <AdminIntakeDecisionState>
            <CheckCircle2 size={16} strokeWidth={1.9} />
            <div>
              <strong>{decisionLabel(submittedDecision)}</strong>
              <span>
                {localDecision ?
                  `${localDecision.decisionPath} / ${localDecision.projectionState}` :
                  "Decision present in generated review state"}
              </span>
            </div>
          </AdminIntakeDecisionState>
        ) : (
          <AdminIntakeDecisionBox>
            <CatchField
              recipe="input"
              title="Review note"
              onChanged={onNoteChange}
              maxLines={3}
              value={note}
            />
            {manualReportCount > 0 ? (
              <AdminOrganizerIntakeCheckboxField
                checked={manualReportsAcknowledged}
                disabled={isDeciding}
                label="Manual reports reviewed as prompts, not identity proof."
                onChange={onManualReportsAcknowledgedChange}
              />
            ) : null}
            <AdminIntakeDecisionActions>
              <AdminButton
                disabled={
                  !approvalReady ||
                  isDeciding ||
                  (manualReportCount > 0 && !manualReportsAcknowledged)
                }
                onClick={() => onDecision("approve_public")}
                variant="primary"
              >
                {inFlightDecision === "approve_public" ?
                  "Approving" :
                  "Approve public"}
              </AdminButton>
              <AdminButton
                disabled={isDeciding}
                onClick={() => onDecision("hold")}
              >
                {inFlightDecision === "hold" ? "Holding" : "Hold"}
              </AdminButton>
              <AdminButton
                disabled={isDeciding}
                onClick={() => onDecision("suppress")}
              >
                {inFlightDecision === "suppress" ? "Suppressing" : "Suppress"}
              </AdminButton>
            </AdminIntakeDecisionActions>
          </AdminIntakeDecisionBox>
        )}
      </AdminIntakeSection>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Decision Commands</AdminIntakeSectionTitle>
        <AdminCommandStack>
          {commandEntries.map(([label, command]) => (
            <AdminCommandRow key={label}>
              <span>{label}</span>
              <code>{command}</code>
            </AdminCommandRow>
          ))}
        </AdminCommandStack>
      </AdminIntakeSection>
    </AdminOrganizerIntakeCard>
  );
}

function OrganizerCurationControl({
  form,
  inFlight,
  item,
  localCuration,
  onChange,
  onSubmit,
  targetOptions,
}: {
  form: Intake.OrganizerCurationFormState;
  inFlight: boolean;
  item: Intake.OrganizerIntakeItem;
  localCuration?: AdminRecordOrganizerCurationResponse;
  onChange: (form: Intake.OrganizerCurationFormState) => void;
  onSubmit: (form: Intake.OrganizerCurationFormState) => void;
  targetOptions: Intake.OrganizerIntakeItem[];
}) {
  const surfaceOptions = item.surfaces.length > 0 ?
    item.surfaces.map((surface) => surface.surfaceId) :
    [""];
  const targetEntityOptions = targetOptions
    .map((option) => option.entityId)
    .filter((entityId) => entityId !== item.entityId);
  const update = <K extends keyof Intake.OrganizerCurationFormState>(
    key: K,
    value: Intake.OrganizerCurationFormState[K]
  ) => {
    onChange({...form, [key]: value});
  };
  const selectedSurface = item.surfaces.find(
    (surface) => surface.surfaceId === form.surfaceId
  );
  const usesSurface = form.operationType === "surface_decision" ||
    form.operationType === "split_surface";

  return (
    <AdminOrganizerCurationControlSection>
      <AdminIntakeSectionTitle>Curation Operation</AdminIntakeSectionTitle>
      <AdminOrganizerCurationControlGrid>
        <CatchField
          recipe="select"
          title="Operation"
          onChanged={(value) => update(
            "operationType",
            (value ?? "") as OrganizerCurationOperation
          )}
          {...selectOptions(organizerCurationOperations)}
          value={form.operationType}
        />

        {form.operationType === "merge_entity" ? (
          <CatchField
            recipe="select"
            title="Merge into"
            onChanged={(value) => update("targetEntityId", (value ?? ""))}
            {...selectOptions(["", ...targetEntityOptions])}
            value={form.targetEntityId}
          />
        ) : null}

        {usesSurface ? (
            <CatchField
              recipe="select"
              title="Surface"
              onChanged={(value) => update("surfaceId", (value ?? ""))}
              {...selectOptions(surfaceOptions)}
              value={form.surfaceId}
            />
          ) : null}

        {form.operationType === "surface_decision" ? (
          <CatchField
            recipe="select"
            title="Decision"
            onChanged={(value) => update(
              "decision",
              (value ?? "") as OrganizerSurfaceDecision
            )}
            {...selectOptions(organizerSurfaceDecisions)}
            value={form.decision}
          />
        ) : null}

        {form.operationType === "split_surface" ? (
          <CatchField
            recipe="input"
            title="New entity id"
            onChanged={(value) => update("newEntityId", value)}
            value={form.newEntityId}
          />
          ) : null}
      </AdminOrganizerCurationControlGrid>
      {usesSurface && selectedSurface ? (
        <AdminSurfacePreview>
          <strong>{selectedSurface.platform} / {selectedSurface.surfaceKind}</strong>
          <span>{selectedSurface.url ?? "no URL captured"}</span>
          <span>{selectedSurface.notes}</span>
        </AdminSurfacePreview>
      ) : null}
      <CatchField
        recipe="input"
        title="Curation reason"
        onChanged={(value) => update("reason", value)}
        maxLines={2}
        value={form.reason}
      />
      {localCuration ? (
        <AdminIntakeDecisionState>
          <CheckCircle2 size={16} strokeWidth={1.9} />
          <div>
            <strong>{localCuration.operationType.replaceAll("_", " ")}</strong>
            <span>{localCuration.decisionPath}</span>
          </div>
        </AdminIntakeDecisionState>
      ) : null}
      <AdminIntakeDecisionActions>
        <AdminButton
          disabled={inFlight}
          onClick={() => onSubmit(form)}
          variant="primary"
        >
          {inFlight ? "Recording" : "Record curation"}
        </AdminButton>
      </AdminIntakeDecisionActions>
    </AdminOrganizerCurationControlSection>
  );
}

function eventCandidateLocation(candidate: Intake.OrganizerExternalEventCandidate) {
  return [
    candidate.location.name,
    candidate.location.address,
    candidate.location.citySlug,
    candidate.location.countryCode,
  ].filter(Boolean).join(" / ") || "unknown";
}

export const organizerIntakeEventPanels = {
  OrganizerExternalEventCandidateQueueView,
  OrganizerExternalEventImportPlanView,
  OrganizerExternalEventLocationResolutionView,
  OrganizerExternalEventImportExecutionPlanView,
  OrganizerExternalEventCandidateCard,
  OrganizerIntakeCard,
  OrganizerCurationControl,
  eventCandidateLocation,
};
