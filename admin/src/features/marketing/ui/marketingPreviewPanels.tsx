import {useCallback, useState} from "react";
import {Download, FileWarning} from "lucide-react";
import {
  AdminButton,
  AdminLinkButton,
  EmptyState,
  AdminMarketingExportStatus,
  AdminMarketingCarouselPreview,
  AdminMarketingPreviewActions,
  AdminMarketingPreviewBrandNote,
  AdminMarketingPreviewCopy,
  AdminMarketingPreviewImage,
  AdminMarketingPreviewMeta,
  AdminMarketingPreviewShell,
  AdminMarketingPreviewSlide,
  AdminMarketingPreviewToolbar,
} from "../../../shared/ui/AdminPrimitives";
import {type MarketingStudioTab, type MarketingTypeFilter} from "../controllers/useMarketingOpsController";
import {
  MarketingContentDraftType,
  MarketingContentDraft,
  MarketingContentDraftSlide,
  MarketingOpsBridge,
} from "../../../shared/types/adminTypes";
import {CatchText} from "@catch/web-ui";

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

function MarketingDraftPreview({
  additionalExportBlocker,
  draft,
}: {
  additionalExportBlocker?: string;
  draft: MarketingContentDraft;
}) {
  const [isExportingImages, setIsExportingImages] = useState(false);
  const [imageExportMessage, setImageExportMessage] = useState<string | null>(null);
  const [imageExportError, setImageExportError] = useState<string | null>(null);
  const exportBlocker = additionalExportBlocker ?? exportBlockerForDraft(draft);
  const draftType = draftTypeForDraft(draft);
  const downloadHref =
    `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(draft, null, 2))}`;
  const canExportImages = draft.slides.length > 0 && !exportBlocker;

  const downloadImages = useCallback(async () => {
    setIsExportingImages(true);
    setImageExportMessage(null);
    setImageExportError(null);
    try {
      const count = await exportDraftPngSlides(draft);
      setImageExportMessage(`Downloaded ${count} PNG slide${count === 1 ? "" : "s"}.`);
    } catch (error) {
      setImageExportError(
        error instanceof Error ?
          error.message :
          "Unable to export PNG slides."
      );
    } finally {
      setIsExportingImages(false);
    }
  }, [draft]);

  return (
    <AdminMarketingPreviewShell>
      <AdminMarketingPreviewToolbar>
        <div>
          <strong>{draft.tone.replaceAll("-", " ")} preview</strong>
          <span>{draft.delivery?.currentExport ?? "copy and layout preview"} / no auto-posting</span>
        </div>
        <AdminMarketingPreviewActions>
          <AdminLinkButton
            download={`${draft.id}.json`}
            href={downloadHref}
            icon={<Download size={15} strokeWidth={1.9} />}
          >
            Download JSON
          </AdminLinkButton>
          <AdminButton
            disabled={!canExportImages || isExportingImages}
            icon={<Download size={15} strokeWidth={1.9} />}
            onClick={() => void downloadImages()}
            title={
              canExportImages ?
                "Download each carousel slide as a 1080x1350 PNG." :
                exportBlocker ?? "Add slides before exporting images."
            }
          >
            {isExportingImages ? "Exporting" : "Download PNG slides"}
          </AdminButton>
        </AdminMarketingPreviewActions>
      </AdminMarketingPreviewToolbar>
      {imageExportMessage ? (
        <AdminMarketingExportStatus>{imageExportMessage}</AdminMarketingExportStatus>
      ) : null}
      {imageExportError ? (
        <AdminMarketingExportStatus tone="error">{imageExportError}</AdminMarketingExportStatus>
      ) : null}
      {exportBlocker && draftType === "event_highlights" ? (
        <EmptyState
          compact variant="marketing"
          icon={<FileWarning size={16} strokeWidth={1.9} />}
        >
          {exportBlocker}
        </EmptyState>
      ) : null}
      {exportBlocker && draftType === "feature_explainer" ? (
        <EmptyState
          compact variant="marketing"
          icon={<FileWarning size={16} strokeWidth={1.9} />}
        >
          {exportBlocker}
        </EmptyState>
      ) : null}
      <AdminMarketingCarouselPreview aria-label={`${draft.tone} carousel preview`}>
        {draft.slides.map((slide, index) => (
          <AdminMarketingPreviewSlide
            hasImage={Boolean(slide.image?.url)}
            key={slide.id}
          >
            <AdminMarketingPreviewMeta>
              <span>{index + 1}/{draft.slides.length}</span>
              <span>{slide.role}</span>
            </AdminMarketingPreviewMeta>
            {slide.image?.url ? (
              <AdminMarketingPreviewImage
                alt={slide.image.altText || ""}
                src={slide.image.url}
              />
            ) : null}
            <AdminMarketingPreviewBrandNote>
              Export design: Catch _ logo text, Archivo token headlines, IBM Plex Mono labels, SF body
            </AdminMarketingPreviewBrandNote>
            <AdminMarketingPreviewCopy>
              <CatchText as="h4" variant="titleS">{slide.headline}</CatchText>
              <CatchText as="p" variant="supporting">{slide.body}</CatchText>
            </AdminMarketingPreviewCopy>
          </AdminMarketingPreviewSlide>
        ))}
      </AdminMarketingCarouselPreview>
    </AdminMarketingPreviewShell>
  );
}

