import {CatchText, CatchField} from "@catch/web-ui";
import {ExternalLink, Search} from "lucide-react";
import {useEffect, useMemo, useState} from "react";

import {
  AdminButton,
  AdminFieldGrid,
  AdminIntakeReviewWorkbench,
  AdminIntakeSection,
  AdminIntakeStageRail,
  AdminIntakeTaskToolbar,
  AdminLinkButton,
  AdminOrganizerIntakeCheckboxField,
  AdminWorkbenchNote,
  SearchField,
  selectOptions,
} from "../../../../shared/ui/AdminPrimitives";
import type {AdminDecideOrganizerIntakeResponse} from
  "../../../../shared/types/adminTypes";
import {
  decisionLabel,
  organizerDraftFormFromCandidate,
  organizerOperationStage,
  emptyOrganizerSurfaceChecklist,
  organizerSurfaceChecklistReady,
  organizerVisibilityFormForItem,
  publicationPacketReady,
} from "../controllers/organizerIntakeHelpers";
import type {OrganizerIntakeController} from
  "../controllers/useOrganizerIntakeController";
import type * as Intake from "../types/organizerIntakeTypes";
import {organizerIntakeVisibilityControls} from
  "./organizerIntakeVisibilityControls";
import {
  buildOrganizerIntakeBulkActions,
  type OrganizerWorkbenchEntry,
} from "./organizerIntakeBulkActions";
import {
  candidateMarketLabel,
  initialsForLabel,
  marketLabelForSlug,
  organizerCandidateChecklistRows,
  organizerCandidateQueueItem,
  organizerCandidateStatus,
  organizerEntityEntryId,
  organizerEntityQueueItem,
  organizerItemStatus,
  organizerMarketLabel as marketLabel,
} from "./organizerIntakeQueueItems";

export {organizerEntityEntryId, organizerEntityQueueItem} from
  "./organizerIntakeQueueItems";

type OrganizerWorkbenchStage = "incoming" | "verify" | "resolve" | "ready";
type OrganizerQueueFilter = "all" | "attention" | "ready";
const organizerWorkbenchStageKey = "catch-admin.organizer-intake-stage.v2";
const organizerTypeOptions = [
  {value: "community", label: "Community"},
  {value: "club", label: "Club"},
  {value: "eventProducer", label: "Event producer"},
  {value: "venue", label: "Venue"},
  {value: "brand", label: "Brand"},
  {value: "individual", label: "Individual"},
];

