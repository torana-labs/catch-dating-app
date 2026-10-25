"use client";

import {useId, useState} from "react";
import {starCount, starGlyphPath} from "./CatchStarRating";
import styles from "./CatchStarInput.module.css";

interface CatchStarInputBase {
  disabled?: boolean;
  /** Called with the chosen number of stars, 1 to 5. */
  onChanged: (value: number) => void;
  /** The accessible name of each choice, such as "4 stars". */
  optionLabel: (stars: number) => string;
  /** Chosen stars, or 0 before a choice. */
  value: number;
}

/** The group is named by visible text (`labelledBy`) or by `label`. */
export type CatchStarInputProps = CatchStarInputBase &
  ({label: string; labelledBy?: never} | {label?: never; labelledBy: string});

/**
 * Five star choices as native radios: arrow keys move between them, and the
 * stars up to the hovered or chosen one fill.
 */
export function CatchStarInput({disabled = false, label, labelledBy, onChanged, optionLabel, value}: CatchStarInputProps) {
  const name = useId();
  const [hovered, setHovered] = useState(0);
  const shown = disabled ? value : hovered || value;
  return (
    <div
      aria-label={label}
      aria-labelledby={labelledBy}
      className={styles.input}
      data-disabled={disabled || undefined}
      onMouseLeave={() => setHovered(0)}
      role="radiogroup"
    >
      {Array.from({length: starCount}, (_, index) => {
        const stars = index + 1;
        return (
          <label className={styles.choice} key={stars} onMouseEnter={() => setHovered(stars)}>
            <input
              aria-label={optionLabel(stars)}
              checked={value === stars}
              className={styles.radio}
              disabled={disabled}
              name={name}
              onChange={() => onChanged(stars)}
              type="radio"
              value={stars}
            />
            <svg aria-hidden="true" className={styles.star} data-filled={stars <= shown || undefined} focusable="false" viewBox="0 0 24 24">
              <path d={starGlyphPath} />
            </svg>
          </label>
        );
      })}
    </div>
  );
}
