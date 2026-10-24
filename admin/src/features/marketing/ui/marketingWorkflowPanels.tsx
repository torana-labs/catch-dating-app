import {CatchText, CatchField} from "@catch/web-ui";
import {type ChangeEvent, useCallback, useEffect, useState} from "react";
import {
  CheckCircle2,
  Download,
  FileWarning,
  ImagePlus,
  Megaphone,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminCardList,
  AdminEyebrow,
  AdminFeatureDropCaptureThumb,
  AdminFeatureDropControlGrid,
  AdminFeatureDropFeatureEditor,
  AdminFeatureDropFeatureList,
  AdminFeatureDropPreviewCard,
  AdminFeatureDropPreviewGrid,
  AdminFeatureDropWideField,
  AdminIconButton,
  AdminMarketingAuditList,
  AdminMarketingAuditRow,
  AdminMarketingExportStatus,
  AdminMarketingFilePickerButton,
  AdminMarketingHelpText,
  AdminMarketingImageControls,
  AdminMarketingImageEditor,
  AdminMarketingImageEditorHeader,
  AdminMarketingImageEmpty,
  AdminMarketingImageMetaFields,
  AdminMarketingImageReviewRow,
  AdminMarketingImageSourceNote,
  AdminMarketingImageThumb,
  AdminMarketingPreviewToolbar,
  AdminMarketingSlideEditor,
  AdminMarketingSlideList,
  AdminMarketingStackedSections,
  AdminPanel,
  CardHeader,
  DecisionFooter,
  EmptyState,
  QualityRow,
  selectOptions,
  StatusChip,
} from "../../../shared/ui/AdminPrimitives";
import {appScreenshotPreviewUrl, appScreenshotRawPreviewUrl} from "../assets/marketingAppScreenshotAssets";
import {
  exportFeatureDropPngSlides,
  marketingFeatureDropDefaults,
  renderFeatureDropPreviewUrls,
  type FeatureDropImageResolver,
  type MarketingFeatureDropAccent,
  type MarketingFeatureDropAudience,
  type MarketingFeatureDropConfig,
  type MarketingFeatureDropRegister,
} from "../renderers/marketingFeatureDropRenderer";
import {type DecisionHandler} from "../../../shared/controllers/marketingReviewDecisionHelpers";
import {type MarketingStudioTab, type MarketingTypeFilter} from "../controllers/useMarketingOpsController";
import {
  AdminRecordMarketingReviewDecisionResponse,
  MarketingAppScreenshotCapture,
  MarketingContentDraft,
  MarketingContentDraftSlideImage,
  MarketingContentDraftSlide,
  MarketingOpsBridge,
} from "../../../shared/types/adminTypes";
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