function OrganizerTaskWorkbench({
  controller,
  onShowDiagnostics,
  nowMs = Date.now(),
}: {
  controller: OrganizerIntakeController;
  onShowDiagnostics: () => void;
  nowMs?: number;
}) {
  const {
    availability,
    bridge,
    diagnosticsBridge,
    decisionInFlight,
    decisionNotes,
    curationInFlight,
    handleDecision,
    handleAttachCandidate,
    handleCreateOrganizerDraft,
    handleOpenOrganizerDraft,
    handleRetrySalesLink,
    localDecisions,
    localCuration,
    localOrganizerDrafts,
    localSalesLinks,
    manualReportAcknowledgements,
    organizerDraftForms,
    organizerDraftInFlight,
    salesLinkInFlight,
    selectedMatchByCandidate,
    setSelectedMatchByCandidate,
    source,
    publicationPacketByEntity,
    setDecisionNotes,
    setManualReportAcknowledgements,
    setOrganizerDraftForms,
    setSurfaceChecklists,
    setVisibilityForms,
    surfaceChecklists,
    visibilityForms,
  } = controller;
  const [activeStage, setActiveStageState] = useState<OrganizerWorkbenchStage>(
    readOrganizerWorkbenchStage
  );
  const [queueFilter, setQueueFilter] = useState<OrganizerQueueFilter>("all");
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("search") ?? "";
  });
  const [city, setCity] = useState("all");
  const [priority, setPriority] = useState("all");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const livePublicationUnavailable =
    controller.source === "firestore" && !availability.canonicalItems;
  const duplicateCandidateIds = useMemo(() => new Set(
    bridge.searchCandidates.duplicateKeys.flatMap((entry) => entry.candidateIds)
  ), [bridge.searchCandidates.duplicateKeys]);

  const cityOptions = useMemo(() => [
    {value: "all", label: "All launch cities"},
    ...Array.from(new Set(
      [
        ...bridge.items.flatMap((item) =>
          item.markets.map((market) => market.displayName)),
        ...bridge.searchCandidates.candidates
          .map((candidate) => candidate.queryIntent.marketSlug)
          .filter((marketSlug): marketSlug is string => Boolean(marketSlug))
          .map(marketLabelForSlug),
      ]
    )).sort().map((label) => ({value: label, label})),
  ], [bridge.items, bridge.searchCandidates.candidates]);
  const stagedEntries = useMemo<OrganizerWorkbenchEntry[]>(() => {
    if (activeStage !== "incoming" && livePublicationUnavailable) return [];
    const entityEntries = stageItems(
      bridge.items,
      publicationPacketByEntity,
      activeStage
    ).map((item) => ({
      id: organizerEntityEntryId(item.entityId),
      kind: "entity" as const,
      item,
    }));
    const candidateEntries = bridge.searchCandidates.candidates
      .filter((candidate) => {
        const hasDraft = Boolean(
          candidate.draftLink || localOrganizerDrafts[candidate.candidateId]
        );
        return activeStage === "incoming" ? !hasDraft :
          activeStage === "ready" ? hasDraft : false;
      })
      .map((candidate) => ({
      id: `candidate:${candidate.candidateId}`,
      kind: "candidate" as const,
      candidate,
    }));
    return [...candidateEntries, ...entityEntries];
  }, [
    activeStage,
    bridge.items,
    bridge.searchCandidates.candidates,
    livePublicationUnavailable,
    localOrganizerDrafts,
    publicationPacketByEntity,
  ]);
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return stagedEntries
      .filter((entry) => city === "all" ||
        workbenchEntryMarkets(entry).includes(city))
      .filter((entry) => priority === "all" ||
        workbenchEntryPriority(entry, duplicateCandidateIds) === priority)
      .filter((entry) => queueFilter !== "attention" ||
        workbenchEntryNeedsAttention(
          entry,
          publicationPacketByEntity,
          duplicateCandidateIds
        ))
      .filter((entry) => queueFilter !== "ready" ||
        workbenchEntryIsReady(
          entry,
          publicationPacketByEntity,
          duplicateCandidateIds
        ))
      .filter((entry) => !query || workbenchEntrySearchText(entry).includes(query));
  }, [
    city,
    duplicateCandidateIds,
    priority,
    publicationPacketByEntity,
    queueFilter,
    searchQuery,
    stagedEntries,
  ]);

  useEffect(() => {
    if (selectedEntryId !== null) return;
    setSelectedEntryId(filteredEntries[0]?.id ?? null);
  }, [filteredEntries, selectedEntryId]);

  const selectedEntry = filteredEntries.find((entry) =>
    entry.id === selectedEntryId) ?? null;
  const item = selectedEntry?.kind === "entity" ? selectedEntry.item : null;
  const candidate = selectedEntry?.kind === "candidate" ?
    selectedEntry.candidate : null;
  const packet = item ? publicationPacketByEntity.get(item.entityId) : undefined;
  const manualReports = packet?.evidenceSummary.manualReportsWithoutArtifacts ?? 0;
  const reportsAcknowledged = item ?
    manualReportAcknowledgements[item.entityId] === true : false;
  const inFlight = item ? decisionInFlight[item.entityId] : undefined;
  const decision = item ? localDecisions[item.entityId] : undefined;
  const visibilityForm = item ?
    visibilityForms[item.entityId] ?? organizerVisibilityFormForItem(item) :
    null;
  const surfaceChecklist = item ?
    surfaceChecklists[item.entityId] ?? emptyOrganizerSurfaceChecklist() :
    null;
  const checklistEntries = Object.entries(packet?.approvalChecklist ?? {});
  const checklistComplete = checklistEntries.filter(([, passed]) => passed).length;
  const canApprove = Boolean(
    item && publicationPacketReady(packet) &&
    visibilityForm && surfaceChecklist &&
    organizerSurfaceChecklistReady(visibilityForm, surfaceChecklist) &&
    (manualReports === 0 || reportsAcknowledged)
  );
  const candidateChecklist = candidate ?
    organizerCandidateChecklistRows(candidate, duplicateCandidateIds) : [];
  const entityChecklist = item ?
    organizerChecklistRows(packet, reportsAcknowledged) : [];
  const entityEvidence = item ? organizerEvidenceRows(item, packet) : [];
  const entityImpact = item ?
    organizerImpactRows(item, packet, visibilityForm) : [];
  const candidateEvidence = candidate ?
    organizerCandidateEvidenceRows(candidate) : [];
  const candidateImpact = candidate ?
    organizerCandidateImpactRows(candidate) : [];
  const candidateChecklistComplete =
    candidateChecklist.filter((row) => row.passed).length;
  const candidateInFlight = candidate ?
    curationInFlight[candidate.candidateId] === true : false;
  const candidateCuration = candidate ?
    localCuration[candidate.candidateId] : undefined;
  const candidateDraft = candidate ?
    localOrganizerDrafts[candidate.candidateId] ?? candidate.draftLink :
    undefined;
  const candidateSalesLink = candidate ?
    localSalesLinks[candidate.candidateId] : undefined;
  const selectedMatch = candidate ?
    selectedMatchByCandidate[candidate.candidateId] ?? "" : "";
  const candidateSalesPending = candidate ?
    salesLinkInFlight[candidate.candidateId] === true : false;
  const candidateDraftForm = candidate ?
    organizerDraftForms[candidate.candidateId] ??
      organizerDraftFormFromCandidate(candidate) :
    null;
  const candidateDraftPending = candidate ?
    organizerDraftInFlight[candidate.candidateId] === true :
    false;
  const candidateHasDuplicateKey = candidate ?
    duplicateCandidateIds.has(candidate.candidateId) :
    false;
  const bulkActions = buildOrganizerIntakeBulkActions({
    entries: filteredEntries,
    handleAttachCandidate,
    handleDecision,
    manualReportAcknowledgements,
    publicationPacketByEntity,
    surfaceChecklists,
    visibilityForms,
  });

  const setStage = (stage: OrganizerWorkbenchStage) => {
    setActiveStageState(stage);
    setQueueFilter("all");
    setSelectedEntryId(null);
    try {
      window.localStorage.setItem(organizerWorkbenchStageKey, stage);
    } catch {
      // The in-memory stage still works when storage is unavailable.
    }
  };

  const controls = (
    <AdminIntakeTaskToolbar aria-label="Organizer intake filters">
        <SearchField
          ariaLabel="Search organizer intake"
          icon={<Search size={15} strokeWidth={1.9} />}
          placeholder="Search organizer, source, city..."
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setSelectedEntryId(null);
          }}
        />
        <CatchField
          recipe="select"
          title="City"
          labelMode="hidden"
          {...selectOptions(cityOptions)}
          value={city}
          onChanged={(value) => {
            setCity((value ?? ""));
            setSelectedEntryId(null);
          }}
        />
        <CatchField
          recipe="select"
          title="Priority"
          labelMode="hidden"
          {...selectOptions([
            {value: "all", label: "All priorities"},
            {value: "p0", label: "P0"},
            {value: "p1", label: "P1"},
            {value: "p2", label: "P2"},
          ])}
          value={priority}
          onChanged={(value) => {
            setPriority((value ?? ""));
            setSelectedEntryId(null);
          }}
        />
        {diagnosticsBridge ? (
          <>
            <AdminButton onClick={onShowDiagnostics}>Diagnostics</AdminButton>
            <AdminButton variant="primary" onClick={onShowDiagnostics}>
              Discovery plan
            </AdminButton>
          </>
        ) : null}
    </AdminIntakeTaskToolbar>
  );
  const stageControl = (
    <AdminIntakeStageRail<OrganizerWorkbenchStage>
      ariaLabel="Organizer intake stages"
      options={[
        {id: "incoming", label: "Incoming"},
        {id: "verify", label: "Verify"},
        {id: "resolve", label: "Resolve"},
        {id: "ready", label: "Ready"},
      ]}
      value={activeStage}
      onChange={setStage}
    />
  );

  return (
      <AdminIntakeReviewWorkbench
        bulkActions={bulkActions}
        controls={controls}
        detail={item ? {
          action: packet?.publicPresence.canonicalPath ? (
            <AdminLinkButton
              href={`https://catchdates.com${packet.publicPresence.canonicalPath}`}
              icon={<ExternalLink size={14} strokeWidth={1.9} />}
              label={`Open public preview for ${item.displayName}`}
              rel="noreferrer"
              target="_blank"
            >
              Open preview
            </AdminLinkButton>
          ) : null,
          blockers: entityChecklist.filter((row) => !row.passed).map((row) => ({
            action: row.meta,
            id: row.id,
            label: row.label,
            tone: "warning" as const,
          })),
          actions: (
            <>
              <AdminButton
                disabled={Boolean(inFlight)}
                loading={inFlight === "suppress"}
                loadingLabel="Rejecting"
                onClick={() => void handleDecision(item, "suppress")}
              >Reject</AdminButton>
              <AdminButton
                disabled={Boolean(inFlight)}
                loading={inFlight === "hold"}
                loadingLabel="Holding"
                onClick={() => void handleDecision(item, "hold")}
              >Hold</AdminButton>
              <AdminButton
                disabled={!canApprove || Boolean(inFlight)}
                loading={inFlight === "approve_public"}
                loadingLabel="Approving"
                variant="primary"
                onClick={() => void handleDecision(item, "approve_public")}
              >Approve listing</AdminButton>
            </>
          ),
          actionGate: organizerDecisionHint(
            decision, packet, manualReports, reportsAcknowledged
          ),
          initials: initialsForLabel(item.displayName),
          sections: [
            {
              id: "evidence",
              kind: "evidence" as const,
              rows: entityEvidence,
              title: "Source evidence",
            },
            ...(entityChecklist.length > 0 ? [{
              id: "checks",
              kind: "checklist" as const,
              rows: entityChecklist,
              title: "Review checklist",
            }] : []),
            {
              id: "impact",
              kind: "impact" as const,
              rows: entityImpact,
              title: "Handoff impact",
            },
            {
              content: (
                <AdminIntakeSection>
                  {visibilityForm && surfaceChecklist ? (
                    <organizerIntakeVisibilityControls.OrganizerVisibilityControls
                      checklist={surfaceChecklist}
                      entityId={item.entityId}
                      form={visibilityForm}
                      setChecklists={setSurfaceChecklists}
                      setForms={setVisibilityForms}
                    />
                  ) : null}
                  <CatchField
                    recipe="input"
                    title="Decision note"
                    inputHint="Add evidence or explain why this organizer should advance..."
                    maxLines={2}
                    value={decisionNotes[item.entityId] ?? ""}
                    onChanged={(note) => setDecisionNotes((current) => ({
                      ...current,
                      [item.entityId]: note,
                    }))}
                  />
                  {manualReports > 0 ? (
                    <AdminOrganizerIntakeCheckboxField
                      checked={reportsAcknowledged}
                      label={`I reviewed ${manualReports} manual report${manualReports === 1 ? "" : "s"} without attached artifacts.`}
                      onChange={(checked) => setManualReportAcknowledgements((current) => ({
                        ...current,
                        [item.entityId]: checked,
                      }))}
                    />
                  ) : null}
                </AdminIntakeSection>
              ),
              id: "decision-note",
              kind: "content" as const,
              title: "Decision note",
            },
            {
              content: (
                <AdminWorkbenchNote>
                  Entity {item.entityId} · source-backed review packet
                </AdminWorkbenchNote>
              ),
              id: "diagnostics",
              kind: "diagnostics" as const,
              title: "Diagnostics",
            },
          ],
          readiness: {
            blockers: decisionBlockerCount(packet, reportsAcknowledged),
            complete: checklistComplete +
              (manualReports === 0 || reportsAcknowledged ? 1 : 0),
            label: "Decision readiness",
            total: checklistEntries.length + 1,
          },
          status: organizerItemStatus(item, packet).label,
          statusTone: organizerItemStatus(item, packet).tone,
          subtitle: `Organizer lead · ${item.entityId} · ${marketLabel(item)}`,
          title: item.displayName,
        } : candidate ? {
          action: (
            <AdminLinkButton
              href={candidate.canonicalUrl}
              icon={<ExternalLink size={14} strokeWidth={1.9} />}
              label={`Open source for ${candidate.title}`}
              rel="noreferrer"
              target="_blank"
            >
              Open source
            </AdminLinkButton>
          ),
          blockers: candidateChecklist.filter((row) => !row.passed).map((row) => ({
            action: row.meta,
            id: row.id,
            label: row.label,
            tone: candidateHasDuplicateKey ? "danger" as const : "warning" as const,
          })),
          actions: candidate.existingEntityMatches.length > 0 ? (<>
            <CatchField
              recipe="select"
              title="Reviewed canonical organizer"
              value={selectedMatch}
              inputMode={Boolean(candidateCuration) ? "inactive" : "editable"}
              onChanged={(value) => setSelectedMatchByCandidate((current) => ({
                ...current, [candidate.candidateId]: (value ?? ""),
              }))}
              {...selectOptions([{value: "", label: "Choose a matched organizer"},
                ...candidate.existingEntityMatches.map((match) => ({
                  value: match.entityId, label: match.entityId,
                }))])}
            />
            <AdminButton
              disabled={!selectedMatch || candidateInFlight ||
                candidateSalesPending || Boolean(candidateCuration)}
              loading={candidateInFlight}
              loadingLabel="Attaching"
              variant="primary"
              onClick={() => void handleAttachCandidate(candidate)}
            >
              {candidateCuration ? "Attach recorded" : "Attach selected organizer"}
            </AdminButton>
            {source !== "sample" && selectedMatch &&
              !candidateSalesLink ? <AdminButton
              disabled={candidateSalesPending || candidateInFlight}
              loading={candidateSalesPending}
              loadingLabel="Linking Sales"
              onClick={() => void handleRetrySalesLink(candidate)}>
              Resume private Sales link
            </AdminButton> : null}
            {candidateSalesLink ? <span>Private Sales linked</span> : null}
          </>) : candidateDraft ? (<>
            <AdminButton variant="primary" onClick={() =>
              handleOpenOrganizerDraft(candidateDraft.organizerId)}>
              Open organizer draft
            </AdminButton>
            {source !== "sample" && !candidateSalesLink ? <AdminButton
              disabled={candidateSalesPending}
              loading={candidateSalesPending}
              loadingLabel="Linking Sales"
              onClick={() => void handleRetrySalesLink(candidate)}>
              Resume private Sales link
            </AdminButton> : candidateSalesLink ?
                <span>Private Sales linked</span> : null}
          </>) : (
            <AdminButton
              disabled={candidateDraftPending || candidateHasDuplicateKey}
              loading={candidateDraftPending}
              loadingLabel="Creating draft"
              variant="primary"
              onClick={() => void handleCreateOrganizerDraft(candidate)}
            >
              Create organizer draft
            </AdminButton>
          ),
          actionGate: candidateDraft ?
            `Draft ${candidateDraft.organizerId} is unclaimed, hidden, noindex, and crawl-disabled. ${source === "sample" ? "Sample mode cannot create a live Sales link." : "Sales linking is a separate private step."}` :
            candidateCuration ?
            `Recorded at ${candidateCuration.decisionPath}.` :
            candidate.existingEntityMatches.length > 0 ?
              "Attaching records curation only. Publication remains separately gated." :
              candidateHasDuplicateKey ?
                "Resolve the duplicate identity key before creating a canonical draft." :
                "Creation opens an unclaimed draft in Organizers. Publication, indexing, app visibility, crawling, and ownership remain disabled.",
          initials: initialsForLabel(candidate.title),
          sections: [
            {
              id: "evidence",
              kind: "evidence" as const,
              rows: candidateEvidence,
              title: "Source evidence",
            },
            ...(candidateChecklist.length > 0 ? [{
              id: "checks",
              kind: "checklist" as const,
              rows: candidateChecklist,
              title: "Candidate checks",
            }] : []),
            {
              id: "impact",
              kind: "impact" as const,
              rows: candidateImpact,
              title: "Intake impact",
            },
            {
              content: (
                <AdminIntakeSection>
                  <CatchText as="p" variant="supporting">
                    {candidate.reviewContext?.reviewNotes ??
                      candidate.snippet ??
                      "No search-result snippet was captured for this candidate."}
                  </CatchText>
                  {candidate.reviewContext?.eventSignal ? (
                    <CatchText as="p" variant="supporting">{candidate.reviewContext.eventSignal}</CatchText>
                  ) : null}
                  {candidate.reviewContext?.formats.length ? (
                    <CatchText as="p" variant="supporting">Formats: {candidate.reviewContext.formats.join(", ")}</CatchText>
                  ) : null}
                  {candidate.existingEntityMatches.length === 0 &&
                    !candidateDraft &&
                    candidateDraftForm ? (
                      <AdminIntakeSection>
                        <AdminFieldGrid columns={2}>
                          <CatchField
                            recipe="input"
                            title="Organizer name"
                            inputMode="readOnly"
                            value={candidateDraftForm.name}
                            onChanged={() => undefined}
                          />
                          <CatchField
                            recipe="input"
                            title="Public page slug"
                            value={candidateDraftForm.publicSlug}
                            onChanged={(publicSlug) =>
                              setOrganizerDraftForms((current) => ({
                                ...current,
                                [candidate.candidateId]: {
                                  ...candidateDraftForm,
                                  publicSlug,
                                },
                              }))}
                          />
                        </AdminFieldGrid>
                        <CatchField
                          recipe="select"
                          title="Organizer type"
                          {...selectOptions(organizerTypeOptions)}
                          value={candidateDraftForm.organizerType}
                          onChanged={(organizerType) => setOrganizerDraftForms((current) => ({
                              ...current,
                              [candidate.candidateId]: {
                                ...candidateDraftForm,
                                organizerType:
                                  (organizerType ?? "") as
                                    Intake.OrganizerDraftFormState["organizerType"],
                              },
                            }))}
                        />
                        <AdminWorkbenchNote>
                          The organizer record receives a separate opaque document
                          ID. The source title is copied unchanged; corrections use
                          the audited organizer editor. Member-facing description,
                          locality, and listing descriptor stay blank until they
                          are verified.
                        </AdminWorkbenchNote>
                        <CatchField
                          recipe="input"
                          title="Creation review note"
                          maxLines={2}
                          value={candidateDraftForm.reviewNote}
                          onChanged={(reviewNote) =>
                            setOrganizerDraftForms((current) => ({
                              ...current,
                              [candidate.candidateId]: {
                                ...candidateDraftForm,
                                reviewNote,
                              },
                            }))}
                        />
                      </AdminIntakeSection>
                    ) : null}
                </AdminIntakeSection>
              ),
              id: "context",
              kind: "content" as const,
              title: candidate.reviewContext ?
                "Reviewed intake context" : "Captured search context",
            },
            {
              content: (
                <AdminWorkbenchNote>
                  Candidate {candidate.candidateId} · observed {candidate.observedAt}
                </AdminWorkbenchNote>
              ),
              id: "diagnostics",
              kind: "diagnostics" as const,
              title: "Diagnostics",
            },
          ],
          readiness: {
            blockers: candidateChecklist.length - candidateChecklistComplete,
            complete: candidateChecklistComplete,
            label: "Candidate readiness",
            total: candidateChecklist.length,
          },
          status: organizerCandidateStatus(
            candidate,
            duplicateCandidateIds,
            Boolean(candidateDraft)
          ).label,
          statusTone: organizerCandidateStatus(
            candidate,
            duplicateCandidateIds,
            Boolean(candidateDraft)
          ).tone,
          subtitle:
            `Search candidate · ${candidateMarketLabel(candidate)} · observed ${candidate.observedAt}`,
          title: candidate.title,
        } : null}
        emptyDetail={
          activeStage !== "incoming" && livePublicationUnavailable ?
            publicationUnavailableMessage(availability) :
            "Select an organizer lead to review evidence and handoff impact."
        }
        emptyQueue={
          activeStage !== "incoming" && livePublicationUnavailable ?
            publicationUnavailableMessage(availability) :
            "No organizer leads match this stage and filter set."
        }
        emptyKind={
          searchQuery || city !== "all" || priority !== "all" || queueFilter !== "all"
            ? "filter"
            : "stage"
        }
        filters={[
          {
            id: "all",
            label: activeStage !== "incoming" && livePublicationUnavailable ?
              "All —" :
              `All ${filteredEntries.length}`,
            selected: queueFilter === "all",
          },
          {id: "attention", label: "Needs attention", selected: queueFilter === "attention"},
          {id: "ready", label: "Ready", selected: queueFilter === "ready"},
        ]}
        items={filteredEntries.map((entry) => {
          const queueItem = entry.kind === "entity" ?
            organizerEntityQueueItem(
              entry.item,
              publicationPacketByEntity.get(entry.item.entityId)
            ) :
            organizerCandidateQueueItem(
              entry.candidate,
              duplicateCandidateIds,
              Boolean(
                entry.candidate.draftLink ||
                localOrganizerDrafts[entry.candidate.candidateId]
              ),
              nowMs
            );
          return {
            ...queueItem,
            pending: entry.kind === "entity"
              ? Boolean(decisionInFlight[entry.item.entityId])
              : Boolean(curationInFlight[entry.candidate.candidateId] ||
                organizerDraftInFlight[entry.candidate.candidateId]),
          };
        })}
        queueMeta={
          activeStage !== "incoming" && livePublicationUnavailable ?
            "Publication review unavailable" :
            `${filteredEntries.length} item${filteredEntries.length === 1 ? "" : "s"}`
        }
        queueTitle={stageTitle(activeStage)}
        queueScopeKey={[
          activeStage,
          city,
          priority,
          queueFilter,
          searchQuery.trim().toLocaleLowerCase(),
          availability.runIds.join(","),
        ].join(":")}
        selectedId={selectedEntryId}
        stageControl={stageControl}
        state={
          activeStage !== "incoming" && livePublicationUnavailable
            ? "unavailable"
            : "ready"
        }
        onFilterChange={(filterId) => {
          setQueueFilter(filterId as OrganizerQueueFilter);
          setSelectedEntryId(null);
        }}
        onSelect={setSelectedEntryId}
      />
  );
}

