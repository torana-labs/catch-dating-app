import type {CSSProperties} from "react";
import styles from "./CatchLoadingIndicator.module.css";

export type CatchLoadingIndicatorVariant = "circular" | "dots" | "inline";

export interface CatchLoadingIndicatorProps {
  /** circular is the default; dots fills busy buttons; inline sits beside field content. */
  recipe?: CatchLoadingIndicatorVariant;
  /** A CSS colour; circular defaults to the theme primary, the others to the current colour. */
  color?: string;
  /** The circular stroke width in px. */
  strokeWidth?: number;
  /** The inline glyph's extent in px. */
  size?: number;
  /** Names the busy state for assistive technology; without one the indicator is decorative. */
  label?: string;
}

/**
 * Flutter's CatchLoadingIndicator: an indeterminate circular indicator, three
 * motion-free dots for busy buttons, or a fixed-cadence inline glyph.
 */
export function CatchLoadingIndicator({recipe = "circular", color, strokeWidth, size, label}: CatchLoadingIndicatorProps) {
  const style = {
    ...(color ? {"--catch-loading-color": color} : {}),
    ...(strokeWidth !== undefined ? {"--catch-loading-stroke": `${strokeWidth}px`} : {}),
    ...(size !== undefined ? {"--catch-loading-size": `${size}px`} : {}),
  } as CSSProperties;
  const semantics = label ? {"aria-label": label, role: "progressbar"} : {"aria-hidden": true};
  return (
    <span {...semantics} className={styles.indicator} data-recipe={recipe} style={style}>
      {recipe === "dots" ? (
        <><span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} /></>
      ) : (
        <svg className={styles.glyph} focusable="false" viewBox="0 0 24 24">
          {recipe === "inline" ? <path d="M21 12a9 9 0 1 1-6.22-8.56" /> : <circle cx="12" cy="12" r="10" />}
        </svg>
      )}
    </span>
  );
}
