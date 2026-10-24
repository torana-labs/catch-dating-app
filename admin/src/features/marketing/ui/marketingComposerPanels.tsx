import {CatchText, CatchField} from "@catch/web-ui";
import {
  CheckCircle2,
  Download,
  FileWarning,
  ImagePlus,
  Library,
  ListChecks,
  Lock,
  Megaphone,
  ShieldCheck,
} from "lucide-react";
import {
  AdminButton,
  AdminPanel,
  AdminStateRow,
  AdminStatGrid,
  AlertRow,
  CheckboxField,
  EmptyState,
  SelectableCardButton,
  StatusChip,
  AdminCommandRow,
  AdminCommandStack,
  AdminEyebrow,
  AdminMarketingBrandContract,
  AdminMarketingBrandContractItem,
  AdminMarketingComplianceList,
  AdminMarketingFeatureShotCard,
  AdminMarketingFeatureShotGrid,
  AdminMarketingHelpText,
  AdminMarketingSlideEditor,
  AdminMarketingSlideEditorTopline,
  AdminMarketingSlideList,
  AdminMarketingBoardColumn,
  AdminMarketingBoardList,
  AdminMarketingPostBoard,
  AdminMarketingPostTypeBadge,
  AdminMarketingStudioFilterTabs,
  AdminMarketingStudioStack,
  AdminMarketingStudioSummary,
  AdminMarketingStudioSummaryItem,
  AdminMarketingComposer,
  AdminMarketingComposerBackButton,
  AdminMarketingComposerFooter,
  AdminMarketingComposerHeader,
  AdminMarketingPickerList,
  AdminMarketingPickerRow,
  AdminMarketingStepChip,
  AdminMarketingStepLayout,
  AdminMarketingStepStrip,
  AdminTag,
  DecisionFooter,
  TagList,
} from "../../../shared/ui/AdminPrimitives";
import {type DecisionHandler} from "../../../shared/controllers/marketingReviewDecisionHelpers";
import {type MarketingStudioTab, type MarketingTypeFilter} from "../controllers/useMarketingOpsController";
import {
  AdminRecordMarketingReviewDecisionResponse,
  MarketingContentDraftType,
  MarketingAppScreenshotCapture,
  MarketingContentDraft,
  MarketingContentDraftSlide,
  MarketingOpsBridge,
} from "../../../shared/types/adminTypes";
import {marketingWorkflowPanels} from "./marketingWorkflowPanels";
import {marketingPreviewPanels} from "./marketingPreviewPanels";

const studioTabs: Array<{id: MarketingStudioTab; label: string}> = [
  {id: "posts", label: "Posts"},
  {id: "events", label: "Events"},
  {id: "media", label: "Media"},
  {id: "activity", label: "Activity"},
];

const typeFilters: Array<{id: MarketingTypeFilter; label: string}> = [
  {id: "all", label: "All"},
  {id: "event_highlights", label: "Event highlights"},
  {id: "feature_explainer", label: "Feature explainers"},
];

function MarketingActionBoundaryPanel({
  bridge,
}: {
  bridge: MarketingOpsBridge;
}) {
  return (
    <AdminPanel
      icon={<Lock size={18} strokeWidth={1.9} />}
      title="Marketing action boundary"
      action="manual export"
    >
      <AlertRow
        icon={<ShieldCheck size={16} strokeWidth={1.9} />}
        title="Content packaging only"
      >
        Marketing consumes reviewed source-backed leads and draft records. App
        supply changes stay in Intake, Events, and Organizers.
      </AlertRow>
      <AdminStatGrid>
        <AdminStateRow
          label="Dashboard read"
          value="marketingOpsDashboards/current"
        />
        <AdminStateRow
          label="Run snapshot"
          value={`${bridge.runPlan.id} / ${bridge.weekStart}`}
        />
        <AdminStateRow
          label="Allowed writes"
          value="marketingReviewDecisions/{decisionId} and content drafts"
        />
        <AdminStateRow
          label="Callables"
          value="adminRecordMarketingReviewDecision + adminCreateMarketingContentDraft"
        />
        <AdminStateRow
          label="Manual output"
          value="PNG export and Instagram upload outside Catch"
        />
        <AdminStateRow
          label="Blocked here"
          value="events/{id}, externalEvents/{id}, organizer imports, booking, payments, direct posting"
        />
      </AdminStatGrid>
      <AdminCommandStack>
        {Object.entries(bridge.commands).length > 0 ? (
          Object.entries(bridge.commands).map(([label, command]) => (
            <AdminCommandRow key={label}>
              <span>{label}</span>
              <code>{command}</code>
            </AdminCommandRow>
          ))
        ) : (
          <EmptyState
            compact variant="marketing"
            icon={<FileWarning size={16} strokeWidth={1.9} />}
          >
            No generated marketing commands are attached to this dashboard.
          </EmptyState>
        )}
      </AdminCommandStack>
    </AdminPanel>
  );
}