function publicationUnavailableMessage(
  availability: OrganizerIntakeController["availability"]
) {
  const runLabel = availability.runIds.length === 1 ?
    `run ${availability.runIds[0]}` :
    availability.runIds.length > 1 ?
      `runs ${availability.runIds.join(", ")}` :
      "the current live run";
  return "Organizer publication review is not available from the live " +
    `projection yet — ${availability.discoveryCandidateCount} discovery ` +
    `candidates loaded from ${runLabel}.`;
}

function stageItems(
  items: Intake.OrganizerIntakeItem[],
  packets: Map<string, Intake.OrganizerPublicationReviewPacket>,
  stage: OrganizerWorkbenchStage
) {
  return items.filter((item) => {
    const packet = packets.get(item.entityId);
    const operationStage = organizerOperationStage(item.reviewStatus);
    if (operationStage) return operationStage === stage;
    if (stage === "incoming") {
      return item.reviewStatus === "new" || item.taskType.includes("discovery");
    }
    if (stage === "verify") {
      return item.reviewStatus.includes("review") || item.reviewStatus.includes("evidence");
    }
    if (stage === "resolve") return organizerItemNeedsAttention(item, packet);
    return organizerItemIsReady(item, packet);
  });
}

function organizerItemNeedsAttention(
  item: Intake.OrganizerIntakeItem,
  packet?: Intake.OrganizerPublicationReviewPacket
) {
  return item.blockers.length > 0 || item.surfaceSummary.ambiguous > 0 ||
    item.surfaceSummary.candidate > 0 ||
    (packet?.evidenceSummary.manualReportsWithoutArtifacts ?? 0) > 0 ||
    (packet?.dataBlockers.length ?? 0) > 0 ||
    (packet?.evidenceBlockers.length ?? 0) > 0;
}

