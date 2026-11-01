import {CatchField} from "@catch/web-ui";
import {RefreshCw, Search} from "lucide-react";
import {useEffect, useMemo, useState} from "react";

import {
  AdminButton,
  type AdminIntakeBulkAction,
  type AdminIntakeQueueColumn,
  AdminIntakeReviewWorkbench,
  AdminIntakeSection,
  AdminIntakeStageRail,
  AdminIntakeTaskToolbar,
  AdminLinkButton,
  SearchField,
  selectOptions,
} from "../../../../shared/ui/AdminPrimitives";
import type {
  EventIntakeCandidate,
  EventIntakeDecision,
  EventIntakeSourceResult,
  EventIntakeTargetType,
} from "../../../../shared/types/adminTypes";
import type {EventIntakeController} from
  "../controllers/useEventIntakeController";
import {
  bridgeIsStale,
  buildEventIntakeEditDiff,
  candidateChecks,
  eventCandidateHasPassed,
  eventCandidateStage,
  eventWhenLabel,
  formatTimestamp,
  passedEventRecords,
  recordsForStage,
  sourceChecks,
  type EventIntakeEditDiff,
  type EventWorkbenchRecord,
  type EventWorkbenchStage,
} from "./eventIntakeWorkbenchModel";

type EventQueueFilter = "all" | "attention" | "sourced" | "passed";

const eventWorkbenchStageKey = "catch-admin.event-intake-stage.v2";
const candidateEditableFields = [
  "title",
  "startDate",
  "time",
  "venue",
  "neighborhood",
  "sourceUrl",
  "publicDescription",
] as const;
const sourceEditableFields = ["title", "url", "snippet"] as const;

const incomingColumns: AdminIntakeQueueColumn[] = [
  {id: "source", label: "Source / platform"},
  {id: "observed", label: "Observed"},
  {id: "risk", label: "Risk flags"},
  {id: "blocker", label: "Top blocker"},
  {id: "status", label: "Status"},
];
const candidateColumns: AdminIntakeQueueColumn[] = [
  {id: "when", label: "When", width: "19%"},
  {id: "organizer", label: "Organizer"},
  {id: "venue", label: "Venue / neighborhood"},
  {id: "source", label: "Source"},
  {id: "blocker", label: "Top blocker"},
  {id: "status", label: "Status"},
];

