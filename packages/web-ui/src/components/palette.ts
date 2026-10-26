/**
 * The Website v2 palette, grounds and activity formats in
 * design/tokens/catch.tokens.json, named for the token specimen and its tests.
 * palette.test.ts pins every list here to the generated CSS, so a token added
 * or renamed there fails the web-ui tests until it appears here too.
 */
export const paletteAccents = ["coral", "pink", "yellow", "mint", "indigo", "magenta"] as const;
export type PaletteAccent = (typeof paletteAccents)[number];

export const paletteNeutrals = [
  "ink",
  "inkSecondary",
  "paper",
  "white",
  "nightSurface",
  "nightInk",
  "nightSecondary",
] as const;

/** Every palette colour, in token order: the neutrals, then each accent with its deep and ink. */
export const paletteColors = [
  ...paletteNeutrals,
  ...paletteAccents.flatMap((accent) => [accent, `${accent}Deep`, `${accent}Ink`] as const),
] as const;
export type PaletteColor = (typeof paletteColors)[number];

export const grounds = ["white", "paper", "ink", ...paletteAccents] as const;
export type Ground = (typeof grounds)[number];
export const groundRoles = ["fill", "ink", "inkSecondary"] as const;
export type GroundRole = (typeof groundRoles)[number];

/** Activity formats and the accent each takes. singlesMixer has no format. */
export const formatAccents = {
  run: "coral",
  dinner: "pink",
  games: "yellow",
  courts: "mint",
  nightsOut: "magenta",
} as const satisfies Record<string, PaletteAccent>;
export type Format = keyof typeof formatAccents;
export const formatRoles = ["accent", "deep", "ink", "inkSecondary"] as const;

/** The activity kinds each format covers; kinds not listed have no v2 format yet. */
export const formatActivityKinds: Readonly<Record<Format, readonly string[]>> = {
  run: ["socialRun", "running"],
  dinner: ["dinner"],
  games: ["pubQuiz"],
  courts: ["pickleball", "padel", "tennis", "badminton"],
  nightsOut: ["barCrawl"],
};

/** The accent an activity kind's format takes, or null while the kind has no v2 format. */
export function catchActivityAccent(kind: string): PaletteAccent | null {
  const format = (Object.keys(formatActivityKinds) as Format[]).find((name) => formatActivityKinds[name].includes(kind));
  return format ? formatAccents[format] : null;
}

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

export const paletteVar = (color: PaletteColor) => `--catch-palette-${kebab(color)}`;
export const groundVar = (ground: Ground, role: GroundRole) => `--catch-ground-${ground}-${kebab(role)}`;
export const formatVar = (format: Format, role: (typeof formatRoles)[number]) =>
  `--catch-format-${kebab(format)}-${kebab(role)}`;

/**
 * The palette colours each ground is meant to carry as text. Every pair must
 * clear the WCAG AA floor for body text (--catch-accessibility-minimum-text-contrast).
 */
export function groundTextColors(ground: Ground): readonly PaletteColor[] {
  switch (ground) {
    case "white":
    case "paper":
      return ["ink", "inkSecondary", ...paletteAccents.map((accent) => `${accent}Deep` as const)];
    case "ink":
      return ["nightInk", "nightSecondary", ...paletteAccents];
    default:
      return ["ink", `${ground}Ink`];
  }
}

/** Text on the night surface, which sits on the ink ground. */
export const nightSurfaceTextColors: readonly PaletteColor[] = ["nightInk", "nightSecondary", ...paletteAccents];

function relativeLuminance(hex: string) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const channel = (shift: number) => {
    const srgb = ((value >> shift) & 0xff) / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}

/** WCAG 2 contrast ratio of two opaque #RRGGBB colours. */
export function contrastRatio(first: string, second: string) {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