function organizerItemIsReady(
  item: Intake.OrganizerIntakeItem,
  packet?: Intake.OrganizerPublicationReviewPacket
) {
  return publicationPacketReady(packet) || item.publishStatus === "published";
}

function organizerEvidenceRows(
  item: Intake.OrganizerIntakeItem,
  packet?: Intake.OrganizerPublicationReviewPacket
) {
  const rows = packet?.evidenceReview.records.slice(0, 4).map((record) => ({
    href: record.surface.url,
    id: record.evidenceId,
    meta: record.evidence.description ?? record.nextAction.replaceAll("_", " "),
    status: record.evidence.status === "resolved_artifact" ?
      "confirmed" : record.evidence.status.replaceAll("_", " "),
    statusTone: record.riskFlags.length > 0 ? "warning" as const :
      record.evidence.status === "resolved_artifact" ? "success" as const : "neutral" as const,
    title: `${record.surface.platform} · ${record.surface.surfaceKind.replaceAll("_", " ")}`,
  })) ?? [];
  const surfaceRows = item.surfaces.slice(0, 4).map((surface) => ({
    href: surface.url,
    id: surface.surfaceId,
    meta: surface.notes,
    status: surface.status.replaceAll("_", " "),
    statusTone: surface.status === "active" ? "success" as const : "warning" as const,
    title: `${surface.platform} · ${surface.surfaceKind.replaceAll("_", " ")}`,
  }));
  if (rows.length > 0) return rows;
  if (surfaceRows.length > 0) return surfaceRows;
  if (packet && packet.evidenceSummary.records > 0) return [{
    id: "evidence-summary",
    meta: `${packet.evidenceSummary.records} records · ${packet.evidenceSummary.manualReportsWithoutArtifacts} manual reports`,
    status: packet.evidenceSummary.unresolvedLocalRefs > 0 ?
      "needs resolution" : "summary loaded",
    statusTone: packet.evidenceSummary.unresolvedLocalRefs > 0 ?
      "warning" as const : "neutral" as const,
    title: "Bounded evidence summary",
  }];
  return [];
}

