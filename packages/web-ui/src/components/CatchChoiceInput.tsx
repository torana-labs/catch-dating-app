"use client";

import {type CSSProperties, type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState} from "react";
import {CatchChip, type CatchChipData, type CatchChipMode} from "./CatchChip";
import {CatchChoiceTile} from "./CatchChoiceTile";
import {CatchText} from "./CatchText";
import styles from "./CatchChoiceInput.module.css";

export type CatchChoiceInputVariant = "label" | "mono" | "operational" | "summary";
export interface CatchOption<T> {
  value: T;
  label: string;
  icon?: ReactNode;
  semanticLabel?: string;
  enabled?: boolean;
  disabledReason?: string;
}
export interface CatchFieldLabelTextCopy {
  optionalLabel: string;
  optionalSuffix: string;
  optionalSemantics: (label: string) => string;
}
type Accent = CatchChipData["accent"];
interface CheckedProps<T> {
  values: readonly T[];
  itemLabelBuilder: (value: T) => string;
  selected: ReadonlySet<T>;
  onChanged: ((value: ReadonlySet<T>) => void) | null;
  mode: CatchChipMode;
  allowEmptySelection?: boolean;
  itemAccentBuilder?: (value: T) => Accent | undefined;
}
export type CatchChoiceInputProps<T> =
  | (CheckedProps<T> & {recipe?: "choice"})
  | (Omit<CheckedProps<T>, "mode" | "allowEmptySelection" | "itemAccentBuilder"> & {
      recipe: "described"; itemSubtitleBuilder: (value: T) => string})
  | (CheckedProps<T> & {recipe: "form"; label: string | null; copy: CatchFieldLabelTextCopy;
      isOptional?: boolean; onValidate?: (value: ReadonlySet<T>) => string | null})
  | {recipe: "segmented"; options: readonly CatchOption<T>[]; selected: T | null;
      onChanged?: ((value: T) => void) | null; variant?: CatchChoiceInputVariant;
      accent?: Accent; trailing?: ReactNode; scrollable?: boolean; showDivider?: boolean};

/** Shared caller-owned cardinality. Schema projection, item keys and Flutter
 * field-close/pager notifications remain native-only. Form validates on submit. */
