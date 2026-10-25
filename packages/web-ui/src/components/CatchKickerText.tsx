import type {CSSProperties} from "react";
import type {CatchTextColor} from "./CatchText";
import styles from "./CatchKickerText.module.css";

export type CatchKickerTextVariant = "md" | "lg" | "fieldSection";
export interface CatchKickerTextProps {
  label: string;
  color?: CatchTextColor;
  variant?: CatchKickerTextVariant;
  maxLines?: number | null;
  textAlign?: "left" | "right" | "center" | "justify" | "start" | "end";
}
/** Fixed native member API: metadata always occupies one line. */
export interface CatchMetadataTextProps {
  label: string;
  color: CatchTextColor;
  uppercase?: boolean;
}
const colors: Record<CatchTextColor, string> = {
  ink: "var(--catch-theme-ink)", ink2: "var(--catch-theme-ink2)", ink3: "var(--catch-theme-ink3)",
  primary: "var(--catch-theme-primary)", danger: "var(--catch-theme-danger)",
  positiveText: "var(--catch-theme-positive-text)", attentionText: "var(--catch-theme-attention-text)",
  inherit: "inherit",
};
function roleColor(color: CatchTextColor) {
  if (!Object.hasOwn(colors, color)) throw new TypeError("Typography color must name a theme role");
  return colors[color];
}
/** Uppercase editorial eyebrow; the caller retains the full label and alignment. */
export function CatchKickerText({label, color, variant = "md", maxLines = 1, textAlign}: CatchKickerTextProps) {
  if (maxLines !== null && (!Number.isInteger(maxLines) || maxLines < 1)) {
    throw new RangeError("CatchKickerText maxLines must be a positive integer or null");
  }
  return <span className={`${styles.atom} ${styles.kicker}`} data-variant={variant}
    data-clamped={maxLines === null ? undefined : ""}
    style={{color: color === undefined ? undefined : roleColor(color), textAlign,
      ...(maxLines === null ? {} : {"--catch-kicker-lines": maxLines})} as CSSProperties}>
    {label.toUpperCase()}
  </span>;
}
/** Sentence-case factual metadata, with only the existing optional uppercase recipe. */
export function CatchMetadataText({label, color, uppercase = false}: CatchMetadataTextProps) {
  return <span className={`${styles.atom} ${styles.metadata}`} data-uppercase={uppercase || undefined}
    style={{color: roleColor(color)}}>{uppercase ? label.toUpperCase() : label}</span>;
}
