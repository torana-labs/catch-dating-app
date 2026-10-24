import {clubPlaceholderCoverLayout} from "./clubCoverArtwork";
import styles from "./ClubPlaceholderCover.module.css";
import {EventBackdropImage} from "./EventBackdropImage";

export interface ClubPlaceholderCoverProps {
  name: string;
  city?: string | null;
  /** A stored activity value; unknown values draw the open format. */
  activityKind: string;
  /**
   * Shows the organiser's initials instead of the name and city. Covers
   * narrower than 160px switch to the initials on their own.
   */
  compact?: boolean;
}

/**
 * The typographic organiser cover (G7) for an organiser without imagery:
 * its name and city set over its activity artwork. Decorative, because the
 * surrounding card or page already states the name; fills its container.
 */
export function ClubPlaceholderCover({name, city, activityKind, compact = false}: ClubPlaceholderCoverProps) {
  const layout = clubPlaceholderCoverLayout({name, city, activityKind});
  return (
    <span className={styles.cover} aria-hidden="true">
      <EventBackdropImage activityKind={layout.activityKind} mirrored />
      <span className={styles.type} data-compact={compact || undefined}>
        {layout.city ? <span className={styles.city}>{layout.city}</span> : null}
        <span className={styles.name}>{layout.name}</span>
        <span className={styles.monogram}>{layout.monogram}</span>
      </span>
    </span>
  );
}