function EventTaskWorkbench({
  controller,
}: {
  controller: EventIntakeController;
}) {
  const {
    bridge,
    errorMessage,
    inFlight,
    isError,
    isLoading,
    isRefreshing,
    loadBridge,
    localDecisions,
    notes,
    setNote,
    snapshotVersion,
    sourceResultById,
    targetDecision,
  } = controller;
  const [activeStage, setActiveStageState] = useState<EventWorkbenchStage>(
    readEventWorkbenchStage
  );
  const [queueFilter, setQueueFilter] = useState<EventQueueFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sourceState, setSourceState] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, Record<string, string>>
  >({});
  const now = new Date();

  const allPassedRecords = bridge ?
    passedEventRecords(bridge.eventCandidates, now) : [];
  const stageRecords = bridge ? (
    queueFilter === "passed" ?
      allPassedRecords :
      recordsForStage(
        bridge.sourceResults,
        bridge.eventCandidates,
        activeStage,
        now
      )
  ) : [];
  const categories = bridge ? Array.from(new Set(
    bridge.eventCandidates.map((candidate) => candidate.category)
  )).sort() : [];
  const records = stageRecords.filter((record) => {
    const text = recordSearchText(record);
    const candidate = record.kind === "candidate" ? record.value : null;
    const source = record.kind === "source" ? record.value : null;
    return (
      (!searchQuery.trim() ||
        text.includes(searchQuery.trim().toLocaleLowerCase())) &&
      (category === "all" || candidate?.category === category) &&
      (
        sourceState === "all" ||
        (sourceState === "sourced" &&
          Boolean(candidate?.sourceUrl || source?.url)) ||
        (sourceState === "missing" && candidate && !candidate.sourceUrl) ||
        (sourceState === "manual" && (
          candidate?.sourceStatus ===
            "manual_reference_needs_official_verification" ||
          source?.resultType === "manual_social_reference"
        ))
      ) &&
      (
        queueFilter === "all" ||
        queueFilter === "passed" ||
        (queueFilter === "attention" && recordNeedsAttention(record, now)) ||
        (queueFilter === "sourced" && recordIsSourced(record))
      )
    );
  });

  useEffect(() => {
    if (selectedId !== null) return;
    setSelectedId(records[0] ? recordId(records[0]) : null);
  }, [records, selectedId]);

  if (!bridge) {
    return (
      <AdminIntakeReviewWorkbench
        detail={null}
        emptyDetail="Select a lead or candidate to review its provenance and decision gates."
        emptyQueue="No event intake projection is available."
        items={[]}
        queueMeta={isLoading ? "Loading" : "Unavailable"}
        queueTitle="Event intake"
        selectedId={null}
        state={isLoading ? "loading" : isError ? "error" : "unavailable"}
        loadError={errorMessage}
        onRetry={() => void loadBridge()}
        onSelect={() => undefined}
      />
    );
  }

  const selected =
    records.find((record) => recordId(record) === selectedId) ?? null;
  const target = selected ? targetForRecord(selected) : null;
  const targetKey = target ? `${target.type}:${target.id}` : null;
  const localDecision = targetKey ? localDecisions[targetKey] : undefined;
  const targetInFlight = targetKey ? inFlight[targetKey] : false;
  const candidateById = new Map(
    bridge.eventCandidates.map((candidate) => [candidate.id, candidate])
  );
  const lookaheadDays = bridge.runPlan.schedule.lookaheadDays || 7;
  const unavailable = bridge.bridgeSource === "empty";
  const stale = bridge.bridgeSource === "operations" &&
    bridgeIsStale(bridge.generatedAt, lookaheadDays, now);

  const setStage = (stage: EventWorkbenchStage) => {
    setActiveStageState(stage);
    setQueueFilter("all");
    setSelectedId(null);
    try {
      window.localStorage.setItem(eventWorkbenchStageKey, stage);
    } catch {
      // The in-memory stage still works when storage is unavailable.
    }
  };

  const editDiffForRecord = (
    record: EventWorkbenchRecord
  ): EventIntakeEditDiff => {
    const original = record.value as unknown as Record<string, unknown>;
    const draft = {
      ...original,
      ...(drafts[recordId(record)] ?? {}),
    };
    return buildEventIntakeEditDiff(
      original,
      draft,
      record.kind === "candidate" ?
        candidateEditableFields :
        sourceEditableFields
    );
  };

  const applyDecisionForRecord = async (
    record: EventWorkbenchRecord,
    decision: EventIntakeDecision,
    edits: EventIntakeEditDiff = {}
  ) => {
    const recordTarget = targetForRecord(record);
    return targetDecision({
      targetType: recordTarget.type,
      targetId: recordTarget.id,
      decision,
      edits: Object.keys(edits).length > 0 ? edits : undefined,
      defaultNote: `${record.value.title} reviewed for event intake use.`,
    });
  };

  const advanceAfterDecision = (currentId: string) => {
    const index = records.findIndex((record) => recordId(record) === currentId);
    if (index < 0 || records.length < 2) return;
    setSelectedId(recordId(records[(index + 1) % records.length]));
  };

  const recordDecision = async (decision: EventIntakeDecision) => {
    if (!selected) return;
    const id = recordId(selected);
    if (await applyDecisionForRecord(selected, decision, editDiffForRecord(selected))) {
      setDrafts((current) => {
        const next = {...current};
        delete next[id];
        return next;
      });
      advanceAfterDecision(id);
    }
  };

  const recordById = new Map(records.map((record) => [recordId(record), record]));
  const applyDecisionToIds = async (
    ids: readonly string[],
    decision: EventIntakeDecision
  ) => {
    const appliedIds: string[] = [];
    const failures: Array<{id: string; reason: string}> = [];
    for (const id of ids) {
      const record = recordById.get(id);
      if (!record) continue;
      if (await applyDecisionForRecord(record, decision)) {
        appliedIds.push(id);
      } else {
        failures.push({id, reason: "The decision was not recorded."});
      }
    }
    return {appliedIds, failures};
  };

  const resolveDuplicateSet = async (candidate: EventIntakeCandidate) => {
    const duplicateIds = candidate.dedupe?.duplicateCandidateIds ?? [];
    const failures: string[] = [];
    for (const duplicateId of duplicateIds) {
      const duplicate = candidateById.get(duplicateId);
      if (
        !duplicate ||
        !await applyDecisionForRecord(
          {kind: "candidate", value: duplicate},
          "reject"
        )
      ) {
        failures.push(duplicateId);
      }
    }
    const keptCandidateRecorded = await applyDecisionForRecord(
      {kind: "candidate", value: candidate},
      "needs_changes",
      {
        dedupe: {
          before: candidate.dedupe,
          after: {
            ...candidate.dedupe,
            duplicateCandidateIds: failures,
          },
        },
      }
    );
    if (!keptCandidateRecorded) {
      failures.push(candidate.id);
    }
    setDuplicateMessage(
      failures.length > 0 ?
        `${duplicateIds.length - failures.filter((id) => id !== candidate.id).length} rejected · ${failures.length} failed: ${failures.join(", ")}` :
        `${duplicateIds.length} duplicate${duplicateIds.length === 1 ? "" : "s"} rejected; this candidate was kept.`
    );
    return failures;
  };

  const bulkActions = eventBulkActions({
    records,
    now,
    applyDecisionToIds,
  });
  const draft = selected ? {
    ...editableValues(selected),
    ...(drafts[recordId(selected)] ?? {}),
  } : {};
  const bridgeState = isLoading ? "loading" :
    unavailable || stale ? "unavailable" :
      "ready";
  const queueTitle = queueFilter === "passed" ?
    "Passed events" :
    eventStageTitle(activeStage);

  const controls = (
    <AdminIntakeTaskToolbar aria-label="Event intake filters">
        <SearchField
          ariaLabel="Search event intake"
          icon={<Search size={15} strokeWidth={1.9} />}
          placeholder="Search event, organizer, source, venue..."
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setSelectedId(null);
          }}
        />
        <CatchField
          recipe="select"
          title="Category"
          labelMode="hidden"
          {...selectOptions([
            {value: "all", label: "All categories"},
            ...categories.map((value) => ({
              value,
              label: value.replaceAll("_", " "),
            })),
          ])}
          value={category}
          onChanged={(value) => {
            setCategory((value ?? ""));
            setSelectedId(null);
          }}
        />
        <CatchField
          recipe="select"
          title="Source state"
          labelMode="hidden"
          {...selectOptions([
            {value: "all", label: "All source states"},
            {value: "sourced", label: "Source-backed"},
            {value: "missing", label: "Missing source"},
            {value: "manual", label: "Manual reference"},
          ])}
          value={sourceState}
          onChanged={(value) => {
            setSourceState((value ?? ""));
            setSelectedId(null);
          }}
        />
        <AdminButton
          icon={<RefreshCw size={14} strokeWidth={1.9} />}
          loading={isLoading || isRefreshing}
          loadingLabel="Refreshing"
          variant="primary"
          onClick={() => void loadBridge()}
        >
          Refresh
        </AdminButton>
    </AdminIntakeTaskToolbar>
  );
  const stageControl = (
    <AdminIntakeStageRail<EventWorkbenchStage>
      ariaLabel="Event intake stages"
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
        columns={activeStage === "incoming" && queueFilter !== "passed" ?
          incomingColumns :
          candidateColumns}
        controls={controls}
        detail={selected && target ? detailForRecord({
          bridgeGeneratedAt: bridge.generatedAt,
          candidateById,
          draft,
          duplicateMessage,
          inFlight: targetInFlight,
          localDecision,
          note: notes[targetKey ?? ""] ?? "",
          now,
          record: selected,
          sourceResultById,
          onDecision: recordDecision,
          onEditField: (field, value) => {
            const id = recordId(selected);
            setDrafts((current) => ({
              ...current,
              [id]: {...(current[id] ?? {}), [field]: value},
            }));
          },
          onNoteChange: (value) => targetKey && setNote(targetKey, value),
          onResolveDuplicates: resolveDuplicateSet,
        }) : null}
        emptyDetail="Select a lead or candidate to review its provenance and decision gates."
        emptyQueue={
          unavailable ?
            `${bridge.city.label} has no completed Supply Intake event run.` :
            stale ?
              `${bridge.city.label} projection from ${formatTimestamp(bridge.generatedAt)} is stale; refresh the governed workflow before reviewing.` :
              queueFilter === "passed" ?
                "No passed events are retained in this projection." :
                "No event intake records match this stage and filter set."
        }
        emptyKind={
          unavailable || stale ? "unavailable" :
            searchQuery || category !== "all" || sourceState !== "all" ||
            queueFilter !== "all" ?
              "filter" :
              "stage"
        }
        filters={[
          {id: "all", label: `All ${records.length}`, selected: queueFilter === "all"},
          {
            id: "attention",
            label: "Needs attention",
            selected: queueFilter === "attention",
          },
          {
            id: "sourced",
            label: "Source-backed",
            selected: queueFilter === "sourced",
          },
          {
            id: "passed",
            label: `Passed ${allPassedRecords.length}`,
            selected: queueFilter === "passed",
          },
        ]}
        items={records.map((record) => {
          const recordTarget = targetForRecord(record);
          return {
            ...queueItemForRecord(record, now),
            pending: Boolean(inFlight[
              `${recordTarget.type}:${recordTarget.id}`
            ]),
          };
        })}
        headerContext={
          <span
            aria-label={`${bridge.city.label}; reviewed run ${bridge.runPlan.id}; generated ${formatTimestamp(bridge.generatedAt)}`}
            title={`${bridge.city.label} · reviewed run ${bridge.runPlan.id} · generated ${formatTimestamp(bridge.generatedAt)}`}
          >
            {bridge.city.label} · {compactIdentifier(bridge.runPlan.id)} ·{" "}
            {compactDate(bridge.generatedAt)}
          </span>
        }
        loadError={errorMessage}
        queueMeta={`${records.length} item${records.length === 1 ? "" : "s"}`}
        queueTitle={queueTitle}
        queueScopeKey={[
          activeStage,
          category,
          sourceState,
          queueFilter,
          searchQuery.trim().toLocaleLowerCase(),
          snapshotVersion,
        ].join(":")}
        selectedId={selectedId}
        stageControl={stageControl}
        state={bridgeState}
        titleColumnLabel="Title"
        onFilterChange={(filterId) => {
          setQueueFilter(filterId as EventQueueFilter);
          setSelectedId(null);
        }}
        onRetry={() => void loadBridge()}
        onSelect={setSelectedId}
      />
  );
}

