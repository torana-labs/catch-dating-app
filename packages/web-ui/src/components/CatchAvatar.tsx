"use client";

import {useState, type CSSProperties, type ReactNode} from "react";
import type {SharedGround} from "./palette";
import styles from "./CatchAvatar.module.css";

/**
 * Flutter `CatchAvatarStatus`: the dot at the corner. `online` and `checkedIn`
 * (a guest already in, at the door) are green, `away` is yellow.
 */
export type CatchAvatarStatus = "none" | "online" | "checkedIn" | "away";
/** Flutter `CatchAvatarVariant`. */
export type CatchAvatarVariant = "circle" | "square";

/** Flutter `CatchAvatarColors`: a caller-resolved pigment with its deep and soft tints. */
export interface CatchAvatarColors {
  accent: string;
  deep: string;
  soft: string;
}

/**
 * Flutter `CatchAvatarSize`: the system diameters and the initials' type size,
 * both in px, from the size and spacing tokens. From xl up the initials take
 * the display voice.
 */
export const catchAvatarSizes = {
  xs: {extent: 24, initials: 12},
  sm: {extent: 28, initials: 12},
  md: {extent: 40, initials: 14},
  lg: {extent: 48, initials: 16},
  xl: {extent: 64, initials: 24},
  xxl: {extent: 104, initials: 40},
} as const;
export type CatchAvatarSize = keyof typeof catchAvatarSizes;

/** Flutter `CatchAvatarColor`: the fills behind system initials, in Flutter's order. */
export const catchAvatarColors = ["ink", "indigo", "run", "dinner", "games", "courts", "nightsOut"] as const;
export type CatchAvatarColor = (typeof catchAvatarColors)[number];

/** The colours `catchAvatarColorOf` picks from, in Flutter's order. */
export const catchAvatarColorPalette = ["run", "dinner", "games", "courts", "nightsOut", "indigo"] as const satisfies readonly CatchAvatarColor[];

/** Flutter `CatchAvatarColor.of`: the same name keeps the same colour everywhere. */
export function catchAvatarColorOf(name: string): CatchAvatarColor {
  const hash = [...name].reduce((h, character) => (h * 31 + (character.codePointAt(0) ?? 0)) & 0x7fffffff, 7);
  return catchAvatarColorPalette[hash % catchAvatarColorPalette.length];
}

interface CatchAvatarFrame {
  /** A ring this many px wide around the avatar. */
  borderWidth?: number;
  /** The ring's colour; defaults to transparent. */
  borderColor?: string;
  /** Outer size in px. */
  size: number;
}

/** Flutter's default `CatchAvatar`: a photo, falling back to initials. */
export interface CatchAvatarDefaultProps extends CatchAvatarFrame {
  /** Activity pigment for the initials fallback. */
  colors?: CatchAvatarColors;
  /** Darkens an activity fallback. */
  dim?: boolean;
  imageUrl?: string;
  /** Overrides the initials derived from `name`. */
  initials?: string;
  name?: string;
  /** Blurs and scrims a photo or the person's initials. */
  obscured?: boolean;
  recipe?: "default";
  status?: CatchAvatarStatus;
  variant?: CatchAvatarVariant;
}

/**
 * `CatchAvatar.system`: a photo, or initials on a palette colour (picked from
 * the name when omitted), at one of the system sizes. A square variant is an
 * organiser logo. It takes no ring.
 */
export interface CatchAvatarSystemProps {
  borderColor?: never;
  borderWidth?: never;
  color?: CatchAvatarColor;
  imageUrl?: string;
  /** Overrides the initials derived from `name`. */
  initials?: string;
  name?: string;
  recipe: "system";
  size: CatchAvatarSize;
  status?: CatchAvatarStatus;
  variant?: CatchAvatarVariant;
}

/** `CatchAvatar.count`: an overflow bubble with caller-formatted copy. */
export interface CatchAvatarCountProps extends CatchAvatarFrame {
  count: number;
  countLabelBuilder: (count: number) => string;
  recipe: "count";
}

/** `CatchAvatar.veiled`: a caller-coloured anonymous slot. */
export interface CatchAvatarVeiledProps extends CatchAvatarFrame {
  colors: CatchAvatarColors;
  recipe: "veiled";
}

/** The grounds a monogram's initials sit on: the palette grounds the apps share. */
export type CatchMonogramGround = SharedGround;

/** `CatchAvatar.monogram`: initials on a palette ground. */
export interface CatchAvatarMonogramProps extends CatchAvatarFrame {
  ground: CatchMonogramGround;
  initials?: string;
  name?: string;
  recipe: "monogram";
  variant?: CatchAvatarVariant;
}

export type CatchAvatarProps =
  | CatchAvatarDefaultProps
  | CatchAvatarCountProps
  | CatchAvatarVeiledProps
  | CatchAvatarMonogramProps
  | CatchAvatarSystemProps;

