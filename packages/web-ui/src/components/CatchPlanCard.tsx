"use client";

import {useState} from "react";
import {CatchText} from "./CatchText";
import {formatAccents, type Format} from "./palette";
import styles from "./CatchPlanCard.module.css";

export interface CatchPlanCardProps {
  href: string;
  title: string;
  /** The coloured line above the title, such as "Games and quizzes · Thu 7:30 PM". */
  label: string;
  /**
   * Colours the label, and a poster without a photo, in its format's accent;
   * a plan with no format keeps the ink and a paper poster.
   */
  format?: Format | null;
  /** Who hosts and where, such as "The Quizzicals · Khar Social". */
  detail: string;
  /** The price, such as "Free" or "₹600". */
  price: string;
  /** Places left or the booking state, such as "6 left" or "Full". */
  availability?: string;
  /** The plan's photo. Without one, or when it fails to load, the card shows its poster. */
  photoUrl?: string | null;
  /** The poster's short name in display type, such as "Quiz night". */
  posterLabel: string;
  /** Called before navigation, such as for click tracking. */
  onClick?: () => void;
}

/**
 * A Website v2 plan card: the plan's photo, or a poster in its format's
 * accent, above its label, title, host and place, with the price and places
 * left at the foot. Below 840px it becomes a row with the media at its start.
 * The whole card is one link.
 */
export function CatchPlanCard({availability, detail, format, href, label, onClick, photoUrl, posterLabel, price, title}: CatchPlanCardProps) {
  const photo = photoUrl?.trim();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const ground = format ? formatAccents[format] : "paper";
  return (
    <a className={styles.card} href={href} onClick={onClick}>
      {photo && failedUrl !== photo ? (
        <img alt="" className={styles.media} decoding="async" loading="lazy" onError={() => setFailedUrl(photo)} src={photo} />
      ) : (
        <span aria-hidden="true" className={`${styles.media} ${styles.poster}`} data-ground={ground}>
          <CatchText as="span" maxLines={2} variant="displayXs">{posterLabel}</CatchText>
        </span>
      )}
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
