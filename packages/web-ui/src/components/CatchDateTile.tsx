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
  /**
   * md (the default): 72 × 78px, the organiser page's event rows. sm: the
   * canvas's date square (.date), 48 × 52px (40 × 44 on phones) with the
   * weekday over the day; the month is read, not shown.
   */
  size?: "md" | "sm";
}

/**
 * A calendar date on a ground: weekday, a display day and month, read as one
 * date. It shrinks on a page narrower than 840px.
 */
export function CatchDateTile({dateTime, day, ground = "paper", month, size = "md", weekday}: CatchDateTileProps) {
  if (size === "sm") {
    return (
      <time className={styles.tile} data-catch-theme={ground === "ink" ? "dark" : "light"} data-ground={ground} data-size="sm" dateTime={dateTime}>
        <span className={styles.weekday}>{weekday}</span>
        <span className={styles.day}>{` ${day} `}</span>
        <span className={styles.month}>{month}</span>
      </time>
    );
  }
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
