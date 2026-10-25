import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchPreviewCard.module.css";

export interface CatchPreviewCardProps {
  href: string;
  /** The line above the title, such as the date and time. */
  label: string;
  title: string;
  /** The line at the card's foot, such as the price and where to book. */
  meta?: string;
  ground?: Ground;
  onClick?: () => void;
}

/**
 * Website v2 preview card: a link on a ground with a label, a display title,
 * and a meta line held to the card's foot.
 */
export function CatchPreviewCard({href, label, title, meta, ground = "paper", onClick}: CatchPreviewCardProps) {
  return (
    <a className={styles.card} data-ground={ground} href={href} onClick={onClick}>
      <CatchText as="span" variant="statusLabel">{label}</CatchText>{" "}
      <CatchText as="span" maxLines={3} variant="displayXs">{title}</CatchText>
      {meta ? <>{" "}<span className={styles.meta}><CatchText as="span" variant="supportingStrong">{meta}</CatchText></span></> : null}
    </a>
  );
}
