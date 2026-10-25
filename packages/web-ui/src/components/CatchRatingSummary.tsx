import type {CSSProperties} from "react";
import {CatchText} from "./CatchText";
import styles from "./CatchRatingSummary.module.css";

/** One row of the distribution: how many reviews gave this many stars. */
export interface CatchRatingSummaryRow {
  count: number;
  /** The row read aloud, such as "5 stars: 142 reviews". */
  label: string;
  stars: 1 | 2 | 3 | 4 | 5;
}

export interface CatchRatingSummaryProps {
  /** The formatted average, such as "4.8". */
  average: string;
  /** The formatted total, such as "186 reviews". */
  countLabel: string;
  /** Rows in display order, usually five stars down to one. */
  distribution: readonly CatchRatingSummaryRow[];
  /** Supporting copy under the bars, such as how reviews are verified. */
  note?: string;
}

/**
 * An average rating over its distribution: one bar per star count, scaled to
 * the largest row so the most common rating fills its track.
 */
export function CatchRatingSummary({average, countLabel, distribution, note}: CatchRatingSummaryProps) {
  const largest = Math.max(1, ...distribution.map((row) => row.count));
  return (
    <div className={styles.summary}>
      <p className={styles.headline}>
        <CatchText as="span" variant="displayXxl">{average}</CatchText>
        <CatchText as="span" color="ink2" variant="bodyM">{countLabel}</CatchText>
      </p>
      <ul className={styles.rows}>
        {distribution.map((row) => (
          <li className={styles.row} key={row.stars}>
            <span className={styles.visuallyHidden}>{row.label}</span>
            <span aria-hidden="true" className={styles.stars}>{`${row.stars}★`}</span>
            <span aria-hidden="true" className={styles.track}>
              <span
                className={styles.fill}
                style={{"--catch-rating-share": Math.max(0, row.count) / largest} as CSSProperties}
              />
            </span>
            <span aria-hidden="true" className={styles.value}>{row.count}</span>
          </li>
        ))}
      </ul>
      {note ? <CatchText color="ink2" variant="bodyS">{note}</CatchText> : null}
    </div>
  );
}