function organizerChecklistRows(
  packet: Intake.OrganizerPublicationReviewPacket | undefined,
  reportsAcknowledged: boolean
) {
  if (!packet) return [{id: "packet", label: "Generate a publication packet", meta: "required", passed: false}];
  const checklist = Object.entries(packet.approvalChecklist);
  const complete = checklist.filter(([, passed]) => passed).length;
  const rows = [{
    id: "checks",
    label: `${complete} identity, market, copy, media, and crawl checks passed`,
    meta: complete === checklist.length ? "complete" : "required",
    passed: complete === checklist.length,
  }];
  [...packet.blockers, ...packet.dataBlockers, ...packet.evidenceBlockers]
    .slice(0, 2).forEach((blocker, index) => rows.push({
      id: `blocker:${index}`,
      label: blocker.replaceAll("_", " "),
      meta: "required",
      passed: false,
    }));
  if (packet.evidenceSummary.manualReportsWithoutArtifacts > 0) rows.push({
    id: "manual-reports",
    label: `Acknowledge ${packet.evidenceSummary.manualReportsWithoutArtifacts} manual reports`,
    meta: reportsAcknowledged ? "complete" : "required",
    passed: reportsAcknowledged,
  });
  if (packet.status === "published") rows.push({
    id: "published",
    label: "Publishing handoff already completed",
    meta: "complete",
    passed: true,
  });
  return rows;
}

