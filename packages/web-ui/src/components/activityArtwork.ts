/**
 * Activity artwork: the duotone ground and line pattern the app paints for an
 * event or organiser without a photo (Flutter `EventBackdropImage` and its
 * `_ActivityPatternPainter`). This module is pure, so the website draws it in
 * React and link-preview cards render the same SVG on the server.
 *
 * activityArtworkParity.test.ts reads the Flutter sources: the kind-to-pattern
 * map and each pattern's geometry cannot drift from the painter they mirror.
 */

/** Production activity kinds, named after the Flutter `ActivityKind` values. */
export const catchActivityKinds = [
  "socialRun",
  "running",
  "walking",
  "pickleball",
  "padel",
  "tennis",
  "badminton",
  "cycling",
  "spinClass",
  "yoga",
  "strengthTraining",
  "dinner",
  "pubQuiz",
  "barCrawl",
  "singlesMixer",
  "openActivity",
] as const;

export type CatchActivityKind = (typeof catchActivityKinds)[number];

/** Pattern names, matching Flutter `EventActivityPattern`. */
export type ActivityArtworkPattern =
  | "routeDots"
  | "routeDashes"
  | "stepDots"
  | "courtLines"
  | "glassGrid"
  | "courtArcs"
  | "shuttleStrokes"
  | "wheelArcs"
  | "rhythmRings"
  | "mandalaArcs"
  | "barMarks"
  | "plateCircles"
  | "quizCards"
  | "neonDots"
  | "overlapCircles"
  | "stampGrid";

export const activityArtworkPatterns: Readonly<Record<CatchActivityKind, ActivityArtworkPattern>> = {
  socialRun: "routeDots",
  running: "routeDashes",
  walking: "stepDots",
  pickleball: "courtLines",
  padel: "glassGrid",
  tennis: "courtArcs",
  badminton: "shuttleStrokes",
  cycling: "wheelArcs",
  spinClass: "rhythmRings",
  yoga: "mandalaArcs",
  strengthTraining: "barMarks",
  dinner: "plateCircles",
  pubQuiz: "quizCards",
  barCrawl: "neonDots",
  singlesMixer: "overlapCircles",
  openActivity: "stampGrid",
};

const kindsByKey = new Map(catchActivityKinds.map((kind) => [kind.toLowerCase(), kind]));

/**
 * Reads a stored activity value ("socialRun", "social_run", "Social run") as
 * a kind. Anything else is the open format, as in the app.
 */
export function activityKindFromValue(value: string | null | undefined): CatchActivityKind {
  return kindsByKey.get((value ?? "").replace(/[^a-z0-9]+/gi, "").toLowerCase()) ?? "openActivity";
}

/** The generated Catch tokens the artwork reads, by CSS custom property name. */
export interface ActivityArtworkTokenNames {
  accent: string;
  deep: string;
  /** Marks and glyph colour: the app's editorial white. */
  mark: string;
  patternOpacity: string;
  glyphOpacity: string;
}

export function activityArtworkTokenNames(kind: CatchActivityKind): ActivityArtworkTokenNames {
  const name = kind.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return {
    accent: `--catch-activity-${name}-accent`,
    deep: `--catch-activity-${name}-deep`,
    mark: "--catch-color-light-surface",
    patternOpacity: "--catch-opacity-activity-artwork-pattern",
    glyphOpacity: "--catch-opacity-activity-artwork-glyph",
  };
}

/** Painter stroke width and the token-sized marks (`CatchSpacing.micro3`). */
export const activityArtworkStrokeWidth = 1.2;
const micro3 = 3;

export type ActivityArtworkMark =
  | {shape: "circle"; cx: number; cy: number; r: number; paint: "fill" | "stroke"}
  | {shape: "line"; x1: number; y1: number; x2: number; y2: number}
  | {shape: "rect"; x: number; y: number; width: number; height: number; rx: number; paint: "fill" | "stroke"}
  | {shape: "path"; d: string};

/**
 * The pattern's marks for a box of `width` × `height`, in the same units the
 * Flutter painter uses: logical pixels, so the pattern keeps the app's density
 * at any size instead of scaling with the box.
 */
