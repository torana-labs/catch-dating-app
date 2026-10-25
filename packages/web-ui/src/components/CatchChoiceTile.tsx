"use client";

import {useId} from "react";
import {CatchText} from "./CatchText";
import styles from "./CatchChoiceTile.module.css";

export interface CatchChoiceTileProps {
  title: string;
  subtitle?: string;
  selected?: boolean;
  onTap?: (() => void) | null;
}
/** One mutually exclusive checked target; the caller owns selection. */
export function CatchChoiceTile({title, subtitle, selected = false, onTap}: CatchChoiceTileProps) {
  const id = useId();
  return <button type="button" className={styles.tile} role="radio" aria-checked={selected}
    aria-labelledby={`${id}-title`} aria-describedby={subtitle ? `${id}-subtitle` : undefined}
    disabled={onTap == null} onClick={onTap ?? undefined} data-selected={selected || undefined}>
    <svg className={styles.icon} aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />{selected ? <path d="m7 12 3 3 7-7" /> : null}
    </svg>
    <span className={styles.copy}>
      <CatchText as="span" id={`${id}-title`} variant="titleS" color="ink">{title}</CatchText>
      {subtitle ? <CatchText as="span" id={`${id}-subtitle`} variant="supporting">{subtitle}</CatchText> : null}
    </span>
  </button>;
}
