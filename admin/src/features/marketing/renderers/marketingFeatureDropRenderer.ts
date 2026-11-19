export type MarketingFeatureDropAudience = "members" | "hosts";
export type MarketingFeatureDropRegister = "dark" | "light" | "system";
export type MarketingFeatureDropAccent =
  | "run"
  | "padel"
  | "yoga"
  | "cycling"
  | "dinner";

export interface MarketingFeatureDropFeature {
  id: string;
  title: string;
  body: string;
  captureId: string;
  bodyTop?: number;
}

export interface MarketingFeatureDropConfig {
  audience: MarketingFeatureDropAudience;
  register: MarketingFeatureDropRegister;
  accent: MarketingFeatureDropAccent;
  coverMeta: string;
  monthLabel: string;
  coverHeadline: string;
  coverBody: string;
  outroLine: string;
  outroMeta: string;
  showWordmark: boolean;
  features: MarketingFeatureDropFeature[];
}

export type FeatureDropImageResolver = (
  feature: MarketingFeatureDropFeature,
  config: MarketingFeatureDropConfig
) => string | null;

const exportSize = {
  width: 1080,
  height: 1350,
} as const;

const headlineFontFamily = "\"Archivo\", ui-sans-serif, system-ui, sans-serif";
const labelFontFamily = "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, monospace";

const accents: Record<MarketingFeatureDropAccent, string> = {
  run: "#D85A3C",
  padel: "#2E9AA0",
  yoga: "#8A5FB0",
  cycling: "#3A6FD0",
  dinner: "#C44D6A",
};

interface FeatureDropPalette {
  canvas: string;
  bg: string;
  raised: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  line2: string;
  accent: string;
}

const darkPalette: Omit<FeatureDropPalette, "accent"> = {
  canvas: "#08070A",
  bg: "#0F0E10",
  raised: "#211F23",
  ink: "#F4F0E8",
  ink2: "#BAB2A7",
  ink3: "#7E776D",
  line: "rgba(244, 240, 232, 0.13)",
  line2: "rgba(244, 240, 232, 0.22)",
};

const lightPalette: Omit<FeatureDropPalette, "accent"> = {
  canvas: "#E7E5DF",
  bg: "#F4F4F1",
  raised: "#FAFAF8",
  ink: "#16140F",
  ink2: "#544F47",
  ink3: "#9C958A",
  line: "rgba(22, 20, 15, 0.08)",
  line2: "rgba(22, 20, 15, 0.14)",
};

const memberDefaults: MarketingFeatureDropConfig = {
  audience: "members",
  register: "dark",
  accent: "run",
  coverMeta: "EST. BANDRA · 2026",
  monthLabel: "JUN 2026",
  coverHeadline: "Four things you won’t find in a swipe app.",
  coverBody: "A short tour of what actually makes Catch different — no swiping required.",
  outroLine: "Update Catch to try them.",
  outroMeta: "OUT NOW · iOS & ANDROID",
  showWordmark: true,
  features: [
    {
      id: "why-click",
      title: "Why you\nmight click",
      body: "Catch tells you why someone is in your orbit — the runs you both show up to, the clubs you share, the rhythm you keep. Not a vague 95%. The actual places your paths cross.",
      captureId: "match-chat-context",
    },
    {
      id: "activity-colour",
      title: "Colour =\nthe activity",
      body: "The app is black and white on purpose. The only colour is meaning: coral is a run, teal a padel match, plum a yoga class. You learn to read Catch by hue.",
      captureId: "member-event-discovery",
    },
    {
      id: "catch-window",
      title: "The Catch\nwindow",
      body: "After an event, a 24-hour window opens with the people you actually met. You choose who to catch before it closes. No endless feed — a real moment, then it’s gone.",
      captureId: "post-run-catch-window",
    },
    {
      id: "clubs",
      title: "Clubs",
      body: "Clubs are the regular crews behind the events — a Tuesday run, a Sunday quiz. Join one and you stop meeting strangers and start meeting your people.",
      captureId: "member-event-discovery",
      bodyTop: 420,
    },
  ],
};

