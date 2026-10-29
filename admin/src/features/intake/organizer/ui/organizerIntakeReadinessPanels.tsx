import {CheckCircle2, Clock3, FileWarning, Lock} from "lucide-react";
import {
  AdminButton,
  EmptyState,
  QualityRow,
  StateRow,
  AdminCommandRow,
  AdminCommandStack,
  AdminEyebrow,
  AdminIntakeGate,
  AdminIntakeGateList,
  AdminIntakeDecisionActions,
  AdminTagList,
  AdminIntakeSection,
  AdminIntakeSectionTitle,
  AdminSearchCandidateCard,
  AdminSearchCandidateHeader,
  AdminSearchCandidateList,
  AdminSearchCandidatePanel,
  AdminOrganizerIntakeSurfaceGrid,
} from "../../../../shared/ui/AdminPrimitives";
import {
  pendingInputDecisionLabel,
  pendingInputDecisionProgressLabel,
  pendingInputDecisionState,
  pendingInputInFlightDecision,
  pendingInputSubmittedDecision,
} from "../controllers/organizerIntakeHelpers";
import type {
  AdminDecideOrganizerIntakeResponse,
  AdminDecideOrganizerPolicyGapResponse,
  OrganizerCurationOperation,
  OrganizerIntakeDecision,
  OrganizerPolicyGapDecision,
  OrganizerSurfaceDecision,
} from "../../../../shared/types/adminTypes";
import type * as Intake from "../types/organizerIntakeTypes";
import {organizerIntakeEvidencePanels} from "./organizerIntakeEvidencePanels";
import {CatchBadge, CatchText} from "@catch/web-ui";

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

