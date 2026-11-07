"use client";

import type {CSSProperties, HTMLAttributes} from "react";
import type {CatchFormat} from "./catchCoreVocabulary";
import {useCatch} from "./catchRootContext";
import {CatchText} from "./CatchText";
import styles from "./CatchMeter.module.css";

/** progress: a bar. cap: a bar with a limit mark. segments: equal steps. stack: shares of a whole with a legend. */
export const catchMeterKinds = ["progress", "cap", "segments", "stack"] as const;
export type CatchMeterKind = (typeof catchMeterKinds)[number];

export const catchMeterThicknesses = [4, 6, 8] as const;
export type CatchMeterThickness = (typeof catchMeterThicknesses)[number];

export const catchMeterFills = ["ink", "format", "success", "warning", "danger"] as const;
export type CatchMeterFill = (typeof catchMeterFills)[number];

/** One share of a stack meter. */
export interface CatchMeterPart {
  label: string;
  value: number;
  fill?: "ink" | "muted" | "indigo" | CatchFormat;
}

export interface CatchMeterProps extends HTMLAttributes<HTMLDivElement> {
  /** 0 to max. */
  value: number;
  /** Defaults to 100; for segments, the number of steps. */
  max?: number;
  kind?: CatchMeterKind;
  /** stack: the parts, in order. */
  parts?: readonly CatchMeterPart[];
  thickness?: CatchMeterThickness;
  fill?: CatchMeterFill;
  /** The format a `format` fill takes; defaults to the surrounding format, then run. */
  format?: CatchFormat;
  /** Read aloud, and shown above the bar with showLabel. */
  label: string;
  showLabel?: boolean;
  /** cap: where the limit sits, 0 to max. */
  limit?: number;
}

function share(part: CatchMeterPart, parts: readonly CatchMeterPart[]) {
  const total = parts.reduce((sum, item) => sum + item.value, 0);
  return total > 0 ? Math.round((part.value / total) * 100) : 0;
}

const partFormat = (fill: CatchMeterPart["fill"]) => fill && fill !== "ink" && fill !== "muted" ? fill : undefined;

/**
 * catch.meter: progress, caps and steps on a rounded track. The track takes
 * its colour from what the meter sits on; the fill eases when the value
 * changes. Absorbs CatchBarIndicator's single bar.
 */
export function CatchMeter({value, max = 100, kind = "progress", parts, thickness = 6, fill = "ink", format, label, showLabel, limit, className, ...rest}: CatchMeterProps) {
  const {format: scoped, ground} = useCatch();
  const fraction = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div
      className={className ? `${styles.meter} ${className}` : styles.meter}
      data-fill={fill}
      data-format={fill === "format" ? format ?? scoped ?? "run" : undefined}
      data-kind={kind}
      data-on={ground}
      data-thickness={thickness}
      {...rest}
    >
      {showLabel ? <CatchText tone="secondary" variant="label-kicker">{label}</CatchText> : null}
      {kind === "stack" && parts ? (
        <>
          <span aria-label={`${label}: ${parts.map((part) => `${part.label} ${share(part, parts)}%`).join(", ")}`} className={styles.stack} role="img">
            {parts.map((part) => (
              <span className={styles.part} data-fill={part.fill ?? "ink"} data-format={partFormat(part.fill)} key={part.label} style={{flexGrow: part.value}} />
            ))}
          </span>
          <span className={styles.legend}>
            {parts.map((part) => (
              <span key={part.label}>
                <span className={styles.key} data-fill={part.fill ?? "ink"} data-format={partFormat(part.fill)} />
                {part.label} · {share(part, parts)}%
              </span>
            ))}
          </span>
        </>
      ) : kind === "segments" ? (
        <span aria-label={label} aria-valuemax={max} aria-valuemin={0} aria-valuenow={value} className={styles.segments} role="progressbar">
          {Array.from({length: Math.max(0, Math.round(max))}, (_, index) => (
            <span className={styles.segment} data-done={index < value ? "" : undefined} key={index} />
          ))}
        </span>
      ) : (
        <span aria-label={label} aria-valuemax={max} aria-valuemin={0} aria-valuenow={value} className={styles.track} role="progressbar">
          <span className={styles.bar} style={{width: `${fraction * 100}%`}} />
          {kind === "cap" && limit != null && max > 0
            ? <span className={styles.limit} style={{left: `${(limit / max) * 100}%`} as CSSProperties} />
            : null}
        </span>
      )}
    </div>
  );
}