export function activityArtworkMarks(pattern: ActivityArtworkPattern, width: number, height: number): ActivityArtworkMark[] {
  const marks: ActivityArtworkMark[] = [];
  const shortestSide = Math.min(width, height);
  const fillCircle = (cx: number, cy: number, r: number) => marks.push({shape: "circle", cx, cy, r, paint: "fill"});
  const strokeCircle = (cx: number, cy: number, r: number) => marks.push({shape: "circle", cx, cy, r, paint: "stroke"});
  const line = (x1: number, y1: number, x2: number, y2: number) => marks.push({shape: "line", x1, y1, x2, y2});
  const arc = (cx: number, cy: number, r: number, start: number, sweep: number) => marks.push({shape: "path", d: arcPath(cx, cy, r, start, sweep)});
  // Flutter's Rect.fromLTWH, RRect.fromRectAndRadius and Rect.fromCenter.
  const strokeRect = (x: number, y: number, w: number, h: number, radius = 0) =>
    marks.push({shape: "rect", x, y, width: w, height: h, rx: radius, paint: "stroke"});
  const fillRectFromCenter = (cx: number, cy: number, w: number, h: number) =>
    marks.push({shape: "rect", x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 0, paint: "fill"});

  switch (pattern) {
  case "routeDots":
    for (let x = 16; x < width; x += 28) {
      const y = height * 0.52 + Math.sin(x / 26) * 16;
      fillCircle(x, y, 1.8);
    }
    break;
  case "routeDashes":
    for (let x = 8; x < width; x += 28) {
      const y = height * 0.5 + Math.sin(x / 30) * 18;
      line(x, y, x + 12, y + 4);
    }
    break;
  case "stepDots":
    for (let x = 18; x < width; x += 32) {
      fillCircle(x, height * 0.42, 2);
      fillCircle(x + 12, height * 0.58, 2);
    }
    break;
  case "courtLines":
    strokeRect(18, 18, width - 36, height - 36);
    line(width / 2, 18, width / 2, height - 18);
    line(18, height / 2, width - 18, height / 2);
    break;
  case "glassGrid":
    for (let x = 18; x < width; x += 34) {
      line(x, 10, x - 22, height - 10);
    }
    for (let y = 18; y < height; y += 28) {
      line(10, y, width - 10, y + 10);
    }
    break;
  case "courtArcs":
    for (let radius = 36; radius < width; radius += 42) {
      arc(width / 2, height, radius, Math.PI, Math.PI);
    }
    break;
  case "shuttleStrokes":
    for (let x = 22; x < width; x += 42) {
      line(x, 20, x + 18, height - 20);
      line(x + 10, 26, x + 26, height - 26);
    }
    break;
  case "wheelArcs":
    for (let x = 24; x < width; x += 66) {
      strokeCircle(x, height * 0.68, 22);
    }
    break;
  case "rhythmRings":
    for (let radius = 16; radius < shortestSide; radius += 22) {
      strokeCircle(width * 0.22, height * 0.42, radius);
    }
    break;
  case "mandalaArcs":
    for (let i = 0; i < 5; i += 1) {
      arc(width * 0.28, height * 0.5, 22 + i * 16, -Math.PI / 3, Math.PI * 1.3);
    }
    break;
  case "barMarks":
    for (let x = 20; x < width; x += 34) {
      line(x, height * 0.35, x, height * 0.68);
      line(x - 8, height * 0.5, x + 8, height * 0.5);
    }
    break;
  case "plateCircles":
    for (let x = 28; x < width; x += 64) {
      strokeCircle(x, height * 0.48, 18);
      strokeCircle(x, height * 0.48, 7);
    }
    break;
  case "quizCards":
    for (let x = 16; x < width; x += 44) {
      strokeRect(x, height * 0.34, 24, 18, micro3);
    }
    break;
  case "neonDots":
    for (let x = 16; x < width; x += 26) {
      for (let y = 18; y < height; y += 28) {
        if (isEven(Math.round(x + y))) fillCircle(x, y, 2);
      }
    }
    break;
  case "overlapCircles":
    for (let x = 28; x < width; x += 46) {
      strokeCircle(x, height * 0.46, 18);
      strokeCircle(x + 16, height * 0.46, 18);
    }
    break;
  case "stampGrid":
    for (let x = 16; x < width; x += 28) {
      for (let y = 16; y < height; y += 28) {
        fillRectFromCenter(x, y, micro3, micro3);
      }
    }
    break;
  }
  return marks;
}

function isEven(value: number) {
  return value % 2 === 0;
}

/** Flutter `drawArc`: angles in radians, clockwise from the positive x axis. */
function arcPath(cx: number, cy: number, r: number, start: number, sweep: number) {
  const end = start + sweep;
  const point = (angle: number) => `${round(cx + r * Math.cos(angle))} ${round(cy + r * Math.sin(angle))}`;
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const clockwise = sweep >= 0 ? 1 : 0;
  return `M${point(start)}A${round(r)} ${round(r)} 0 ${largeArc} ${clockwise} ${point(end)}`;
}