const instagramExportSize = {
  width: 1080,
  height: 1350,
} as const;

const headlineFontFamily = "\"Archivo\", ui-sans-serif, system-ui, sans-serif";
const labelFontFamily = "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, monospace";
const bodyFontFamily = "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI\", sans-serif";

interface CanvasPalette {
  background: string;
  raised: string;
  ink: string;
  muted: string;
  faint: string;
  line: string;
  primary: string;
  primaryInk: string;
  primarySoft: string;
  accent: string;
}

async function exportDraftPngSlides(draft: MarketingContentDraft): Promise<number> {
  if (draft.slides.length === 0) {
    throw new Error("This draft does not have any slides to export.");
  }
  const blocker = exportBlockerForDraft(draft);
  if (blocker) throw new Error(blocker);

  await document.fonts?.ready;
  const palette = readCanvasPalette();
  for (let index = 0; index < draft.slides.length; index += 1) {
    const slide = draft.slides[index];
    const slideImage = slide.image?.url ?
      await loadCanvasImage(slide.image.url, slide.id) :
      null;
    const canvas = renderMarketingSlideCanvas({
      draft,
      index,
      palette,
      slide,
      slideImage,
      totalSlides: draft.slides.length,
    });
    const blob = await canvasToBlob(canvas);
    downloadBlob(
      blob,
      `${sanitizeDownloadName(draft.id)}-${String(index + 1).padStart(2, "0")}-${sanitizeDownloadName(slide.id)}.png`
    );
    await waitForDownloadTick();
  }
  return draft.slides.length;
}

function readCanvasPalette(): CanvasPalette {
  const styles = getComputedStyle(document.documentElement);
  const color = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    background: color("--catch-color-light-bg", "#F4F4F1"),
    raised: color("--catch-color-light-raised", "#FAFAF8"),
    ink: color("--catch-color-light-ink", "#16140F"),
    muted: color("--catch-color-light-ink2", "#544F47"),
    faint: color("--catch-color-light-ink3", "#9C958A"),
    line: color("--catch-color-light-line2", "rgba(22, 20, 15, 0.14)"),
    primary: color("--catch-color-light-primary", "#16140F"),
    primaryInk: color("--catch-color-light-primary-ink", "#F4F4F1"),
    primarySoft: color("--catch-color-light-primary-soft", "#ECEAE4"),
    accent: color("--catch-activity-singles-mixer-accent", "#D85A6E"),
  };
}

