"use client";

import {useEffect, useRef, type PointerEvent} from "react";
import styles from "./CatchStepper.module.css";

interface CatchStepperBase {
  /** Accessible name of the minus control, such as "One fewer place". */
  decreaseSemanticLabel: string;
  enabled?: boolean;
  /** Accessible name of the plus control, such as "One more place". */
  increaseSemanticLabel: string;
  /** Web only: the id of visible text that names the stepper as a group. */
  labelledBy?: string;
  /** Shown after the number, such as "km". */
  unit?: string;
  value: number;
  /** Formats the value instead of the default number text. */
  valueLabelBuilder?: (value: number) => string;
}

/**
 * Flutter's `CatchStepper` clamps each step to `min` and `max`;
 * `CatchStepper.actions` (`recipe: "actions"`) hands each direction to the
 * caller, and a missing callback disables that direction.
 */
export type CatchStepperProps = CatchStepperBase & (
  | {
    max?: number;
    min?: number;
    onChanged?: (value: number) => void;
    onDecrease?: never;
    onIncrease?: never;
    recipe?: "bounded";
    step?: number;
  }
  | {
    max?: never;
    min?: never;
    onChanged?: never;
    onDecrease?: () => void;
    onIncrease?: () => void;
    recipe: "actions";
    step?: never;
  }
);

// Flutter CatchFieldTokens: the first repeat waits 400ms, then steps every
// 110ms, and every 55ms after ten repeats.
const repeatDelayMs = 400;
const repeatNormalMs = 110;
const repeatAcceleratedMs = 55;
const repeatAccelerationTicks = 10;

const decimalPlaces = (value: number) => {
  const [mantissa, exponent = "0"] = value.toString().toLowerCase().split("e");
  const point = mantissa.indexOf(".");
  return Math.max(0, (point < 0 ? 0 : mantissa.length - point - 1) - Number(exponent));
};

/** Adds `delta` at the precision of value and step, then clamps, as Flutter does. */
export function stepperNextValue(value: number, delta: number, min?: number, max?: number) {
  const places = Math.max(decimalPlaces(value), decimalPlaces(delta));
  let next = places > 0 && places <= 20 ? Number((value + delta).toFixed(places)) : value + delta;
  if (min !== undefined && next < min) next = min;
  if (max !== undefined && next > max) next = max;
  return next;
}

function RepeatButton({direction, label, onStep}: {direction: "decrease" | "increase"; label: string; onStep?: () => void}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(onStep);
  latest.current = onStep;
  const enabled = onStep !== undefined;

  const stop = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
  };
  // A bound reached mid-hold disables the button, which then never sees the pointer leave.
  useEffect(() => {
    if (!enabled) stop();
  }, [enabled]);
  useEffect(() => stop, []);

  const start = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !latest.current) return;
    stop();
    latest.current();
    let ticks = 0;
    const repeat = () => {
      if (!latest.current) return stop();
      latest.current();
      ticks += 1;
      timer.current = setTimeout(repeat, ticks > repeatAccelerationTicks ? repeatAcceleratedMs : repeatNormalMs);
    };
    timer.current = setTimeout(repeat, repeatDelayMs);
  };

  return (
    <button
      aria-label={label}
      className={styles.button}
      disabled={!enabled}
      // Pointer presses step on press and repeat while held; a keyboard click
      // (detail 0) steps once.
      onClick={(event) => event.detail === 0 && latest.current?.()}
      onPointerCancel={stop}
      onPointerDown={start}
      onPointerLeave={stop}
      onPointerUp={stop}
      title={label}
      type="button"
    >
      <span aria-hidden="true" className={styles.visual}>
        <svg focusable="false" viewBox="0 0 24 24">
          <path d={direction === "decrease" ? "M5 12h14" : "M5 12h14M12 5v14"} />
        </svg>
      </span>
    </button>
  );
}

/**
 * A number between minus and plus controls that repeat while held. Callers own
 * the copy, the limits and what a change means.
 */
export function CatchStepper(props: CatchStepperProps) {
  const {decreaseSemanticLabel, enabled = true, increaseSemanticLabel, labelledBy, unit, value, valueLabelBuilder} = props;
  let decrease: (() => void) | undefined;
  let increase: (() => void) | undefined;
  if (enabled && props.recipe === "actions") {
    decrease = props.onDecrease;
    increase = props.onIncrease;
  } else if (enabled && props.recipe !== "actions" && props.onChanged) {
    const {max, min, onChanged, step = 1} = props;
    if (min === undefined || value > min) decrease = () => onChanged(stepperNextValue(value, -step, min, max));
    if (max === undefined || value < max) increase = () => onChanged(stepperNextValue(value, step, min, max));
  }
  const number = valueLabelBuilder?.(value) ?? String(value);
  return (
    <div aria-labelledby={labelledBy} className={styles.stepper} role={labelledBy ? "group" : undefined}>
      <RepeatButton direction="decrease" label={decreaseSemanticLabel} onStep={decrease} />
      <span aria-live="polite" className={styles.value}>{unit ? `${number} ${unit}` : number}</span>
      <RepeatButton direction="increase" label={increaseSemanticLabel} onStep={increase} />
    </div>
  );
}
