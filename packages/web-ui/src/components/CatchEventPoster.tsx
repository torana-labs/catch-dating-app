import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchEventPoster.module.css";

export interface CatchEventPosterProps {
  /** The poster's ground, such as the event's activity accent; defaults to coral. */
  ground?: Ground;
  /** The top line, such as the organiser. */
  kicker: string;
  /** Top right, such as the date. */
  date: string;
  title: string;
  /** The foot line, such as the place. */
  place: string;
}

/**
 * Website v2 event poster: an event without a photo, set in type on a ground
 * in CatchHeroImage's framed geometry (16:10 at radius lg, 4:3 below 840px).
 * It repeats what the page already says, so it is hidden from screen readers.
 */
export function CatchEventPoster({ground = "coral", kicker, date, title, place}: CatchEventPosterProps) {
  return (
    <span aria-hidden="true" className={styles.poster} data-catch-theme={ground === "ink" ? "dark" : "light"} data-ground={ground}>
      <span className={styles.top}>
        <CatchText as="span" maxLines={1} variant="sectionTitle">{kicker}</CatchText>
        <CatchText as="span" variant="sectionTitle">{date}</CatchText>
      </span>
      <CatchText as="span" maxLines={3} variant="displayXxl">{title}</CatchText>
      <CatchText as="span" maxLines={1} variant="sectionTitle">{place}</CatchText>
    </span>
  );
}
