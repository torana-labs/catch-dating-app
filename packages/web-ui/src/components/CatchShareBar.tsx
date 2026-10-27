import type {CSSProperties} from "react";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchShareBar.module.css";

export interface CatchShareBarSegment {
  label: string;
  /** The segment's share, in any unit; shares are drawn relative to their sum. */
  value: number;
  /** The caller's formatted share, such as "71%". */
  valueLabel: string;
  ground: Ground;
}

export interface CatchShareBarProps {
  /** Names the bar for assistive technology, such as "Where visitors came from". */
  label: string;
  segments: readonly CatchShareBarSegment[];
}

/**
 * Website v2 share bar: one pill split into ground-coloured segments by
 * share, with a legend that names each segment and its formatted share.
 */
export function CatchShareBar({label, segments}: CatchShareBarProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);
  return (
    <figure aria-label={label} className={styles.share}>
      <span aria-hidden="true" className={styles.bar}>
        {total > 0
          ? segments.map((segment) => (
            <span className={styles.segment} data-ground={segment.ground} key={segment.label}
              style={{"--catch-share": Math.max(segment.value, 0) / total} as CSSProperties} />
          ))
          : null}
      </span>
      <ul className={styles.legend} role="list">
        {segments.map((segment) => (
          <li className={styles.key} key={segment.label}>
            <span aria-hidden="true" className={styles.swatch} data-ground={segment.ground} />
            <CatchText as="span" color="ink" variant="bodyS">{`${segment.label} · ${segment.valueLabel}`}</CatchText>
          </li>
        ))}
      </ul>
    </figure>
  );
}