function eventBulkActions({
  records,
  now,
  applyDecisionToIds,
}: {
  records: EventWorkbenchRecord[];
  now: Date;
  applyDecisionToIds: (
    ids: readonly string[],
    decision: EventIntakeDecision
  ) => Promise<{
    appliedIds: string[];
    failures: Array<{id: string; reason: string}>;
  }>;
}): AdminIntakeBulkAction[] {
  const ids = records.map(recordId);
  const approvable = records.filter((record) => (
    record.kind === "candidate" ?
      candidateChecks(record.value, now).every((check) => check.passed) :
      sourceChecks(record.value).every((check) => check.passed)
  )).map(recordId);
  const passed = records.filter((record) =>
    record.kind === "candidate" &&
    eventCandidateHasPassed(record.value, now)
  ).map(recordId);
  const missingSource = records.filter((record) =>
    record.kind === "candidate" && !record.value.sourceUrl
  ).map(recordId);
  return [
    {
      disabledReason:
        "Approval requires a current source, future Operations expiry, organizer attribution, venue, reviewed copy, rights, and dedupe clearance.",
      eligibleIds: approvable,
      id: "approve",
      label: "Approve eligible",
      onApply: (selected) => applyDecisionToIds(selected, "approve"),
      onUndo: async (selected) => {
        await applyDecisionToIds(selected, "hold");
      },
      tone: "success",
    },
    {
      disabledReason: "Reject passed applies only to expired event candidates.",
      eligibleIds: passed,
      id: "reject-passed",
      label: "Reject passed",
      onApply: (selected) => applyDecisionToIds(selected, "reject"),
      tone: "danger",
    },
    {
      disabledReason: "Hold missing source applies only to event candidates without a source URL.",
      eligibleIds: missingSource,
      id: "hold-missing-source",
      label: "Hold missing source",
      onApply: (selected) => applyDecisionToIds(selected, "hold"),
    },
    {
      eligibleIds: ids,
      id: "hold",
      label: "Hold",
      onApply: (selected) => applyDecisionToIds(selected, "hold"),
    },
    {
      eligibleIds: ids,
      id: "suppress",
      label: "Suppress",
      onApply: (selected) => applyDecisionToIds(selected, "reject"),
      onUndo: async (selected) => {
        await applyDecisionToIds(selected, "hold");
      },
      tone: "danger",
    },
  ];
}

