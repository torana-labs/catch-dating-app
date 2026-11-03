import {CatchLegacyText} from "./CatchLegacyText";
import type {Ground} from "./palette";
import styles from "./CatchDateTile.module.css";

export interface CatchDateTileProps {
  /** The machine-readable date, such as "2026-11-02". */
  dateTime?: string;
  /** The day of the month, such as "2". */
  day: string;
  /** Defaults to paper. */
  ground?: Ground;
  /** The short month, such as "Nov". */
  month: string;
  /** The short weekday, such as "Sun". */
  weekday: string;
}

/**
 * A calendar date on a ground: weekday, a display day and month, read as one
 * date. It shrinks on a page narrower than 840px.
 */
export function CatchDateTile({dateTime, day, ground = "paper", month, weekday}: CatchDateTileProps) {
  return (
    <time
      className={styles.tile}
      data-catch-theme={ground === "ink" ? "dark" : "light"}
      data-ground={ground}
      dateTime={dateTime}
    >
      <CatchLegacyText as="span" color="inherit" variant="statusLabel">{weekday}</CatchLegacyText>
      {/* The spaces keep the date one phrase when read aloud. */}
      <CatchLegacyText as="span" color="inherit" variant="displayS">{` ${day} `}</CatchLegacyText>
      <CatchLegacyText as="span" color="inherit" variant="statusLabel">{month}</CatchLegacyText>
    </time>
  );
}