export function round(value: number) {
  return Math.round(value * 100) / 100;
}

/** Gradient stops of the duotone ground: accent to deep, or accent-deep-accent when dense. */
export function activityArtworkStops(dense: boolean): ReadonlyArray<{offset: number; color: "accent" | "deep"}> {
  return dense
    ? [{offset: 0, color: "accent"}, {offset: 0.6, color: "deep"}, {offset: 1, color: "accent"}]
    : [{offset: 0, color: "accent"}, {offset: 1, color: "deep"}];
}

export interface ActivityArtworkSvgOptions {
  activityKind: CatchActivityKind;
  width: number;
  height: number;
  /** The app's dense ground, for small or busy media. */
  dense?: boolean;
  /**
   * Turns a token name into its value, e.g. read from
   * packages/web-config/generated/catch-tokens.css. Without it the SVG
   * references the tokens as CSS custom properties, for inline use on a page
   * that loads them.
   */
  resolveToken?: (name: string) => string;
  /**
   * Optional glyph markup in a 24 × 24 box drawn with `currentColor`, such as
   * an icon's `<path>` elements. Drawn bottom-right like the app's glyph.
   */
  glyph?: string;
  /** Prefix for the gradient id; give each inline SVG on one page its own. */
  idPrefix?: string;
}

/** The activity artwork as a standalone SVG document. */
export function activityArtworkSvg({
  activityKind,
  width,
  height,
  dense = false,
  resolveToken,
  glyph,
  idPrefix = "catch-activity-artwork",
}: ActivityArtworkSvgOptions): string {
  const tokens = activityArtworkTokenNames(activityKind);
  const value = (name: string) => resolveToken ? resolveToken(name) : `var(${name})`;
  const color = {accent: value(tokens.accent), deep: value(tokens.deep)};
  const gradientId = `${idPrefix}-ground`;
  const stops = activityArtworkStops(dense)
    .map((stop) => `<stop offset="${stop.offset}" style="stop-color:${color[stop.color]}"/>`)
    .join("");
  const marks = activityArtworkMarks(activityArtworkPatterns[activityKind], width, height).map(markSvg).join("");
  const glyphSize = activityArtworkGlyphSize(width, height);
  const glyphInset = activityArtworkGlyphInset;
  const glyphMarkup = glyph
    ? `<g transform="translate(${round(width - glyphInset - glyphSize)} ${round(height - glyphInset - glyphSize)}) scale(${round(glyphSize / 24)})" style="color:${value(tokens.mark)};opacity:${value(tokens.glyphOpacity)}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    + `<defs><linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${width}" y2="${height}">${stops}</linearGradient></defs>`
    + `<rect width="${width}" height="${height}" fill="url(#${gradientId})"/>`
    // Per-mark opacity, like the painter's translucent paint: crossings darken.
    + `<g style="fill:${value(tokens.mark)};stroke:${value(tokens.mark)};fill-opacity:${value(tokens.patternOpacity)};stroke-opacity:${value(tokens.patternOpacity)}" stroke-width="${activityArtworkStrokeWidth}" stroke-linecap="round">${marks}</g>`
    + glyphMarkup
    + "</svg>";
}

/** The app's glyph is 132 logical pixels; smaller boxes scale it down. */
export function activityArtworkGlyphSize(width: number, height: number) {
  return Math.min(132, Math.min(width, height) * 0.6);
}

/** `CatchInsets.tileContent` (`CatchSpacing.micro18`). */
export const activityArtworkGlyphInset = 18;

function markSvg(mark: ActivityArtworkMark) {
  switch (mark.shape) {
  case "circle":
    return `<circle cx="${round(mark.cx)}" cy="${round(mark.cy)}" r="${round(mark.r)}"${mark.paint === "fill" ? ' stroke="none"' : ' fill="none"'}/>`;
  case "line":
    return `<line x1="${round(mark.x1)}" y1="${round(mark.y1)}" x2="${round(mark.x2)}" y2="${round(mark.y2)}"/>`;
  case "rect":
    return `<rect x="${round(mark.x)}" y="${round(mark.y)}" width="${round(mark.width)}" height="${round(mark.height)}"${mark.rx ? ` rx="${round(mark.rx)}"` : ""}${mark.paint === "fill" ? ' stroke="none"' : ' fill="none"'}/>`;
  case "path":
    return `<path d="${mark.d}" fill="none"/>`;
  }
}
