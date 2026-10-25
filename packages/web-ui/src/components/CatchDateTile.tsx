import {CatchText} from "./CatchText";
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
      <CatchText as="span" color="inherit" variant="statusLabel">{weekday}</CatchText>
      {/* The spaces keep the date one phrase when read aloud. */}
      <CatchText as="span" color="inherit" variant="displayS">{` ${day} `}</CatchText>
      <CatchText as="span" color="inherit" variant="statusLabel">{month}</CatchText>
    </time>
  );
}