const hostDefaults: MarketingFeatureDropConfig = {
  audience: "hosts",
  register: "dark",
  accent: "padel",
  coverMeta: "EST. BANDRA · 2026",
  monthLabel: "JUN 2026",
  coverHeadline: "Four ways to run a room you couldn’t before.",
  coverBody: "A short tour of the controls hosts can use before, during, and after an event.",
  outroLine: "Update Catch Hosts to try them.",
  outroMeta: "OUT NOW · iOS & ANDROID",
  showWordmark: true,
  features: [
    {
      id: "live-console",
      title: "The room,\nin motion",
      body: "Run check-in, waitlist moves, guest status, and live notes from one console. The host sees the room while the room is still happening.",
      captureId: "host-live-console",
    },
    {
      id: "guided-flow",
      title: "Guided\nrotations",
      body: "Choose the live guide before the night starts. Catch keeps the operational flow visible so hosts are not improvising from a spreadsheet.",
      captureId: "host-create-guide",
    },
    {
      id: "event-setup",
      title: "Set the\nrules once",
      body: "Capacity, admission, waitlists, pricing, cohorts, and cancellation rules live in the event setup. The admin work is explicit before guests arrive.",
      captureId: "host-event-setup",
    },
    {
      id: "post-event-report",
      title: "After the\nroom closes",
      body: "Review attendance, waitlist movement, catches, matches, and chats after the event. Hosts get a read on what actually worked.",
      captureId: "host-post-event-report",
    },
  ],
};

export function marketingFeatureDropDefaults(
  audience: MarketingFeatureDropAudience = "members"
): MarketingFeatureDropConfig {
  return cloneConfig(audience === "hosts" ? hostDefaults : memberDefaults);
}

export async function renderFeatureDropPreviewUrls(
  config: MarketingFeatureDropConfig,
  resolveImage: FeatureDropImageResolver
): Promise<string[]> {
  await document.fonts?.ready;
  const featureImages = await loadFeatureImages(config, resolveImage);
  return Array.from({length: 6}, (_, index) => {
    const canvas = renderFeatureDropCanvas(config, index, featureImages);
    return canvas.toDataURL("image/png");
  });
}

export async function exportFeatureDropPngSlides(
  config: MarketingFeatureDropConfig,
  resolveImage: FeatureDropImageResolver
): Promise<number> {
  await document.fonts?.ready;
  const featureImages = await loadFeatureImages(config, resolveImage);
  for (let index = 0; index < 6; index += 1) {
    const canvas = renderFeatureDropCanvas(config, index, featureImages);
    const blob = await canvasToBlob(canvas);
    downloadBlob(
      blob,
      `${sanitizeDownloadName(config.audience)}-feature-drop-${String(index + 1).padStart(2, "0")}.png`
    );
    await waitForDownloadTick();
  }
  return 6;
}

async function loadFeatureImages(
  config: MarketingFeatureDropConfig,
  resolveImage: FeatureDropImageResolver
): Promise<Array<HTMLImageElement | null>> {
  return Promise.all(
    config.features.map(async (feature) => {
      const url = resolveImage(feature, config);
      return url ? loadCanvasImage(url, feature.id) : null;
    })
  );
}

function renderFeatureDropCanvas(
  config: MarketingFeatureDropConfig,
  index: number,
  featureImages: Array<HTMLImageElement | null>
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = exportSize.width;
  canvas.height = exportSize.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas export is not available in this browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const palette = paletteFor(config, index);
  ctx.fillStyle = palette.canvas;
  ctx.fillRect(0, 0, exportSize.width, exportSize.height);

  if (index === 0) {
    drawCover(ctx, config, palette);
  } else if (index === 5) {
    drawOutro(ctx, config, palette);
  } else {
    const feature = config.features[index - 1] ?? config.features[0];
    drawFeature(ctx, config, palette, feature, featureImages[index - 1] ?? null);
  }

  return canvas;
}

