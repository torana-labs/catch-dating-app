"use client";
import {useId} from "react";
import {CatchText} from "./CatchText";
import styles from "./CatchCheckboxInput.module.css";

/** One acknowledgement/checklist value; settings retain CatchToggleInput. */
export interface CatchCheckboxInputProps {
  value: boolean;
  onChanged: ((value: boolean) => void) | null;
  label: string;
  description?: string;
  semanticLabel?: string;
}
export function CatchCheckboxInput({value, onChanged, label, description, semanticLabel}: CatchCheckboxInputProps) {
  const descriptionId = useId();
  return <label className={styles.field} data-disabled={onChanged === null || undefined}>
    <input className={styles.checkbox} type="checkbox" checked={value} disabled={onChanged === null}
      aria-label={semanticLabel} aria-describedby={description === undefined ? undefined : descriptionId}
      onChange={(event) => onChanged?.(event.currentTarget.checked)} />
    <span className={styles.copy}>
      <CatchText as="span" variant="bodyM">{label}</CatchText>
      {description === undefined ? null : <CatchText as="span" id={descriptionId} variant="bodyS">{description}</CatchText>}
    </span>
  </label>;
}
