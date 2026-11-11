"use client";

import type {HTMLAttributes} from "react";
import {catchTextRoleFor, type CatchTextTone, type CatchTextVariant} from "./catchCoreVocabulary";
import {useCatch} from "./catchRootContext";
import styles from "./CatchText.module.css";

export type CatchTextAs = "h1" | "h2" | "h3" | "p" | "span" | "label" | "div" | "strong";

/**
 * Website-only roles beyond the shared 22 variants (which are pinned to the
 * Flutter enum): display-giant, one figure carrying a band, such as the host
 * landing's "5%" (proposal L4). It is the hero face at 220px, 150px on a
 * phone-width band.
 */
export const catchWebTextVariants = ["display-giant"] as const;
export type CatchWebTextVariant = (typeof catchWebTextVariants)[number];

const isWebVariant = (variant: string): variant is CatchWebTextVariant => catchWebTextVariants.includes(variant as CatchWebTextVariant);

export interface CatchTextProps extends HTMLAttributes<HTMLElement> {
  /** The role (one of the 19 type roles, or page-title, section-title, hero). Pick a role, never a size. Defaults to body. */
  variant?: CatchTextVariant | CatchWebTextVariant;
  /** Defaults to inherit: the ink of the surface behind it. */
  tone?: CatchTextTone;
  /** The element. Defaults by role: page-title and hero are h1, section-title h2, the rest spans. */
  as?: CatchTextAs;
  align?: "start" | "center" | "end";
  /** Clamp to this many lines with an ellipsis. */
  maxLines?: number;
  /** Tabular figures, for scores, prices and times that change. */
  numeric?: boolean;
  htmlFor?: string;
}

function defaultElement(variant: CatchTextVariant | CatchWebTextVariant): CatchTextAs {
  if (variant === "page-title" || variant === "hero") return "h1";
  if (variant === "section-title") return "h2";
  return "span";
}

/**
 * catch.text: every piece of text, in a role. The role carries size, line
 * height, weight, tracking and family; the responsive roles resolve through
 * the size class. Colour comes from what the text sits on unless a tone is
 * given.
 */
export function CatchText({
  variant = "body",
  tone = "inherit",
  as,
  align,
  maxLines,
  numeric,
  className,
  style,
  children,
  ...rest
}: CatchTextProps) {
  const {sizeClass} = useCatch();
  const role = isWebVariant(variant) ? variant : catchTextRoleFor(variant, sizeClass);
  const clamp = maxLines !== undefined && maxLines > 0 ? maxLines : undefined;
  const Element = as ?? defaultElement(variant);
  return (
    <Element
      {...rest}
      className={className ? `${styles.text} ${className}` : styles.text}
      data-align={align}
      data-clamp={clamp === undefined ? undefined : ""}
      data-numeric={numeric ? "" : undefined}
      data-tone={tone}
      data-variant={role}
      style={clamp === undefined ? style : {...style, WebkitLineClamp: clamp}}
    >
      {children}
    </Element>
  );
}
