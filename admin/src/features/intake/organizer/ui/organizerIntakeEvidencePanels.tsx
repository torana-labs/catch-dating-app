import {CatchText, CatchField} from "@catch/web-ui";
import {CheckCircle2, FileWarning, Lock} from "lucide-react";
import {
  AdminButton,
  AdminTag,
  QualityRow,
  StateRow,
  StatusChip,
  AdminCommandRow,
  AdminCommandStack,
  AdminEyebrow,
  AdminGuardrailList,
  AdminIntakeDecisionActions,
  AdminIntakeDecisionBox,
  AdminIntakeDecisionState,
  AdminTagList,
  AdminIntakeSection,
  AdminIntakeSectionTitle,
  AdminOrganizerPolicyGapColumns,
  AdminSearchCandidateCard,
  AdminSearchCandidateHeader,
  AdminSearchCandidateList,
  AdminSearchCandidatePanel,
  AdminIntakeStateGrid,
} from "../../../../shared/ui/AdminPrimitives";
import {policyGapDecisionLabel} from "../controllers/organizerIntakeHelpers";
import type {
  AdminDecideOrganizerPolicyGapResponse,
  OrganizerCurationOperation,
  OrganizerPolicyGapDecision,
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

function OrganizerPromotionExecutionView({
  packet,
}: {
  packet: Intake.OrganizerPromotionExecutionPacket;
}) {
  const visiblePhases = packet.phases.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow
          label="Status"
          value={packet.summary.status.replaceAll("_", " ")}
        />
        <StateRow label="Phases" value={String(packet.summary.phases)} />
        <StateRow
          label="Blocked"
          value={String(packet.summary.blockedPhases)}
        />
        <StateRow
          label="Local preview"
          value={packet.summary.canRunLocalPreview ? "ready" : "blocked"}
        />
        <StateRow
          label="Public deploy"
          value={packet.summary.canDeployNewPublicPages ? "ready" : "blocked"}
        />
        <StateRow
          label="Claim writes"
          value={packet.summary.canWriteClaimTargets ? "ready" : "blocked"}
        />
        <StateRow
          label="Answer packets"
          value={packet.summary.reviewedAnswerPacketStatus.replaceAll("_", " ")}
        />
      </AdminIntakeStateGrid>
      <AdminTagList>
        <AdminTag>
          admin pending x{packet.summary.pendingAdminDecisions}
        </AdminTag>
        <AdminTag tone="muted">
          policy pending x{packet.summary.pendingPolicyDecisions}
        </AdminTag>
        <AdminTag tone="muted">
          answer slots x{packet.summary.pendingAnswerSlots}
        </AdminTag>
        <AdminTag tone={packet.summary.reviewedAnswerPacketsReady > 0 ? "neutral" : "muted"}>
          ready packets x{packet.summary.reviewedAnswerPacketsReady}
        </AdminTag>
        <AdminTag tone="muted">
          reviewed packets x{packet.summary.reviewedAnswerPackets}
        </AdminTag>
        {packet.summary.reviewedAnswerPacketsStale > 0 ? (
          <AdminTag tone="muted">
            stale packets x{packet.summary.reviewedAnswerPacketsStale}
          </AdminTag>
        ) : null}
        {packet.summary.reviewedAnswerPacketsInvalid > 0 ? (
          <AdminTag tone="muted">
            invalid packets x{packet.summary.reviewedAnswerPacketsInvalid}
          </AdminTag>
        ) : null}
        <AdminTag tone="muted">
          guarded reads x{packet.summary.guardedRemoteReadPhases}
        </AdminTag>
        <AdminTag tone="muted">
          guarded writes x{packet.summary.guardedRemoteWritePhases}
        </AdminTag>
        {Object.entries(packet.summary.phasesByStatus).map(([status, count]) => (
          <AdminTag key={status} tone="muted">
            {status.replaceAll("_", " ")} x{count}
          </AdminTag>
        ))}
      </AdminTagList>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>{packet.guardrails[0]}</strong>
        <span>{packet.guardrails[1]}</span>
      </QualityRow>
      <AdminSearchCandidateList>
        {visiblePhases.map((phase) => (
          <AdminSearchCandidateCard key={phase.phaseId}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {phase.executionMode.replaceAll("_", " ")}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{phase.label}</CatchText>
              </div>
              <StatusChip tone={promotionPhaseTone(phase.status)}>
                {phase.status.replaceAll("_", " ")}
              </StatusChip>
            </AdminSearchCandidateHeader>

            <AdminIntakeStateGrid>
              <StateRow label="Mode" value={phase.executionMode.replaceAll("_", " ")} />
              <StateRow label="Blockers" value={String(phase.blockers.length)} />
              <StateRow label="Outputs" value={String(phase.outputs.length)} />
              <StateRow label="Phase" value={phase.phaseId.replaceAll("_", " ")} />
            </AdminIntakeStateGrid>

            {phase.blockers.length > 0 ? (
              <QualityRow tone="warning" icon={<FileWarning size={16} strokeWidth={1.9} />}>
                <strong>{phase.blockers[0]}</strong>
                {phase.blockers.slice(1, 4).map((blocker) => (
                  <span key={blocker}>{blocker}</span>
                ))}
              </QualityRow>
            ) : (
              <QualityRow tone="success" icon={<CheckCircle2 size={16} strokeWidth={1.9} />}>
                <strong>Phase ready</strong>
                <span>Run only in the documented order.</span>
              </QualityRow>
            )}

            <AdminTagList>
              {phase.outputs.slice(0, 8).map((output) => (
                <AdminTag key={output} tone="muted">
                  {output}
                </AdminTag>
              ))}
            </AdminTagList>

            <AdminCommandStack>
              <AdminCommandRow>
                <span>command</span>
                <code>{phase.command}</code>
              </AdminCommandRow>
            </AdminCommandStack>
          </AdminSearchCandidateCard>
        ))}
      </AdminSearchCandidateList>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerPolicyGapRegisterView({
  inFlightDecisions,
  localDecisions,
  notes,
  onDecision,
  onNoteChange,
  register,
}: {
  inFlightDecisions: Record<string, OrganizerPolicyGapDecision>;
  localDecisions: Record<string, AdminDecideOrganizerPolicyGapResponse>;
  notes: Record<string, string>;
  onDecision: (
    gap: Intake.OrganizerPolicyGap,
    decision: OrganizerPolicyGapDecision
  ) => void;
  onNoteChange: (gapId: string, note: string) => void;
  register: Intake.OrganizerPolicyGapRegister;
}) {
  const visibleGaps = register.gaps.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Gaps" value={String(register.summary.gaps)} />
        <StateRow label="Operational blockers" value={String(register.summary.decisionRequired)} />
        <StateRow label="Reviewed" value={String(register.summary.reviewDecisions)} />
        <StateRow label="Accepted" value={String(register.summary.reviewAccepted)} />
        <StateRow label="Held" value={String(register.summary.reviewHeld)} />
        <StateRow label="Rejected" value={String(register.summary.reviewRejected)} />
        <StateRow label="Invalid" value={String(register.summary.reviewInvalid)} />
        <StateRow label="Ready" value={String(register.summary.ready)} />
        <StateRow label="Disabled" value={String(register.summary.blockedByPolicy)} />
      </AdminIntakeStateGrid>
      <AdminTagList>
        {Object.entries(register.summary.gapsByArea).map(([area, count]) => (
          <AdminTag key={area} tone="muted">
            {area} x{count}
          </AdminTag>
        ))}
        {Object.entries(register.summary.gapsByDecisionStatus).map(([status, count]) => (
          <AdminTag key={status} tone="muted">
            {status.replaceAll("_", " ")} x{count}
          </AdminTag>
        ))}
        {register.guardrails.map((guardrail) => (
          <AdminTag key={guardrail} tone="muted">
            {guardrail}
          </AdminTag>
        ))}
      </AdminTagList>
      {register.errors && register.errors.length > 0 ? (
        <AdminGuardrailList>
          {register.errors.map((error) => (
            <QualityRow
              key={error}
              tone="warning"
              icon={<FileWarning size={16} strokeWidth={1.9} />}>
              <strong>{error}</strong>
            </QualityRow>
          ))}
        </AdminGuardrailList>
      ) : null}
      <AdminSearchCandidateList>
        {visibleGaps.map((gap) => {
          const localDecision = localDecisions[gap.gapId];
          const submittedDecision = localDecision?.decision ??
            gap.reviewDecision?.decision;
          const isDeciding = Boolean(inFlightDecisions[gap.gapId]);

          return (
            <AdminSearchCandidateCard key={gap.gapId}>
              <AdminSearchCandidateHeader>
                <div>
                  <AdminEyebrow>
                    {gap.area} / {gap.decisionOwner}
                  </AdminEyebrow>
                  <CatchText as="h3" variant="sectionTitle">{gap.gapId.replaceAll("_", " ")}</CatchText>
                </div>
                <StatusChip tone={gap.status === "ready" ? "ready" : ""}>
                  {gap.severity}
                </StatusChip>
              </AdminSearchCandidateHeader>
              <AdminIntakeStateGrid>
                <StateRow label="Status" value={gap.status.replaceAll("_", " ")} />
                <StateRow label="Decision" value={gap.decisionStatus.replaceAll("_", " ")} />
                <StateRow label="Default" value={gap.defaultPosition.replaceAll("_", " ")} />
                <StateRow label="State" value={gap.currentState} />
                <StateRow label="Next" value={gap.nextAction} />
              </AdminIntakeStateGrid>
              {submittedDecision ? (
                <AdminIntakeDecisionState>
                  <CheckCircle2 size={16} strokeWidth={1.9} />
                  <div>
                    <strong>{policyGapDecisionLabel(submittedDecision)}</strong>
                    <span>
                      {localDecision ?
                        `${localDecision.decisionPath} / ${localDecision.operationalState}` :
                        `Decision present in ${gap.reviewDecision?.policyGapDecisionBatchId}`}
                    </span>
                  </div>
                </AdminIntakeDecisionState>
              ) : (
                <AdminIntakeDecisionBox>
                  <CatchField
                    recipe="input"
                    title="Policy review note"
                    onChanged={(note) => onNoteChange(gap.gapId, note)}
                    maxLines={3}
                    value={notes[gap.gapId] ?? ""}
                  />
                  <AdminIntakeDecisionActions>
                    <AdminButton
                      disabled={isDeciding}
                      onClick={() => onDecision(gap, "accept")}
                      variant="primary"
                    >
                      {inFlightDecisions[gap.gapId] === "accept" ?
                        "Accepting" :
                        "Accept"}
                    </AdminButton>
                    <AdminButton
                      disabled={isDeciding}
                      onClick={() => onDecision(gap, "hold")}
                    >
                      {inFlightDecisions[gap.gapId] === "hold" ?
                        "Holding" :
                        "Hold"}
                    </AdminButton>
                    <AdminButton
                      disabled={isDeciding}
                      onClick={() => onDecision(gap, "reject")}
                    >
                      {inFlightDecisions[gap.gapId] === "reject" ?
                        "Rejecting" :
                        "Reject"}
                    </AdminButton>
                  </AdminIntakeDecisionActions>
                </AdminIntakeDecisionBox>
              )}
              {gap.reviewDecision ? (
                <AdminIntakeSection>
                  <AdminIntakeSectionTitle>Reviewed Decision</AdminIntakeSectionTitle>
                  <AdminIntakeStateGrid>
                    <StateRow label="Decision" value={gap.reviewDecision.decision} />
                    <StateRow label="Reviewer" value={gap.reviewDecision.reviewer} />
                    <StateRow label="Date" value={gap.reviewDecision.decidedAt} />
                    <StateRow label="Note" value={gap.reviewDecision.note} />
                    <StateRow
                      label="Missing inputs"
                      value={String(gap.reviewDecision.missingRequiredInputs.length)}
                    />
                    <StateRow
                      label="Batch"
                      value={gap.reviewDecision.policyGapDecisionBatchId}
                    />
                  </AdminIntakeStateGrid>
                </AdminIntakeSection>
              ) : null}
              <AdminOrganizerPolicyGapColumns>
                <div>
                  <AdminIntakeSectionTitle>Required Inputs</AdminIntakeSectionTitle>
                  <AdminTagList>
                    {gap.requiredInputs.map((input) => (
                      <AdminTag key={input}>
                        {input}
                      </AdminTag>
                    ))}
                  </AdminTagList>
                </div>
                <div>
                  <AdminIntakeSectionTitle>Unblock Criteria</AdminIntakeSectionTitle>
                  <AdminTagList>
                    {gap.unblockCriteria.map((criterion) => (
                      <AdminTag key={criterion} tone="muted">
                        {criterion}
                      </AdminTag>
                    ))}
                  </AdminTagList>
                </div>
              </AdminOrganizerPolicyGapColumns>
              <AdminCommandStack>
                {gap.blockedArtifacts.map((artifact) => (
                  <AdminCommandRow key={artifact}>
                    <span>artifact</span>
                    <code>{artifact}</code>
                  </AdminCommandRow>
                ))}
              </AdminCommandStack>
            </AdminSearchCandidateCard>
          );
        })}
      </AdminSearchCandidateList>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerPolicyDecisionPacketsView({
  packets,
}: {
  packets: Intake.OrganizerPolicyDecisionPackets;
}) {
  const visiblePackets = packets.packets.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Packets" value={String(packets.summary.packets)} />
        <StateRow label="Need decision" value={String(packets.summary.decisionRequired)} />
        <StateRow label="Questions" value={String(packets.summary.questions)} />
        <StateRow label="Unanswered" value={String(packets.summary.unansweredQuestions)} />
        <StateRow label="Accepted" value={String(packets.summary.accepted)} />
        <StateRow label="Held" value={String(packets.summary.held)} />
      </AdminIntakeStateGrid>
      <AdminTagList>
        {Object.entries(packets.summary.questionsByArea).map(([area, count]) => (
          <AdminTag key={area} tone="muted">
            {area} x{count}
          </AdminTag>
        ))}
        {Object.entries(packets.summary.questionsByAnswerState).map(([state, count]) => (
          <AdminTag key={state} tone="muted">
            {state.replaceAll("_", " ")} x{count}
          </AdminTag>
        ))}
        {packets.guardrails.map((guardrail) => (
          <AdminTag key={guardrail} tone="muted">
            {guardrail}
          </AdminTag>
        ))}
      </AdminTagList>
      <AdminSearchCandidateList>
        {visiblePackets.map((packet) => (
          <AdminSearchCandidateCard key={packet.packetId}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {packet.area} / {packet.decisionOwner}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{packet.decisionPrompt}</CatchText>
              </div>
              <StatusChip tone={packet.status === "ready" ? "ready" : ""}>
                {packet.severity}
              </StatusChip>
            </AdminSearchCandidateHeader>

            <AdminIntakeStateGrid>
              <StateRow label="Gap" value={packet.gapId} />
              <StateRow label="Decision" value={packet.decisionStatus.replaceAll("_", " ")} />
              <StateRow label="Safe default" value={packet.safeDefaultAction.replaceAll("_", " ")} />
              <StateRow label="Gate" value={packet.implementationGate} />
            </AdminIntakeStateGrid>

            <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
              <strong>{packet.currentState}</strong>
              <span>{packet.nextAction}</span>
            </QualityRow>

            <AdminIntakeSection>
              <AdminIntakeSectionTitle>Required Inputs</AdminIntakeSectionTitle>
              <AdminTagList>
                {packet.questions.map((question) => (
                  <AdminTag
                    key={question.questionId}
                    tone={question.answerState === "reviewed" ? "neutral" : "muted"}
                  >
                    {question.input}
                  </AdminTag>
                ))}
              </AdminTagList>
            </AdminIntakeSection>

            <AdminCommandStack>
              {packet.blockedArtifacts.map((artifact) => (
                <AdminCommandRow key={artifact}>
                  <span>blocked</span>
                  <code>{artifact}</code>
                </AdminCommandRow>
              ))}
            </AdminCommandStack>
          </AdminSearchCandidateCard>
        ))}
      </AdminSearchCandidateList>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerCanonicalHostRegistryView({
  registry,
}: {
  registry: Intake.OrganizerCanonicalHostEntityRegistry;
}) {
  const visibleEntries = registry.entries.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Entities" value={String(registry.summary.entities)} />
        <StateRow label="Public" value={String(registry.summary.publicPublished)} />
        <StateRow label="Indexed" value={String(registry.summary.indexed)} />
        <StateRow label="Claim targets" value={String(registry.summary.claimTargets)} />
        <StateRow label="Surfaces" value={String(registry.summary.surfaces)} />
        <StateRow label="Crawl-capable" value={String(registry.summary.crawlCapableSurfaces)} />
      </AdminIntakeStateGrid>
      <AdminTagList>
        <AdminTag>{registry.naming.publicEntityLabel}</AdminTag>
        <AdminTag tone="muted">
          {registry.naming.canonicalDataModel}
        </AdminTag>
        <AdminTag tone="muted">
          {registry.naming.legacyCompatibilityModel}
        </AdminTag>
        {Object.entries(registry.summary.byEntityKind).map(([kind, count]) => (
          <AdminTag key={kind} tone="muted">
            {kind} x{count}
          </AdminTag>
        ))}
        {Object.entries(registry.summary.byScopeKind).map(([scope, count]) => (
          <AdminTag key={scope} tone="muted">
            {scope} x{count}
          </AdminTag>
        ))}
      </AdminTagList>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>{registry.naming.note}</strong>
        <span>{registry.guardrails[0]}</span>
      </QualityRow>
      <AdminSearchCandidateList>
        {visibleEntries.map((entry) => (
          <AdminSearchCandidateCard key={entry.canonicalHostId}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {entry.entityKind} / {entry.geography.scopeKind ?? "unknown"}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{entry.displayName}</CatchText>
              </div>
              <StatusChip tone={entry.publicPresence.publishStatus === "published" ? "ready" : ""}>
                {entry.publicPresence.publishStatus}
              </StatusChip>
            </AdminSearchCandidateHeader>

            <AdminIntakeStateGrid>
              <StateRow label="Host id" value={entry.canonicalHostId} />
              <StateRow label="Path" value={entry.publicPresence.canonicalPath ?? "none"} />
              <StateRow label="Index" value={entry.publicPresence.indexStatus} />
              <StateRow label="App" value={entry.publicPresence.appVisibility} />
              <StateRow label="Claim" value={entry.claim.claimState} />
              <StateRow label="Club doc" value={entry.legacyClubCompatibility.documentId} />
            </AdminIntakeStateGrid>

            <AdminTagList>
              {entry.geography.markets.map((market) => (
                <AdminTag key={market.marketSlug}>
                  {market.displayName}
                </AdminTag>
              ))}
              <AdminTag tone="muted">
                {entry.surfaceInventory.active} active
              </AdminTag>
              <AdminTag tone="muted">
                {entry.surfaceInventory.ambiguous} ambiguous
              </AdminTag>
              <AdminTag tone="muted">
                {entry.surfaceInventory.rejected} rejected
              </AdminTag>
              <AdminTag tone="muted">
                {entry.dedupe.strongKeys} strong keys
              </AdminTag>
            </AdminTagList>

            <AdminCommandStack>
              {entry.nextActions.map((action) => (
                <AdminCommandRow key={action}>
                  <span>next</span>
                  <code>{action}</code>
                </AdminCommandRow>
              ))}
            </AdminCommandStack>
          </AdminSearchCandidateCard>
        ))}
      </AdminSearchCandidateList>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerCanonicalEvidenceIndexView({
  index,
}: {
  index: Intake.OrganizerCanonicalEvidenceIndex;
}) {
  const visibleRecords = index.records.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Records" value={String(index.summary.records)} />
        <StateRow label="Resolved" value={String(index.summary.resolvedArtifactRefs)} />
        <StateRow label="Missing" value={String(index.summary.surfacesWithoutEvidence)} />
        <StateRow label="Manual" value={String(index.summary.manualReportsWithoutArtifacts)} />
        <StateRow label="Raw payloads" value={String(index.summary.rawProviderArtifacts)} />
        <StateRow label="Raw bytes" value={index.summary.rawPayloadBytes.toLocaleString()} />
      </AdminIntakeStateGrid>
      <AdminTagList>
        {Object.entries(index.summary.evidenceByStatus).map(([status, count]) => (
          <AdminTag key={status} tone="muted">
            {status.replaceAll("_", " ")} x{count}
          </AdminTag>
        ))}
        {Object.entries(index.summary.evidenceByType).map(([type, count]) => (
          <AdminTag key={type} tone="muted">
            {type} x{count}
          </AdminTag>
        ))}
      </AdminTagList>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>{index.guardrails[0]}</strong>
        <span>{index.guardrails[1]}</span>
      </QualityRow>
      <AdminSearchCandidateList>
        {visibleRecords.map((record) => (
          <AdminSearchCandidateCard key={record.evidenceId}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {record.surface.platform} / {record.surface.status}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{record.displayName}</CatchText>
              </div>
              <StatusChip tone={record.evidence.status === "resolved_artifact" ? "ready" : ""}>
                {record.evidence.status.replaceAll("_", " ")}
              </StatusChip>
            </AdminSearchCandidateHeader>

            <AdminIntakeStateGrid>
              <StateRow label="Surface" value={record.surface.surfaceId} />
              <StateRow label="Type" value={record.evidence.type} />
              <StateRow label="Publish" value={record.reviewState.publishStatus ?? "unknown"} />
              <StateRow label="Claim" value={record.reviewState.claimState ?? "unknown"} />
              <StateRow
                label="Artifact"
                value={record.artifact ? record.artifact.artifactKind : "none"}
              />
              <StateRow
                label="SHA"
                value={record.artifact ? record.artifact.sha256.slice(0, 12) : "none"}
              />
            </AdminIntakeStateGrid>

            <AdminTagList>
              {record.riskFlags.length === 0 ? (
                <AdminTag>no flags</AdminTag>
              ) : (
                record.riskFlags.map((flag) => (
                  <AdminTag key={flag} tone="muted">
                    {flag.replaceAll("_", " ")}
                  </AdminTag>
                ))
              )}
            </AdminTagList>

            <AdminCommandStack>
              <AdminCommandRow>
                <span>ref</span>
                <code>{record.evidence.ref ?? "none"}</code>
              </AdminCommandRow>
              <AdminCommandRow>
                <span>next</span>
                <code>{record.nextAction}</code>
              </AdminCommandRow>
            </AdminCommandStack>
          </AdminSearchCandidateCard>
        ))}
      </AdminSearchCandidateList>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerPublicationReviewPacketsView({
  packets,
}: {
  packets: Intake.OrganizerPublicationReviewPackets;
}) {
  const visiblePackets = packets.packets.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Packets" value={String(packets.summary.packets)} />
        <StateRow label="Ready" value={String(packets.summary.readyForManualPublicationReview)} />
        <StateRow label="Blocked" value={String(packets.summary.blockedByData)} />
        <StateRow label="Published" value={String(packets.summary.published)} />
        <StateRow label="Evidence" value={String(packets.summary.evidenceRecords)} />
        <StateRow label="Manual refs" value={String(packets.summary.manualReportsWithoutArtifacts)} />
      </AdminIntakeStateGrid>
      <AdminTagList>
        {Object.entries(packets.summary.packetsByStatus).map(([status, count]) => (
          <AdminTag key={status} tone="muted">
            {status.replaceAll("_", " ")} x{count}
          </AdminTag>
        ))}
        {Object.entries(packets.summary.packetsByTaskType).map(([type, count]) => (
          <AdminTag key={type} tone="muted">
            {type.replaceAll("_", " ")} x{count}
          </AdminTag>
        ))}
      </AdminTagList>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>{packets.guardrails[0]}</strong>
        <span>{packets.guardrails[1]}</span>
      </QualityRow>
      <AdminSearchCandidateList>
        {visiblePackets.map((packet) => (
          <AdminSearchCandidateCard key={packet.packetId}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {packet.taskType.replaceAll("_", " ")} / {packet.priority}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{packet.displayName}</CatchText>
              </div>
              <StatusChip tone={packet.status === "ready_for_manual_publication_review" ? "ready" : ""}>
                {packet.status.replaceAll("_", " ")}
              </StatusChip>
            </AdminSearchCandidateHeader>

            <AdminIntakeStateGrid>
              <StateRow label="Path" value={packet.publicPresence.canonicalPath ?? "none"} />
              <StateRow label="Index" value={packet.publicPresence.indexStatus} />
              <StateRow label="App" value={packet.publicPresence.appVisibility} />
              <StateRow label="Evidence" value={String(packet.evidenceSummary.records)} />
              <StateRow label="Data blockers" value={String(packet.dataBlockers.length)} />
              <StateRow label="Evidence blockers" value={String(packet.evidenceBlockers.length)} />
            </AdminIntakeStateGrid>

            <QualityRow icon={<CheckCircle2 size={16} strokeWidth={1.9} />}>
              <strong>{packet.recommendedAction}</strong>
              <span>{packet.publicDraft.headline ?? packet.entityId}</span>
            </QualityRow>

            <AdminIntakeSection>
              <AdminIntakeSectionTitle>Evidence review</AdminIntakeSectionTitle>
              <AdminIntakeStateGrid>
                <StateRow label="Shown" value={`${packet.evidenceReview.shownRecords}/${packet.evidenceReview.totalRecords}`} />
                <StateRow label="Artifacts" value={String(packet.evidenceReview.artifactBackedRecords)} />
                <StateRow label="Manual" value={String(packet.evidenceReview.manualReportsWithoutArtifacts)} />
                <StateRow label="Unresolved" value={String(packet.evidenceReview.unresolvedLocalRefs)} />
              </AdminIntakeStateGrid>
              <AdminCommandStack>
                {packet.evidenceReview.records.slice(0, 6).map((record) => (
                  <AdminCommandRow key={record.evidenceId}>
                    <span>
                      {record.surface.platform} / {record.evidence.status.replaceAll("_", " ")}
                    </span>
                    <code>{publicationEvidenceReviewLine(record)}</code>
                    <AdminTagList>
                      <AdminTag tone={record.reviewerUse.artifactAvailable ? "neutral" : "muted"}>
                        {record.reviewerUse.artifactAvailable ? "artifact" : "no artifact"}
                      </AdminTag>
                      <AdminTag tone="muted">
                        {record.surface.status.replaceAll("_", " ")}
                      </AdminTag>
                      {record.riskFlags.slice(0, 4).map((flag) => (
                        <AdminTag key={flag} tone="muted">
                          {flag.replaceAll("_", " ")}
                        </AdminTag>
                      ))}
                    </AdminTagList>
                  </AdminCommandRow>
                ))}
                {packet.evidenceReview.truncated ? (
                  <AdminCommandRow>
                    <span>more</span>
                    <code>{packet.evidenceReview.totalRecords - packet.evidenceReview.shownRecords} additional evidence records</code>
                  </AdminCommandRow>
                ) : null}
              </AdminCommandStack>
            </AdminIntakeSection>

            <AdminTagList>
              {packet.publicDraft.formats.map((format) => (
                <AdminTag key={format}>
                  {format}
                </AdminTag>
              ))}
              {packet.evidenceSummary.riskFlags.map((flag) => (
                <AdminTag key={flag} tone="muted">
                  {flag.replaceAll("_", " ")}
                </AdminTag>
              ))}
            </AdminTagList>

            <AdminCommandStack>
              <AdminCommandRow>
                <span>decision</span>
                <code>{packet.adminDecision.command}</code>
              </AdminCommandRow>
              {packet.nextActions.map((action) => (
                <AdminCommandRow key={action}>
                  <span>next</span>
                  <code>{action}</code>
                </AdminCommandRow>
              ))}
            </AdminCommandStack>
          </AdminSearchCandidateCard>
        ))}
      </AdminSearchCandidateList>
    </AdminSearchCandidatePanel>
  );
}

function publicationEvidenceReviewLine(
  record: Intake.OrganizerPublicationEvidenceReviewRecord
) {
  const surface = record.surface.surfaceId ?? "unknown surface";
  const ref = record.evidence.ref ?? record.surface.url ?? "manual report";
  const artifact = record.artifact ?
    `${record.artifact.artifactKind} ${record.artifact.sha256.slice(0, 12)}` :
    "no artifact";
  const candidates = [
    ...record.correlatedCandidates.searchCandidateIds,
    ...record.correlatedCandidates.externalEventCandidateIds,
  ];
  const candidateText = candidates.length > 0 ?
    ` / candidates ${candidates.slice(0, 3).join(", ")}` :
    "";
  return `${surface} / ${record.evidence.type} / ${ref} / ${artifact} / next ${record.nextAction}${candidateText}`;
}

function OrganizerPublicationImpactPreviewView({
  preview,
}: {
  preview: Intake.OrganizerPublicationDecisionImpactPreview;
}) {
  const visibleEntries = preview.entries.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Impacts" value={String(preview.summary.impacts)} />
        <StateRow label="Would publish" value={String(preview.summary.wouldPublish)} />
        <StateRow label="Would index" value={String(preview.summary.wouldIndex)} />
        <StateRow label="Claim targets" value={String(preview.summary.wouldCreateClaimTargets)} />
        <StateRow label="App visible" value={String(preview.summary.wouldBeAppDiscoverable)} />
        <StateRow label="Manual acks" value={String(preview.summary.reviewerAcknowledgementsRequired)} />
      </AdminIntakeStateGrid>
      <AdminTagList>
        {Object.entries(preview.summary.byStatus).map(([status, count]) => (
          <AdminTag key={status} tone="muted">
            {status.replaceAll("_", " ")} x{count}
          </AdminTag>
        ))}
      </AdminTagList>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>{preview.guardrails[0]}</strong>
        <span>{preview.guardrails[1]}</span>
      </QualityRow>
      <AdminSearchCandidateList>
        {visibleEntries.map((entry) => (
          <AdminSearchCandidateCard key={entry.impactId}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {entry.entityId} / {entry.decisionRequired.decision}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{entry.displayName}</CatchText>
              </div>
              <StatusChip tone={entry.status.includes("would_publish") ? "ready" : ""}>
                {entry.status.replaceAll("_", " ")}
              </StatusChip>
            </AdminSearchCandidateHeader>

            <AdminIntakeStateGrid>
              <StateRow label="Path" value={entry.publicProjection.canonicalPath ?? "none"} />
              <StateRow label="Publish" value={entry.publicProjection.publishStatus} />
              <StateRow label="Index" value={entry.publicProjection.indexing} />
              <StateRow label="Claim" value={entry.claimTarget.path ?? "none"} />
              <StateRow label="App" value={entry.app.appVisibility} />
              <StateRow label="Sitemap" value={entry.remoteEffects.sitemapEligible ? "eligible" : "excluded"} />
            </AdminIntakeStateGrid>

            <AdminTagList>
              {entry.preconditions.reviewerAcknowledgementRequired ? (
                <AdminTag tone="muted">
                  manual reports require acknowledgement
                </AdminTag>
              ) : (
                <AdminTag>packet ready</AdminTag>
              )}
              {entry.publicProjection.legacyPaths.map((legacyPath) => (
                <AdminTag key={legacyPath} tone="muted">
                  legacy {legacyPath}
                </AdminTag>
              ))}
              {entry.preconditions.blockers?.map((blocker) => (
                <AdminTag key={blocker} tone="muted">
                  {blocker.replaceAll("_", " ")}
                </AdminTag>
              ))}
            </AdminTagList>

            <AdminCommandStack>
              {entry.commands.map((command) => (
                <AdminCommandRow key={command}>
                  <span>next</span>
                  <code>{command}</code>
                </AdminCommandRow>
              ))}
            </AdminCommandStack>
          </AdminSearchCandidateCard>
        ))}
      </AdminSearchCandidateList>
    </AdminSearchCandidatePanel>
  );
}

function readinessGateTone(status: string) {
  if (status === "ready") return "passed";
  return "blocked";
}

function healthStatusTone(status: string) {
  if (status === "ready" || status === "clear" || status === "idle") {
    return "ready";
  }
  return "";
}

function coverageStatusTone(status: string) {
  if (
    status === "covered_by_input_request" ||
    status === "covered_by_follow_up"
  ) {
    return "ready";
  }
  return "";
}

function promotionPhaseTone(status: string) {
  if (
    status === "ready" ||
    status === "ready_for_firestore_dry_run" ||
    status === "ready_after_reviewed_firestore_dry_run"
  ) {
    return "ready";
  }
  if (
    status.startsWith("blocked") ||
    status.startsWith("disabled") ||
    status.startsWith("waiting")
  ) {
    return "blocked";
  }
  return "";
}

function sourceResolutionTone(status: string) {
  if (status === "auto_attach" || status === "singleton") return "ready";
  if (status === "needs_human_review") return "blocked";
  return "";
}

function formatHealthMetric(value: string | number | boolean | null) {
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "yes" : "no";
  return value ?? "none";
}

export const organizerIntakeEvidencePanels = {
  OrganizerPromotionExecutionView,
  OrganizerPolicyGapRegisterView,
  OrganizerPolicyDecisionPacketsView,
  OrganizerCanonicalHostRegistryView,
  OrganizerCanonicalEvidenceIndexView,
  OrganizerPublicationReviewPacketsView,
  publicationEvidenceReviewLine,
  OrganizerPublicationImpactPreviewView,
  readinessGateTone,
  healthStatusTone,
  coverageStatusTone,
  promotionPhaseTone,
  sourceResolutionTone,
  formatHealthMetric,
};