export function CatchChoiceInput<T>(props: CatchChoiceInputProps<T>) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [error, setError] = useState<string | null>(null);
  const selectedIndex = props.recipe === "segmented"
    ? props.options.findIndex((option) => Object.is(option.value, props.selected)) : -1;
  useEffect(() => {
    const parent = root.current?.closest("form");
    const validate = (event: Event) => {
      const current = latest.current;
      if (current.recipe !== "form") return;
      const supported = new Set([...current.selected].filter((value) => current.values.includes(value)));
      const next = current.onValidate?.(supported) ?? null;
      setError(next);
      if (next) { event.preventDefault(); event.stopPropagation(); root.current?.querySelector<HTMLButtonElement>("button:enabled")?.focus(); }
    };
    parent?.addEventListener("submit", validate, true);
    return () => parent?.removeEventListener("submit", validate, true);
  }, [props.recipe]);
  useEffect(() => {
    const container = rail.current;
    const target = container?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!container || !target) return;
    const reveal = () => {
      const box = container.getBoundingClientRect(); const item = target.getBoundingClientRect();
      if (item.left < box.left) container.scrollLeft += item.left - box.left;
      else if (item.right > box.right) container.scrollLeft += item.right - box.right;
    };
    reveal();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(reveal);
    observer?.observe(container); observer?.observe(target);
    return () => observer?.disconnect();
  }, [selectedIndex, props.recipe === "segmented" ? props.variant : undefined]);

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="radio"]:enabled'));
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const backward = event.key === "ArrowUp" || event.key === (rtl ? "ArrowRight" : "ArrowLeft");
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
      : (index + (backward ? -1 : 1) + buttons.length) % buttons.length;
    buttons[next]?.focus(); buttons[next]?.click();
  }

  if (props.recipe === "segmented") {
    const variant = props.variant ?? "label";
    for (const option of props.options) {
      if (option.enabled === false && !option.disabledReason) throw new TypeError("Disabled CatchOption requires its reason");
    }
    const accent = props.accent;
    if (accent !== undefined && !/^(social-run|running|walking|pickleball|padel|tennis|badminton|cycling|spin-class|yoga|strength-training|dinner|pub-quiz|bar-crawl|singles-mixer|open-activity)$/.test(accent)) {
      throw new TypeError("Choice accent must name an activity token");
    }
    return <div className={styles.segmented} data-variant={variant} data-divider={props.showDivider !== false || undefined}
      style={accent ? {"--catch-choice-accent": `var(--catch-activity-${accent}-accent)`} as CSSProperties : undefined}>
      <div className={styles.rail} ref={rail} data-scrollable={props.scrollable || undefined}>
        {props.options.map((option, index) => <button key={index} type="button" className={styles.option}
          aria-pressed={Object.is(option.value, props.selected)} aria-label={option.semanticLabel}
          disabled={props.onChanged == null || option.enabled === false} title={option.enabled === false ? option.disabledReason : undefined}
          data-selected={Object.is(option.value, props.selected) || undefined} onClick={() => props.onChanged?.(option.value)}>
          {option.icon ? <span className={styles.icon} aria-hidden="true">{option.icon}</span> : null}
          <span className={styles.label}>{variant === "mono" ? option.label.toUpperCase() : option.label}</span>
        </button>)}
      </div>
      {props.trailing ? <span className={styles.trailing}>{props.trailing}</span> : null}
    </div>;
  }

  const mode = props.recipe === "described" ? "single" : props.mode;
  const selected = new Set([...props.selected].filter((value) => props.values.includes(value)));
  if (mode === "single" && selected.size > 1) throw new RangeError("Single choice accepts at most one selected value");
  function pick(value: T) {
    if (props.recipe === "segmented" || props.onChanged === null) return;
    const next = new Set(selected);
    const allowEmpty = "allowEmptySelection" in props && props.allowEmptySelection;
    if (mode === "multiple") {
      if (next.has(value)) { if (!allowEmpty && next.size === 1) return; next.delete(value); }
      else next.add(value);
    } else { const wasSelected = next.has(value); next.clear(); if (!wasSelected || !allowEmpty) next.add(value); }
    props.onChanged(next);
    if (props.recipe === "form" && error) setError(props.onValidate?.(next) ?? null);
  }
  const label = props.recipe === "form" ? props.label : null;
  const optional = props.recipe === "form" && props.isOptional;
  const group = <div className={props.recipe === "described" ? styles.described : styles.choices}
    role={mode === "single" ? "radiogroup" : "group"} aria-labelledby={label ? `${id}-label` : undefined}
    aria-describedby={error ? `${id}-error` : undefined} aria-invalid={error ? true : undefined} onKeyDown={navigate}>
    {props.values.map((value, index) => props.recipe === "described"
      ? <CatchChoiceTile key={index} title={props.itemLabelBuilder(value)} subtitle={props.itemSubtitleBuilder(value)}
          selected={selected.has(value)} onTap={props.onChanged === null ? null : () => pick(value)} />
      : <CatchChip key={index} recipe="choice" label={props.itemLabelBuilder(value)} mode={mode}
          selected={selected.has(value)} accent={props.itemAccentBuilder?.(value)} onPressed={props.onChanged === null ? null : () => pick(value)} />)}
  </div>;
  return <div ref={root} className={styles.field}>
    {/* D21: normalize the native ink3 caption to the adjacent readable ink2 role. */}
    {label ? <CatchText as="span" id={`${id}-label`} variant="fieldLabel" color={error ? "danger" : "ink2"}
      aria-label={optional && props.recipe === "form" ? props.copy.optionalSemantics(label) : undefined}>
      {label}{optional && props.recipe === "form" ? <span aria-hidden="true">{props.copy.optionalSuffix}</span> : null}
    </CatchText> : null}
    {group}
    {error ? <CatchText as="span" id={`${id}-error`} variant="supporting" color="danger" role="alert">{error}</CatchText> : null}
  </div>;
}
