"use client";

import {useState, type CSSProperties, type ReactNode} from "react";
import type {Ground} from "./palette";
import styles from "./CatchAvatar.module.css";

/** Flutter `CatchAvatarStatus`. */
export type CatchAvatarStatus = "none" | "online";
/** Flutter `CatchAvatarVariant`. */
export type CatchAvatarVariant = "circle" | "square";

/** Flutter `CatchAvatarColors`: a caller-resolved pigment with its deep and soft tints. */
export interface CatchAvatarColors {
  accent: string;
  deep: string;
  soft: string;
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

/** `CatchAvatar.monogram`: initials on a palette ground. */
export interface CatchAvatarMonogramProps extends CatchAvatarFrame {
  ground: Ground;
  initials?: string;
  name?: string;
  recipe: "monogram";
  variant?: CatchAvatarVariant;
}

export type CatchAvatarProps =
  | CatchAvatarDefaultProps
  | CatchAvatarCountProps
  | CatchAvatarVeiledProps
  | CatchAvatarMonogramProps;

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
 * optional ring and online dot, plus the count, veiled and monogram recipes.
 * Avatars are decorative: the name beside them carries the identity. Initials
 * are drawn from CSS so they stay out of the visible text of a control an
 * avatar sits in, which must match that control's name (axe-core 4.14).
 */
export function CatchAvatar(props: CatchAvatarProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const borderWidth = props.borderWidth ?? 0;
  const variant = props.recipe === undefined || props.recipe === "default" || props.recipe === "monogram"
    ? props.variant ?? "circle"
    : "circle";
  const frame = {
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
    <span aria-hidden="true" className={styles.avatar} data-recipe={props.recipe ?? "default"} style={frame}>
      <span className={styles.viewport} data-obscured={obscure || undefined} data-variant={variant}>
        {surface}
      </span>
      {status === "online" ? <span className={styles.status} /> : null}
    </span>
  );
}