function renderMarketingSlideCanvas({
  draft,
  index,
  palette,
  slide,
  slideImage,
  totalSlides,
}: {
  draft: MarketingContentDraft;
  index: number;
  palette: CanvasPalette;
  slide: MarketingContentDraftSlide;
  slideImage: HTMLImageElement | null;
  totalSlides: number;
}): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = instagramExportSize.width;
  canvas.height = instagramExportSize.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas export is not available in this browser.");

  const {width, height} = instagramExportSize;
  const margin = 72;
  const contentWidth = width - margin * 2;
  const hasImage = Boolean(slideImage);

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = palette.primarySoft;
  ctx.fillRect(0, 0, width, 18);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 0, Math.round(width * ((index + 1) / totalSlides)), 18);

  drawExportHeader(ctx, {
    draft,
    index,
    margin,
    palette,
    slide,
    totalSlides,
    width,
  });

  if (slideImage) {
    drawSlideImage(ctx, {
      image: slideImage,
      fit: slide.image?.fit ?? "cover",
      palette,
      rect: {
        x: margin,
        y: 168,
        width: contentWidth,
        height: 472,
      },
    });
  }

  const role = slide.role.toLowerCase();
  const isCover = role === "cover";
  const isCta = role === "cta";
  const headlineY = hasImage ? 760 : isCover ? 410 : isCta ? 390 : 350;
  const headlineStartSize = hasImage ? isCover ? 76 : 66 : isCover ? 104 : isCta ? 86 : 80;
  const headlineMaxLines = hasImage ? 3 : isCover ? 5 : 4;
  const bodyStartSize = hasImage ? 30 : isCover ? 36 : 34;
  const bodyMaxLines = hasImage ? isCta ? 5 : 4 : isCover ? 4 : isCta ? 6 : 5;

  if (!isCover) {
    drawRoleMarker(ctx, {
      eventOrdinal: slide.role === "event" ?
        draft.slides.slice(0, index + 1).filter((item) => item.role === "event").length :
        null,
      index,
      margin,
      palette,
      slide,
      totalSlides,
      y: hasImage ? 664 : 214,
    });
  }

  const headline = fitTextBlock(ctx, {
    fontFamily: headlineFontFamily,
    fontWeight: 760,
    maxLines: headlineMaxLines,
    maxWidth: contentWidth,
    minSize: 50,
    startSize: headlineStartSize,
    text: slide.headline,
  });
  drawTextBlock(ctx, {
    color: palette.ink,
    fontFamily: headlineFontFamily,
    fontSize: headline.fontSize,
    fontWeight: 760,
    lineHeight: Math.round(headline.fontSize * 1.03),
    lines: headline.lines,
    x: margin,
    y: headlineY,
  });

  const bodyY = headlineY +
    headline.lines.length * Math.round(headline.fontSize * 1.03) +
    44;
  const body = fitTextBlock(ctx, {
    fontFamily: bodyFontFamily,
    fontWeight: 500,
    maxLines: bodyMaxLines,
    maxWidth: contentWidth,
    minSize: 25,
    startSize: bodyStartSize,
    text: slide.body,
  });
  drawTextBlock(ctx, {
    color: palette.muted,
    fontFamily: bodyFontFamily,
    fontSize: body.fontSize,
    fontWeight: 500,
    lineHeight: Math.round(body.fontSize * 1.38),
    lines: body.lines,
    x: margin,
    y: bodyY,
  });

  if (isCta) {
    drawCtaChips(ctx, {
      margin,
      palette,
      y: Math.min(bodyY + body.lines.length * Math.round(body.fontSize * 1.38) + 58, 930),
    });
  }

  drawExportFooter(ctx, {
    draft,
    margin,
    palette,
    slide,
    width,
    y: height - 164,
  });

  return canvas;
}