function paletteFor(
  config: MarketingFeatureDropConfig,
  index: number
): FeatureDropPalette {
  const base = config.register === "light" ||
    (config.register === "system" && index > 0 && index < 5) ?
    lightPalette :
    darkPalette;
  return {
    ...base,
    accent: accents[config.accent],
  };
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  config: MarketingFeatureDropConfig,
  palette: FeatureDropPalette
) {
  const marginX = 80;
  if (config.showWordmark) {
    drawWordmark(ctx, {
      x: marginX,
      y: 128,
      size: 64,
      palette,
      dot: "_",
    });
  }

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "right";
  ctx.font = canvasFont(700, 22, labelFontFamily);
  setCanvasLetterSpacing(ctx, "3.52px");
  ctx.fillStyle = palette.ink3;
  ctx.fillText(config.coverMeta, exportSize.width - marginX, 126);
  ctx.textAlign = "left";
  setCanvasLetterSpacing(ctx, "normal");

  const contentTop = 382;
  drawKicker(ctx, {
    color: palette.accent,
    fontSize: 30,
    label: `${kickerFor(config)} · ${config.monthLabel}`,
    x: marginX,
    y: contentTop,
  });

  const headline = fitTextBlock(ctx, {
    fontFamily: headlineFontFamily,
    fontWeight: 600,
    maxLines: 4,
    maxWidth: 920,
    minSize: 76,
    startSize: 118,
    text: config.coverHeadline,
  });
  drawTextBlock(ctx, {
    color: palette.ink,
    fontFamily: headlineFontFamily,
    fontSize: headline.fontSize,
    fontWeight: 600,
    lineHeight: Math.round(headline.fontSize * 0.95),
    lines: headline.lines,
    x: marginX,
    y: contentTop + 72,
  });

  const headlineHeight = headline.lines.length * Math.round(headline.fontSize * 0.95);
  const body = fitTextBlock(ctx, {
    fontFamily: headlineFontFamily,
    fontWeight: 400,
    maxLines: 3,
    maxWidth: 760,
    minSize: 30,
    startSize: 38,
    text: config.coverBody,
  });
  drawTextBlock(ctx, {
    color: palette.ink2,
    fontFamily: headlineFontFamily,
    fontSize: body.fontSize,
    fontWeight: 400,
    lineHeight: Math.round(body.fontSize * 1.45),
    lines: body.lines,
    x: marginX,
    y: contentTop + 72 + headlineHeight + 64,
  });

  ctx.font = canvasFont(500, 24, labelFontFamily);
  ctx.fillStyle = palette.ink3;
  ctx.fillText("Swipe →", marginX, exportSize.height - 84);
  drawNavCircle(ctx, {
    x: exportSize.width - marginX - 70,
    y: exportSize.height - 300 - 70,
    size: 70,
    label: "›",
    palette,
    opacity: 0.32,
  });
}

function drawFeature(
  ctx: CanvasRenderingContext2D,
  config: MarketingFeatureDropConfig,
  palette: FeatureDropPalette,
  feature: MarketingFeatureDropFeature,
  image: HTMLImageElement | null
) {
  const title = fitTextBlock(ctx, {
    fontFamily: headlineFontFamily,
    fontWeight: 600,
    maxLines: 3,
    maxWidth: 392,
    minSize: 62,
    startSize: 90,
    text: feature.title,
  });
  drawTextBlock(ctx, {
    color: palette.ink,
    fontFamily: headlineFontFamily,
    fontSize: title.fontSize,
    fontWeight: 600,
    lineHeight: Math.round(title.fontSize * 0.94),
    lines: title.lines,
    x: 80,
    y: 92,
  });

  const body = fitTextBlock(ctx, {
    fontFamily: headlineFontFamily,
    fontWeight: 400,
    maxLines: feature.bodyTop ? 8 : 7,
    maxWidth: 392,
    minSize: 27,
    startSize: 38,
    text: feature.body,
  });
  drawTextBlock(ctx, {
    color: palette.ink2,
    fontFamily: headlineFontFamily,
    fontSize: body.fontSize,
    fontWeight: 400,
    lineHeight: Math.round(body.fontSize * 1.5),
    lines: body.lines,
    x: 80,
    y: feature.bodyTop ?? 560,
  });

  drawPhone(ctx, {
    image,
    palette,
    x: 498,
    y: 288,
    width: 520,
    height: 1016,
  });

  drawKicker(ctx, {
    color: palette.ink3,
    fontSize: 24,
    label: kickerFor(config),
    x: 80,
    y: exportSize.height - 64,
  });
}