function organizerImpactRows(
  item: Intake.OrganizerIntakeItem,
  packet: Intake.OrganizerPublicationReviewPacket | undefined,
  visibility: Intake.OrganizerVisibilityFormState | null
) {
  return [
    {
      id: "website",
      label: "Website listing",
      tone: visibility?.publishStatus === "published" ?
        "success" as const :
        "neutral" as const,
      value: visibility?.publishStatus === "published" ?
        "Publish" :
        "Keep draft",
    },
    {
      id: "index",
      label: "Search indexing",
      value: visibility?.indexStatus ?? "noindex",
    },
    {
      id: "app",
      label: "App visibility",
      value: visibility?.appVisibility ?? item.appVisibility.replaceAll("_", " "),
    },
    {id: "claim", label: "Claim handoff", value: packet?.publicPresence.claimTargetPath ? "Target prepared" : "No target"},
    {id: "crawl", label: "Recurring crawl", value: item.surfaces.some((surface) => surface.crawl.policy !== "blocked") ? "Manual only" : "Blocked"},
    {id: "canonical", label: "Canonical organizer", value: "Separate workspace"},
  ];
}

function organizerDecisionHint(
  decision: AdminDecideOrganizerIntakeResponse | undefined,
  packet: Intake.OrganizerPublicationReviewPacket | undefined,
  manualReports: number,
  reportsAcknowledged: boolean
) {
  if (decision) return `Recorded ${decisionLabel(decision.decision)} at ${decision.decisionPath}.`;
  if (!packet) return "Approval is disabled until a publication packet exists.";
  if (packet.status === "published") {
    return "This handoff is already published. Use Organizers for canonical edits or visibility changes.";
  }
  if (manualReports > 0 && !reportsAcknowledged) {
    return "Approval is disabled until manual reports are acknowledged.";
  }
  return publicationPacketReady(packet) ?
    "Approval records the reviewed entity and applies only the three selected surface controls." :
    "Approval is disabled until packet blockers and checklist gates are resolved.";
}

