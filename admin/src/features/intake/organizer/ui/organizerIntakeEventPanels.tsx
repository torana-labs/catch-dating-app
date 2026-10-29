import {CatchBadge, CatchField, CatchText} from "@catch/web-ui";
import {CheckCircle2, FileWarning, Lock} from "lucide-react";
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
  AdminOrganizerSurfaceList,
  AdminOrganizerSurfaceRow,
  AdminSearchCandidateCard,
  AdminSearchCandidateHeader,
  AdminSearchCandidateList,
  AdminSearchCandidatePanel,
  AdminSurfacePreview,
  AdminTagList,
  EmptyState,
  QualityRow,
  selectOptions,
  StateRow,
} from "../../../../shared/ui/AdminPrimitives";
import {
  decisionLabel,
  intakeChecklistForDecision,
  publicationPacketReady,
} from "../controllers/organizerIntakeHelpers";
import type {
  AdminDecideOrganizerIntakeResponse,
  AdminRecordOrganizerCurationResponse,
  OrganizerCurationOperation,
  OrganizerIntakeDecision,
  OrganizerSurfaceDecision,
} from "../../../../shared/types/adminTypes";
import type * as Intake from "../types/organizerIntakeTypes";

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
          <CatchBadge key={guardrail} label={guardrail} />
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
                <CatchBadge recipe="status" tone={action.status === "write_ready" ? "success" : "neutral"} label={action.action.replaceAll("_", " ")} />
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
                  <CatchBadge key={`${link.platform}-${link.url}`} recipe="status" tone="success" label={`${link.platform} outbound`} />
                ))}
                {action.blockers.map((blocker) => (
                  <CatchBadge key={blocker} label={blocker} />
                ))}
                {action.duplicateCandidateIds.map((candidateId) => (
                  <CatchBadge key={candidateId} label={`duplicate ${candidateId}`} />
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
          <CatchBadge key={guardrail} label={guardrail} />
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
                <CatchBadge recipe="status" tone={action.status === "would_publish_read_only" ? "success" : "neutral"} label={action.sourceAction.replaceAll("_", " ")} />
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
                  <CatchBadge key={blocker} label={blocker} />
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
          <CatchBadge
            recipe="status" tone={item.projectionStatus === "ready" ? "success" :
              item.projectionStatus === "blocked" ? "danger" : "neutral"}
            label={item.projectionStatus}
          />
          <CatchBadge label={item.relationshipToCatch} />
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
              <CatchBadge key={`attached-${surface.surfaceId}`} label={`attached ${surface.surfaceId}`} />
            ))}
            {item.curation.mergedFrom.map((entityId) => (
              <CatchBadge key={`merged-${entityId}`} label={`merged ${entityId}`} />
            ))}
            {item.curation.mergedInto ? (
              <CatchBadge label={`merged into ${item.curation.mergedInto}`} />
            ) : null}
            {item.curation.suppressed ? (
              <CatchBadge label="suppressed" />
            ) : null}
            {item.curation.surfaceDecisions.map((decision) => (
              <CatchBadge key={`${decision.surfaceId}-${decision.decision}`} label={`${decision.surfaceId}: ${decision.decision}`} />
            ))}
            {item.curation.splitSurfaces.map((split) => (
              <CatchBadge key={`${split.surfaceId}-${split.newEntityId}`} label={`split ${split.surfaceId} to ${split.newEntityId}`} />
            ))}
          </AdminTagList>
        </AdminOrganizerIntakeCurationPanel>
      ) : null}
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Markets</AdminIntakeSectionTitle>
        <AdminTagList>
          {item.markets.map((market) => (
            <CatchBadge key={market.marketSlug} label={`${market.displayName} / ${market.eventFilter.citySlug}`} />
          ))}
          {item.legacyPaths.map((path) => (
            <CatchBadge key={path} label={path} />
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
            <CatchBadge key={platform} label={`${platform} x${count}`} />
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

export const organizerIntakeEventPanels = {
  OrganizerExternalEventImportPlanView,
  OrganizerExternalEventImportExecutionPlanView,
  OrganizerIntakeCard,
  OrganizerCurationControl,
};