function drawOutro(
  ctx: CanvasRenderingContext2D,
  config: MarketingFeatureDropConfig,
  palette: FeatureDropPalette
) {
  drawKicker(ctx, {
    color: palette.ink3,
    fontSize: 24,
    label: kickerFor(config),
    x: 80,
    y: 108,
  });

  if (config.showWordmark) {
    drawWordmark(ctx, {
      x: 80,
      y: 658,
      size: 128,
      palette,
      dot: "_",
    });
  }

  const outro = fitTextBlock(ctx, {
    fontFamily: headlineFontFamily,
    fontWeight: 600,
    maxLines: 3,
    maxWidth: 680,
    minSize: 34,
    startSize: 46,
    text: config.outroLine,
  });
  drawTextBlock(ctx, {
    color: palette.ink,
    fontFamily: headlineFontFamily,
    fontSize: outro.fontSize,
    fontWeight: 600,
    lineHeight: Math.round(outro.fontSize * 1.2),
    lines: outro.lines,
    x: 80,
    y: 718,
  });

  ctx.font = canvasFont(700, 22, labelFontFamily);
  ctx.fillStyle = palette.ink2;
  setCanvasLetterSpacing(ctx, "3.52px");
  ctx.fillText(config.outroMeta, 80, exportSize.height - 84);
  setCanvasLetterSpacing(ctx, "normal");
  drawNavCircle(ctx, {
    x: exportSize.width - 80 - 62,
    y: exportSize.height - 80 - 62,
    size: 62,
    label: "↗",
    palette,
    opacity: 0.24,
  });
}

function drawPhone(
  ctx: CanvasRenderingContext2D,
  {
    image,
    palette,
    x,
    y,
    width,
    height,
  }: {
    image: HTMLImageElement | null;
    palette: FeatureDropPalette;
    x: number;
    y: number;
    width: number;
    height: number;
  }
) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.62)";
  ctx.shadowBlur = 92;
  ctx.shadowOffsetY = 54;
  const rim = ctx.createLinearGradient(x, y, x + width, y + height);
  rim.addColorStop(0, "#54545A");
  rim.addColorStop(0.22, "#26262B");
  rim.addColorStop(0.49, "#3B3B41");
  rim.addColorStop(0.73, "#1C1C20");
  rim.addColorStop(1, "#4E4E54");
  roundedRect(ctx, x, y, width, height, 66);
  ctx.fillStyle = rim;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRect(ctx, x, y, width, height, 66);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const inset = 14;
  const screen = {
    x: x + inset,
    y: y + inset,
    width: width - inset * 2,
    height: height - inset * 2,
  };
  ctx.save();
  roundedRect(ctx, screen.x, screen.y, screen.width, screen.height, 52);
  ctx.clip();
  ctx.fillStyle = palette.bg;
  ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
  if (image) {
    drawPhoneImage(ctx, image, screen);
  } else {
    drawMissingCapture(ctx, palette, screen);
  }
  ctx.restore();

  roundedRect(ctx, screen.x, screen.y, screen.width, screen.height, 52);
  ctx.strokeStyle = "#08070A";
  ctx.lineWidth = 3;
  ctx.stroke();
}

// App captures are the screen alone (tool/marketing/lib/capture_devices.mjs),
// so the whole image fits the drawn phone's screen; this phone is its only frame.
function drawPhoneImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  target: {x: number; y: number; width: number; height: number}
) {
  drawImageContain(ctx, image, {x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight}, target);
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  source: {x: number; y: number; width: number; height: number},
  target: {x: number; y: number; width: number; height: number}
) {
  const imageRatio = source.width / source.height;
  const targetRatio = target.width / target.height;
  const scale = imageRatio > targetRatio ?
    target.width / source.width :
    target.height / source.height;
  const drawWidth = source.width * scale;
  const drawHeight = source.height * scale;
  const drawX = target.x + (target.width - drawWidth) / 2;
  const drawY = target.y + (target.height - drawHeight) / 2;
  ctx.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );
}