function detailForRecord({
  bridgeGeneratedAt,
  candidateById,
  draft,
  duplicateMessage,
  inFlight,
  localDecision,
  note,
  now,
  record,
  sourceResultById,
  onDecision,
  onEditField,
  onNoteChange,
  onResolveDuplicates,
}: {
  bridgeGeneratedAt: string | null;
  candidateById: Map<string, EventIntakeCandidate>;
  draft: Record<string, string>;
  duplicateMessage: string | null;
  inFlight: boolean;
  localDecision: EventIntakeController["localDecisions"][string] | undefined;
  note: string;
  now: Date;
  record: EventWorkbenchRecord;
  sourceResultById: Map<string, EventIntakeSourceResult>;
  onDecision: (decision: EventIntakeDecision) => Promise<void>;
  onEditField: (field: string, value: string) => void;
  onNoteChange: (value: string) => void;
  onResolveDuplicates: (
    candidate: EventIntakeCandidate
  ) => Promise<string[]>;
}) {
  const candidate = record.kind === "candidate" ? record.value : null;
  const source = record.kind === "source" ? record.value : null;
  const checks = candidate ?
    candidateChecks(candidate, now) :
    sourceChecks(source!);
  const canApprove = checks.every((check) => check.passed);
  const status = recordStatus(record, now);
  const duplicateIds = candidate?.dedupe?.duplicateCandidateIds ?? [];
  const duplicateCandidates = duplicateIds.flatMap((id) => {
    const value = candidateById.get(id);
    return value ? [value] : [];
  });
  const organizerName = candidate ?
    candidate.attribution?.organizerEvidence.name ??
      candidate.attribution?.match.matchedEntityId ??
      "Unattributed" :
    null;
  const organizerSearch = encodeURIComponent(
    candidate?.attribution?.organizerEvidence.name ?? candidate?.title ?? ""
  );
  const editableSection = (
    <AdminIntakeSection variant="event-editor">
      <CatchField
        recipe="input"
        title="Title"
        value={draft.title ?? record.value.title}
        onChanged={(value) => onEditField("title", value)}
      />
      {candidate ? (
        <>
          <CatchField
            recipe="input"
            title="Start date"
            value={draft.startDate ?? candidate.startDate}
            onChanged={(value) => onEditField("startDate", value)}
            keyboardType="date"
          />
          <CatchField
            recipe="input"
            title="Time"
            value={draft.time ?? candidate.time}
            onChanged={(value) => onEditField("time", value)}
          />
          <CatchField
            recipe="input"
            title="Venue"
            value={draft.venue ?? candidate.venue}
            onChanged={(value) => onEditField("venue", value)}
          />
          <CatchField
            recipe="input"
            title="Neighborhood"
            value={draft.neighborhood ?? candidate.neighborhood}
            onChanged={(value) => onEditField("neighborhood", value)}
          />
          <CatchField
            recipe="input"
            title="Official source URL"
            value={draft.sourceUrl ?? candidate.sourceUrl ?? ""}
            onChanged={(value) => onEditField("sourceUrl", value)}
            keyboardType="url"
          />
          <CatchField
            recipe="input"
            title="Public description"
            maxLines={3}
            value={draft.publicDescription ?? candidate.publicDescription}
            onChanged={(value) => onEditField("publicDescription", value)}
          />
          <AdminIntakeSection variant="event-ceiling">
            <CatchField
              recipe="select"
              inputMode="inactive"
              title="App visibility ceiling"
              helperText={candidate.organizerCeiling?.reason ??
                "Organizer visibility was not projected; app discovery remains blocked."}
              values={["discoverable", "hidden"]}
              itemLabelBuilder={(ceiling) => ceiling === "discoverable" ? "Discoverable" : "Hidden"}
              value={candidate.organizerCeiling?.canAppDiscover ?
                "discoverable" :
                "hidden"}
            />
          </AdminIntakeSection>
        </>
      ) : (
        <>
          <CatchField
            recipe="input"
            title="Source URL"
            value={draft.url ?? source!.url}
            onChanged={(value) => onEditField("url", value)}
            keyboardType="url"
          />
          <CatchField
            recipe="input"
            title="Source snippet"
            maxLines={3}
            value={draft.snippet ?? source!.snippet}
            onChanged={(value) => onEditField("snippet", value)}
          />
        </>
      )}
    </AdminIntakeSection>
  );

  const duplicateSection = candidate && duplicateIds.length > 0 ? (
    <AdminIntakeSection variant="duplicate-comparison">
      <article>
        <strong>Keep: {candidate.title}</strong>
        <span>{eventWhenLabel(candidate, now)}</span>
        <span>{candidate.venue || "Venue missing"}</span>
      </article>
      {duplicateIds.map((id) => {
        const duplicate = candidateById.get(id);
        return (
          <article key={id}>
            <strong>Drop: {duplicate?.title ?? id}</strong>
            <span>{duplicate ?
              eventWhenLabel(duplicate, now) :
              "Candidate not in this projection"}</span>
            <span>{duplicate?.venue || "Venue missing"}</span>
          </article>
        );
      })}
      <AdminButton
        disabled={inFlight}
        onClick={() => void onResolveDuplicates(candidate)}
      >
        Keep this and reject {duplicateIds.length} duplicate
        {duplicateIds.length === 1 ? "" : "s"}
      </AdminButton>
      {duplicateMessage ? <span aria-live="polite">{duplicateMessage}</span> : null}
    </AdminIntakeSection>
  ) : null;

  const evidenceRows = candidate ? (
    candidate.sourceResultIds.length > 0 ?
      candidate.sourceResultIds.map((sourceId) => {
        const result = sourceResultById.get(sourceId);
        return {
          href: result?.url,
          id: sourceId,
          meta: result ?
            `${result.sourceLabel} · observed ${formatTimestamp(result.observedAt)}` :
            "Source result missing from this projection",
          status: result ? result.status.replaceAll("_", " ") : "missing",
          statusTone: result ? "warning" as const : "danger" as const,
          title: result?.title ?? sourceId,
        };
      }) :
      candidate.sourceUrl ? [{
        href: candidate.sourceUrl,
        id: `direct-source:${candidate.id}`,
        meta: `${candidate.sourceLabel} · direct event evidence`,
        status: candidate.attribution?.state === "orphan" ?
          "organizer attribution required" :
          "source backed",
        statusTone: candidate.attribution?.state === "orphan" ?
          "warning" as const :
          "success" as const,
        title: organizerName ?? candidate.title,
      }] : []
  ) : [{
    href: source!.url,
    id: source!.id,
    meta: `${source!.sourceLabel} · observed ${formatTimestamp(source!.observedAt)}`,
    status: source!.status.replaceAll("_", " "),
    statusTone: source!.riskFlags.length > 0 ?
      "warning" as const :
      "success" as const,
    title: source!.resultType.replaceAll("_", " "),
  }];

  return {
    action: candidate?.attribution?.state === "orphan" ? (
      <AdminLinkButton
        href={`/intake/organizers?search=${organizerSearch}`}
        label="Open generated organizer discovery lead"
      >
        Organizer lead
      </AdminLinkButton>
    ) : undefined,
    actionGate: localDecision ?
      `Decision recorded as ${localDecision.decisionStatus.replaceAll("_", " ")}. It remains in this snapshot until Refresh.` :
      canApprove ?
        "Approval records a decision only; publication remains a separate Events action." :
        checks.find((check) => !check.passed)?.meta ??
          "Resolve the evidence blockers before approval.",
    actions: (
      <>
        <AdminButton disabled={inFlight} onClick={() => void onDecision("reject")}>
          Reject
        </AdminButton>
        <AdminButton disabled={inFlight} onClick={() => void onDecision("hold")}>
          Hold
        </AdminButton>
        <AdminButton
          disabled={inFlight}
          onClick={() => void onDecision("needs_changes")}
        >
          Needs changes
        </AdminButton>
        <AdminButton
          disabled={!canApprove || inFlight}
          title={!canApprove ?
            checks.find((check) => !check.passed)?.meta :
            undefined}
          variant="primary"
          onClick={() => void onDecision("approve")}
        >
          Approve intake
        </AdminButton>
      </>
    ),
    blockers: checks.filter((check) => !check.passed).map((check) => ({
      action: check.meta,
      id: check.id,
      label: check.label,
      tone: check.id === "event_has_not_passed" ||
        check.id === "organizer" ?
        "danger" as const :
        "warning" as const,
    })),
    initials: initialsForLabel(record.value.title),
    readiness: {
      blockers: checks.filter((check) => !check.passed).length,
      complete: checks.filter((check) => check.passed).length,
      label: "Decision readiness",
      total: checks.length,
    },
    sections: [
      {
        content: editableSection,
        id: "edit",
        kind: "content" as const,
        title: "Reviewed fields",
      },
      ...(checks.length > 0 ? [{
        id: "checks",
        kind: "checklist" as const,
        rows: checks,
        title: "Review checklist",
      }] : []),
      ...(duplicateSection ? [{
        content: duplicateSection,
        id: "duplicates",
        kind: "content" as const,
        title: "Duplicate comparison",
      }] : []),
      {
        id: "evidence",
        kind: "evidence" as const,
        rows: evidenceRows,
        title: "Evidence and provenance",
      },
      {
        id: "impact",
        kind: "impact" as const,
        rows: candidate ? [
          {
            id: "organizer",
            label: "Organizer",
            value: organizerName ?? "Unattributed",
          },
          {
            id: "expiry",
            label: "Expiry",
            value: formatTimestamp(candidate.expiresAt),
          },
          {
            id: "visibility",
            label: "App ceiling",
            value: candidate.organizerCeiling?.appVisibility ?? "unverified",
          },
        ] : [{
          id: "observed",
          label: "Observed",
          value: formatTimestamp(source!.observedAt),
        }],
        title: "Impact",
      },
      {
        content: (
          <pre>{JSON.stringify({
            operationRunId: candidate?.operationRunId ??
              bridgeGeneratedAt,
            blockerCodes: candidate?.blockerCodes ?? [],
            warnings: candidate?.warnings ?? source?.riskFlags ?? [],
          }, null, 2)}</pre>
        ),
        id: "diagnostics",
        kind: "diagnostics" as const,
        title: "Diagnostics",
      },
      {
        content: (
          <AdminIntakeSection>
            <CatchField
              recipe="input"
              title="Decision note"
              inputHint="Record source, duplicate, timing, or location evidence..."
              maxLines={2}
              value={note}
              onChanged={onNoteChange}
            />
          </AdminIntakeSection>
        ),
        id: "note",
        kind: "content" as const,
        title: "Decision note",
      },
    ],
    status: status.label,
    statusTone: status.tone,
    subtitle: candidate ?
      `${candidate.category.replaceAll("_", " ")} · ${eventWhenLabel(candidate, now)}` :
      `${source!.sourceLabel} · ${source!.resultType.replaceAll("_", " ")}`,
    title: record.value.title,
  };
}