function drawExportHeader(
  ctx: CanvasRenderingContext2D,
  {
    draft,
    index,
    margin,
    palette,
    slide,
    totalSlides,
    width,
  }: {
    draft: MarketingContentDraft;
    index: number;
    margin: number;
    palette: CanvasPalette;
    slide: MarketingContentDraftSlide;
    totalSlides: number;
    width: number;
  }
) {
  ctx.fillStyle = palette.ink;
  ctx.font = canvasFont(760, 48, headlineFontFamily);
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Catch _", margin, 102);

  const weekLabel = formatExportWeek(draft.weekStart);
  const cityLabel = draft.cityId.replaceAll("-", " ").toUpperCase();
  const meta = `${cityLabel} / ${weekLabel}`;
  ctx.font = canvasFont(700, 20, labelFontFamily);
  ctx.fillStyle = palette.muted;
  ctx.textAlign = "right";
  ctx.fillText(meta, width - margin, 78);
  ctx.fillText(`${index + 1}/${totalSlides} / ${slide.role.toUpperCase()}`, width - margin, 108);
  ctx.textAlign = "left";
}

function drawSlideImage(
  ctx: CanvasRenderingContext2D,
  {
    fit,
    image,
    palette,
    rect,
  }: {
    fit: "cover" | "contain";
    image: HTMLImageElement;
    palette: CanvasPalette;
    rect: {x: number; y: number; width: number; height: number};
  }
) {
  ctx.save();
  roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 8);
  ctx.clip();
  ctx.fillStyle = palette.raised;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  const imageRatio = image.naturalWidth / image.naturalHeight;
  const rectRatio = rect.width / rect.height;
  const scale = fit === "contain" ?
    imageRatio > rectRatio ? rect.width / image.naturalWidth : rect.height / image.naturalHeight :
    imageRatio > rectRatio ? rect.height / image.naturalHeight : rect.width / image.naturalWidth;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const drawX = rect.x + (rect.width - drawWidth) / 2;
  const drawY = rect.y + (rect.height - drawHeight) / 2;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();

  roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 8);
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawRoleMarker(
  ctx: CanvasRenderingContext2D,
  {
    eventOrdinal,
    index,
    margin,
    palette,
    slide,
    totalSlides,
    y,
  }: {
    eventOrdinal: number | null;
    index: number;
    margin: number;
    palette: CanvasPalette;
    slide: MarketingContentDraftSlide;
    totalSlides: number;
    y: number;
  }
) {
  const isEvent = slide.role === "event";
  const label = isEvent ? `PICK ${String(eventOrdinal ?? 1).padStart(2, "0")}` : slide.role.toUpperCase();
  drawPill(ctx, {
    fill: isEvent ? palette.primary : palette.raised,
    label,
    stroke: isEvent ? palette.primary : palette.line,
    textColor: isEvent ? palette.primaryInk : palette.ink,
    x: margin,
    y,
  });
  ctx.font = canvasFont(700, 20, labelFontFamily);
  ctx.fillStyle = palette.faint;
  ctx.fillText(`SLIDE ${index + 1}`, margin + 208, y + 36);
  ctx.fillText(`${totalSlides} TOTAL`, margin + 336, y + 36);
}

function drawCtaChips(
  ctx: CanvasRenderingContext2D,
  {
    margin,
    palette,
    y,
  }: {
    margin: number;
    palette: CanvasPalette;
    y: number;
  }
) {
  drawPill(ctx, {
    fill: palette.primary,
    label: "JOIN WAITLIST",
    stroke: palette.primary,
    textColor: palette.primaryInk,
    x: margin,
    y,
  });
  drawPill(ctx, {
    fill: palette.raised,
    label: "SUBMIT HOST EVENT",
    stroke: palette.line,
    textColor: palette.ink,
    x: margin + 282,
    y,
  });
}