function drawMissingCapture(
  ctx: CanvasRenderingContext2D,
  palette: FeatureDropPalette,
  rect: {x: number; y: number; width: number; height: number}
) {
  ctx.fillStyle = palette.raised;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.font = canvasFont(700, 18, labelFontFamily);
  ctx.fillStyle = palette.ink3;
  ctx.textAlign = "center";
  setCanvasLetterSpacing(ctx, "2.2px");
  ctx.fillText("SELECT CAPTURE", rect.x + rect.width / 2, rect.y + rect.height / 2);
  setCanvasLetterSpacing(ctx, "normal");
  ctx.textAlign = "left";
}

function drawWordmark(
  ctx: CanvasRenderingContext2D,
  {
    dot,
    palette,
    size,
    x,
    y,
  }: {
    dot: "." | "_";
    palette: FeatureDropPalette;
    size: number;
    x: number;
    y: number;
  }
) {
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.78, 1);
  ctx.font = canvasFont(700, size, headlineFontFamily);
  ctx.fillStyle = palette.ink;
  ctx.fillText("Catch", 0, 0);
  const width = ctx.measureText("Catch").width;
  ctx.fillStyle = palette.accent;
  ctx.fillText(dot, width + (dot === "_" ? 16 : 0), 0);
  ctx.restore();
}

function drawKicker(
  ctx: CanvasRenderingContext2D,
  {
    color,
    fontSize,
    label,
    x,
    y,
  }: {
    color: string;
    fontSize: number;
    label: string;
    x: number;
    y: number;
  }
) {
  ctx.textBaseline = "alphabetic";
  ctx.font = canvasFont(700, fontSize, labelFontFamily);
  ctx.fillStyle = color;
  setCanvasLetterSpacing(ctx, `${fontSize * 0.18}px`);
  ctx.fillText(label, x, y);
  setCanvasLetterSpacing(ctx, "normal");
}

function drawNavCircle(
  ctx: CanvasRenderingContext2D,
  {
    label,
    opacity,
    palette,
    size,
    x,
    y,
  }: {
    label: string;
    opacity: number;
    palette: FeatureDropPalette;
    size: number;
    x: number;
    y: number;
  }
) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(140, 134, 124, ${opacity})`;
  roundedRect(ctx, x, y, size, size, size / 2);
  ctx.fill();
  ctx.fillStyle = palette.ink;
  ctx.font = canvasFont(500, label === "›" ? 48 : 28, headlineFontFamily);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + size / 2, y + size / 2 - (label === "›" ? 4 : 0));
  ctx.restore();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function kickerFor(config: MarketingFeatureDropConfig): string {
  return config.audience === "hosts" ? "NEW FOR HOSTS" : "NEW IN CATCH";
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
  for (let fontSize = startSize; fontSize >= minSize; fontSize -= 2) {
    ctx.font = canvasFont(fontWeight, fontSize, fontFamily);
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) {
      return {fontSize, lines};
    }
  }
  ctx.font = canvasFont(fontWeight, minSize, fontFamily);
  return {
    fontSize: minSize,
    lines: wrapText(ctx, text, maxWidth).slice(0, maxLines),
  };
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split(/\n+/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth || !line) {
        line = test;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
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
  ctx.font = canvasFont(fontWeight, fontSize, fontFamily);
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
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
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function canvasFont(
  weight: number,
  size: number,
  family: string
): string {
  return `${weight} ${size}px ${family}`;
}

function setCanvasLetterSpacing(ctx: CanvasRenderingContext2D, value: string) {
  (ctx as CanvasRenderingContext2D & {letterSpacing?: string}).letterSpacing = value;
}

function cloneConfig(config: MarketingFeatureDropConfig): MarketingFeatureDropConfig {
  return {
    ...config,
    features: config.features.map((feature) => ({...feature})),
  };
}

function loadCanvasImage(url: string, label: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image for ${label}.`));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Unable to create PNG image."));
      }
    }, "image/png");
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function waitForDownloadTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 80));
}

function sanitizeDownloadName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "catch";
}