function MarketingFeatureDropView({
  appCaptures,
}: {
  appCaptures: MarketingAppScreenshotCapture[];
}) {
  const [config, setConfig] = useState<MarketingFeatureDropConfig>(() =>
    marketingFeatureDropDefaults("members")
  );
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const resolveFeatureImage = useCallback<FeatureDropImageResolver>((
    feature,
    currentConfig
  ) => {
    const capture = appCaptures.find((item) => item.id === feature.captureId);
    return appScreenshotRawPreviewUrl(capture, currentConfig.register);
  }, [appCaptures]);

  useEffect(() => {
    let cancelled = false;
    setIsRendering(true);
    setRenderError(null);
    void renderFeatureDropPreviewUrls(config, resolveFeatureImage)
      .then((urls) => {
        if (!cancelled) setPreviewUrls(urls);
      })
      .catch((error) => {
        if (!cancelled) {
          setRenderError(
            error instanceof Error ?
              error.message :
              "Unable to render feature drop preview."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsRendering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config, resolveFeatureImage]);

  const updateConfig = useCallback((
    patch: Partial<MarketingFeatureDropConfig>
  ) => {
    setConfig((current) => ({...current, ...patch}));
  }, []);

  const updateAudience = useCallback((audience: MarketingFeatureDropAudience) => {
    setConfig((current) => {
      const next = marketingFeatureDropDefaults(audience);
      return {
        ...next,
        register: current.register,
        showWordmark: current.showWordmark,
        monthLabel: current.monthLabel,
        coverMeta: current.coverMeta,
      };
    });
  }, []);

  const updateFeature = useCallback((
    featureId: string,
    patch: Partial<MarketingFeatureDropConfig["features"][number]>
  ) => {
    setConfig((current) => ({
      ...current,
      features: current.features.map((feature) =>
        feature.id === featureId ? {...feature, ...patch} : feature
      ),
    }));
  }, []);

  const exportSlides = useCallback(async () => {
    setIsExporting(true);
    setExportMessage(null);
    setExportError(null);
    try {
      const count = await exportFeatureDropPngSlides(config, resolveFeatureImage);
      setExportMessage(`Downloaded ${count} feature-drop PNG slides.`);
    } catch (error) {
      setExportError(
        error instanceof Error ?
          error.message :
          "Unable to export feature-drop slides."
      );
    } finally {
      setIsExporting(false);
    }
  }, [config, resolveFeatureImage]);

  const selectedCaptureIds = new Set(config.features.map((feature) =>
    feature.captureId
  ));

  return (
    <AdminMarketingStackedSections>
      <AdminPanel
        span={2}
        icon={<Sparkles size={18} strokeWidth={1.9} />}
        title="Feature drop renderer"
        action="1080x1350 / 6 frames"
      >
        <AdminMarketingHelpText>
          This renderer follows the design-system feature-drop template: 4:5
          Instagram frames, Catch wordmark, Archivo headline system, IBM Plex
          Mono labels, activity pigment as the only chroma, and approved app
          screenshots inside the template phone shell.
        </AdminMarketingHelpText>
        <QualityRow icon={<CheckCircle2 size={16} strokeWidth={1.9} />}>
          <strong>Uses existing capture automation</strong>
          <span>
            Phone imagery resolves from the app media bridge and prefers raw
            402x874 screenshots before falling back to synced website assets.
          </span>
        </QualityRow>
      </AdminPanel>
      <AdminPanel
        span={2}
        icon={<Settings2 size={18} strokeWidth={1.9} />}
        title="Template controls"
        action={`${config.audience} / ${config.register} / ${config.accent}`}
      >
        <AdminFeatureDropControlGrid>
          <CatchField
            recipe="select"
            title="Audience"
            onChanged={(value) => updateAudience((value ?? "") as MarketingFeatureDropAudience)}
            {...selectOptions([
              {label: "Members", value: "members"},
              {label: "Hosts", value: "hosts"},
            ])}
            value={config.audience}
          />
          <CatchField
            recipe="select"
            title="Register"
            onChanged={(value) => updateConfig({register: (value ?? "") as MarketingFeatureDropRegister})}
            {...selectOptions([
              {label: "Dark", value: "dark"},
              {label: "Light", value: "light"},
              {label: "System", value: "system"},
            ])}
            value={config.register}
          />
          <CatchField
            recipe="select"
            title="Accent"
            onChanged={(value) => updateConfig({accent: (value ?? "") as MarketingFeatureDropAccent})}
            {...selectOptions([
              {label: "Run", value: "run"},
              {label: "Padel", value: "padel"},
              {label: "Yoga", value: "yoga"},
              {label: "Cycling", value: "cycling"},
              {label: "Dinner", value: "dinner"},
            ])}
            value={config.accent}
          />
          <CatchField
            recipe="select"
            title="Wordmark"
            onChanged={(value) => updateConfig({showWordmark: (value ?? "") === "shown"})}
            {...selectOptions([
              {label: "Shown", value: "shown"},
              {label: "Hidden", value: "hidden"},
            ])}
            value={config.showWordmark ? "shown" : "hidden"}
          />
          <CatchField
            recipe="input"
            title="Cover meta"
            value={config.coverMeta}
            onChanged={(value) => updateConfig({coverMeta: value})}
          />
          <CatchField
            recipe="input"
            title="Month label"
            value={config.monthLabel}
            onChanged={(value) => updateConfig({monthLabel: value})}
          />
          <CatchField
            recipe="input"
            title="Cover headline"
            value={config.coverHeadline}
            onChanged={(value) => updateConfig({coverHeadline: value})}
          />
          <CatchField
            recipe="input"
            title="Outro line"
            value={config.outroLine}
            onChanged={(value) => updateConfig({outroLine: value})}
          />
          <AdminFeatureDropWideField>
            <CatchField
              recipe="input"
              title="Cover body"
              maxLines={2}
              value={config.coverBody}
              onChanged={(value) => updateConfig({coverBody: value})}
            />
          </AdminFeatureDropWideField>
        </AdminFeatureDropControlGrid>
      </AdminPanel>
      <AdminPanel
        span={2}
        icon={<ImagePlus size={18} strokeWidth={1.9} />}
        title="Feature slides"
        action={`${selectedCaptureIds.size} capture slots`}
      >
        {appCaptures.length === 0 ? (
          <EmptyState
            compact variant="marketing"
            icon={<FileWarning size={16} strokeWidth={1.9} />}
          >
            No app capture slots are available in the marketing bridge.
          </EmptyState>
        ) : null}
        <AdminFeatureDropFeatureList>
          {config.features.map((feature, index) => {
            const selectedCapture = appCaptures.find((capture) =>
              capture.id === feature.captureId
            );
            const previewUrl = selectedCapture ?
              appScreenshotPreviewUrl(selectedCapture) :
              null;
            return (
              <AdminFeatureDropFeatureEditor key={feature.id}>
                <AdminMarketingImageEditorHeader>
                  <div>
                    <strong>Slide {index + 2}</strong>
                    <span>{feature.id.replaceAll("-", " ")}</span>
                  </div>
                  {previewUrl ? (
                    <AdminFeatureDropCaptureThumb
                      alt={selectedCapture?.alt ?? ""}
                      src={previewUrl}
                    />
                  ) : null}
                </AdminMarketingImageEditorHeader>
                <CatchField
                  recipe="input"
                  title="Title"
                  value={feature.title}
                  onChanged={(value) => updateFeature(feature.id, {title: value})}
                />
                <CatchField
                  recipe="input"
                  title="Body"
                  maxLines={4}
                  value={feature.body}
                  onChanged={(value) => updateFeature(feature.id, {body: value})}
                />
                <CatchField
                  recipe="select"
                  title="App capture"
                  onChanged={(value) => updateFeature(feature.id, {captureId: (value ?? "")})}
                  {...selectOptions(appCaptures.map((capture) => ({
                    label: `${capture.audience} / ${capture.surface}`,
                    value: capture.id,
                  })))}
                  value={feature.captureId}
                />
              </AdminFeatureDropFeatureEditor>
            );
          })}
        </AdminFeatureDropFeatureList>
      </AdminPanel>
      <AdminPanel
        span={2}
        icon={<Megaphone size={18} strokeWidth={1.9} />}
        title="Template preview"
        action={isRendering ? "Rendering" : "Ready"}
      >
        <AdminMarketingPreviewToolbar>
          <div>
            <strong>Feature-drop carousel</strong>
            <span>Six export frames generated from the current editable copy.</span>
          </div>
          <AdminButton
            disabled={isExporting || previewUrls.length !== 6}
            icon={<Download size={15} strokeWidth={1.9} />}
            onClick={() => void exportSlides()}
          >
            {isExporting ? "Exporting" : "Download PNG slides"}
          </AdminButton>
        </AdminMarketingPreviewToolbar>
        {renderError ? (
          <AdminMarketingExportStatus tone="error">{renderError}</AdminMarketingExportStatus>
        ) : null}
        {exportError ? (
          <AdminMarketingExportStatus tone="error">{exportError}</AdminMarketingExportStatus>
        ) : null}
        {exportMessage ? (
          <AdminMarketingExportStatus>{exportMessage}</AdminMarketingExportStatus>
        ) : null}
        <AdminFeatureDropPreviewGrid>
          {previewUrls.map((url, index) => (
            <AdminFeatureDropPreviewCard key={url}>
              <img
                alt={`Feature drop slide ${index + 1}`}
                src={url}
              />
              <figcaption>
                {String(index + 1).padStart(2, "0")} / {index === 0 ? "Cover" : index === 5 ? "Outro" : "Feature"}
              </figcaption>
            </AdminFeatureDropPreviewCard>
          ))}
        </AdminFeatureDropPreviewGrid>
      </AdminPanel>
    </AdminMarketingStackedSections>
  );
}

function MarketingDrafts({
  appCaptures,
  drafts,
  inFlight,
  localDecisions,
  notes,
  onDecision,
  onDraftChange,
  onNoteChange,
  onSlideChange,
}: {
  appCaptures: MarketingAppScreenshotCapture[];
  drafts: MarketingContentDraft[];
  inFlight: Record<string, boolean>;
  localDecisions: Record<string, AdminRecordMarketingReviewDecisionResponse>;
  notes: Record<string, string>;
  onDecision: DecisionHandler;
  onDraftChange: (draftId: string, patch: Partial<MarketingContentDraft>) => void;
  onNoteChange: (key: string, value: string) => void;
  onSlideChange: (
    draftId: string,
    slideId: string,
    patch: Partial<MarketingContentDraftSlide>
  ) => void;
}) {
  return (
    <AdminMarketingStackedSections>
      <AdminPanel
        icon={<Megaphone size={18} strokeWidth={1.9} />}
        title="Preview and export"
        action="Manual Instagram upload"
      >
        <AdminMarketingHelpText>
          This preview shows the carousel copy and slide order. PNG export
          creates individual 4:5 image files for manual Instagram upload. It is
          not an auto-posting integration.
        </AdminMarketingHelpText>
      </AdminPanel>
      <AdminCardList>
      {drafts.map((draft) => {
        const key = `content_draft:${draft.id}`;
        const eventSlideCount = draft.slides.filter((slide) =>
          slide.role === "event"
        ).length;
        return (
          <AdminCard key={draft.id} span={2}>
            <CardHeader action={<StatusChip>{draft.aspectRatio}</StatusChip>}>
              <div>
                <AdminEyebrow>{draft.format} / {draft.tone}</AdminEyebrow>
                <CatchText as="h3" variant="sectionTitle">{draft.id}</CatchText>
              </div>
            </CardHeader>
            <QualityRow icon={<CheckCircle2 size={16} strokeWidth={1.9} />}>
              <strong>PNG export available</strong>
              <span>
                Downloads one 1080x1350 PNG per slide using the current
                editable draft copy and existing Catch web tokens.
              </span>
            </QualityRow>
            <marketingPreviewPanels.MarketingDraftPreview draft={draft} />
            <AdminMarketingSlideList>
              {draft.slides.map((slide) => (
                <AdminMarketingSlideEditor key={slide.id}>
                  <AdminEyebrow>{slide.role}</AdminEyebrow>
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
                    maxLines={2}
                    value={slide.body}
                    onChanged={(value) =>
                      onSlideChange(draft.id, slide.id, {body: value})}
                  />
                  <MarketingSlideImageEditor
                    appCaptures={appCaptures}
                    image={slide.image ?? null}
                    slideId={slide.id}
                    onChange={(image) =>
                      onSlideChange(draft.id, slide.id, {image})}
                  />
                </AdminMarketingSlideEditor>
              ))}
            </AdminMarketingSlideList>
            <CatchField
              recipe="input"
              title="Caption"
              maxLines={8}
              value={draft.caption}
              onChanged={(value) => onDraftChange(draft.id, {caption: value})}
            />
            <DecisionFooter
              defaultNote={`Content draft ${draft.id} reviewed for export.`}
              edits={draft as unknown as Record<string, unknown>}
              inFlight={inFlight[key]}
              localDecision={localDecisions[key]}
              note={notes[key] ?? ""}
              targetId={draft.id}
              targetType="content_draft"
              onDecision={onDecision}
              onNoteChange={(value) => onNoteChange(key, value)}
              showExportReady
              approvalDisabledReason={
                eventSlideCount === 0 ?
                  "This draft has no sourced event slides yet." :
                  undefined
              }
            />
          </AdminCard>
        );
      })}
      </AdminCardList>
    </AdminMarketingStackedSections>
  );
}

function MarketingSlideImageEditor({
  appCaptures,
  image,
  slideId,
  onChange,
}: {
  appCaptures: MarketingAppScreenshotCapture[];
  image: MarketingContentDraftSlideImage | null;
  slideId: string;
  onChange: (image: MarketingContentDraftSlideImage | null) => void;
}) {
  const selectedCapture = image?.sourceType === "app_capture" && image.captureId ?
    appCaptures.find((capture) => capture.id === image.captureId) ?? null :
    null;
  const previewUrl = selectedCapture ?
    appScreenshotPreviewUrl(selectedCapture) :
    image?.url ?? null;

  const updateImage = useCallback((
    patch: Partial<MarketingContentDraftSlideImage>
  ) => {
    onChange({
      sourceType: image?.sourceType ?? "url",
      url: image?.url ?? "",
      fit: image?.fit ?? "cover",
      altText: image?.altText ?? "",
      credit: image?.credit ?? "",
      fileName: image?.fileName ?? null,
      captureId: image?.captureId ?? null,
      sourcePath: image?.sourcePath ?? null,
      websitePath: image?.websitePath ?? null,
      webPath: image?.webPath ?? null,
      ...patch,
    });
  }, [image, onChange]);

  const selectAppCapture = useCallback((captureId: string) => {
    if (!captureId) {
      onChange(null);
      return;
    }
    const capture = appCaptures.find((item) => item.id === captureId);
    if (!capture) return;
    onChange({
      sourceType: "app_capture",
      url: appScreenshotPreviewUrl(capture) ?? "",
      captureId: capture.id,
      sourcePath: capture.sourcePath,
      websitePath: capture.websitePath,
      webPath: capture.webPath,
      fileName: `${capture.id}.png`,
      altText: capture.alt,
      credit: "Catch deterministic app screenshot pipeline",
      fit: "contain",
    });
  }, [appCaptures, onChange]);

  const handleUpload = useCallback(async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    const dataUrl = await marketingPreviewPanels.readImageFileAsDataUrl(file);
    onChange({
      sourceType: "upload",
      url: dataUrl,
      fileName: file.name,
      altText: image?.altText ?? "",
      credit: image?.credit ?? "",
      fit: image?.fit ?? "cover",
    });
  }, [image, onChange]);

  return (
    <AdminMarketingImageEditor>
      <AdminMarketingImageEditorHeader>
        <div>
          <strong>Slide image</strong>
          <span>Use approved app screenshot slots when the post references product UI. Uploads and URLs are for sourced non-app imagery.</span>
        </div>
        {image?.url ? (
          <AdminIconButton
            label="Remove slide image"
            onClick={() => onChange(null)}
          >
            <Trash2 size={15} strokeWidth={1.9} />
          </AdminIconButton>
        ) : null}
      </AdminMarketingImageEditorHeader>
      <AdminMarketingImageControls>
        <CatchField
          recipe="select"
          title="App screenshot"
          onChanged={(value) => selectAppCapture(value ?? "")}
          {...selectOptions([
            {label: "No app screenshot", value: ""},
            ...appCaptures.map((capture) => ({
              label: `${capture.walkthroughStep} / ${capture.surface}`,
              value: capture.id,
            })),
          ])}
          value={selectedCapture?.id ?? ""}
        />
        <AdminMarketingFilePickerButton
          accept="image/*"
          icon={<ImagePlus size={15} strokeWidth={1.9} />}
          inputLabel={`Choose image for ${slideId}`}
          onChange={(event) => void handleUpload(event)}
        >
          Choose image
        </AdminMarketingFilePickerButton>
        <CatchField
          recipe="input"
          title="Image URL"
          value={image?.sourceType === "url" ? image.url : ""}
          onChanged={(value) =>
            value.trim() ?
              updateImage({
                sourceType: "url",
                url: value.trim(),
                captureId: null,
                sourcePath: null,
                websitePath: null,
                webPath: null,
                fileName: null,
              }) :
              onChange(null)}
        />
        <CatchField
          recipe="select"
          title="Fit"
          onChanged={(value) => updateImage({fit: (value ?? "") as "cover" | "contain"})}
          {...selectOptions([
            {label: "Cover crop", value: "cover"},
            {label: "Contain", value: "contain"},
          ])}
          value={image?.fit ?? "cover"}
        />
      </AdminMarketingImageControls>
      {previewUrl ? (
        <AdminMarketingImageReviewRow>
          <AdminMarketingImageThumb
            alt={image?.altText || "Selected slide image"}
            src={previewUrl}
          />
          <AdminMarketingImageMetaFields>
            <CatchField
              recipe="input"
              title="Alt text"
              value={image?.altText ?? ""}
              onChanged={(value) => updateImage({altText: value})}
            />
            <CatchField
              recipe="input"
              title="Credit / rights note"
              value={image?.credit ?? ""}
              onChanged={(value) => updateImage({credit: value})}
            />
            <AdminMarketingImageSourceNote>
              {image?.sourceType === "app_capture" ?
                `App screenshot slot: ${image.captureId ?? "unknown"}` :
                image?.sourceType === "upload" ?
                `Uploaded file: ${image.fileName ?? "local image"}` :
                "External image URL"}
            </AdminMarketingImageSourceNote>
          </AdminMarketingImageMetaFields>
        </AdminMarketingImageReviewRow>
      ) : (
        <AdminMarketingImageEmpty>
          <ImagePlus size={15} strokeWidth={1.9} />
          <span>No image attached to this slide.</span>
        </AdminMarketingImageEmpty>
      )}
    </AdminMarketingImageEditor>
  );
}

function MarketingAudit({
  bridge,
  localDecisions,
}: {
  bridge: MarketingOpsBridge;
  localDecisions: Record<string, AdminRecordMarketingReviewDecisionResponse>;
}) {
  const local = Object.values(localDecisions);
  return (
    <AdminCardList>
      <AdminPanel
        icon={<CheckCircle2 size={18} strokeWidth={1.9} />}
        title="Review receipts"
        action={`${bridge.auditTrail.length + local.length} shown`}
      >
        <AdminMarketingAuditList>
          {bridge.auditTrail.map((item) => (
            <AdminMarketingAuditRow key={`${item.targetType}-${item.targetId}`}>
              <strong>{item.targetType}: {item.targetId}</strong>
              <span>{String(item.decision)} by {item.reviewer ?? "unknown"}</span>
              {item.note ? <CatchText as="p" variant="supporting">{item.note}</CatchText> : null}
            </AdminMarketingAuditRow>
          ))}
          {local.map((item) => (
            <AdminMarketingAuditRow key={item.decisionPath}>
              <strong>{item.targetType}: {item.targetId}</strong>
              <span>{item.decisionStatus} receipt recorded at {item.decisionPath}</span>
            </AdminMarketingAuditRow>
          ))}
        </AdminMarketingAuditList>
      </AdminPanel>
    </AdminCardList>
  );
}

export const marketingWorkflowPanels = {
  MarketingFeatureDropView,
  MarketingDrafts,
  MarketingSlideImageEditor,
  MarketingAudit,
};