function MarketingPostsWorkspace({
  bridge,
  selectedDraftId,
  typeFilter,
  onDraftSelect,
  onTypeFilterChange,
}: {
  bridge: MarketingOpsBridge;
  selectedDraftId: string | null;
  typeFilter: MarketingTypeFilter;
  onDraftSelect: (draftId: string | null) => void;
  onTypeFilterChange: (value: MarketingTypeFilter) => void;
}) {
  const filteredDrafts = bridge.contentDrafts.filter((draft) =>
    typeFilter === "all" || marketingPreviewPanels.draftTypeForDraft(draft) === typeFilter
  );
  const board = boardColumns(filteredDrafts);

  return (
    <AdminMarketingStudioStack>
      <AdminMarketingStudioSummary>
        <AdminMarketingStudioSummaryItem
          label="Week"
          value={`${bridge.weekStart} to ${bridge.weekEnd}`}
        />
        <AdminMarketingStudioSummaryItem
          label="Drafts"
          value={bridge.summary.contentDrafts}
        />
        <AdminMarketingStudioSummaryItem
          label="Export ready"
          value={bridge.summary.exportReadyDrafts}
        />
        <AdminMarketingStudioSummaryItem
          label="Verified pool"
          value={bridge.summary.approvedCandidates}
        />
      </AdminMarketingStudioSummary>

      <AdminMarketingStudioFilterTabs
        ariaLabel="Marketing content type filter"
        onChange={onTypeFilterChange}
        options={typeFilters}
        value={typeFilter}
      />

      <AdminMarketingPostBoard>
        {board.map((column) => (
          <AdminMarketingBoardColumn
            count={column.drafts.length}
            key={column.id}
            title={column.title}
          >
            <AdminMarketingBoardList>
              {column.drafts.length === 0 ? (
                <EmptyState
                  compact variant="marketing"
                  icon={<CheckCircle2 size={16} strokeWidth={1.9} />}
                >
                  {column.emptyText}
                </EmptyState>
              ) : column.drafts.map((draft) => (
                <MarketingPostCard
                  draft={draft}
                  isSelected={draft.id === selectedDraftId}
                  key={draft.id}
                  onSelect={() => onDraftSelect(draft.id)}
                />
              ))}
            </AdminMarketingBoardList>
          </AdminMarketingBoardColumn>
        ))}
      </AdminMarketingPostBoard>
    </AdminMarketingStudioStack>
  );
}

interface MarketingBoardColumn {
  id: "sourcing" | "composing" | "compliance" | "ready";
  title: string;
  emptyText: string;
  drafts: MarketingContentDraft[];
}

function boardColumns(drafts: MarketingContentDraft[]): MarketingBoardColumn[] {
  const columns: MarketingBoardColumn[] = [
    {
      id: "sourcing",
      title: "Sourcing",
      emptyText: "No drafts waiting on a source pool.",
      drafts: [],
    },
    {
      id: "composing",
      title: "Composing",
      emptyText: "No active copy work.",
      drafts: [],
    },
    {
      id: "compliance",
      title: "Brand & compliance",
      emptyText: "No drafts waiting on final checks.",
      drafts: [],
    },
    {
      id: "ready",
      title: "Ready to post",
      emptyText: "No export-ready posts yet.",
      drafts: [],
    },
  ];
  for (const draft of drafts) {
    const stage = boardStageForDraft(draft);
    columns.find((column) => column.id === stage)?.drafts.push(draft);
  }
  return columns;
}

