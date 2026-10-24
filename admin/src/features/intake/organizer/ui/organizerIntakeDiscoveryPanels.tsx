import {CatchText, CatchField} from "@catch/web-ui";
import {CheckCircle2, FileWarning, Lock} from "lucide-react";
import {
  AdminButton,
  AdminCommandRow,
  AdminCommandStack,
  AdminEyebrow,
  AdminIntakeDecisionState,
  AdminIntakeGate,
  AdminIntakeGateList,
  AdminIntakeSection,
  AdminIntakeSectionTitle,
  AdminIntakeStateGrid,
  AdminSearchCandidateActions,
  AdminSearchCandidateCard,
  AdminSearchCandidateHeader,
  AdminSearchCandidateList,
  AdminSearchCandidatePanel,
  AdminSearchCandidateSnippet,
  AdminTag,
  AdminTagList,
  EmptyState,
  QualityRow,
  selectOptions,
  StateRow,
  StatusChip,
} from "../../../../shared/ui/AdminPrimitives";
import type {
  AdminRecordOrganizerCurationResponse,
  OrganizerCurationOperation,
  OrganizerSurfaceDecision,
} from "../../../../shared/types/adminTypes";
import type * as Intake from "../types/organizerIntakeTypes";
import {organizerIntakeEvidencePanels} from "./organizerIntakeEvidencePanels";

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

