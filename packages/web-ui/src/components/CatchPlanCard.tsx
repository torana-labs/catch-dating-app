import type {CatchActivityKind} from "./activityArtwork";
import {CatchText} from "./CatchText";
import {EventThumbnail} from "./EventThumbnail";
import {formatAccents, type Format} from "./palette";
import styles from "./CatchPlanCard.module.css";

export interface CatchPlanCardProps {
  href: string;
  title: string;
  /** The coloured line above the title, such as "Games and quizzes · Thu 7:30 PM". */
  label: string;
  /** Colours the label in its format's accent; a plan with no format keeps the ink. */
  format?: Format | null;
  /** Who hosts and where, such as "The Quizzicals · Khar Social". */
  detail: string;
  /** The price, such as "Free" or "₹600". */
  price: string;
  /** Places left or the booking state, such as "6 left" or "Full". */
  availability?: string;
  /** Draws the activity artwork when there is no photo, or the photo fails. */
  activityKind: CatchActivityKind;
  photoUrl?: string | null;
  /** Called before navigation, such as for click tracking. */
  onClick?: () => void;
}

/**
 * A Website v2 plan card: the plan's photo or artwork above its label, title,
 * host and place, with the price and places left at the foot. Below 840px it
 * becomes a row with the media at its start. The whole card is one link.
 */
export function CatchPlanCard({activityKind, availability, detail, format, href, label, onClick, photoUrl, price, title}: CatchPlanCardProps) {
  return (
    <a className={styles.card} href={href} onClick={onClick}>
      <span className={styles.media}><EventThumbnail activityKind={activityKind} photoUrl={photoUrl} /></span>
      <span className={styles.body}>
        <CatchText as="span" color={format ? formatAccents[format] : "ink2"} variant="statusLabel">{label}</CatchText>{" "}
        <CatchText as="span" maxLines={2} variant="titleS">{title}</CatchText>{" "}
        <CatchText as="span" color="ink2" maxLines={2} variant="bodyS">{detail}</CatchText>{" "}
        <span className={styles.foot}>
          <CatchText as="span" variant="supportingStrong">{price}</CatchText>
          {availability ? <>{" "}<CatchText as="span" color="ink2" variant="supportingStrong">{availability}</CatchText></> : null}
        </span>
      </span>
    </a>
  );
}
