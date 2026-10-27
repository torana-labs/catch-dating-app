import {CatchBadge} from "@catch/web-ui";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Database,
  FileWarning,
  FolderSearch,
  LineChart,
  RefreshCw,
  Settings2,
  UserCheck,
  Users,
} from "lucide-react";

import {
  AdminCommandRow,
  AdminCommandStack,
  AdminGuardrailList,
  AdminIntakeLayout,
  AdminIntakeSectionTitle,
  AdminIntakeSourceList,
  AdminIntakeStateGrid,
  AdminMetricCard,
  AdminMetricGrid,
  AdminOrganizerIntakeCurationPanel,
  AdminOrganizerIntakeList,
  AdminTagList,
  EmptyState,
  Panel,
  QualityRow,
  StateRow,
} from "../../../../shared/ui/AdminPrimitives";
import {
  curationFormKey,
  defaultCurationForm,
} from "../controllers/organizerIntakeHelpers";
import type {OrganizerIntakeController} from
  "../controllers/useOrganizerIntakeController";
import type {OrganizerIntakeBridge} from
  "../types/organizerIntakeTypes";
import {organizerIntakeDiscoveryPanels} from "./organizerIntakeDiscoveryPanels";
import {organizerIntakeEventPanels} from "./organizerIntakeEventPanels";
import {organizerIntakeEvidencePanels} from "./organizerIntakeEvidencePanels";
import {organizerIntakeReadinessPanels} from "./organizerIntakeReadinessPanels";