function OrganizerClaimTargetSyncPreviewView({
  preview,
}: {
  preview: Intake.OrganizerClaimTargetSyncPreview;
}) {
  const visibleActions = preview.actions.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Targets" value={String(preview.summary.targets)} />
        <StateRow label="Creates" value={String(preview.summary.creates)} />
        <StateRow label="Refreshes" value={String(preview.summary.refreshes)} />
        <StateRow label="Owner-bound" value={String(preview.summary.skippedOwnerBound)} />
        <StateRow label="Writes" value={String(preview.summary.writesNeeded)} />
        <StateRow label="Remote writes" value={String(preview.mode.remoteWrites)} />
      </AdminIntakeStateGrid>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>{preview.guardrails[0]}</strong>
        <span>{preview.guardrails[1]}</span>
      </QualityRow>
      <AdminTagList>
        <AdminTag tone="muted">
          source {preview.mode.existingDocsSource}
        </AdminTag>
        {preview.mode.assumesMissingWhenNotInFixture ? (
          <AdminTag tone="muted">missing docs assumed absent</AdminTag>
        ) : null}
      </AdminTagList>
      <AdminSearchCandidateList>
        {visibleActions.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={16} strokeWidth={1.9} />}>
            No claim-target sync actions until a public approval exists.
          </EmptyState>
        ) : (
          visibleActions.map((action) => (
            <AdminSearchCandidateCard key={`${action.path}-${action.status}`}>
              <AdminSearchCandidateHeader>
                <div>
                  <AdminEyebrow>
                    {action.entityId} / {action.reason.replaceAll("_", " ")}
                  </AdminEyebrow>
                  <CatchText as="h3" variant="sectionTitle">{action.path}</CatchText>
                </div>
                <StatusChip tone={action.writesRemoteData ? "ready" : ""}>
                  {action.status.replaceAll("_", " ")}
                </StatusChip>
              </AdminSearchCandidateHeader>

              <AdminIntakeStateGrid>
                <StateRow label="Merge" value={action.merge ? "merge" : "set"} />
                <StateRow label="Fields" value={String(action.writeFieldCount)} />
                <StateRow label="Dry run" value={action.requiresFirestoreDryRun ? "required" : "not required"} />
              </AdminIntakeStateGrid>

              <AdminTagList>
                {action.writeFields.slice(0, 12).map((field) => (
                  <AdminTag key={field} tone="muted">
                    {field}
                  </AdminTag>
                ))}
              </AdminTagList>
            </AdminSearchCandidateCard>
          ))
        )}
      </AdminSearchCandidateList>
      <AdminCommandStack>
        {Object.entries(preview.commands).map(([label, command]) => (
          <AdminCommandRow key={label}>
            <span>{label}</span>
            <code>{command}</code>
          </AdminCommandRow>
        ))}
      </AdminCommandStack>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerCrawlRunPlanView({
  plan,
}: {
  plan: Intake.OrganizerCrawlRunPlan;
}) {
  const visibleIntents = plan.runIntents.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Scheduler" value={plan.policy.schedulerEnabled ? "enabled" : "disabled"} />
        <StateRow label="Network" value={plan.policy.networkEnabled ? "enabled" : "disabled"} />
        <StateRow label="Request cap" value={String(plan.policy.maxRequestsPerRun)} />
        <StateRow label="Would fetch" value={String(plan.summary.wouldFetch)} />
        <StateRow label="Blocked" value={String(plan.summary.blocked)} />
        <StateRow label="Writes" value={String(plan.summary.firestoreWrites)} />
      </AdminIntakeStateGrid>
      <AdminTagList>
        {plan.policy.platformAllowlist.length === 0 ? (
          <AdminTag tone="muted">No platform allowlist</AdminTag>
        ) : (
          plan.policy.platformAllowlist.map((platform) => (
            <AdminTag key={platform}>{platform}</AdminTag>
          ))
        )}
        {plan.guardrails.map((guardrail) => (
          <AdminTag key={guardrail} tone="muted">
            {guardrail}
          </AdminTag>
        ))}
      </AdminTagList>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Run blockers</AdminIntakeSectionTitle>
        <AdminTagList>
          {Object.entries(plan.summary.blockers)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([blocker, count]) => (
              <AdminTag key={blocker} tone="muted">
                {blocker} x{count}
              </AdminTag>
            ))}
        </AdminTagList>
      </AdminIntakeSection>
      <AdminSearchCandidateList>
        {visibleIntents.map((intent) => (
          <AdminSearchCandidateCard key={intent.crawlRunId}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {intent.platform} / {intent.surfaceKind}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{intent.displayName}</CatchText>
              </div>
              <StatusChip tone={intent.action === "would_fetch" ? "ready" : ""}>
                {intent.action.replaceAll("_", " ")}
              </StatusChip>
            </AdminSearchCandidateHeader>
            <AdminIntakeStateGrid>
              <StateRow label="Run" value={intent.crawlRunId} />
              <StateRow label="Surface" value={intent.surfaceId} />
              <StateRow label="Next" value={intent.nextGate.replaceAll("_", " ")} />
              <StateRow label="Output" value={intent.expectedOutput} />
            </AdminIntakeStateGrid>
            <AdminTagList>
              {intent.blockedBy.length === 0 ? (
                <AdminTag>ready for reviewed capture</AdminTag>
              ) : (
                intent.blockedBy.map((blocker) => (
                  <AdminTag key={blocker} tone="muted">
                    {blocker}
                  </AdminTag>
                ))
              )}
            </AdminTagList>
          </AdminSearchCandidateCard>
        ))}
      </AdminSearchCandidateList>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerRawArtifactStorageView({
  manifest,
}: {
  manifest: Intake.OrganizerRawArtifactStorageManifest;
}) {
  const visibleArtifacts = manifest.artifacts.slice(0, 8);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Policy" value={manifest.policy.status.replaceAll("_", " ")} />
        <StateRow label="Object storage" value={manifest.policy.remoteObjectStorageEnabled ? "enabled" : "disabled"} />
        <StateRow label="Firestore raw" value={manifest.summary.firestoreRawStorageAllowed ? "allowed" : "forbidden"} />
        <StateRow label="Raw payloads" value={String(manifest.summary.rawProviderPayloads)} />
        <StateRow label="Upload blocked" value={String(manifest.summary.remoteUploadBlocked)} />
        <StateRow label="Bytes" value={manifest.summary.totalBytes.toLocaleString()} />
      </AdminIntakeStateGrid>
      <AdminTagList>
        <AdminTag tone="muted">provider: {manifest.policy.provider}</AdminTag>
        <AdminTag tone="muted">
          bucket: {manifest.policy.bucket ?? "not configured"}
        </AdminTag>
        <AdminTag tone="muted">
          retention: {manifest.policy.rawPayloadRetentionDays ?? "not configured"}
        </AdminTag>
        {manifest.guardrails.map((guardrail) => (
          <AdminTag key={guardrail} tone="muted">
            {guardrail}
          </AdminTag>
        ))}
      </AdminTagList>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Storage blockers</AdminIntakeSectionTitle>
        <AdminTagList>
          {Object.entries(manifest.summary.blockers).length === 0 ? (
            <AdminTag>No upload blockers</AdminTag>
          ) : (
            Object.entries(manifest.summary.blockers)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([blocker, count]) => (
                <AdminTag key={blocker} tone="muted">
                  {blocker} x{count}
                </AdminTag>
              ))
          )}
        </AdminTagList>
      </AdminIntakeSection>
      <AdminSearchCandidateList>
        {visibleArtifacts.map((artifact) => (
          <AdminSearchCandidateCard key={artifact.artifactId}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {artifact.storageClass} / {artifact.artifactKind}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{artifact.path}</CatchText>
              </div>
              <StatusChip tone={artifact.storagePlan.action === "would_upload" ? "ready" : ""}>
                {artifact.storagePlan.action.replaceAll("_", " ")}
              </StatusChip>
            </AdminSearchCandidateHeader>
            <AdminIntakeStateGrid>
              <StateRow label="Firestore" value={artifact.firestoreMode.replaceAll("_", " ")} />
              <StateRow label="Retention" value={artifact.retention.status.replaceAll("_", " ")} />
              <StateRow label="Bytes" value={artifact.sizeBytes.toLocaleString()} />
              <StateRow label="Object key" value={artifact.storagePlan.remoteObjectKey} />
            </AdminIntakeStateGrid>
            <AdminTagList>
              {artifact.storagePlan.blockedBy.length === 0 ? (
                <AdminTag>storage policy satisfied</AdminTag>
              ) : (
                artifact.storagePlan.blockedBy.map((blocker) => (
                  <AdminTag key={blocker} tone="muted">
                    {blocker}
                  </AdminTag>
                ))
              )}
            </AdminTagList>
          </AdminSearchCandidateCard>
        ))}
      </AdminSearchCandidateList>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerSearchCandidateQueueView({
  curationInFlight,
  localCuration,
  onAttachCandidate,
  onSelectMatch,
  queue,
  selectedMatchByCandidate,
}: {
  curationInFlight: Record<string, boolean>;
  localCuration: Record<string, AdminRecordOrganizerCurationResponse>;
  onAttachCandidate: (candidate: Intake.OrganizerSearchCandidate) => void;
  onSelectMatch: (candidateId: string, organizerId: string) => void;
  queue: Intake.OrganizerSearchCandidateQueue;
  selectedMatchByCandidate: Record<string, string>;
}) {
  const platformEntries = Object.entries(queue.summary.platforms)
    .sort(([left], [right]) => left.localeCompare(right));
  const visibleCandidates = queue.candidates.slice(0, 12);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Batches" value={String(queue.summary.batches)} />
        <StateRow label="Results" value={String(queue.summary.results)} />
        <StateRow label="Matched" value={String(queue.summary.matchedExistingEntities)} />
        <StateRow label="Duplicate keys" value={String(queue.summary.duplicateNormalizedKeys)} />
      </AdminIntakeStateGrid>
      <AdminTagList>
        {platformEntries.length === 0 ? (
          <AdminTag tone="muted">No captured surfaces</AdminTag>
        ) : (
          platformEntries.map(([platform, count]) => (
            <AdminTag key={platform}>
              {platform} x{count}
            </AdminTag>
          ))
        )}
      </AdminTagList>
      {queue.errors.length > 0 || queue.warnings.length > 0 ? (
        <AdminIntakeSection>
          <AdminIntakeSectionTitle>Queue Diagnostics</AdminIntakeSectionTitle>
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
            No captured search surfaces
          </EmptyState>
        ) : (
          visibleCandidates.map((candidate) => (
            <OrganizerSearchCandidateCard
              candidate={candidate}
              commands={queue.commands}
              inFlight={curationInFlight[candidate.candidateId] === true}
              key={candidate.candidateId}
              localCuration={localCuration[candidate.candidateId]}
              onAttachCandidate={onAttachCandidate}
              onSelectMatch={onSelectMatch}
              selectedMatch={selectedMatchByCandidate[candidate.candidateId] ?? ""}
            />
          ))
        )}
      </AdminSearchCandidateList>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Queue Commands</AdminIntakeSectionTitle>
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

function OrganizerDiscoverySearchPlanView({
  plan,
}: {
  plan: Intake.OrganizerDiscoverySearchPlan;
}) {
  const launchEntries = plan.planned
    .filter((entry) => plan.summary.launchCities.includes(entry.citySlug))
    .slice(0, 18);
  const skippedEntries = plan.skippedFresh
    .filter((entry) => plan.summary.launchCities.includes(entry.citySlug))
    .slice(0, 6);
  const launchQueryTemplates = Array.from(new Map(
    launchEntries.map((entry) => [
      `${entry.queryTemplateId}:${entry.queryTemplate}`,
      entry,
    ])
  ).values()).slice(0, 12);
  const sourceRows = [
    ["Search plan", plan.generatedFrom.searchPlan],
    ["Search matrix", plan.generatedFrom.searchMatrix ?? "not configured"],
    ["Target categories", plan.generatedFrom.targetCategories ?? "not configured"],
    ["Query templates", plan.generatedFrom.queryTemplates ?? "not configured"],
    [
      "Candidate batches",
      plan.generatedFrom.batches.length > 0 ?
        plan.generatedFrom.batches.join(", ") :
        "none",
    ],
    [
      "Prior runs",
      plan.generatedFrom.runs.length > 0 ?
        `${plan.generatedFrom.runs.length} recorded run files` :
        "none",
    ],
  ] as const;

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow label="Launch cities" value={plan.summary.launchCities.join(", ")} />
        <StateRow label="Planned launch queries" value={String(plan.summary.launchCityPlanned)} />
        <StateRow label="Fresh skipped" value={String(plan.summary.launchCitySkippedFresh)} />
        <StateRow label="Fresh for" value={plan.freshForDays ? `${plan.freshForDays} days` : "not configured"} />
        <StateRow label="As of" value={plan.asOf ?? "unknown"} />
        <StateRow label="Plan source" value={plan.generatedFrom.searchPlan} />
      </AdminIntakeStateGrid>
      <AdminTagList>
        {plan.launchCities.map((city) => (
          <AdminTag
            key={city.citySlug}
            tone={city.missingCategoryIds.length > 0 ? "muted" : "neutral"}
          >
            {city.city}: {city.categoryIds.length} categories
          </AdminTag>
        ))}
      </AdminTagList>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>Repo-owned search configuration</strong>
        <span>{plan.commands.configure}</span>
        <span>Change the files below, regenerate the plan, then capture and ingest provider results.</span>
      </QualityRow>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Configuration Sources</AdminIntakeSectionTitle>
        <AdminIntakeStateGrid>
          {sourceRows.map(([label, value]) => (
            <StateRow key={label} label={label} value={value} />
          ))}
        </AdminIntakeStateGrid>
      </AdminIntakeSection>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Launch Search Terms</AdminIntakeSectionTitle>
        <AdminTagList>
          {launchQueryTemplates.length === 0 ? (
            <AdminTag tone="muted">No launch search terms planned.</AdminTag>
          ) : (
            launchQueryTemplates.map((entry) => (
              <AdminTag
                key={`${entry.queryTemplateId}-${entry.queryTemplate}`}
                tone="muted"
              >
                {entry.queryTemplateId}: {entry.queryTemplate}
              </AdminTag>
            ))
          )}
        </AdminTagList>
      </AdminIntakeSection>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Operator Commands</AdminIntakeSectionTitle>
        <AdminCommandStack>
          {Object.entries(plan.commands).map(([label, command]) => (
            <AdminCommandRow key={label}>
              <span>{label}</span>
              <code>{command}</code>
            </AdminCommandRow>
          ))}
        </AdminCommandStack>
      </AdminIntakeSection>
      {plan.summary.missingLaunchCityCategories.length > 0 ? (
        <AdminIntakeSection>
          <AdminIntakeSectionTitle>Missing launch categories</AdminIntakeSectionTitle>
          <AdminIntakeGateList>
            {plan.summary.missingLaunchCityCategories.map((missing) => (
              <AdminIntakeGate
                tone="blocked"
                key={`${missing.citySlug}-${missing.categoryId}`}
              >
                <FileWarning size={15} strokeWidth={1.9} />
                <div>
                  <strong>{missing.city}</strong>
                  <span>{missing.categoryId}</span>
                </div>
              </AdminIntakeGate>
            ))}
          </AdminIntakeGateList>
        </AdminIntakeSection>
      ) : null}
      <AdminSearchCandidateList>
        {launchEntries.map((entry) => (
          <AdminSearchCandidateCard key={entry.runKey}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {entry.city} / {entry.categoryId.replaceAll("_", " ")}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{entry.renderedQuery}</CatchText>
              </div>
              <StatusChip>
                {entry.planKind.replaceAll("_", " ")}
              </StatusChip>
            </AdminSearchCandidateHeader>
            <AdminIntakeStateGrid>
              <StateRow label="Template" value={entry.queryTemplateId} />
              <StateRow label="Template text" value={entry.queryTemplate} />
              <StateRow label="Source" value={entry.source} />
              <StateRow label="Run key" value={entry.runKey} />
              <StateRow label="Candidate" value={entry.candidateName ?? "generic city search"} />
              <StateRow label="Searched" value={entry.searchedAt ?? "not captured"} />
              <StateRow label="Existing run" value={entry.existingRunFile ?? "none"} />
              <StateRow label="Fingerprint" value={entry.resultFingerprint ?? "none"} />
            </AdminIntakeStateGrid>
          </AdminSearchCandidateCard>
        ))}
        {launchEntries.length === 0 ? (
          <EmptyState icon={<FileWarning size={16} strokeWidth={1.9} />}>
            No planned launch-city discovery queries
          </EmptyState>
        ) : null}
      </AdminSearchCandidateList>
      {skippedEntries.length > 0 ? (
        <AdminIntakeSection>
          <AdminIntakeSectionTitle>Fresh skipped queries</AdminIntakeSectionTitle>
          <AdminSearchCandidateList>
            {skippedEntries.map((entry) => (
              <AdminSearchCandidateCard key={entry.runKey}>
                <AdminSearchCandidateHeader>
                  <div>
                    <AdminEyebrow>
                      {entry.city} / {entry.categoryId.replaceAll("_", " ")}
                    </AdminEyebrow>
                    <CatchText as="h3" variant="sectionTitle">{entry.renderedQuery}</CatchText>
                  </div>
                  <StatusChip>fresh</StatusChip>
                </AdminSearchCandidateHeader>
                <AdminIntakeStateGrid>
                  <StateRow label="Run key" value={entry.runKey} />
                  <StateRow label="Searched" value={entry.searchedAt ?? "unknown"} />
                  <StateRow label="Existing run" value={entry.existingRunFile ?? "none"} />
                  <StateRow label="Fingerprint" value={entry.resultFingerprint ?? "none"} />
                </AdminIntakeStateGrid>
              </AdminSearchCandidateCard>
            ))}
          </AdminSearchCandidateList>
        </AdminIntakeSection>
      ) : null}
    </AdminSearchCandidatePanel>
  );
}