/** Flutter `catchAvatarInitialsOf`: two letters of one word, else the first letters of two. */
export function catchAvatarInitialsOf(value: string) {
  const parts = value.trim().split(/[\s\-_]+/u).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return [...parts[0]].slice(0, 2).join("").toUpperCase();
  return parts.slice(0, 2).map((part) => [...part][0]).join("").toUpperCase();
}

// Flutter CatchLayout.personAvatarInitialsScale, and D19's 24px display floor.
const personInitialsScale = 0.34;
const displayMinimumSize = 24;

// Flutter: the person tint steps toward ink2 by the name's code points mod 3.
const personTone = (name: string) => [...name].reduce((sum, character) => sum + (character.codePointAt(0) ?? 0), 0) % 3;

/**
 * Flutter's `CatchAvatar`: a photo or initials in a circle or square, with an
 * optional ring and status dot, plus the system, count, veiled and monogram
 * recipes. Avatars are decorative, as in Flutter, whose dot has no semantics:
 * the name and copy beside them carry the identity and any status, such as
 * "Checked in". Initials
 * are drawn from CSS so they stay out of the visible text of a control an
 * avatar sits in, which must match that control's name (axe-core 4.14).
 */
export function CatchAvatar(props: CatchAvatarProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const borderWidth = props.borderWidth ?? 0;
  const variant = props.recipe === "count" || props.recipe === "veiled" ? "circle" : props.variant ?? "circle";
  // A system avatar takes its extent and initials size from the tokens, in CSS.
  const frame = props.recipe === "system" ? undefined : {
    "--catch-avatar-size": `${props.size}px`,
    "--catch-avatar-inner": `${props.size - borderWidth * 2}px`,
    "--catch-avatar-ring": `${borderWidth}px`,
    ...(props.borderColor ? {"--catch-avatar-ring-color": props.borderColor} : {}),
  } as CSSProperties;

  let surface: ReactNode;
  let obscure = false;
  let status: CatchAvatarStatus = "none";
  switch (props.recipe) {
    case "count":
      surface = <span className={styles.count}>{props.countLabelBuilder(props.count)}</span>;
      break;
    case "veiled":
      surface = (
        <span className={styles.veiled} style={{"--catch-avatar-deep": props.colors.deep, "--catch-avatar-soft": props.colors.soft} as CSSProperties}>
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
      );
      break;
    case "monogram": {
      const label = props.initials ?? catchAvatarInitialsOf(props.name ?? "");
      // D19: initials of 24px and up take the display voice.
      const display = (props.size - borderWidth * 2) * personInitialsScale >= displayMinimumSize;
      surface = <span className={styles.monogram} data-display={display || undefined} data-ground={props.ground} data-initials={label} />;
      break;
    }
    case "system": {
      const label = props.initials ?? catchAvatarInitialsOf(props.name ?? "");
      const initialsSurface = (
        <span
          className={styles.system}
          data-color={props.color ?? catchAvatarColorOf(props.name ?? "")}
          data-display={catchAvatarSizes[props.size].initials >= displayMinimumSize || undefined}
          data-initials={label}
        />
      );
      const photo = props.imageUrl && failed !== props.imageUrl ? props.imageUrl : null;
      surface = photo ? <img alt="" className={styles.photo} onError={() => setFailed(photo)} src={photo} /> : initialsSurface;
      status = props.status ?? "none";
      break;
    }
    default: {
      const name = props.name ?? "";
      const label = props.initials ?? catchAvatarInitialsOf(name);
      const initialsSurface = props.colors ? (
        <span
          className={styles.activity}
          data-dim={props.dim || undefined}
          data-initials={label}
          style={{"--catch-avatar-accent": props.colors.accent, "--catch-avatar-deep": props.colors.deep} as CSSProperties}
        />
      ) : (
        <span className={styles.person} data-initials={label} style={{"--catch-avatar-tone": personTone(name)} as CSSProperties} />
      );
      const photo = props.imageUrl && failed !== props.imageUrl ? props.imageUrl : null;
      surface = photo
        ? <img alt="" className={styles.photo} onError={() => setFailed(photo)} src={photo} />
        : initialsSurface;
      obscure = (props.obscured ?? false) && (Boolean(props.imageUrl) || !props.colors);
      status = props.status ?? "none";
    }
  }

  return (
    <span
      aria-hidden="true"
      className={styles.avatar}
      data-recipe={props.recipe ?? "default"}
      data-size={props.recipe === "system" ? props.size : undefined}
      style={frame}
    >
      <span className={styles.viewport} data-obscured={obscure || undefined} data-variant={variant}>
        {surface}
      </span>
      {status === "none" ? null : <span className={styles.status} data-status={status} />}
    </span>
  );
}