function boardStageForDraft(
  draft: MarketingContentDraft
): MarketingBoardColumn["id"] {
  if (
    draft.latestDecision?.decision === "export_ready" ||
    draft.status === "export_ready"
  ) {
    return "ready";
  }
  if (
    marketingPreviewPanels.draftTypeForDraft(draft) === "event_highlights" &&
    !draft.slides.some((slide) => slide.role === "event")
  ) {
    return "sourcing";
  }
  if (draft.reviewState === "new" || draft.reviewState === "needs_changes") {
    return "composing";
  }
  if (draft.reviewState === "approved") return "ready";
  return "compliance";
}

function MarketingPostCard({
  draft,
  isSelected,
  onSelect,
}: {
  draft: MarketingContentDraft;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const draftType = marketingPreviewPanels.draftTypeForDraft(draft);
  const eventCount = draft.slides.filter((slide) => slide.role === "event")
    .length;
  const featureCount = draft.slides.filter((slide) => slide.role === "feature")
    .length;
  const countLabel = draftType === "event_highlights" ?
    `${eventCount} events` :
    `${featureCount} shots`;
  return (
    <SelectableCardButton
      onClick={onSelect}
      selected={isSelected}
    >
      <AdminMarketingPostTypeBadge draftType={draftType}>
        {marketingPreviewPanels.draftLabel(draftType)}
      </AdminMarketingPostTypeBadge>
      <strong>{marketingPreviewPanels.draftTitle(draft)}</strong>
      <span>{draft.cityId} / {draft.weekStart}</span>
      <div>
        <StatusChip>{draft.reviewState}</StatusChip>
        <StatusChip tone="muted">{countLabel}</StatusChip>
      </div>
      <small>{marketingPreviewPanels.nextActionForDraft(draft)}</small>
    </SelectableCardButton>
  );
}

function MarketingDraftComposer({
  appCaptures,
  bridge,
  draft,
  editSize,
  editTooLarge,
  inFlight,
  localDecisions,
  notes,
  rightsConfirmed,
  stepIndex,
  onBack,
  onDecision,
  onDraftChange,
  onNoteChange,
  onRightsConfirmedChange,
  onSlideChange,
  onStepChange,
}: {
  appCaptures: MarketingAppScreenshotCapture[];
  bridge: MarketingOpsBridge;
  draft: MarketingContentDraft;
  editSize: number;
  editTooLarge: boolean;
  inFlight: Record<string, boolean>;
  localDecisions: Record<string, AdminRecordMarketingReviewDecisionResponse>;
  notes: Record<string, string>;
  rightsConfirmed: boolean;
  stepIndex: number;
  onBack: () => void;
  onDecision: DecisionHandler;
  onDraftChange: (draftId: string, patch: Partial<MarketingContentDraft>) => void;
  onNoteChange: (key: string, value: string) => void;
  onRightsConfirmedChange: (confirmed: boolean) => void;
  onSlideChange: (
    draftId: string,
    slideId: string,
    patch: Partial<MarketingContentDraftSlide>
  ) => void;
  onStepChange: (stepIndex: number) => void;
}) {
  const draftType = marketingPreviewPanels.draftTypeForDraft(draft);
  const key = `content_draft:${draft.id}`;
  const steps = draftType === "event_highlights" ?
    ["Review included events", "Order & copy", "Brand & compliance", "Export"] :
    ["Review source media", "Copy & layout", "Brand & compliance", "Export"];
  const exportDisabledReason = marketingPreviewPanels.exportBlockerForDraft(draft);
  const approvalDisabledReason = exportDisabledReason ??
    (!rightsConfirmed ? "Confirm image and media rights before approval or export-ready review." :
      editTooLarge ? "Reduce the serialized edit payload before recording a decision." : undefined);
  const boundedStep = Math.min(Math.max(stepIndex, 0), steps.length - 1);

  return (
    <AdminMarketingComposer>
      <AdminMarketingComposerHeader status={<StatusChip>{draft.reviewState}</StatusChip>}>
        <AdminMarketingComposerBackButton onClick={onBack}>
          Back to posts
        </AdminMarketingComposerBackButton>
        <AdminMarketingPostTypeBadge draftType={draftType}>
          {marketingPreviewPanels.draftLabel(draftType)}
        </AdminMarketingPostTypeBadge>
        <CatchText as="h3" variant="sectionTitle">{marketingPreviewPanels.draftTitle(draft)}</CatchText>
        <CatchText as="p" variant="supporting">
          {draft.format} / {draft.aspectRatio} / manual Instagram export
        </CatchText>
      </AdminMarketingComposerHeader>

      <AdminMarketingStepStrip>
        {steps.map((step, index) => (
          <AdminMarketingStepChip
            key={step}
            marker={index < boundedStep ? "OK" : index + 1}
            onClick={() => onStepChange(index)}
            status={index === boundedStep ? "active" : index < boundedStep ? "done" : "todo"}
          >
            {step}
          </AdminMarketingStepChip>
        ))}
      </AdminMarketingStepStrip>

      {boundedStep === 0 ? (
        draftType === "event_highlights" ? (
          <MarketingEventPickStep bridge={bridge} draft={draft} />
        ) : (
          <MarketingFeaturePickStep
            appCaptures={appCaptures}
            draft={draft}
            onSlideChange={onSlideChange}
          />
        )
      ) : boundedStep === 1 ? (
        <MarketingCopyStep
          draft={draft}
          draftType={draftType}
          onDraftChange={onDraftChange}
          onSlideChange={onSlideChange}
        />
      ) : boundedStep === 2 ? (
        <MarketingComplianceStep
          draft={draft}
          draftType={draftType}
          rightsConfirmed={rightsConfirmed}
          onRightsConfirmedChange={onRightsConfirmedChange}
        />
      ) : (
        <MarketingExportStep
          draft={draft}
          editSize={editSize}
          exportDisabledReason={approvalDisabledReason}
          inFlight={inFlight[key]}
          localDecision={localDecisions[key]}
          note={notes[key] ?? ""}
          onDecision={onDecision}
          onNoteChange={(value) => onNoteChange(key, value)}
          rightsConfirmed={rightsConfirmed}
        />
      )}

      <AdminMarketingComposerFooter>
        {boundedStep > 0 ? (
          <AdminButton
            onClick={() => onStepChange(boundedStep - 1)}
          >
            {steps[boundedStep - 1]}
          </AdminButton>
        ) : <span />}
        {boundedStep < steps.length - 1 ? (
          <AdminButton
            onClick={() => onStepChange(boundedStep + 1)}
            variant="primary"
          >
            {steps[boundedStep + 1]}
          </AdminButton>
        ) : null}
      </AdminMarketingComposerFooter>
    </AdminMarketingComposer>
  );
}

function MarketingEventPickStep({
  bridge,
  draft,
}: {
  bridge: MarketingOpsBridge;
  draft: MarketingContentDraft;
}) {
  const eventSlides = draft.slides.filter((slide) => slide.role === "event");
  const pickedIds = new Set(eventSlides.map((slide) => slide.eventCandidateId)
    .filter(Boolean));
  const verifiedEvents = bridge.eventCandidates.filter((event) =>
    event.reviewState === "approved" ||
    event.latestDecision?.decision === "approve" ||
    event.publishability === "publishable_after_approval"
  );

  return (
    <AdminPanel
      icon={<Library size={18} strokeWidth={1.9} />}
      title="Review included events"
      action={`${eventSlides.length} included`}
    >
      <AdminMarketingHelpText>
        This step is read-only event selection visibility for the current draft.
        Event sourcing, verification, canonical imports, booking, payments, and
        waitlists stay in Intake, Events, and Organizers.
      </AdminMarketingHelpText>
      <AdminMarketingPickerList>
        {verifiedEvents.map((event) => {
          const isPicked = pickedIds.has(event.id);
          return (
            <AdminMarketingPickerRow
              key={event.id}
              marker={isPicked ? "OK" : null}
              selected={isPicked}
              status={isPicked ? "In draft" : "Verified"}
            >
              <strong>{event.title}</strong>
              <small>
                {event.category} / {event.neighborhood} / {event.startDate}
              </small>
            </AdminMarketingPickerRow>
          );
        })}
        {verifiedEvents.length === 0 ? (
          <EmptyState
            compact variant="marketing"
            icon={<FileWarning size={16} strokeWidth={1.9} />}
          >
            No verified events are available for this draft.
          </EmptyState>
        ) : null}
      </AdminMarketingPickerList>
    </AdminPanel>
  );
}

function MarketingFeaturePickStep({
  appCaptures,
  draft,
  onSlideChange,
}: {
  appCaptures: MarketingAppScreenshotCapture[];
  draft: MarketingContentDraft;
  onSlideChange: (
    draftId: string,
    slideId: string,
    patch: Partial<MarketingContentDraftSlide>
  ) => void;
}) {
  const featureSlides = draft.slides.filter((slide) => slide.role === "feature");
  return (
    <AdminPanel
      icon={<ImagePlus size={18} strokeWidth={1.9} />}
      title="Pick feature shots"
      action={`${featureSlides.length} frames`}
    >
      <AdminMarketingHelpText>
        Pair each feature frame with one approved app screenshot from the media
        library. Copy comes next.
      </AdminMarketingHelpText>
      <AdminMarketingFeatureShotGrid>
        {featureSlides.map((slide, index) => (
          <AdminMarketingFeatureShotCard
            key={slide.id}
            headline={slide.headline}
            meta={(
              <AdminMarketingSlideEditorTopline>
                <AdminEyebrow>Frame {index + 1}</AdminEyebrow>
                <StatusChip tone="muted">{slide.role}</StatusChip>
              </AdminMarketingSlideEditorTopline>
            )}
          >
            <marketingWorkflowPanels.MarketingSlideImageEditor
              appCaptures={appCaptures}
              image={slide.image ?? null}
              slideId={slide.id}
              onChange={(image) => onSlideChange(draft.id, slide.id, {image})}
            />
          </AdminMarketingFeatureShotCard>
        ))}
        {featureSlides.length === 0 ? (
          <EmptyState
            compact variant="marketing"
            icon={<FileWarning size={16} strokeWidth={1.9} />}
          >
            No feature frames are available in this draft.
          </EmptyState>
        ) : null}
      </AdminMarketingFeatureShotGrid>
    </AdminPanel>
  );
}

function MarketingCopyStep({
  draft,
  draftType,
  onDraftChange,
  onSlideChange,
}: {
  draft: MarketingContentDraft;
  draftType: MarketingContentDraftType;
  onDraftChange: (draftId: string, patch: Partial<MarketingContentDraft>) => void;
  onSlideChange: (
    draftId: string,
    slideId: string,
    patch: Partial<MarketingContentDraftSlide>
  ) => void;
}) {
  return (
    <AdminMarketingStepLayout>
      <AdminPanel
        icon={<ListChecks size={18} strokeWidth={1.9} />}
        title={draftType === "event_highlights" ? "Order & copy" : "Copy & layout"}
        action={`${draft.slides.length} slides`}
      >
        <AdminMarketingSlideList single>
          {draft.slides.map((slide, index) => (
            <AdminMarketingSlideEditor key={slide.id}>
              <AdminMarketingSlideEditorTopline>
                <AdminEyebrow>
                  {String(index + 1).padStart(2, "0")} / {slide.role}
                </AdminEyebrow>
                {slide.eventCandidateId ? (
                  <StatusChip tone="muted">
                    {slide.eventCandidateId}
                  </StatusChip>
                ) : null}
              </AdminMarketingSlideEditorTopline>
              <CatchField
                recipe="input"
                title="Headline"
                value={slide.headline}
                onChanged={(value) =>
                  onSlideChange(draft.id, slide.id, {headline: value})}
              />
              <CatchField
                recipe="input"
                title="Body"
                maxLines={3}
                value={slide.body}
                onChanged={(value) =>
                  onSlideChange(draft.id, slide.id, {body: value})}
              />
            </AdminMarketingSlideEditor>
          ))}
        </AdminMarketingSlideList>
      </AdminPanel>
      <AdminPanel
        icon={<Megaphone size={18} strokeWidth={1.9} />}
        title="Caption"
        action="Manual upload copy"
      >
        <CatchField
          recipe="input"
          title="Caption"
          maxLines={10}
          value={draft.caption}
          onChanged={(value) => onDraftChange(draft.id, {caption: value})}
        />
        <TagList>
          {draft.ctas.map((cta) => (
            <AdminTag key={cta.id} tone="muted">
              CTA / {cta.label}
            </AdminTag>
          ))}
        </TagList>
      </AdminPanel>
    </AdminMarketingStepLayout>
  );
}

function MarketingComplianceStep({
  draft,
  draftType,
  onRightsConfirmedChange,
  rightsConfirmed,
}: {
  draft: MarketingContentDraft;
  draftType: MarketingContentDraftType;
  onRightsConfirmedChange: (confirmed: boolean) => void;
  rightsConfirmed: boolean;
}) {
  return (
    <AdminMarketingStepLayout>
      <AdminPanel
        icon={<CheckCircle2 size={18} strokeWidth={1.9} />}
        title="Brand & compliance check"
        action={draft.brandContract.rendererStatus}
      >
        <ComplianceChecklist draftType={draftType} />
        <CheckboxField
          checked={rightsConfirmed}
          label="I verified that every image and media asset in this draft has appropriate usage rights or is an approved Catch-owned capture."
          onChange={onRightsConfirmedChange}
        />
      </AdminPanel>
      <AdminPanel
        icon={<Lock size={18} strokeWidth={1.9} />}
        title="Brand contract"
        action={draft.aspectRatio}
      >
        <AdminMarketingBrandContract>
          <AdminMarketingBrandContractItem label="Wordmark" value={draft.brandContract.logo} />
          <AdminMarketingBrandContractItem label="Headlines" value={draft.brandContract.headlineFont} />
          <AdminMarketingBrandContractItem label="Labels" value={draft.brandContract.labelFont} />
          <AdminMarketingBrandContractItem label="Body" value={draft.brandContract.bodyFont} />
          <AdminMarketingBrandContractItem
            label="Export"
            value={draft.delivery?.finalImageExport ?? "1080x1350 PNG"}
          />
        </AdminMarketingBrandContract>
      </AdminPanel>
    </AdminMarketingStepLayout>
  );
}

function MarketingExportStep({
  draft,
  editSize,
  exportDisabledReason,
  inFlight,
  localDecision,
  note,
  onDecision,
  onNoteChange,
  rightsConfirmed,
}: {
  draft: MarketingContentDraft;
  editSize: number;
  exportDisabledReason?: string;
  inFlight?: boolean;
  localDecision?: AdminRecordMarketingReviewDecisionResponse;
  note: string;
  onDecision: DecisionHandler;
  onNoteChange: (value: string) => void;
  rightsConfirmed: boolean;
}) {
  return (
    <AdminPanel
      icon={<Download size={18} strokeWidth={1.9} />}
      title="Preview & export"
      action="Manual Instagram upload"
    >
      <marketingPreviewPanels.MarketingDraftPreview
        additionalExportBlocker={exportDisabledReason}
        draft={draft}
      />
      <AdminStatGrid>
        <AdminStateRow label="Draft state" value="Unsaved session working copy until persisted by its owning workflow" />
        <AdminStateRow label="Rights confirmation" value={rightsConfirmed ? "Confirmed for this review session" : "Not confirmed"} />
        <AdminStateRow label="Serialized decision edits" value={`${editSize.toLocaleString()} / 50,000 characters`} />
      </AdminStatGrid>
      <DecisionFooter
        defaultNote={`Content draft ${draft.id} reviewed for export.`}
        edits={draft as unknown as Record<string, unknown>}
        inFlight={inFlight}
        localDecision={localDecision}
        note={note}
        targetId={draft.id}
        targetType="content_draft"
        onDecision={onDecision}
        onNoteChange={onNoteChange}
        showExportReady
        approvalDisabledReason={exportDisabledReason}
      />
    </AdminPanel>
  );
}

function ComplianceChecklist({
  draftType,
}: {
  draftType: MarketingContentDraftType;
}) {
  const checks = draftType === "event_highlights" ? [
    "Source verified",
    "Dates, venue, and price confirmed",
    "No Catch-host implication",
    "No singles-only claim unless source says it",
    "Image rights cleared",
  ] : [
    "Approved screenshots",
    "Accurate feature behavior",
    "Brand contract followed",
    "No unsupported product claim",
    "Image rights cleared",
  ];
  return (
    <AdminMarketingComplianceList>
      {checks.map((check) => (
        <AlertRow
          icon={<CheckCircle2 size={16} strokeWidth={1.9} />}
          key={check}
          title={check}
        >
          Required before marking the draft export ready.
        </AlertRow>
      ))}
    </AdminMarketingComplianceList>
  );
}

export const marketingComposerPanels = {
  MarketingActionBoundaryPanel,
  MarketingPostsWorkspace,
  boardColumns,
  boardStageForDraft,
  MarketingPostCard,
  MarketingDraftComposer,
  MarketingEventPickStep,
  MarketingFeaturePickStep,
  MarketingCopyStep,
  MarketingComplianceStep,
  MarketingExportStep,
  ComplianceChecklist,
};