function decisionBlockerCount(
  packet: Intake.OrganizerPublicationReviewPacket | undefined,
  reportsAcknowledged: boolean
) {
  if (!packet || packet.status === "published") return packet ? 0 : 1;
  return packet.blockers.length + packet.dataBlockers.length +
    packet.evidenceBlockers.length +
    Object.values(packet.approvalChecklist).filter((passed) => !passed).length +
    (packet.evidenceSummary.manualReportsWithoutArtifacts > 0 && !reportsAcknowledged ? 1 : 0);
}

function organizerSearchText(item: Intake.OrganizerIntakeItem) {
  return [
    item.displayName,
    item.entityId,
    item.taskType,
    item.reviewStatus,
    ...item.markets.map((market) => market.displayName),
    ...Object.keys(item.surfaceSummary.platforms),
  ].join(" ").toLocaleLowerCase();
}

function workbenchEntryMarkets(entry: OrganizerWorkbenchEntry) {
  if (entry.kind === "candidate") {
    return [candidateMarketLabel(entry.candidate)];
  }
  return entry.item.markets.map((market) => market.displayName);
}

function workbenchEntryPriority(
  entry: OrganizerWorkbenchEntry,
  duplicateCandidateIds: Set<string>
) {
  if (entry.kind === "entity") return entry.item.priority;
  if (
    entry.candidate.existingEntityMatches.length > 0 ||
    duplicateCandidateIds.has(entry.candidate.candidateId)
  ) {
    return "p0";
  }
  if (
    entry.candidate.reviewAction === "supporting_evidence_only" ||
    entry.candidate.normalizedKey === null
  ) {
    return "p2";
  }
  return "p1";
}

