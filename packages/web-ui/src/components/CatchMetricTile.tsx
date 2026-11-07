"use client";

import type {HTMLAttributes, ReactNode} from "react";
import {CatchMeter} from "./CatchMeter";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import styles from "./CatchMetricTile.module.css";

/** tile: a grey block. inline: no box, for strips and spotlights. fact: a small tile whose value is words. */
export const catchMetricTileLayouts = ["tile", "inline", "fact"] as const;
export type CatchMetricTileLayout = (typeof catchMetricTileLayouts)[number];

export const catchMetricTileTones = ["secondary", "success", "warning", "danger"] as const;
export type CatchMetricTileTone = (typeof catchMetricTileTones)[number];

export interface CatchMetricTileProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  noteTone?: CatchMetricTileTone;
  layout?: CatchMetricTileLayout;
  /** A thin meter under the value. */
  meter?: {value: number; max?: number; label: string};
}

/**
 * The system Stat (catch.metric_strip's stat tile, Flutter's
 * CatchMetricTile.stat): a number with a label. A tile stands on its own and
 * is 118px tall at least, so a row of them lines up; inline sits in
 * spotlights and strips with the value above the label; a fact is a small
 * tile whose value is words.
 */
export function CatchMetricTile({label, value, note, noteTone = "secondary", layout = "tile", meter, className, ...rest}: CatchMetricTileProps) {
  const inner = (
    <>
      <CatchText className={styles.label} tone={layout === "inline" ? "inherit" : "secondary"} variant="label-kicker">{label}</CatchText>
      <CatchText className={styles.value} numeric={layout !== "fact"} variant={layout === "fact" ? "title-row" : layout === "tile" ? "display-title" : "display-section"}>{value}</CatchText>
      {meter ? <CatchMeter label={meter.label} max={meter.max ?? 100} thickness={4} value={meter.value} /> : null}
      {note ? <CatchText className={styles.note} tone={noteTone} variant={layout === "fact" ? "body-meta" : "label-kicker"}>{note}</CatchText> : null}
    </>
  );
  const classes = className ? `${styles.stat} ${className}` : styles.stat;
  if (layout === "inline") return <div className={classes} data-layout="inline" {...rest}>{inner}</div>;
  return <CatchSurface className={classes} data-layout={layout} padding={layout === "fact" ? "sm" : undefined} {...rest}>{inner}</CatchSurface>;
}