function drawExportFooter(
  ctx: CanvasRenderingContext2D,
  {
    draft,
    margin,
    palette,
    slide,
    width,
    y,
  }: {
    draft: MarketingContentDraft;
    margin: number;
    palette: CanvasPalette;
    slide: MarketingContentDraftSlide;
    width: number;
    y: number;
  }
) {
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(width - margin, y);
  ctx.stroke();

  ctx.font = canvasFont(700, 19, labelFontFamily);
  ctx.fillStyle = palette.muted;
  ctx.fillText(draft.tone.replaceAll("-", " ").toUpperCase(), margin, y + 48);

  ctx.font = canvasFont(500, 26, bodyFontFamily);
  ctx.fillStyle = palette.ink;
  const footerText = slide.role === "cta" ?
    "Join the waitlist or submit an event for review." :
    "More city plans and host submissions on Catch.";
  ctx.fillText(footerText, margin, y + 92);
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  {
    fill,
    label,
    stroke,
    textColor,
    x,
    y,
  }: {
    fill: string;
    label: string;
    stroke: string;
    textColor: string;
    x: number;
    y: number;
  }
) {
  ctx.font = canvasFont(700, 20, labelFontFamily);
  const width = Math.ceil(ctx.measureText(label).width + 44);
  const height = 52;
  roundedRect(ctx, x, y, width, height, 26);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 22, y + height / 2 + 1);
  ctx.textBaseline = "alphabetic";
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const resolvedRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + resolvedRadius, y);
  ctx.lineTo(x + width - resolvedRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + resolvedRadius);
  ctx.lineTo(x + width, y + height - resolvedRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - resolvedRadius, y + height);
  ctx.lineTo(x + resolvedRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - resolvedRadius);
  ctx.lineTo(x, y + resolvedRadius);
  ctx.quadraticCurveTo(x, y, x + resolvedRadius, y);
  ctx.closePath();
}

function fitTextBlock(
  ctx: CanvasRenderingContext2D,
  {
    fontFamily,
    fontWeight,
    maxLines,
    maxWidth,
    minSize,
    startSize,
    text,
  }: {
    fontFamily: string;
    fontWeight: number;
    maxLines: number;
    maxWidth: number;
    minSize: number;
    startSize: number;
    text: string;
  }
): {fontSize: number; lines: string[]} {
  for (let size = startSize; size >= minSize; size -= 2) {
    ctx.font = canvasFont(fontWeight, size, fontFamily);
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) {
      return {fontSize: size, lines};
    }
  }
  ctx.font = canvasFont(fontWeight, minSize, fontFamily);
  const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
  if (lines.length > 0) {
    lines[lines.length - 1] = truncateLine(ctx, lines[lines.length - 1], maxWidth);
  }
  return {fontSize: minSize, lines};
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  {
    color,
    fontFamily,
    fontSize,
    fontWeight,
    lineHeight,
    lines,
    x,
    y,
  }: {
    color: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    lines: string[];
    x: number;
    y: number;
  }
) {
  ctx.fillStyle = color;
  ctx.font = canvasFont(fontWeight, fontSize, fontFamily);
  ctx.textBaseline = "alphabetic";
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (ctx.measureText(word).width <= maxWidth) {
        line = word;
      } else {
        const splitWords = splitLongWord(ctx, word, maxWidth);
        lines.push(...splitWords.slice(0, -1));
        line = splitWords[splitWords.length - 1] ?? "";
      }
    }
    if (line) lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

function splitLongWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  maxWidth: number
): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const character of word) {
    const candidate = `${current}${character}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    current = character;
  }
  if (current) chunks.push(current);
  return chunks;
}

function truncateLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  maxWidth: number
): string {
  let current = line;
  while (current.length > 0 && ctx.measureText(`${current}...`).width > maxWidth) {
    current = current.slice(0, -1).trimEnd();
  }
  return current ? `${current}...` : "...";
}

function canvasFont(
  weight: number,
  size: number,
  family: string
): string {
  return `${weight} ${size}px ${family}`;
}

function formatExportWeek(weekStart: string): string {
  const parsed = new Date(`${weekStart}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return weekStart;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(parsed).toUpperCase();
}

function sanitizeDownloadName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "marketing-slide";
}

function readImageFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Choose an image file."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read the image file."));
    };
    reader.onerror = () => {
      reject(new Error(reader.error?.message ?? "Unable to read the image file."));
    };
    reader.readAsDataURL(file);
  });
}

