import {CatchBadge} from "./CatchBadge";
import {CatchButton} from "./CatchButton";
import {CatchText} from "./CatchText";
import styles from "./CatchNoteCard.module.css";

export interface CatchNoteCardPhoto {
  src: string;
  alt: string;
}

export interface CatchNoteCardAction {
  label: string;
  href: string;
}

export interface CatchNoteCardProps {
  /** When the note was posted, as the page says it ("Yesterday", "5 days ago"). */
  when: string;
  body: string;
  /** A pinned note leads the list and carries the pinned badge. */
  pinned?: boolean;
  /** The pinned badge's copy; defaults to "Pinned". */
  pinnedLabel?: string;
  /** Held to a short 2:1 crop so a note never turns into a photo post. */
  photo?: CatchNoteCardPhoto;
  /** One follow-on link, such as the event the note is about. */
  action?: CatchNoteCardAction;
  as?: "article" | "li" | "div";
}

/**
 * Proposal WebOrgNote: one note from an organiser on their page, on a tile:
 * when it was posted (and whether it is pinned), the note, an optional photo
 * in a 2:1 crop and an optional link.
 */
export function CatchNoteCard({when, body, pinned = false, pinnedLabel = "Pinned", photo, action, as: Element = "article"}: CatchNoteCardProps) {
  return (
    <Element className={styles.note} data-pinned={pinned ? "" : undefined}>
      <div className={styles.head}>
        <CatchText as="span" tone="secondary" variant="body-meta">{when}</CatchText>
        {pinned ? <CatchBadge label={pinnedLabel} /> : null}
      </div>
      <CatchText as="p" variant="body-small">{body}</CatchText>
      {photo ? <img alt={photo.alt} className={styles.photo} decoding="async" loading="lazy" src={photo.src} /> : null}
      {action ? (
        <div className={styles.action}>
          <CatchButton href={action.href} label={action.label} size="sm" trailingIcon="forward" variant="secondary" />
        </div>
      ) : null}
    </Element>
  );
}