function workbenchEntryNeedsAttention(
  entry: OrganizerWorkbenchEntry,
  packets: Map<string, Intake.OrganizerPublicationReviewPacket>,
  duplicateCandidateIds: Set<string>
) {
  if (entry.kind === "candidate") {
    if (entry.candidate.draftLink) return true;
    return organizerCandidateChecklistRows(
      entry.candidate,
      duplicateCandidateIds
    ).some((row) => !row.passed);
  }
  return organizerItemNeedsAttention(
    entry.item,
    packets.get(entry.item.entityId)
  );
}

function workbenchEntryIsReady(
  entry: OrganizerWorkbenchEntry,
  packets: Map<string, Intake.OrganizerPublicationReviewPacket>,
  duplicateCandidateIds: Set<string>
) {
  if (entry.kind === "candidate") {
    return organizerCandidateChecklistRows(
      entry.candidate,
      duplicateCandidateIds
    ).every((row) => row.passed);
  }
  return organizerItemIsReady(entry.item, packets.get(entry.item.entityId));
}

function workbenchEntrySearchText(entry: OrganizerWorkbenchEntry) {
  if (entry.kind === "entity") return organizerSearchText(entry.item);
  const candidate = entry.candidate;
  return [
    candidate.title,
    candidate.candidateId,
    candidate.platform,
    candidate.surfaceKind,
    candidate.reviewAction,
    candidate.snippet,
    candidate.query,
    candidate.queryIntent.marketSlug,
    candidate.queryIntent.activityKind,
    ...candidate.diagnostics,
    ...candidate.existingEntityMatches.map((match) => match.entityId),
    candidate.reviewContext?.recordStatus,
    candidate.reviewContext?.eventSignal,
    candidate.reviewContext?.reviewNotes,
    ...(candidate.reviewContext?.formats ?? []),
    ...(candidate.reviewContext?.sources ?? []),
  ].filter(Boolean).join(" ").toLocaleLowerCase();
}

function organizerCandidateEvidenceRows(
  candidate: Intake.OrganizerSearchCandidate
) {
  const primarySource = {
    href: candidate.canonicalUrl,
    id: "source",
    meta: candidate.snippet ?? candidate.query,
    status: `observed ${candidate.observedAt}`,
    statusTone: "neutral" as const,
    title:
      `${candidate.platform} · ${candidate.surfaceKind.replaceAll("_", " ")}`,
  };
  const reviewedSources = (candidate.reviewContext?.sources ?? [])
    .filter((source) => source !== candidate.canonicalUrl)
    .map((source, index) => ({
      href: source,
      id: `review-source:${index}`,
      meta: candidate.reviewContext?.eventSignal ?? "Reviewed source",
      status: `verified ${candidate.reviewContext?.verifiedAt ?? "date unavailable"}`,
      statusTone: "success" as const,
      title: `Reviewed source ${index + 1}`,
    }));
  return [
    primarySource,
    ...reviewedSources,
    {
      id: "query",
      meta: candidate.query,
      status: candidate.reviewAction.replaceAll("_", " "),
      statusTone: candidate.existingEntityMatches.length > 0 ?
        "success" as const : "warning" as const,
      title: "Discovery query",
    },
    {
      id: "provenance",
      meta: "Only source-linked values are projected into the draft.",
      status:
        `${candidate.fieldProvenance?.length ?? 0} mapped source fields`,
      statusTone: candidate.fieldProvenance?.length ?
        "success" as const :
        "warning" as const,
      title: "Field provenance",
    },
  ];
}

function organizerCandidateImpactRows(
  candidate: Intake.OrganizerSearchCandidate
) {
  return [
    {
      id: "entity",
      label: "Organizer record",
      value: candidate.existingEntityMatches[0]?.entityId ?
        `Attach to ${candidate.existingEntityMatches[0].entityId}` :
        "Draft required",
    },
    {id: "website", label: "Website listing", value: "No write"},
    {id: "app", label: "App visibility", value: "Hidden"},
    {id: "crawl", label: "Recurring crawl", value: "Disabled"},
    {id: "market", label: "Pilot market", value: candidateMarketLabel(candidate)},
    ...(candidate.reviewContext ? [{
      id: "record-status",
      label: "Review status",
      value: candidate.reviewContext.recordStatus.replaceAll("_", " "),
    }, {
      id: "inventory",
      label: "Existing inventory",
      value: candidate.reviewContext.existingInventory ? "Attach" : "Net new",
    }] : []),
  ];
}

function stageTitle(stage: OrganizerWorkbenchStage) {
  if (stage === "incoming") return "Incoming organizer leads";
  if (stage === "verify") return "Needs verification";
  if (stage === "resolve") return "Resolve evidence and identity";
  return "Ready handoffs";
}

function readOrganizerWorkbenchStage(): OrganizerWorkbenchStage {
  if (typeof window === "undefined") return "incoming";
  try {
    const value = window.localStorage.getItem(organizerWorkbenchStageKey);
    if (value === "incoming" || value === "verify" || value === "resolve" || value === "ready") {
      return value;
    }
  } catch {
    // Fall through to the review-first default.
  }
  return "incoming";
}

export const organizerIntakeWorkbench = {OrganizerTaskWorkbench};