function queueItemForRecord(
  record: EventWorkbenchRecord,
  now: Date
) {
  const status = recordStatus(record, now);
  const candidate = record.kind === "candidate" ? record.value : null;
  const source = record.kind === "source" ? record.value : null;
  const checks = candidate ?
    candidateChecks(candidate, now) :
    sourceChecks(source!);
  const failedCheck = checks.find((check) => !check.passed);
  const observedAt =
    source?.observedAt ?? candidate?.observedAt ?? candidate?.startDate;
  const organizer = candidate?.attribution?.state === "attributed" ?
    candidate.attribution.organizerEvidence.name ??
      candidate.attribution.match.matchedEntityId ??
      "Attributed" :
    candidate ?
      "Unattributed" :
      "—";
  return {
    age: ageLabel(observedAt),
    ageDays: ageDays(observedAt),
    blocker: failedCheck?.label ?? "—",
    blockerKey: failedCheck?.id ?? (
      candidate && status.tone === "neutral" ? "needs-you" : null
    ),
    description: candidate ?
      `${candidate.category.replaceAll("_", " ")} · ${candidate.neighborhood}` :
      source!.sourceLabel,
    id: recordId(record),
    initials: initialsForLabel(record.value.title),
    kind: candidate ? "Event candidate" : "Source lead",
    market: candidate?.neighborhood || "—",
    meta: candidate ?
      `${candidate.sourceResultIds.length} sources` :
      `${source!.resultType.replaceAll("_", " ")} · ${formatTimestamp(source!.observedAt)}`,
    source: candidate?.sourceLabel ?? source!.sourceLabel,
    status: status.label,
    statusTone: status.tone,
    title: record.value.title,
    values: candidate ? {
      blocker: failedCheck?.label ?? "—",
      organizer,
      source: candidate.sourceLabel,
      status: status.label,
      venue: [candidate.venue, candidate.neighborhood]
        .filter(Boolean).join(" · ") || "—",
      when: eventWhenLabel(candidate, now),
    } : {
      blocker: failedCheck?.label ?? "—",
      observed: formatTimestamp(source!.observedAt),
      risk: source!.riskFlags.join(", ") || "—",
      source: source!.sourceLabel,
      status: status.label,
    },
  };
}

