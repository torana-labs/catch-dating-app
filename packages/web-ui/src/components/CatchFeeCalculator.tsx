"use client";

import type {HTMLAttributes} from "react";
import {CatchRangeInput} from "./CatchRangeInput";
import {CatchText} from "./CatchText";
import styles from "./CatchFeeCalculator.module.css";

/** One result tile under the slider: what it is, the figure and what the figure is of. Resolved copy. */
export interface CatchFeeCalculatorTile {
  label: string;
  value: string;
  note?: string;
}

export interface CatchFeeCalculatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "color" | "onChange" | "style"> {
  /** What the slider sets, shown over the figure and read as the slider's name. */
  label: string;
  /** The slider's value as the page formats it, such as "₹1,20,000". */
  valueText: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** The slider's new value; the page owns the state and works the figures out. */
  onChange: (value: number) => void;
  /** The slider's ends as the page formats them. */
  minLabel: string;
  maxLabel: string;
  /** The worked-out figures, two across (one column on phones). */
  tiles: readonly CatchFeeCalculatorTile[];
  /** A line under the tiles that says what the figures mean now, such as that the cap is reached. */
  status?: string;
  /** Fine print at the foot, such as the trial and gateway lines. */
  fine?: readonly string[];
}

/**
 * The pricing calculator (the canvas's .calc2, playbook-panels.css): the
 * slider's figure in the display face, the slider in coral with its two ends,
 * the worked-out figures as translucent tiles, a status line in mint and the
 * fine print. Presentational: the page passes the value and works out every
 * figure, so its state and its price model stay in the page. It sits in the
 * second column of an ink fee band (CatchFeeSection).
 */
export function CatchFeeCalculator({label, valueText, value, min, max, step, onChange, minLabel, maxLabel, tiles, status, fine, ...rest}: CatchFeeCalculatorProps) {
  return (
    <div className={styles.calculator} {...rest}>
      <CatchText as="p" className={styles.label} variant="body-meta">{label}</CatchText>
      <CatchText aria-live="polite" as="p" className={styles.value} numeric variant="display-lg">{valueText}</CatchText>
      <CatchRangeInput className={styles.range} label={label} max={max} min={min} onChange={(next) => onChange(Array.isArray(next) ? next[next.length - 1] : next as number)} step={step} value={value} />
      <div aria-hidden="true" className={styles.scale}>
        <CatchText as="span" className={styles.end} variant="body-meta">{minLabel}</CatchText>
        <CatchText as="span" className={styles.end} variant="body-meta">{maxLabel}</CatchText>
      </div>
      <ul className={styles.tiles}>
        {tiles.map((tile) => (
          <li className={styles.tile} key={tile.label}>
            <CatchText as="span" className={styles.tileLabel} variant="body-meta">{tile.label}</CatchText>
            <CatchText aria-live="polite" as="span" className={styles.tileValue} numeric variant="display-title">{tile.value}</CatchText>
            {tile.note ? <CatchText as="span" className={styles.tileNote} variant="body-meta">{tile.note}</CatchText> : null}
          </li>
        ))}
      </ul>
      <CatchText aria-live="polite" as="p" className={styles.status} role="status" variant="label-action">{status ?? ""}</CatchText>
      {fine?.map((line) => <CatchText as="p" className={styles.fine} key={line} variant="body-meta">{line}</CatchText>)}
    </div>
  );
}
