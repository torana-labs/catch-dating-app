import styles from "./CatchStarRating.module.css";

/** Star size: 16px or 20px. */
export type CatchStarRatingSize = "s" | "m";

export interface CatchStarRatingProps {
  /** The accessible reading, such as "4 out of 5". */
  label: string;
  /** Defaults to s. */
  size?: CatchStarRatingSize;
  /** Stars out of five; rounded to a whole star and clamped to 0–5. */
  value: number;
}

/** The star glyph the rating display and input share, on a 24px grid. */
export const starGlyphPath = "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z";
export const starCount = 5;

/** A read-only rating out of five, read as one image with the caller's label. */
export function CatchStarRating({label, size = "s", value}: CatchStarRatingProps) {
  const filled = Math.min(starCount, Math.max(0, Math.round(value)));
  return (
    <span aria-label={label} className={styles.rating} data-size={size} role="img">
      {Array.from({length: starCount}, (_, index) => (
        <svg
          aria-hidden="true"
          className={styles.star}
          data-filled={index < filled || undefined}
          focusable="false"
          key={index}
          viewBox="0 0 24 24"
        >
          <path d={starGlyphPath} />
        </svg>
      ))}
    </span>
  );
}
