"use client";

import {useState, type HTMLAttributes} from "react";
import {useCatch} from "./catchRootContext";
import styles from "./CatchRangeInput.module.css";

/** One number, or [low, high] for a range. */
export type CatchRangeInputValue = number | readonly [number, number];

export interface CatchRangeInputProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  min?: number;
  max?: number;
  step?: number;
  /** Controlled value; leave it out to let the slider keep its own. */
  value?: CatchRangeInputValue;
  defaultValue?: CatchRangeInputValue;
  onChange?: (value: CatchRangeInputValue) => void;
  /** Read aloud; a range reads "lowest" and "highest" after it. */
  label: string;
}

/**
 * catch.range_slider on the web, the system's Slider: one value or a range
 * on a pill track, with native range inputs underneath, so the arrow keys
 * move a thumb by one step and screen readers announce each value.
 */
export function CatchRangeInput({min = 0, max = 100, step = 1, value, defaultValue = 50, onChange, label, className, ...rest}: CatchRangeInputProps) {
  const {ground} = useCatch();
  const [inner, setInner] = useState<CatchRangeInputValue>(defaultValue);
  const current = value ?? inner;
  const range = Array.isArray(current);
  const [low, high] = range ? (current as readonly [number, number]) : [min, current as number];
  const span = max - min || 1;
  const at = (n: number) => `${((n - min) / span) * 100}%`;
  const set = (next: CatchRangeInputValue) => {
    setInner(next);
    onChange?.(next);
  };
  return (
    <div className={className ? `${styles.slider} ${className}` : styles.slider} data-on={ground} data-range={range ? "" : undefined} {...rest}>
      <span aria-hidden="true" className={styles.track}>
        <span className={styles.fill} style={{left: at(low), width: `calc(${at(high)} - ${at(low)})`}} />
      </span>
      {range ? (
        <input aria-label={`${label}, lowest`} className={styles.input} max={max} min={min} step={step} type="range" value={low}
          onChange={(event) => set([Math.min(Number(event.target.value), high - step), high])} />
      ) : null}
      <input aria-label={range ? `${label}, highest` : label} className={styles.input} max={max} min={min} step={step} type="range" value={high}
        onChange={(event) => set(range ? [low, Math.max(Number(event.target.value), low + step)] : Number(event.target.value))} />
    </div>
  );
}