function OrganizerIntakeDiagnostics({
  bridge,
  controller,
}: {
  bridge: OrganizerIntakeBridge;
  controller: OrganizerIntakeController;
}) {
  const {
    curationForms,
    curationInFlight,
    decisionInFlight,
    decisionNotes,
    eventDecisionInFlight,
    eventDecisionNotes,
    handleAttachCandidate,
    handleDecision,
    handleEventDecision,
    handleItemCuration,
    handleLocationResolution,
    handlePendingInputDecision,
    handlePolicyGapDecision,
    localCuration,
    localDecisions,
    localEventDecisions,
    localLocationResolutions,
    localPolicyDecisions,
    locationResolutionForms,
    locationResolutionInFlight,
    manualReportAcknowledgements,
    metrics,
    policyDecisionInFlight,
    policyDecisionNotes,
    publicationPacketByEntity,
    setCurationForms,
    setDecisionNotes,
    setEventDecisionNotes,
    setLocationResolutionForms,
    setManualReportAcknowledgements,
    setPolicyDecisionNotes,
    selectedMatchByCandidate,
    setSelectedMatchByCandidate,
  } = controller;
  return (
    <>
      <AdminMetricGrid ariaLabel="Organizer intake diagnostic metrics">
        {metrics.map((metric) => (
          <AdminMetricCard
            key={metric.label}
            label={metric.label}
            tone={metric.label === "Blocked" ? "attention" : "normal"}
            value={metric.value.toLocaleString()}
            variant="tile"
          />
        ))}
      </AdminMetricGrid>
      <AdminIntakeLayout>
        <Panel span={2} icon={<Settings2 size={18} />} title="Workflow readiness" action={bridge.workflowReadiness.status.replaceAll("_", " ")}>
          <organizerIntakeReadinessPanels.OrganizerWorkflowReadinessView readiness={bridge.workflowReadiness} />
        </Panel>
        <Panel span={2} icon={<FileWarning size={18} />} title="Operator action queue" action={`${bridge.operatorActionQueue.summary.actions} actions`}>
          <organizerIntakeReadinessPanels.OrganizerOperatorActionQueueView queue={bridge.operatorActionQueue} />
        </Panel>
        <Panel span={2} icon={<Activity size={18} />} title="Operational health" action={bridge.operationalHealth.summary.healthStatus.replaceAll("_", " ")}>
          <organizerIntakeReadinessPanels.OrganizerOperationalHealthView health={bridge.operationalHealth} />
        </Panel>
        <Panel span={2} icon={<CheckCircle2 size={18} />} title="Pending work coverage" action={bridge.pendingWorkCoverage.summary.status.replaceAll("_", " ")}>
          <organizerIntakeReadinessPanels.OrganizerPendingWorkCoverageView coverage={bridge.pendingWorkCoverage} />
        </Panel>
        <Panel span={2} icon={<UserCheck size={18} />} title="Pending admin/product inputs" action={`${bridge.pendingInputRequest.summary.requests} inputs`}>
          <organizerIntakeReadinessPanels.OrganizerPendingInputRequestView
            onPendingDecision={handlePendingInputDecision}
            policyDecisions={localPolicyDecisions}
            policyInFlight={policyDecisionInFlight}
            publicationDecisions={localDecisions}
            publicationInFlight={decisionInFlight}
            request={bridge.pendingInputRequest}
          />
        </Panel>
        <Panel span={2} icon={<FileWarning size={18} />} title="Reviewed answer packets" action={bridge.reviewedDecisionAnswerPackets.summary.status.replaceAll("_", " ")}>
          <organizerIntakeReadinessPanels.OrganizerReviewedDecisionAnswerPacketsView register={bridge.reviewedDecisionAnswerPackets} />
        </Panel>
        <Panel span={2} icon={<RefreshCw size={18} />} title="Promotion execution" action={bridge.promotionExecutionPacket.summary.status.replaceAll("_", " ")}>
          <organizerIntakeEvidencePanels.OrganizerPromotionExecutionView packet={bridge.promotionExecutionPacket} />
        </Panel>
        <Panel span={2} icon={<Users size={18} />} title="Canonical host registry" action={`${bridge.canonicalHostEntities.summary.entities} entities`}>
          <organizerIntakeEvidencePanels.OrganizerCanonicalHostRegistryView registry={bridge.canonicalHostEntities} />
        </Panel>
        <Panel span={2} icon={<Database size={18} />} title="Canonical evidence index" action={`${bridge.canonicalEvidenceIndex.summary.resolvedArtifactRefs} resolved`}>
          <organizerIntakeEvidencePanels.OrganizerCanonicalEvidenceIndexView index={bridge.canonicalEvidenceIndex} />
        </Panel>
        <Panel span={2} icon={<CheckCircle2 size={18} />} title="Publication review packets" action={`${bridge.publicationReviewPackets.summary.readyForManualPublicationReview} ready`}>
          <organizerIntakeEvidencePanels.OrganizerPublicationReviewPacketsView packets={bridge.publicationReviewPackets} />
        </Panel>
        <Panel span={2} icon={<LineChart size={18} />} title="Publication impact preview" action={`${bridge.publicationDecisionImpactPreview.summary.wouldPublish} would publish`}>
          <organizerIntakeEvidencePanels.OrganizerPublicationImpactPreviewView preview={bridge.publicationDecisionImpactPreview} />
        </Panel>
        <Panel span={2} icon={<Database size={18} />} title="Claim-target sync preview" action={`${bridge.claimTargetSyncPreview.summary.writesNeeded} writes`}>
          <organizerIntakeDiscoveryPanels.OrganizerClaimTargetSyncPreviewView preview={bridge.claimTargetSyncPreview} />
        </Panel>
        <Panel span={2} icon={<FileWarning size={18} />} title="Policy gap register" action={`${bridge.policyGaps.summary.reviewDecisions} reviewed`}>
          <organizerIntakeEvidencePanels.OrganizerPolicyGapRegisterView
            inFlightDecisions={policyDecisionInFlight}
            localDecisions={localPolicyDecisions}
            notes={policyDecisionNotes}
            onDecision={(gap, decision) => void handlePolicyGapDecision(gap, decision)}
            onNoteChange={(gapId, note) => setPolicyDecisionNotes((current) => ({...current, [gapId]: note}))}
            register={bridge.policyGaps}
          />
        </Panel>
        <Panel span={2} icon={<FileWarning size={18} />} title="Policy decision packets" action={`${bridge.policyDecisionPackets.summary.unansweredQuestions} inputs`}>
          <organizerIntakeEvidencePanels.OrganizerPolicyDecisionPacketsView packets={bridge.policyDecisionPackets} />
        </Panel>
        <Panel span={2} icon={<Clock3 size={18} />} title="Event crawl run plan" action={`${bridge.crawlRunPlan.summary.blocked} blocked`}>
          <organizerIntakeDiscoveryPanels.OrganizerCrawlRunPlanView plan={bridge.crawlRunPlan} />
        </Panel>
        <Panel span={2} icon={<Database size={18} />} title="Raw artifact storage" action={`${bridge.rawArtifactStorage.summary.remoteUploadBlocked} blocked`}>
          <organizerIntakeDiscoveryPanels.OrganizerRawArtifactStorageView manifest={bridge.rawArtifactStorage} />
        </Panel>
        <Panel span={2} icon={<FolderSearch size={18} />} title="Discovery search plan" action={`${bridge.discoverySearchPlan.summary.launchCityPlanned} launch queries`}>
          <organizerIntakeDiscoveryPanels.OrganizerDiscoverySearchPlanView plan={bridge.discoverySearchPlan} />
        </Panel>
        <Panel span={2} icon={<FileWarning size={18} />} title="Publishing contract anchors" action="app + website schemas">
          <organizerIntakeDiscoveryPanels.OrganizerPublishingContractsView contracts={bridge.publishingContracts} />
        </Panel>
        <Panel span={2} icon={<LineChart size={18} />} title="Source mention resolution" action={`${bridge.sourceMentionResolution.resolutionClusters.summary.clusters} clusters`}>
          <organizerIntakeDiscoveryPanels.OrganizerSourceMentionResolutionView resolution={bridge.sourceMentionResolution} />
        </Panel>
        <Panel span={2} icon={<FolderSearch size={18} />} title="Search surface candidates" action={`${bridge.searchCandidates.summary.candidates} surfaces`}>
          <organizerIntakeDiscoveryPanels.OrganizerSearchCandidateQueueView
            curationInFlight={curationInFlight}
            localCuration={localCuration}
            onAttachCandidate={(candidate) => void handleAttachCandidate(candidate)}
            onSelectMatch={(candidateId, organizerId) =>
              setSelectedMatchByCandidate((current) => ({...current,
                [candidateId]: organizerId}))}
            selectedMatchByCandidate={selectedMatchByCandidate}
            queue={bridge.searchCandidates}
          />
        </Panel>
        <Panel span={2} icon={<Activity size={18} />} title="External event candidates" action={bridge.externalEventCandidates.policy.status}>
          <organizerIntakeEventPanels.OrganizerExternalEventCandidateQueueView
            decisionInFlight={eventDecisionInFlight}
            localDecisions={localEventDecisions}
            notes={eventDecisionNotes}
            onDecision={(candidate, decision, blockerResolutions) =>
              void handleEventDecision(
                candidate,
                decision,
                blockerResolutions
              )}
            onNoteChange={(candidateId, note) => setEventDecisionNotes((current) => ({...current, [candidateId]: note}))}
            queue={bridge.externalEventCandidates}
          />
        </Panel>
        <Panel span={2} icon={<FolderSearch size={18} />} title="External event location resolution" action={`${bridge.externalEventLocationResolution.summary.tasks} tasks`}>
          <organizerIntakeEventPanels.OrganizerExternalEventLocationResolutionView
            forms={locationResolutionForms}
            inFlight={locationResolutionInFlight}
            localResolutions={localLocationResolutions}
            onFormChange={(taskId, form) => setLocationResolutionForms((current) => ({...current, [taskId]: form}))}
            onResolve={(task) => void handleLocationResolution(task)}
            queue={bridge.externalEventLocationResolution}
          />
        </Panel>
        <Panel span={2} icon={<Database size={18} />} title="External event import plan" action={bridge.externalEventImportPlan.policy.status}>
          <organizerIntakeEventPanels.OrganizerExternalEventImportPlanView plan={bridge.externalEventImportPlan} />
        </Panel>
        <Panel span={2} icon={<Settings2 size={18} />} title="External event import preflight" action={bridge.externalEventImportExecutionPlan.policy.status}>
          <organizerIntakeEventPanels.OrganizerExternalEventImportExecutionPlanView plan={bridge.externalEventImportExecutionPlan} />
        </Panel>
        <Panel icon={<Database size={18} />} title="Bridge guardrails" action={`Schema v${bridge.schemaVersion}`}>
          <AdminGuardrailList>
            {bridge.guardrails.map((guardrail) => (
              <QualityRow key={guardrail} tone="warning" icon={<FileWarning size={16} />}>
                <strong>{guardrail}</strong>
              </QualityRow>
            ))}
          </AdminGuardrailList>
          <AdminIntakeSourceList>
            {Object.entries(bridge.generatedFrom).map(([label, source]) => (
              <StateRow key={label} label={label} value={source} />
            ))}
          </AdminIntakeSourceList>
          <AdminOrganizerIntakeCurationPanel>
            <AdminIntakeSectionTitle>Dedupe curation</AdminIntakeSectionTitle>
            <AdminIntakeStateGrid>
              <StateRow label="Operations" value={String(bridge.curation.summary.operations)} />
              <StateRow label="Attached" value={String(bridge.curation.summary.attachedSurfaces ?? 0)} />
              <StateRow label="Merges" value={String(bridge.curation.summary.merges)} />
              <StateRow label="Surface decisions" value={String(bridge.curation.summary.surfaceDecisions)} />
            </AdminIntakeStateGrid>
            <AdminCommandStack>
              {Object.entries(bridge.curation.commands).map(([label, command]) => (
                <AdminCommandRow key={label}><span>{label}</span><code>{command}</code></AdminCommandRow>
              ))}
            </AdminCommandStack>
          </AdminOrganizerIntakeCurationPanel>
        </Panel>
        <Panel icon={<Activity size={18} />} title="Event crawl readiness" action={bridge.crawlPlan.policy.status}>
          <AdminIntakeStateGrid>
            <StateRow label="Scheduler" value={bridge.crawlPlan.policy.schedulerEnabled ? "enabled" : "disabled"} />
            <StateRow label="Default policy" value={bridge.crawlPlan.policy.defaultSurfacePolicy} />
            <StateRow label="Capable" value={String(bridge.crawlPlan.summary.crawlCapableSurfaces)} />
            <StateRow label="Blocked" value={String(bridge.crawlPlan.summary.blockedSurfaces)} />
          </AdminIntakeStateGrid>
          <AdminTagList>
            {Object.entries(bridge.crawlPlan.summary.platforms).map(([platform, count]) => (
              <CatchBadge key={platform} label={`${platform} x${count}`} />
            ))}
          </AdminTagList>
        </Panel>
        <Panel span={2} icon={<FolderSearch size={18} />} title="Private entity queue" action={`${bridge.items.length} entities`}>
          <AdminOrganizerIntakeList>
            {bridge.items.length === 0 ? (
              <EmptyState icon={<CheckCircle2 size={16} />}>Clear</EmptyState>
            ) : bridge.items.map((item) => {
              const curationForm = curationForms[item.entityId] ?? defaultCurationForm(item);
              const curationKey = curationFormKey(item, curationForm);
              return (
                <organizerIntakeEventPanels.OrganizerIntakeCard
                  key={item.entityId}
                  curationForm={curationForm}
                  curationInFlight={curationInFlight[curationKey] === true}
                  curationResult={localCuration[curationKey]}
                  entityOptions={bridge.items}
                  inFlightDecision={decisionInFlight[item.entityId]}
                  item={item}
                  localDecision={localDecisions[item.entityId]}
                  manualReportsAcknowledged={manualReportAcknowledgements[item.entityId] === true}
                  note={decisionNotes[item.entityId] ?? ""}
                  publicationPacket={publicationPacketByEntity.get(item.entityId)}
                  onCurationFormChange={(form) => setCurationForms((current) => ({...current, [item.entityId]: form}))}
                  onCurationSubmit={(form) => void handleItemCuration(item, form)}
                  onDecision={(decision) => void handleDecision(item, decision)}
                  onManualReportsAcknowledgedChange={(checked) => setManualReportAcknowledgements((current) => ({...current, [item.entityId]: checked}))}
                  onNoteChange={(note) => setDecisionNotes((current) => ({...current, [item.entityId]: note}))}
                />
              );
            })}
          </AdminOrganizerIntakeList>
        </Panel>
      </AdminIntakeLayout>
    </>
  );
}

export const organizerIntakeDiagnostics = {OrganizerIntakeDiagnostics};