function recordStatus(
  record: EventWorkbenchRecord,
  now: Date
): {
  label: string;
  tone: "neutral" | "warning" | "danger" | "success";
} {
  if (record.value.latestDecision?.decision) {
    const decision = record.value.latestDecision.decision.replaceAll("_", " ");
    return {
      label: `recorded: ${decision}`,
      tone: decision === "approve" ? "success" : "neutral",
    };
  }
  if (record.kind === "source") {
    if (record.value.riskFlags.includes("placeholder_result")) {
      return {label: "placeholder", tone: "danger"};
    }
    return {
      label: record.value.status.replaceAll("_", " "),
      tone: "warning",
    };
  }
  if (eventCandidateHasPassed(record.value, now)) {
    return {label: "passed", tone: "danger"};
  }
  if (record.value.reviewState === "approved") {
    return {label: "approved", tone: "success"};
  }
  if (record.value.attribution?.state === "orphan") {
    return {label: "organizer required", tone: "danger"};
  }
  if (!record.value.sourceUrl) {
    return {label: "needs source", tone: "danger"};
  }
  if (
    record.value.sourceStatus ===
      "manual_reference_needs_official_verification"
  ) {
    return {label: "verify source", tone: "warning"};
  }
  return {
    label: record.value.reviewState.replaceAll("_", " "),
    tone: "neutral",
  };
}