function OrganizerPublishingContractsView({
  contracts,
}: {
  contracts: Intake.OrganizerPublishingContracts;
}) {
  return (
    <AdminSearchCandidatePanel>
      <AdminSearchCandidateList>
        {Object.entries(contracts).map(([key, contract]) => (
          <AdminSearchCandidateCard key={key}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {contract.intakeTarget} / {contract.writeCallable}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{contract.callablePayloadSchema}</CatchText>
              </div>
              <StatusChip tone="ready">schema source</StatusChip>
            </AdminSearchCandidateHeader>
            <AdminIntakeStateGrid>
              <StateRow label="Firestore" value={contract.firestoreSchema} />
              <StateRow label="Generated payload" value={contract.generatedCallablePayload} />
              <StateRow label="Callable" value={contract.writeCallable} />
            </AdminIntakeStateGrid>
            <AdminTagList>
              {contract.projectionNotes.map((note: string) => (
                <AdminTag key={note} tone="muted">
                  {note}
                </AdminTag>
              ))}
            </AdminTagList>
          </AdminSearchCandidateCard>
        ))}
      </AdminSearchCandidateList>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerSourceMentionResolutionView({
  resolution,
}: {
  resolution: Intake.OrganizerSourceMentionResolution;
}) {
  const clusters = resolution.resolutionClusters.clusters.slice(0, 8);
  const reviewPackets = resolution.reviewPackets.packets.slice(0, 8);
  const llmQueue = resolution.resolutionClusters.llmReviewQueue.slice(0, 6);
  const promptQueue = resolution.llmPromptQueue.requests.slice(0, 6);
  const blockingKeys = resolution.policy.blockingKeys.slice(0, 10);
  const stableProviderPlatforms =
    resolution.policy.hardKeyPolicy?.stableProviderEventPlatforms ?? [];
  const thresholds = Object.entries(resolution.policy.thresholds);

  return (
    <AdminSearchCandidatePanel>
      <AdminIntakeStateGrid>
        <StateRow
          label="Source artifacts"
          value={String(resolution.sourceArtifacts.summary.artifacts)}
        />
        <StateRow
          label="Mentions"
          value={String(resolution.extractedMentions.summary.mentions)}
        />
        <StateRow
          label="Candidates"
          value={String(resolution.resolutionCandidates.summary.candidates)}
        />
        <StateRow
          label="Clusters"
          value={String(resolution.resolutionClusters.summary.clusters)}
        />
        <StateRow
          label="Human review"
          value={String(resolution.reviewPackets.summary.humanReviewRequired)}
        />
        <StateRow label="LLM status" value={resolution.policy.llm.status} />
        <StateRow
          label="Prompt payloads"
          value={String(resolution.llmPromptQueue.summary.requests)}
        />
      </AdminIntakeStateGrid>
      <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
        <strong>Canonical write boundary</strong>
        <span>{resolution.policy.canonicalBoundary.generatedCandidates}</span>
        <span>{resolution.policy.canonicalBoundary.platformVerifiedMeaning}</span>
      </QualityRow>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Editable Resolution Policy</AdminIntakeSectionTitle>
        <AdminTagList>
          {thresholds.map(([key, value]) => (
            <AdminTag key={key} tone="muted">
              {key}: {value}
            </AdminTag>
          ))}
          {blockingKeys.map((key) => (
            <AdminTag key={key.id} tone="muted">
              {key.id} / {key.strength}
            </AdminTag>
          ))}
          {stableProviderPlatforms.length > 0 ? (
            <AdminTag tone="muted">
              provider hard keys: {stableProviderPlatforms.join(", ")}
            </AdminTag>
          ) : null}
        </AdminTagList>
      </AdminIntakeSection>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>Resolution review packets</AdminIntakeSectionTitle>
        <AdminSearchCandidateList>
          {reviewPackets.map((packet) => (
            <AdminSearchCandidateCard key={packet.packetId}>
              <AdminSearchCandidateHeader>
                <div>
                  <AdminEyebrow>
                    {packet.entityType} / {packet.recommendedAction.replaceAll("_", " ")}
                  </AdminEyebrow>
                  <CatchText as="h3" variant="sectionTitle">{packet.packetId}</CatchText>
                </div>
                <StatusChip tone={packet.humanReviewRequired ? "blocked" : "ready"}>
                  {packet.resolutionState.replaceAll("_", " ")}
                </StatusChip>
              </AdminSearchCandidateHeader>
              <AdminIntakeStateGrid>
                <StateRow label="Score" value={String(packet.score)} />
                <StateRow label="Candidates" value={String(packet.candidateIds.length)} />
                <StateRow label="Mentions" value={String(packet.mentionIds.length)} />
                <StateRow
                  label="LLM"
                  value={packet.llmReview.status.replaceAll("_", " ")}
                />
              </AdminIntakeStateGrid>
              <AdminTagList>
                {Object.entries(packet.checklist).map(([key, value]) => (
                  <AdminTag key={key} tone="muted">
                    {key}: {String(value)}
                  </AdminTag>
                ))}
                {packet.topSignals.slice(0, 5).map((signal) => (
                  <AdminTag key={signal}>
                    {signal.replaceAll("_", " ")}
                  </AdminTag>
                ))}
                {packet.conflicts.map((conflict) => (
                  <AdminTag key={conflict} tone="muted">
                    conflict: {conflict.replaceAll("_", " ")}
                  </AdminTag>
                ))}
              </AdminTagList>
            </AdminSearchCandidateCard>
          ))}
          {reviewPackets.length === 0 ? (
            <EmptyState icon={<FileWarning size={16} strokeWidth={1.9} />}>
              No source resolution review packets have been generated yet.
            </EmptyState>
          ) : null}
        </AdminSearchCandidateList>
      </AdminIntakeSection>
      <AdminSearchCandidateList>
        {clusters.map((cluster) => (
          <AdminSearchCandidateCard key={cluster.clusterId}>
            <AdminSearchCandidateHeader>
              <div>
                <AdminEyebrow>
                  {cluster.entityType} / {cluster.scoreBand.replaceAll("_", " ")}
                </AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{cluster.displayNames.slice(0, 3).join(" / ") || cluster.clusterId}</CatchText>
              </div>
              <StatusChip tone={organizerIntakeEvidencePanels.sourceResolutionTone(cluster.resolutionState)}>
                {cluster.resolutionState.replaceAll("_", " ")}
              </StatusChip>
            </AdminSearchCandidateHeader>
            <AdminIntakeStateGrid>
              <StateRow label="Score" value={String(cluster.score)} />
              <StateRow label="Mentions" value={String(cluster.mentionIds.length)} />
              <StateRow label="Cities" value={cluster.cities.join(", ") || "unknown"} />
              <StateRow label="Dates" value={cluster.dates.join(", ") || "unknown"} />
              <StateRow label="LLM" value={cluster.llmReview.status.replaceAll("_", " ")} />
            </AdminIntakeStateGrid>
            <AdminTagList>
              {cluster.hardSignals.map((signal) => (
                <AdminTag key={signal}>
                  {signal}
                </AdminTag>
              ))}
              {cluster.matchingSignals.slice(0, 6).map((signal) => (
                <AdminTag key={signal} tone="muted">
                  {signal.replaceAll("_", " ")}
                </AdminTag>
              ))}
              {cluster.conflictingSignals.map((signal) => (
                <AdminTag key={signal} tone="muted">
                  conflict: {signal.replaceAll("_", " ")}
                </AdminTag>
              ))}
            </AdminTagList>
            {cluster.publishBoundary ? (
              <QualityRow icon={<FileWarning size={16} strokeWidth={1.9} />}>
                <strong>Projection boundary</strong>
                <span>{cluster.publishBoundary}</span>
              </QualityRow>
            ) : null}
          </AdminSearchCandidateCard>
        ))}
        {clusters.length === 0 ? (
          <EmptyState icon={<FileWarning size={16} strokeWidth={1.9} />}>
            No source mentions have been captured for resolution yet.
          </EmptyState>
        ) : null}
      </AdminSearchCandidateList>
      {llmQueue.length > 0 ? (
        <AdminIntakeSection>
          <AdminIntakeSectionTitle>LLM Review Queue</AdminIntakeSectionTitle>
          <AdminTagList>
            {llmQueue.map((request) => (
              <AdminTag key={request.clusterId} tone="muted">
                {request.clusterId}: {request.status} / {request.promptVersion}
              </AdminTag>
            ))}
          </AdminTagList>
        </AdminIntakeSection>
      ) : null}
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>LLM Prompt Queue</AdminIntakeSectionTitle>
        <QualityRow tone="warning" icon={<Lock size={16} strokeWidth={1.9} />}>
          <strong>{resolution.llmPromptQueue.policy.status.replaceAll("_", " ")}</strong>
          <span>{resolution.llmPromptQueue.policy.note}</span>
        </QualityRow>
        <AdminTagList>
          {promptQueue.map((request) => (
            <AdminTag key={request.requestId} tone="muted">
              {request.clusterId}: {request.status} / {request.promptVersion}
            </AdminTag>
          ))}
          {promptQueue.length === 0 ? (
            <AdminTag tone="muted">No prompt payloads queued.</AdminTag>
          ) : null}
        </AdminTagList>
      </AdminIntakeSection>
    </AdminSearchCandidatePanel>
  );
}

function OrganizerSearchCandidateCard({
  candidate,
  commands,
  inFlight,
  localCuration,
  onAttachCandidate,
  onSelectMatch,
  selectedMatch,
}: {
  candidate: Intake.OrganizerSearchCandidate;
  commands: Intake.OrganizerSearchCandidateCommands;
  inFlight: boolean;
  localCuration?: AdminRecordOrganizerCurationResponse;
  onAttachCandidate: (candidate: Intake.OrganizerSearchCandidate) => void;
  onSelectMatch: (candidateId: string, organizerId: string) => void;
  selectedMatch: string;
}) {
  const matchedEntityIds = candidate.existingEntityMatches.map((match) => match.entityId);
  const entityTarget = selectedMatch || "ENTITY";
  const attachCommand = commands.curateSurface
    .replace("ENTITY", entityTarget)
    .replace("CANDIDATE_ID", candidate.candidateId);
  const canAttach =
    candidate.reviewAction !== "supporting_evidence_only" &&
    matchedEntityIds.length > 0 &&
    Boolean(selectedMatch) &&
    !localCuration;

  return (
    <AdminSearchCandidateCard>
      <AdminSearchCandidateHeader>
        <div>
          <AdminEyebrow>
            #{candidate.rank} / {candidate.platform} / {candidate.surfaceKind}
          </AdminEyebrow>
          <CatchText as="h3" variant="sectionTitle">{candidate.title}</CatchText>
        </div>
        <StatusChip tone={candidate.reviewAction.includes("attach") ? "ready" : ""}>
          {candidate.reviewAction.replaceAll("_", " ")}
        </StatusChip>
      </AdminSearchCandidateHeader>
      <AdminIntakeStateGrid>
        <StateRow label="Candidate" value={candidate.candidateId} />
        <StateRow label="Observed" value={candidate.observedAt} />
        <StateRow label="Normalized" value={candidate.normalizedKey ?? "none"} />
        <StateRow label="Canonical URL" value={candidate.canonicalUrl} />
      </AdminIntakeStateGrid>
      {candidate.snippet ? (
        <AdminSearchCandidateSnippet>{candidate.snippet}</AdminSearchCandidateSnippet>
      ) : null}
      <AdminTagList>
        {matchedEntityIds.length > 0 ? (
          matchedEntityIds.map((entityId) => (
            <AdminTag key={entityId}>
              matches {entityId}
            </AdminTag>
          ))
        ) : (
          <AdminTag tone="muted">no surface match</AdminTag>
        )}
        {candidate.queryIntent.marketSlug ? (
          <AdminTag tone="muted">{candidate.queryIntent.marketSlug}</AdminTag>
        ) : null}
        {candidate.queryIntent.entityHint ? (
          <AdminTag tone="muted">{candidate.queryIntent.entityHint}</AdminTag>
        ) : null}
        {candidate.diagnostics.map((diagnostic) => (
          <AdminTag key={diagnostic} tone="muted">{diagnostic}</AdminTag>
        ))}
      </AdminTagList>
      {candidate.reviewAction !== "supporting_evidence_only" ? (
        <AdminSearchCandidateActions>
          {matchedEntityIds.length > 0 ? <CatchField
            recipe="select"
            title="Reviewed canonical organizer"
            value={selectedMatch}
            onChanged={(value) => onSelectMatch(candidate.candidateId, (value ?? ""))}
            inputMode={Boolean(localCuration) ? "inactive" : "editable"}
            {...selectOptions([{value: "", label: "Choose a matched organizer"},
              ...matchedEntityIds.map((entityId) => ({
                value: entityId, label: entityId,
              }))])}
          /> : null}
          {localCuration ? (
            <AdminIntakeDecisionState>
              <CheckCircle2 size={16} strokeWidth={1.9} />
              <div>
                <strong>Attach recorded</strong>
                <span>{localCuration.decisionPath}</span>
              </div>
            </AdminIntakeDecisionState>
          ) : (
            <AdminButton
              disabled={!canAttach || inFlight}
              onClick={() => onAttachCandidate(candidate)}
            >
              {inFlight ? "Recording" : "Attach surface"}
            </AdminButton>
          )}
          <AdminCommandRow>
            <span>attach</span>
            <code>{attachCommand}</code>
          </AdminCommandRow>
        </AdminSearchCandidateActions>
      ) : null}
    </AdminSearchCandidateCard>
  );
}

export const organizerIntakeDiscoveryPanels = {
  OrganizerClaimTargetSyncPreviewView,
  OrganizerCrawlRunPlanView,
  OrganizerRawArtifactStorageView,
  OrganizerSearchCandidateQueueView,
  OrganizerDiscoverySearchPlanView,
  OrganizerPublishingContractsView,
  OrganizerSourceMentionResolutionView,
  OrganizerSearchCandidateCard,
};
