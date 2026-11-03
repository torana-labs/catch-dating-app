import type {Format} from "./palette";

/**
 * The shared vocabulary of the core library (redesign P2.1): every name the
 * system's Root, Surface, Text, Icon and Stack take, as readonly tuples and the
 * types derived from them, the way palette.ts lists its tokens. Flutter's
 * catch_ui carries the same names (camelCase where Dart needs it), and the
 * cross-framework parity test pins the two, so a name changes in both or in
 * neither.
 */

/** Day screens are white; night is for the door, the live console and staff screens. */
export const catchThemeModes = ["day", "night"] as const;
export type CatchThemeMode = (typeof catchThemeModes)[number];

/** Under 600, 600 to 839, and 840 up: the window size classes of the token sheet. */
export const catchSizeClasses = ["compact", "medium", "expanded"] as const;
export type CatchSizeClass = (typeof catchSizeClasses)[number];

/** The width at which each size class starts (--catch-window-size-*-min-width). */
export const catchSizeClassMinWidths = {compact: 0, medium: 600, expanded: 840} as const satisfies Record<CatchSizeClass, number>;

/** The size class of a width in CSS pixels. */
export function catchSizeClassForWidth(width: number): CatchSizeClass {
  return width >= catchSizeClassMinWidths.expanded ? "expanded" : width >= catchSizeClassMinWidths.medium ? "medium" : "compact";
}

/**
 * Event formats: the keys of palette.ts's formatAccents, in its order (the
 * vocabulary test pins the two). The token sheet spells nightsOut
 * `nights-out`; catchFormatTokenName maps one to the other.
 */
export const catchFormats = ["run", "dinner", "games", "courts", "nightsOut"] as const satisfies readonly Format[];
export type CatchFormat = Format;

/** The token sheet's spelling of a format (`--catch-format-<name>-*`). */
export function catchFormatTokenName(format: CatchFormat): string {
  return format.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/** app: the apps and the website. quiet: Admin, the quietest register. */
export const catchRegisters = ["app", "quiet"] as const;
export type CatchRegister = (typeof catchRegisters)[number];

/** What a component sits on. Components read it to pick their own fill, outline and ink. */
export const catchGrounds = ["ground", "tile", "nested", "colour", "night", "night-tile"] as const;
export type CatchGround = (typeof catchGrounds)[number];

/** Whether a ground is one of the two night grounds. */
export function catchGroundIsNight(ground: CatchGround): boolean {
  return ground === "night" || ground === "night-tile";
}

/** plain: no box. tile: the grey block. spotlight: one per screen. floating: white with a shadow. band: a web page section. */
export const catchSurfaceBlocks = ["plain", "tile", "spotlight", "floating", "band"] as const;
export type CatchSurfaceBlock = (typeof catchSurfaceBlocks)[number];

/** A spotlight's or a band's colour: a format, ink (night) or, for bands, tile. */
export const catchSurfaceColors = [...catchFormats, "ink", "tile"] as const;
export type CatchSurfaceColor = (typeof catchSurfaceColors)[number];

export const catchSurfacePaddings = ["none", "sm", "md", "lg"] as const;
export type CatchSurfacePadding = (typeof catchSurfacePaddings)[number];
/** Each padding step in pixels (the --catch-space-* variable it reads). */
export const catchSurfacePaddingPixels = {none: 0, sm: 12, md: 16, lg: 20} as const satisfies Record<CatchSurfacePadding, number>;

/** The 19 type roles, in the order of the token source (GeneratedCatchTypeRoleTokens). */
export const catchTextRoles = [
  "display-hero",
  "display-xl",
  "display-lg",
  "display-title",
  "display-section",
  "display-sm",
  "display-xs",
  "body-lead",
  "body-input",
  "body",
  "body-small",
  "body-meta",
  "title-bar",
  "title-row",
  "label-button",
  "label-action",
  "label-kicker",
  "label-badge",
  "label-code",
] as const;
export type CatchTextRole = (typeof catchTextRoles)[number];

/** Roles that change size with the size class; each resolves to one of the 19. */
export const catchTextResponsiveVariants = ["page-title", "section-title", "hero"] as const;
export type CatchTextResponsiveVariant = (typeof catchTextResponsiveVariants)[number];

/** The system's table: the role each responsive variant takes at each size class. */
export const catchTextResponsiveRoles = {
  "page-title": {compact: "display-title", medium: "display-section", expanded: "display-section"},
  "section-title": {compact: "display-sm", medium: "display-sm", expanded: "display-section"},
  hero: {compact: "display-lg", medium: "display-xl", expanded: "display-hero"},
} as const satisfies Record<CatchTextResponsiveVariant, Record<CatchSizeClass, CatchTextRole>>;

export const catchTextVariants = [...catchTextRoles, ...catchTextResponsiveVariants] as const;
export type CatchTextVariant = (typeof catchTextVariants)[number];

/** The role a variant draws in at a size class. */
export function catchTextRoleFor(variant: CatchTextVariant, sizeClass: CatchSizeClass): CatchTextRole {
  return variant in catchTextResponsiveRoles
    ? catchTextResponsiveRoles[variant as CatchTextResponsiveVariant][sizeClass]
    : (variant as CatchTextRole);
}

export const catchTextTones = ["inherit", "primary", "secondary", "tertiary", "success", "warning", "danger", "info"] as const;
export type CatchTextTone = (typeof catchTextTones)[number];

/** Icon sizes in pixels; 20 is the default. */
export const catchIconSizeSteps = [16, 18, 20, 24] as const;
export type CatchIconSizeStep = (typeof catchIconSizeSteps)[number];

/** Stack gaps in pixels; `section` is 28 on compact and 40 wider. */
export const catchStackGaps = [0, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64, "section"] as const;
export type CatchStackGap = (typeof catchStackGaps)[number];

export const catchStackDirections = ["column", "row"] as const;
export type CatchStackDirection = (typeof catchStackDirections)[number];

export const catchStackAligns = ["start", "center", "end", "stretch", "baseline"] as const;
export type CatchStackAlign = (typeof catchStackAligns)[number];

export const catchStackJustifies = ["start", "center", "end", "between"] as const;
export type CatchStackJustify = (typeof catchStackJustifies)[number];
