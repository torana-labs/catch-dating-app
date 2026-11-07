"use client";

import type {HTMLAttributes} from "react";
import type {CatchFormat} from "./catchCoreVocabulary";
import {useCatch} from "./catchRootContext";
import {CatchIcon} from "./CatchIcon";
import styles from "./CatchMarker.module.css";

/** dot: status or format. ring: a step not reached. check: done. number: a numbered step. */
export const catchMarkerKinds = ["dot", "ring", "check", "number"] as const;
export type CatchMarkerKind = (typeof catchMarkerKinds)[number];

export const catchMarkerTones = ["ink", "muted", "success", "warning", "danger", "info", "format"] as const;
export type CatchMarkerTone = (typeof catchMarkerTones)[number];

/** Dot and ring sizes in pixels; checks and numbers are 20. */
export const catchMarkerSizes = [8, 10, 12] as const;
export type CatchMarkerSize = (typeof catchMarkerSizes)[number];

export interface CatchMarkerProps extends HTMLAttributes<HTMLSpanElement> {
  kind?: CatchMarkerKind;
  size?: CatchMarkerSize;
  tone?: CatchMarkerTone;
  /** The format a `format` tone takes; defaults to the surrounding format, then run. */
  format?: CatchFormat;
  /** Pulses: the step happening now, a live session. Still under reduced motion. */
  live?: boolean;
  /** The number a `number` marker shows. */
  value?: number;
}

/**
 * catch.marker: dots, rings, checks and numbers for status lights, timeline
 * steps, legend keys and page dots. Decorative: the row or label beside it
 * carries the meaning.
 */
export function CatchMarker({kind = "dot", size = 10, tone = "ink", format, live, value, className, ...rest}: CatchMarkerProps) {
  const {format: scoped, ground} = useCatch();
  return (
    <span
      aria-hidden="true"
      className={className ? `${styles.marker} ${className}` : styles.marker}
      data-format={tone === "format" ? format ?? scoped ?? "run" : undefined}
      data-kind={kind}
      data-live={live ? "" : undefined}
      data-on={ground}
      data-size={size}
      data-tone={tone}
      {...rest}
    >
      {kind === "check" ? <CatchIcon name="check" size={16} /> : null}
      {kind === "number" ? value : null}
    </span>
  );
}
