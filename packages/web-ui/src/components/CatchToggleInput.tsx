"use client";

import styles from "./CatchToggleInput.module.css";

export interface CatchToggleInputProps {
  value: boolean;
  onChanged: ((value: boolean) => void) | null;
  semanticLabel?: string;
  recipe?: "toggle" | "field";
}
/** Settings on/off intent. Consent and checklist items use CatchCheckboxInput. */
export function CatchToggleInput({value, onChanged, semanticLabel, recipe = "toggle"}: CatchToggleInputProps) {
  return <button className={styles.control} type="button" role="switch"
    aria-checked={value} aria-label={semanticLabel} disabled={onChanged === null}
    data-recipe={recipe} onClick={() => onChanged?.(!value)}>
    <span className={styles.track} aria-hidden="true"><span className={styles.knob} /></span>
  </button>;
}
