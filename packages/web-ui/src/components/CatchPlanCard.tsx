"use client";

import {useState} from "react";
import {CatchDateTile, type CatchDateTileProps} from "./CatchDateTile";
import {CatchLegacyText} from "./CatchLegacyText";
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
  /** Who hosts and where, such as "The Harbour Line Quizzers · Lantern Lane Tavern". */
  detail: string;
  /** The price, such as "Free" or "₹600". */
  price: string;
  /** Places left or the booking state, such as "6 left" or "Full". */
  availability?: string;
  /**
   * A short tag on the photo's corner, such as "Women-led": the canvas plan
   * card's white pill (.plan .badge). It is read after the host line.
   */
  badge?: string;
  /** The plan's photo. Without one, or when it fails to load, the card shows its poster. */
  photoUrl?: string | null;
  /** The poster's short name in display type, such as "Quiz night". */
  posterLabel: string;
  /** Called before navigation, such as for click tracking. */
  onClick?: () => void;
  /**
   * The plan's date. With one the card takes the canvas's plan card (.plan):
   * a 150px photo or poster in a white card, the date square beside the title
   * and host, and the price and places over a hairline. The label is then
   * read, not shown.
   */
  date?: Omit<CatchDateTileProps, "size">;
}

/**
 * A Website v2 plan card: the plan's photo, or a poster in its format's
 * accent, above its label, title, host and place, with the price and places
 * left at the foot. Below 840px it becomes a row with the media at its start.
 * A badge sits on the media's top corner. The whole card is one link.
 */
export function CatchPlanCard({availability, badge, date, detail, format, href, label, onClick, photoUrl, posterLabel, price, title}: CatchPlanCardProps) {
  const photo = photoUrl?.trim();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const ground = format ? formatAccents[format] : "paper";
  const tag = badge?.trim() ? (
    <>{" "}<CatchText as="span" className={styles.badge} variant="label-badge">{badge.trim()}</CatchText>{" "}</>
  ) : null;
  if (date) {
    return (
      <a className={styles.card} data-layout="kit" href={href} onClick={onClick}>
        {photo && failedUrl !== photo ? (
          <img alt="" className={styles.media} decoding="async" loading="lazy" onError={() => setFailedUrl(photo)} src={photo} />
        ) : (
          <span aria-hidden="true" className={`${styles.media} ${styles.poster}`} data-ground={ground}>
            <CatchLegacyText as="span" maxLines={2} variant="displayXs">{posterLabel}</CatchLegacyText>
          </span>
        )}
        <span className={styles.row}>
          <CatchDateTile {...date} ground={date.ground ?? ground} size="sm" />
          <span className={styles.copy}>
            <CatchText as="span" className={styles.title} variant="title-bar">{title}</CatchText>{" "}
            <CatchText as="span" className={styles.label}>{label}</CatchText>{" "}
            <CatchText as="span" tone="secondary" variant="body-meta">{detail}</CatchText>
          </span>
        </span>{tag ?? " "}
        <span className={styles.meta}>
          <CatchText as="span" className={styles.metaText} variant="body-meta">{price}</CatchText>
          {availability ? <>{" "}<CatchText as="span" className={`${styles.metaText} ${styles.availability}`} variant="body-meta">{availability}</CatchText></> : null}
        </span>
      </a>
    );
  }
  return (
    <a className={styles.card} href={href} onClick={onClick}>
      {photo && failedUrl !== photo ? (
        <img alt="" className={styles.media} decoding="async" loading="lazy" onError={() => setFailedUrl(photo)} src={photo} />
      ) : (
        <span aria-hidden="true" className={`${styles.media} ${styles.poster}`} data-ground={ground}>
          <CatchLegacyText as="span" maxLines={2} variant="displayXs">{posterLabel}</CatchLegacyText>
        </span>
      )}
      <span className={styles.body}>
        <CatchLegacyText as="span" color={format ? formatAccents[format] : "ink2"} variant="statusLabel">{label}</CatchLegacyText>{" "}
        <CatchLegacyText as="span" maxLines={2} variant="titleS">{title}</CatchLegacyText>{" "}
        <CatchLegacyText as="span" color="ink2" maxLines={2} variant="bodyS">{detail}</CatchLegacyText>{tag ?? " "}
        <span className={styles.foot}>
          <CatchLegacyText as="span" variant="supportingStrong">{price}</CatchLegacyText>
          {availability ? <>{" "}<CatchLegacyText as="span" color="ink2" variant="supportingStrong">{availability}</CatchLegacyText></> : null}
        </span>
      </span>
    </a>
  );
}
