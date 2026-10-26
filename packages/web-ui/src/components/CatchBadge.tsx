import type {CSSProperties, ReactNode} from "react";
import styles from "./CatchBadge.module.css";

/** Flutter `CatchBadgeTone`. */
export type CatchBadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "gold" | "affinity";

/** Flutter `CatchBadgeSize`. */
export type CatchBadgeSize = "sm" | "md" | "action";

/** Flutter `CatchBadgeEmphasis`, for the ticket-status recipe. */
export type CatchBadgeEmphasis = "soft" | "strong";

/**
 * Flutter `CatchBadge`'s named constructors; `standard` is the default
 * constructor. Each fixes its own treatment, as in Flutter.
 */
export type CatchBadgeRecipe =
  | "standard"
  | "functional"
  | "solid"
  | "solidStatus"
  | "live"
  | "onDark"
  | "onDarkStatus"
  | "privacy"
  | "status"
  | "ticketStatus"
  | "optional";

export interface CatchBadgeProps {
  /** Resolved copy; functional recipes render it in uppercase. */
  label: string;
  recipe?: CatchBadgeRecipe;
  /** standard, functional and status recipes. */
  tone?: CatchBadgeTone;
  /** standard, functional, solid, solidStatus and live recipes. */
  size?: CatchBadgeSize;
  /** A leading glyph; decorative, so the label carries the meaning. */
  icon?: ReactNode;
  /** ticketStatus: a soft pigment or the strong dark pill. */
  emphasis?: CatchBadgeEmphasis;
  /** ticketStatus: the pigment, a CSS colour such as an activity colour. */
  color?: string;
  /** optional: shows the field's validation feedback. */
  hasError?: boolean;
}

const functionalRecipes = new Set<CatchBadgeRecipe>([
  "functional", "solidStatus", "live", "onDarkStatus", "privacy", "ticketStatus",
]);

// The size each constructor fixes or defaults to in Flutter.
const fixedSize: Partial<Record<CatchBadgeRecipe, CatchBadgeSize>> = {
  onDark: "md",
  onDarkStatus: "md",
  privacy: "sm",
  status: "sm",
  ticketStatus: "sm",
  optional: "sm",
};
const defaultSize: Partial<Record<CatchBadgeRecipe, CatchBadgeSize>> = {solid: "md"};

/**
 * Compact, non-interactive metadata and status: Flutter's `CatchBadge`.
 * Status and optional badges wrap; every other recipe stays on one line and
 * ends with an ellipsis.
 */
export function CatchBadge({
  color,
  emphasis = "soft",
  hasError = false,
  icon,
  label,
  recipe = "standard",
  size,
  tone,
}: CatchBadgeProps) {
  const resolvedSize = fixedSize[recipe] ?? size ?? defaultSize[recipe] ?? "sm";
  const resolvedTone = recipe === "optional"
    ? (hasError ? "danger" : "neutral")
    : recipe === "standard" || recipe === "functional" || recipe === "status"
      ? tone ?? "neutral"
      : "neutral";
  const style = recipe === "ticketStatus" && color
    ? ({"--catch-badge-pigment": color} as CSSProperties)
    : undefined;
  return (
    <span
      className={styles.badge}
      data-emphasis={recipe === "ticketStatus" ? emphasis : undefined}
      data-functional={functionalRecipes.has(recipe) || undefined}
      data-recipe={recipe}
      data-size={resolvedSize}
      data-tone={resolvedTone}
      style={style}
    >
      {recipe === "live" ? <span aria-hidden="true" className={styles.dot} /> : null}
      {icon && recipe !== "live" ? <span aria-hidden="true" className={styles.icon}>{icon}</span> : null}
      <span className={styles.label}>{label}</span>
    </span>
  );
}