function OrganizerWorkflowReadinessView({
  readiness,
}: {
  readiness: Intake.OrganizerWorkflowReadiness;
}) {
  return (
    <AdminSearchCandidatePanel>
      <AdminOrganizerIntakeSurfaceGrid>
        <StateRow label="Ready" value={String(readiness.summary.ready)} />
        <StateRow label="Review" value={String(readiness.summary.reviewNeeded)} />
        <StateRow label="Waiting" value={String(readiness.summary.waiting)} />
        <StateRow label="Policy" value={String(readiness.summary.policyNeeded)} />
      </AdminOrganizerIntakeSurfaceGrid>
      <AdminTagList>
        <CatchBadge label={`local pipeline ${readiness.summary.localPromotionPipelineReady ? "ready" : "blocked"}`} />
        <CatchBadge label={`public projection ${readiness.summary.publicProjectionReady ? "ready" : "waiting"}`} />
        <CatchBadge label={`claim sync ${readiness.summary.claimSyncReady ? "ready" : "waiting"}`} />
        <CatchBadge label={`crawl ${readiness.summary.recurringCrawlEnabled ? "enabled" : "disabled"}`} />
      </AdminTagList>
      <AdminIntakeGateList>
        {readiness.gates.map((gate) => (
          <AdminIntakeGate
            tone={organizerIntakeEvidencePanels.readinessGateTone(gate.status)}
            key={gate.id}
          >
            {gate.status === "ready" ? (
              <CheckCircle2 size={15} strokeWidth={1.9} />
            ) : gate.status === "policy_needed" ? (
              <Clock3 size={15} strokeWidth={1.9} />
            ) : (
              <FileWarning size={15} strokeWidth={1.9} />
            )}
            <div>
              <strong>{gate.label}</strong>
              <span>{gate.detail}</span>
              <span>{gate.nextAction}</span>
            </div>
          </AdminIntakeGate>
        ))}
      </AdminIntakeGateList>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Commands</AdminIntakeSectionTitle>
        <AdminCommandStack>
          {Object.entries(readiness.commands).map(([label, command]) => (
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

function OrganizerOperatorActionQueueView({
  queue,
}: {
  queue: Intake.OrganizerOperatorActionQueue;
}) {
  const visibleActions = queue.actions.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminOrganizerIntakeSurfaceGrid>
        <StateRow label="Actions" value={String(queue.summary.actions)} />
        <StateRow label="Admin" value={String(queue.summary.adminDecisionsRequired)} />
        <StateRow label="Policy" value={String(queue.summary.policyInputsRequired)} />
        <StateRow label="Waiting" value={String(queue.summary.waitingActions)} />
      </AdminOrganizerIntakeSurfaceGrid>
      <AdminTagList>
        {Object.entries(queue.summary.actionsByPriority).map(([priority, count]) => (
          <CatchBadge key={priority} label={`${priority} x${count}`} />
        ))}
        {Object.entries(queue.summary.actionsByType).map(([type, count]) => (
          <CatchBadge key={type} label={`${type.replaceAll("_", " ")} x${count}`} />
        ))}
      </AdminTagList>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>{queue.guardrails[0]}</strong>
        <span>{queue.guardrails[1]}</span>
      </QualityRow>
      <AdminSearchCandidateList>
        {visibleActions.map((action) => (
          <AdminSearchCandidateCard key={action.actionId}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {action.actionType.replaceAll("_", " ")} / {action.priority}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{action.subjectName}</CatchText>
              </div>
              <CatchBadge recipe="status" tone={action.status === "requires_admin_decision" ? "success" : "neutral"} label={action.status.replaceAll("_", " ")} />
            </AdminSearchCandidateHeader>

            <AdminOrganizerIntakeSurfaceGrid>
              <StateRow label="Subject" value={action.subjectId} />
              <StateRow label="Task" value={action.taskType.replaceAll("_", " ")} />
              <StateRow label="Options" value={String(action.decisionOptions.length)} />
              <StateRow label="Blockers" value={String(action.blockers.length)} />
            </AdminOrganizerIntakeSurfaceGrid>

            <QualityRow icon={<FileWarning size={16} strokeWidth={1.9} />}>
              <strong>{action.nextAction}</strong>
              <span>{action.detail}</span>
            </QualityRow>

            <AdminTagList>
              {action.decisionOptions.map((option) => (
                <CatchBadge key={option} label={option.replaceAll("_", " ")} />
              ))}
              {action.requiredAcknowledgements?.manualReportsReviewed ? (
                <CatchBadge label="manual reports" />
              ) : null}
              {(action.requiredInputs ?? []).slice(0, 6).map((input) => (
                <CatchBadge key={input} label={input.replaceAll("_", " ")} />
              ))}
              {action.impact?.wouldIndex ? (
                <CatchBadge label="indexable" />
              ) : null}
              {action.impact?.wouldCreateClaimTarget ? (
                <CatchBadge label="claim target" />
              ) : null}
            </AdminTagList>

            <AdminCommandStack>
              {action.commands.slice(0, 3).map((command, index) => (
                <AdminCommandRow key={`${action.actionId}:${index}`}>
                  <span>{index === 0 ? "command" : "then"}</span>
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

function OrganizerOperationalHealthView({
  health,
}: {
  health: Intake.OrganizerOperationalHealthReport;
}) {
  const visibleWorkstreams = health.workstreams.slice(0, 6);

  return (
    <AdminSearchCandidatePanel>
      <AdminOrganizerIntakeSurfaceGrid>
        <StateRow label="Status" value={health.summary.healthStatus.replaceAll("_", " ")} />
        <StateRow label="Workstreams" value={String(health.summary.workstreams)} />
        <StateRow label="Action" value={String(health.summary.actionRequiredWorkstreams)} />
        <StateRow label="Policy" value={String(health.summary.policyBlockedWorkstreams)} />
        <StateRow label="Waiting" value={String(health.summary.waitingWorkstreams)} />
        <StateRow label="Ready" value={String(health.summary.readyWorkstreams)} />
      </AdminOrganizerIntakeSurfaceGrid>
      <AdminTagList>
        {Object.entries(health.summary.workstreamsByPriority).map(([priority, count]) => (
          <CatchBadge key={priority} label={`${priority} x${count}`} />
        ))}
        {Object.entries(health.summary.workstreamsByStatus).map(([status, count]) => (
          <CatchBadge key={status} label={`${status.replaceAll("_", " ")} x${count}`} />
        ))}
      </AdminTagList>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>{health.guardrails[0]}</strong>
        <span>{health.guardrails[1]}</span>
      </QualityRow>
      <AdminSearchCandidateList>
        {visibleWorkstreams.map((stream) => (
          <AdminSearchCandidateCard key={stream.id}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {stream.priority} / {stream.id.replaceAll("_", " ")}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{stream.label}</CatchText>
              </div>
              <CatchBadge recipe="status" tone={organizerIntakeEvidencePanels.healthStatusTone(stream.status)} label={stream.status.replaceAll("_", " ")} />
            </AdminSearchCandidateHeader>

            <AdminOrganizerIntakeSurfaceGrid>
              {Object.entries(stream.metrics).slice(0, 6).map(([metric, value]) => (
                <StateRow
                  key={metric}
                  label={metric.replaceAll("_", " ")}
                  value={organizerIntakeEvidencePanels.formatHealthMetric(value)}
                />
              ))}
            </AdminOrganizerIntakeSurfaceGrid>

            {stream.nextActions.length > 0 ? (
              <QualityRow icon={<FileWarning size={16} strokeWidth={1.9} />}>
                <strong>{stream.nextActions[0]}</strong>
                {stream.nextActions.slice(1, 3).map((action) => (
                  <span key={action}>{action}</span>
                ))}
              </QualityRow>
            ) : null}

            <AdminTagList>
              {stream.blockers.slice(0, 6).map((blocker) => (
                <CatchBadge key={blocker} label={blocker.replaceAll("_", " ")} />
              ))}
            </AdminTagList>

            <AdminCommandStack>
              {stream.commands.slice(0, 2).map((command, index) => (
                <AdminCommandRow key={`${stream.id}:${index}`}>
                  <span>{index === 0 ? "command" : "then"}</span>
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

function OrganizerPendingWorkCoverageView({
  coverage,
}: {
  coverage: Intake.OrganizerPendingWorkCoverage;
}) {
  const visibleEntries = coverage.entries.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminOrganizerIntakeSurfaceGrid>
        <StateRow
          label="Status"
          value={coverage.summary.status.replaceAll("_", " ")}
        />
        <StateRow
          label="Unresolved"
          value={String(coverage.summary.unresolvedWorkstreams)}
        />
        <StateRow
          label="Covered"
          value={String(coverage.summary.coveredWorkstreams)}
        />
        <StateRow
          label="Input-covered"
          value={String(coverage.summary.coveredByInputRequest)}
        />
        <StateRow
          label="Follow-up"
          value={String(coverage.summary.coveredByFollowUp)}
        />
        <StateRow
          label="Untriaged"
          value={String(coverage.summary.untriagedWorkstreams)}
        />
      </AdminOrganizerIntakeSurfaceGrid>
      <AdminTagList>
        {coverage.summary.highestPriority ? (
          <CatchBadge label={`highest ${coverage.summary.highestPriority}`} />
        ) : null}
        {Object.entries(coverage.summary.coverageByStatus).map(([status, count]) => (
          <CatchBadge key={status} label={`${status.replaceAll("_", " ")} x${count}`} />
        ))}
        {Object.entries(coverage.summary.workstreamsByPriority).map(([priority, count]) => (
          <CatchBadge key={priority} label={`${priority} x${count}`} />
        ))}
      </AdminTagList>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>{coverage.guardrails[0]}</strong>
        <span>{coverage.guardrails[1]}</span>
      </QualityRow>
      <AdminSearchCandidateList>
        {visibleEntries.map((entry) => (
          <AdminSearchCandidateCard key={entry.coverageId}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {entry.priority} / {entry.workstreamId.replaceAll("_", " ")}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{entry.label}</CatchText>
              </div>
              <CatchBadge recipe="status" tone={organizerIntakeEvidencePanels.coverageStatusTone(entry.coverageStatus)} label={entry.coverageStatus.replaceAll("_", " ")} />
            </AdminSearchCandidateHeader>

            <AdminOrganizerIntakeSurfaceGrid>
              <StateRow label="Status" value={entry.status.replaceAll("_", " ")} />
              <StateRow
                label="Blocker"
                value={entry.blockerClass.replaceAll("_", " ")}
              />
              <StateRow
                label="Requests"
                value={String(entry.pendingRequestIds.length)}
              />
              <StateRow
                label="Follow-ups"
                value={String(entry.followUpIds.length)}
              />
            </AdminOrganizerIntakeSurfaceGrid>

            {entry.nextActions.length > 0 ? (
              <QualityRow icon={<FileWarning size={16} strokeWidth={1.9} />}>
                <strong>{entry.nextActions[0]}</strong>
                {entry.nextActions.slice(1, 3).map((action) => (
                  <span key={action}>{action}</span>
                ))}
              </QualityRow>
            ) : null}

            <AdminTagList>
              {entry.pendingRequestIds.slice(0, 6).map((requestId) => (
                <CatchBadge key={requestId} label={requestId.replaceAll("_", " ")} />
              ))}
              {entry.followUpIds.slice(0, 6).map((followUpId) => (
                <CatchBadge key={followUpId} label={followUpId.replaceAll("_", " ")} />
              ))}
              {entry.blockers.slice(0, 6).map((blocker) => (
                <CatchBadge key={blocker} label={blocker} />
              ))}
            </AdminTagList>

            <AdminCommandStack>
              {entry.commands.slice(0, 3).map((command, index) => (
                <AdminCommandRow key={`${entry.coverageId}:${index}`}>
                  <span>{index === 0 ? "command" : "then"}</span>
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

function OrganizerPendingInputRequestView({
  onPendingDecision,
  policyDecisions,
  policyInFlight,
  publicationDecisions,
  publicationInFlight,
  request,
}: {
  onPendingDecision: (
    input: Intake.OrganizerPendingInputItem,
    decision: string
  ) => void;
  policyDecisions: Record<string, AdminDecideOrganizerPolicyGapResponse>;
  policyInFlight: Record<string, OrganizerPolicyGapDecision>;
  publicationDecisions: Record<string, AdminDecideOrganizerIntakeResponse>;
  publicationInFlight: Record<string, OrganizerIntakeDecision>;
  request: Intake.OrganizerPendingInputRequest;
}) {
  const visibleRequests = request.requests.slice(0, 8);
  const visibleFollowUps = request.followUps.slice(0, 6);

  return (
    <AdminSearchCandidatePanel>
      <AdminOrganizerIntakeSurfaceGrid>
        <StateRow label="Inputs" value={String(request.summary.requests)} />
        <StateRow label="Admin" value={String(request.summary.adminPublicationRequests)} />
        <StateRow label="Policy" value={String(request.summary.policyDecisionRequests)} />
        <StateRow label="Questions" value={String(request.summary.requiredPolicyQuestions)} />
        <StateRow label="Manual acks" value={String(request.summary.manualPublicationAcknowledgements)} />
        <StateRow label="Follow-ups" value={String(request.summary.workflowFollowUps)} />
      </AdminOrganizerIntakeSurfaceGrid>
      <AdminTagList>
        {request.summary.highestPriority ? (
          <CatchBadge label={`highest ${request.summary.highestPriority}`} />
        ) : null}
        {Object.entries(request.summary.requestsByOwner).map(([owner, count]) => (
          <CatchBadge key={owner} label={`${owner.replaceAll("_", " ")} x${count}`} />
        ))}
        {Object.entries(request.summary.requestsByType).map(([type, count]) => (
          <CatchBadge key={type} label={`${type.replaceAll("_", " ")} x${count}`} />
        ))}
      </AdminTagList>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>{request.guardrails[0]}</strong>
        <span>{request.guardrails[1]}</span>
      </QualityRow>
      <AdminSearchCandidateList>
        {visibleRequests.map((input) => {
          const submittedDecision =
            pendingInputSubmittedDecision({
              input,
              policyDecisions,
              publicationDecisions,
            });
          const inFlightDecision =
            pendingInputInFlightDecision({
              input,
              policyInFlight,
              publicationInFlight,
            });
          const isDeciding = Boolean(inFlightDecision);

          return (
            <AdminSearchCandidateCard key={input.requestId}>
              <AdminSearchCandidateHeader>
                <div>
                  <AdminEyebrow>
                    {input.requestType.replaceAll("_", " ")} / {input.priority}
                  </AdminEyebrow>
                  <CatchText as="h3" variant="sectionTitle">{input.subjectName}</CatchText>
                </div>
                <CatchBadge recipe="status" tone={input.priority === "p0" ? "success" : "neutral"} label={input.owner.replaceAll("_", " ")} />
              </AdminSearchCandidateHeader>
              <QualityRow icon={<FileWarning size={16} strokeWidth={1.9} />}>
                <strong>{input.prompt}</strong>
                <span>Safe default: {input.safeDefaultAction.replaceAll("_", " ")}</span>
              </QualityRow>
              <AdminOrganizerIntakeSurfaceGrid>
                <StateRow label="Subject" value={input.subjectId} />
                <StateRow label="Options" value={input.decisionOptions.join(", ")} />
                <StateRow
                  label="Required inputs"
                  value={String(input.requiredInputs?.length ?? 0)}
                />
                <StateRow
                  label="Manual ack"
                  value={input.requiredAcknowledgements?.manualReportsReviewed ? "required" : "not required"}
                />
                <StateRow
                  label="Would publish"
                  value={input.impact?.wouldPublish ? "yes" : "no"}
                />
                <StateRow
                  label="Claim target"
                  value={input.impact?.claimTargetPath ?? "none"}
                />
              </AdminOrganizerIntakeSurfaceGrid>
              <AdminTagList>
                {input.decisionOptions.map((option) => (
                  <CatchBadge key={option} label={option.replaceAll("_", " ")} />
                ))}
                {input.requiredAcknowledgements?.manualReportsReviewed ? (
                  <CatchBadge label="manual reports reviewed" />
                ) : null}
                {(input.requiredAcknowledgements?.publicationChecklist ?? [])
                  .slice(0, 8)
                  .map((acknowledgement) => (
                    <CatchBadge key={acknowledgement} label={acknowledgement.replaceAll("_", " ")} />
                  ))}
                {(input.currentState?.riskFlags as string[] | undefined)
                  ?.slice(0, 8)
                  .map((flag) => (
                    <CatchBadge key={flag} label={flag.replaceAll("_", " ")} />
                  ))}
              </AdminTagList>
              {input.requiredInputs && input.requiredInputs.length > 0 ? (
                <AdminIntakeSection>
                  <AdminIntakeSectionTitle>Required Policy Inputs</AdminIntakeSectionTitle>
                  <AdminCommandStack>
                    {input.requiredInputs.slice(0, 6).map((requiredInput) => (
                      <AdminCommandRow key={requiredInput.questionId ?? requiredInput.prompt}>
                        <span>{requiredInput.input ?? "input"}</span>
                        <code>
                          {requiredInput.prompt} Default: {requiredInput.recommendedSafeDefault}
                        </code>
                      </AdminCommandRow>
                    ))}
                  </AdminCommandStack>
                </AdminIntakeSection>
              ) : null}
              {input.callableSubmission ? (
                <AdminIntakeSection>
                  <AdminIntakeSectionTitle>Callable Payloads</AdminIntakeSectionTitle>
                  <AdminOrganizerIntakeSurfaceGrid>
                    <StateRow
                      label="Callable"
                      value={input.callableSubmission.callableName}
                    />
                    <StateRow
                      label="Wrapper"
                      value={input.callableSubmission.adminApiWrapper}
                    />
                    <StateRow
                      label="Payload"
                      value={input.callableSubmission.payloadType}
                    />
                    <StateRow
                      label="Collection"
                      value={input.callableSubmission.firestoreCollection}
                    />
                  </AdminOrganizerIntakeSurfaceGrid>
                  <AdminCommandStack>
                    {Object.entries(input.callableSubmission.payloadsByDecision)
                      .slice(0, 4)
                      .map(([decision, payload]) => (
                        <AdminCommandRow key={`${input.requestId}:payload:${decision}`}>
                          <span>{decision.replaceAll("_", " ")}</span>
                          <code>{JSON.stringify(payload)}</code>
                        </AdminCommandRow>
                      ))}
                  </AdminCommandStack>
                  {submittedDecision ? (
                    <QualityRow tone="success" icon={<CheckCircle2 size={16} strokeWidth={1.9} />}>
                      <strong>
                        {pendingInputDecisionLabel(submittedDecision.decision)}
                      </strong>
                      <span>
                        {submittedDecision.decisionPath} / {pendingInputDecisionState(submittedDecision)}
                      </span>
                    </QualityRow>
                  ) : (
                    <AdminIntakeDecisionActions>
                      {input.decisionOptions.map((decision) => {
                        const payloadAvailable = Boolean(
                          input.callableSubmission?.payloadsByDecision[decision]
                        );
                        return (
                          <AdminButton
                            disabled={isDeciding || !payloadAvailable}
                            key={`${input.requestId}:decision:${decision}`}
                            onClick={() => onPendingDecision(input, decision)}
                          >
                            {inFlightDecision === decision ?
                              pendingInputDecisionProgressLabel(decision) :
                              pendingInputDecisionLabel(decision)}
                          </AdminButton>
                        );
                      })}
                    </AdminIntakeDecisionActions>
                  )}
                </AdminIntakeSection>
              ) : null}
              <AdminCommandStack>
                {input.commands.slice(0, 4).map((command, index) => (
                  <AdminCommandRow key={`${input.requestId}:${index}`}>
                    <span>{index === 0 ? "command" : "then"}</span>
                    <code>{command}</code>
                  </AdminCommandRow>
                ))}
              </AdminCommandStack>
            </AdminSearchCandidateCard>
          );
        })}
      </AdminSearchCandidateList>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Workflow Follow-ups</AdminIntakeSectionTitle>
        <AdminSearchCandidateList>
          {visibleFollowUps.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={16} strokeWidth={1.9} />}>
              No follow-ups are pending.
            </EmptyState>
          ) : (
            visibleFollowUps.map((followUp) => (
              <AdminSearchCandidateCard key={followUp.followUpId}>
                <AdminSearchCandidateHeader>
                  <div>
                    <AdminEyebrow>
                      {followUp.priority} / {followUp.workstreamId.replaceAll("_", " ")}
                    </AdminEyebrow>
                    <CatchText as="h3" variant="sectionTitle">{followUp.label}</CatchText>
                  </div>
                  <CatchBadge recipe="status" tone={organizerIntakeEvidencePanels.healthStatusTone(followUp.status)} label={followUp.status.replaceAll("_", " ")} />
                </AdminSearchCandidateHeader>
                <QualityRow icon={<FileWarning size={16} strokeWidth={1.9} />}>
                  <strong>{followUp.nextActions[0] ?? "Review workflow state."}</strong>
                  {followUp.nextActions.slice(1, 3).map((action) => (
                    <span key={action}>{action}</span>
                  ))}
                </QualityRow>
                <AdminTagList>
                  {followUp.blockers.slice(0, 8).map((blocker) => (
                    <CatchBadge key={blocker} label={blocker.replaceAll("_", " ")} />
                  ))}
                </AdminTagList>
                <AdminCommandStack>
                  {followUp.commands.slice(0, 2).map((command, index) => (
                    <AdminCommandRow key={`${followUp.followUpId}:${index}`}>
                      <span>{index === 0 ? "command" : "then"}</span>
                      <code>{command}</code>
                    </AdminCommandRow>
                  ))}
                </AdminCommandStack>
              </AdminSearchCandidateCard>
            ))
          )}
        </AdminSearchCandidateList>
      </AdminIntakeSection>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerReviewedDecisionAnswerPacketsView({
  register,
}: {
  register: Intake.OrganizerReviewedDecisionAnswerPacketRegister;
}) {
  const visibleEntries = register.entries.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminOrganizerIntakeSurfaceGrid>
        <StateRow
          label="Status"
          value={register.summary.status.replaceAll("_", " ")}
        />
        <StateRow label="Packets" value={String(register.summary.packets)} />
        <StateRow label="Ready" value={String(register.summary.readyToApply)} />
        <StateRow
          label="Awaiting"
          value={String(register.summary.awaitingAnswers)}
        />
        <StateRow label="Stale" value={String(register.summary.stale)} />
        <StateRow label="Invalid" value={String(register.summary.invalid)} />
      </AdminOrganizerIntakeSurfaceGrid>
      <AdminTagList>
        <CatchBadge label={`root ${register.generatedFrom.answerPacketsRoot}`} />
        <CatchBadge label={`source ${register.generatedFrom.generatedAnswerPacket}`} />
        <CatchBadge label={`fresh x${register.summary.sourceFresh}`} />
      </AdminTagList>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>{register.guardrails[0]}</strong>
        <span>{register.guardrails[1]}</span>
      </QualityRow>
      <AdminSearchCandidateList>
        {visibleEntries.length === 0 ? (
          <EmptyState icon={<Clock3 size={16} strokeWidth={1.9} />}>
            No reviewed answer packets exist yet.
          </EmptyState>
        ) : (
          visibleEntries.map((entry) => (
            <AdminSearchCandidateCard key={entry.path}>
              <AdminSearchCandidateHeader>
                <div>
                  <AdminEyebrow>
                    {entry.sourceFreshness.replaceAll("_", " ")}
                  </AdminEyebrow>
                  <CatchText as="h3" variant="sectionTitle">{entry.path}</CatchText>
                </div>
                <CatchBadge recipe="status" tone={entry.readyToApply ? "success" : "neutral"} label={entry.status.replaceAll("_", " ")} />
              </AdminSearchCandidateHeader>

              <AdminOrganizerIntakeSurfaceGrid>
                <StateRow label="Reviewer" value={entry.reviewer ?? "unknown"} />
                <StateRow label="Date" value={entry.decidedAt ?? "unknown"} />
                <StateRow label="Slots" value={String(entry.answerSlots)} />
                <StateRow
                  label="Planned actions"
                  value={String(entry.plannedActions)}
                />
                <StateRow
                  label="Pending answers"
                  value={String(entry.pendingAnswers)}
                />
                <StateRow
                  label="Source"
                  value={entry.sourceFresh ? "fresh" : entry.sourceFreshness}
                />
              </AdminOrganizerIntakeSurfaceGrid>

              {(entry.errors.length > 0 || entry.warnings.length > 0) ? (
                <QualityRow tone="warning" icon={<FileWarning size={16} strokeWidth={1.9} />}>
                  <strong>
                    {entry.errors[0] ?? entry.warnings[0]}
                  </strong>
                  {[...entry.errors.slice(1, 3), ...entry.warnings.slice(1, 3)]
                    .slice(0, 3)
                    .map((message) => (
                      <span key={message}>{message}</span>
                    ))}
                </QualityRow>
              ) : null}

              <AdminTagList>
                {entry.readyToApply ? (
                  <CatchBadge label="ready to apply" />
                ) : null}
                {entry.awaitingAnswers ? (
                  <CatchBadge label="awaiting answers" />
                ) : null}
                {entry.stale ? (
                  <CatchBadge label="stale source" />
                ) : null}
                {entry.invalid ? (
                  <CatchBadge label="invalid packet" />
                ) : null}
              </AdminTagList>
            </AdminSearchCandidateCard>
          ))
        )}
      </AdminSearchCandidateList>
    </AdminSearchCandidatePanel>
  );
}

export const organizerIntakeReadinessPanels = {
  OrganizerWorkflowReadinessView,
  OrganizerOperatorActionQueueView,
  OrganizerOperationalHealthView,
  OrganizerPendingWorkCoverageView,
  OrganizerPendingInputRequestView,
  OrganizerReviewedDecisionAnswerPacketsView,
};
