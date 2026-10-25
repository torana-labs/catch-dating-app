"use client";

import type {CSSProperties, ReactNode} from "react";
import {CatchText} from "./CatchText";
import styles from "./CatchChip.module.css";

const activities = ["social-run", "running", "walking", "pickleball", "padel", "tennis",
  "badminton", "cycling", "spin-class", "yoga", "strength-training", "dinner", "pub-quiz",
  "bar-crawl", "singles-mixer", "open-activity"] as const;
type ActivityAccent = typeof activities[number];
export type CatchChipMode = "single" | "multiple";
export type CatchChipEmphasis = "soft" | "solid";
/** Pigments derive from the named activity token; raw deep/soft colours are native-only. */
export interface CatchChipData {label: string; icon: ReactNode; accent: ActivityAccent}
interface LabelProps {label: string; leading?: ReactNode; semanticsLabel?: string}
export type CatchChipProps =
  | (LabelProps & {recipe: "tag"})
  | (LabelProps & {recipe: "selectable"; selected: boolean; onChanged: (selected: boolean) => void;
      enabled?: boolean; accent?: ActivityAccent})
  | (Omit<LabelProps, "leading"> & {recipe: "choice"; selected: boolean; mode: CatchChipMode;
      onPressed: (() => void) | null; accent?: ActivityAccent})
  | {recipe: "activity"; data: CatchChipData; emphasis?: CatchChipEmphasis; label?: string;
      onTap?: () => void; enabled?: boolean; semanticsLabel?: string}
  | (LabelProps & {recipe: "removable"; onRemove: () => void; enabled?: boolean});

const check = <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>;
const close = <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="m6 6 12 12m0-12L6 18" /></svg>;
// Flutter ThemeData.estimateBrightnessForColor applied to the current generated
// dark activity accents. chipParity.test.ts recomputes this from the token source.
const darkInkActivities = new Set<ActivityAccent>(["walking", "pickleball", "padel"]);

function pigments(accent: ActivityAccent | undefined): CSSProperties | undefined {
  if (accent === undefined) return undefined;
  if (!(activities as readonly string[]).includes(accent)) throw new TypeError("CatchChip accent must name an activity token");
  const token = `--catch-activity-${accent}`;
  return {
    "--catch-chip-activity-accent": `var(${token}-accent)`,
    "--catch-chip-activity-accent-dark": `var(${token}-accent-dark)`,
    "--catch-chip-activity-deep": `var(${token}-deep)`,
    "--catch-chip-activity-soft": `var(${token}-soft)`,
    "--catch-chip-activity-soft-dark": `var(${token}-soft-dark)`,
    "--catch-chip-activity-ink": "#FFFFFF",
    "--catch-chip-activity-ink-dark": darkInkActivities.has(accent) ? "#000000" : "#FFFFFF",
  } as CSSProperties;
}

/** Five Flutter constructors, with selection and domain callbacks owned by the caller. */
export function CatchChip(props: CatchChipProps) {
  const activity = props.recipe === "activity" ? props.data : undefined;
  const label = props.recipe === "activity" ? props.label ?? props.data.label : props.label;
  const selected = (props.recipe === "selectable" || props.recipe === "choice") && props.selected;
  const enabled = props.recipe === "choice" ? props.onPressed != null : "enabled" in props ? props.enabled !== false : true;
  const accent = activity?.accent ?? ("accent" in props ? props.accent : undefined);
  const control = props.recipe !== "tag" && (props.recipe !== "activity" || props.onTap !== undefined);
  let action: (() => void) | undefined;
  switch (props.recipe) {
    case "selectable": action = () => props.onChanged(!props.selected); break;
    case "choice": action = props.onPressed ?? undefined; break;
    case "activity": action = props.onTap; break;
    case "removable": action = props.onRemove; break;
  }
  const checkedChoice = props.recipe === "choice";
  const leading = props.recipe === "choice"
    ? props.mode === "multiple" && selected ? check : undefined
    : activity?.icon ?? ("leading" in props ? props.leading : undefined);
  const attributes = {
    className: `${styles.chip}${control ? ` ${styles.control}` : ""}`,
    "data-recipe": props.recipe,
    "data-selected": selected || undefined,
    "data-disabled": control && !enabled || undefined,
    "data-emphasis": props.recipe === "activity" ? props.emphasis ?? "soft" : undefined,
    style: pigments(accent),
  };
  const contents = <span className={styles.surface}>
    {leading ? <span className={styles.icon} data-check={checkedChoice || undefined} aria-hidden="true">{leading}</span> : null}
    <CatchText as="span" variant={activity ? "bodyLead" : "titleS"} color="inherit">{label}</CatchText>
    {props.recipe === "removable" ? <span className={styles.icon} aria-hidden="true">{close}</span> : null}
  </span>;
  const semanticLabel = props.semanticsLabel ?? (props.recipe === "removable" ? `Delete: ${label}` : label);
  return control ? (
    <button {...attributes} type="button" disabled={!enabled} onClick={action}
      aria-label={semanticLabel}
      aria-pressed={props.recipe === "selectable" ? selected : undefined}
      role={checkedChoice ? props.mode === "single" ? "radio" : "checkbox" : undefined}
      aria-checked={checkedChoice ? selected : undefined}>
      {contents}
    </button>
  ) : <span {...attributes}>
    {props.semanticsLabel ? <span className={styles.semanticLabel}>{props.semanticsLabel}</span> : null}
    <span aria-hidden={props.semanticsLabel ? true : undefined}>{contents}</span>
  </span>;
}