function loadCanvasImage(src: string, slideId: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () => {
      reject(
        new Error(
          `Unable to load image for ${slideId}. If this is an external URL, upload the image file instead so the PNG export can use it.`
        )
      );
    };
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(
          new Error(
            "Unable to create PNG from canvas. If the slide uses an external image URL, upload the image file instead."
          )
        );
      }, "image/png");
    } catch (error) {
      reject(
        error instanceof Error ?
          error :
          new Error("Unable to create PNG from canvas.")
      );
    }
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function waitForDownloadTick(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 120);
  });
}

function guideNextAction(bridge: MarketingOpsBridge): string {
  if ((bridge.summary.reviewableCandidates ?? 0) === 0) {
    return "Capture or add source-backed candidates.";
  }
  if ((bridge.summary.sourceMissingCandidates ?? 0) > 0) {
    return `${bridge.summary.reviewableCandidates ?? 0} candidates can be reviewed now; add source URLs for ${bridge.summary.sourceMissingCandidates ?? 0} leads to grow the carousel.`;
  }
  if (bridge.summary.approvedCandidates === 0) {
    return "Review source-backed candidates and approve the ones safe for public copy.";
  }
  if (bridge.summary.exportReadyDrafts === 0) {
    return "Review the preview, edit the caption/slides, then mark a draft export ready.";
  }
  return "Export the reviewed packet for manual Instagram upload.";
}

function draftTypeForDraft(
  draft: MarketingContentDraft
): MarketingContentDraftType {
  if (draft.tone === "feature_explainer" || draft.recommendationSetId === "app-feature-media") {
    return "feature_explainer";
  }
  return "event_highlights";
}

function draftLabel(draftType: MarketingContentDraftType): string {
  return draftType === "feature_explainer" ?
    "Feature explainer" :
    "Event highlights";
}

function draftTitle(draft: MarketingContentDraft): string {
  return draft.slides[0]?.headline || draft.id;
}

function nextActionForDraft(draft: MarketingContentDraft): string {
  const blocker = exportBlockerForDraft(draft);
  if (blocker) return blocker;
  if (
    draft.latestDecision?.decision === "export_ready" ||
    draft.status === "export_ready"
  ) {
    return "Export PNG slides for manual upload.";
  }
  if (draft.reviewState === "new") return "Edit copy and run compliance checks.";
  if (draft.reviewState === "needs_changes") return "Resolve requested changes.";
  return "Review and mark export ready.";
}

function exportBlockerForDraft(draft: MarketingContentDraft): string | undefined {
  if (draft.slides.length === 0) {
    return "This draft has no slides yet.";
  }
  if (draftTypeForDraft(draft) === "event_highlights" &&
    !draft.slides.some((slide) => slide.role === "event")) {
    return "This draft has no sourced event slides yet.";
  }
  if (draftTypeForDraft(draft) === "feature_explainer" &&
    !draft.slides.some((slide) => slide.role === "feature")) {
    return "This draft has no feature screenshot slides yet.";
  }
  if (!draft.caption.trim()) return "Add a caption before export review.";
  return undefined;
}

export const marketingPreviewPanels = {
  MarketingDraftPreview,
  readCanvasPalette,
  renderMarketingSlideCanvas,
  drawExportHeader,
  drawSlideImage,
  drawRoleMarker,
  drawCtaChips,
  drawExportFooter,
  drawPill,
  roundedRect,
  fitTextBlock,
  drawTextBlock,
  wrapText,
  splitLongWord,
  truncateLine,
  canvasFont,
  formatExportWeek,
  sanitizeDownloadName,
  readImageFileAsDataUrl,
  loadCanvasImage,
  canvasToBlob,
  downloadBlob,
  waitForDownloadTick,
  guideNextAction,
  draftTypeForDraft,
  draftLabel,
  draftTitle,
  nextActionForDraft,
  exportBlockerForDraft,
};
