"use client";

import styles from "./CatchToggleInput.module.css";

export interface CatchToggleInputProps {
  value: boolean;
  onChanged: ((value: boolean) => void) | null;
  semanticLabel?: string;
  recipe?: "toggle" | "field";
  /** Web only: lets a visible label name the switch (CatchField's toggle recipe). */
  id?: string;
  /** Web only: the ids of the text that describes the switch. */
  describedBy?: string;
}
/** Settings on/off intent. Consent and checklist items use CatchCheckboxInput. */
export function CatchToggleInput({value, onChanged, semanticLabel, recipe = "toggle", id, describedBy}: CatchToggleInputProps) {
  return <button className={styles.control} type="button" role="switch" id={id}
    aria-checked={value} aria-label={semanticLabel} aria-describedby={describedBy} disabled={onChanged === null}
    data-recipe={recipe} onClick={() => onChanged?.(!value)}>
    <span className={styles.track} aria-hidden="true"><span className={styles.knob} /></span>
  </button>;
}