function compactIdentifier(value: string) {
  return value.length <= 8 ? value : `…${value.slice(-7)}`;
}

function compactDate(value: string | null | undefined) {
  if (!value) return "No date";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Invalid date";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(timestamp);
}

function recordNeedsAttention(record: EventWorkbenchRecord, now: Date) {
  return record.kind === "candidate" ?
    candidateChecks(record.value, now).some((check) => !check.passed) :
    sourceChecks(record.value).some((check) => !check.passed);
}

function recordIsSourced(record: EventWorkbenchRecord) {
  return record.kind === "source" ?
    Boolean(record.value.url) :
    Boolean(record.value.sourceUrl);
}

function targetForRecord(record: EventWorkbenchRecord): {
  id: string;
  type: EventIntakeTargetType;
} {
  return record.kind === "source" ?
    {id: record.value.id, type: "source_result"} :
    {id: record.value.id, type: "event_candidate"};
}

function recordId(record: EventWorkbenchRecord) {
  return `${record.kind}:${record.value.id}`;
}

function editableValues(record: EventWorkbenchRecord): Record<string, string> {
  if (record.kind === "source") {
    return {
      title: record.value.title,
      url: record.value.url,
      snippet: record.value.snippet,
    };
  }
  return {
    title: record.value.title,
    startDate: record.value.startDate,
    time: record.value.time,
    venue: record.value.venue,
    neighborhood: record.value.neighborhood,
    sourceUrl: record.value.sourceUrl ?? "",
    publicDescription: record.value.publicDescription,
  };
}

function recordSearchText(record: EventWorkbenchRecord) {
  const candidate = record.kind === "candidate" ? record.value : null;
  const source = record.kind === "source" ? record.value : null;
  return [
    record.value.title,
    candidate?.category,
    candidate?.venue,
    candidate?.neighborhood,
    candidate?.attribution?.organizerEvidence.name,
    candidate?.attribution?.match.matchedEntityId,
    source?.sourceLabel,
    source?.snippet,
  ].filter(Boolean).join(" ").toLocaleLowerCase();
}

function eventStageTitle(stage: EventWorkbenchStage) {
  if (stage === "incoming") return "Incoming source leads";
  if (stage === "verify") return "Candidates to verify";
  if (stage === "resolve") return "Resolve source and event details";
  return "Ready event handoffs";
}

function initialsForLabel(label: string) {
  return label.split(/\s+/u).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function ageDays(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function ageLabel(value: string | null | undefined) {
  const days = ageDays(value);
  return days === null ? "—" : days === 0 ? "Today" : `${days}d`;
}

function readEventWorkbenchStage(): EventWorkbenchStage {
  if (typeof window === "undefined") return "verify";
  try {
    const value = window.localStorage.getItem(eventWorkbenchStageKey);
    if (
      value === "incoming" ||
      value === "verify" ||
      value === "resolve" ||
      value === "ready"
    ) {
      return value;
    }
  } catch {
    // Fall through to the review-first default.
  }
  return "verify";
}

export const eventIntakeWorkbench = {EventTaskWorkbench};
