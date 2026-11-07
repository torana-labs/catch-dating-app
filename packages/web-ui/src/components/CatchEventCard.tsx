"use client";

import {useState, type CSSProperties, type ReactNode} from "react";
import {CatchAvatarRow, type CatchPersonAvatarItem} from "./CatchAvatarRow";
import {CatchBadge} from "./CatchBadge";
import type {CatchFormat} from "./catchCoreVocabulary";
import {CatchIcon} from "./CatchIcon";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import styles from "./CatchEventCard.module.css";

/**
 * poster: the event's colour, a big title and counts. cover: a photo with the
 * title under it. compact: small, for rails. external: an event hosted
 * elsewhere, as a tile that links out.
 */
export const catchEventCardVariants = ["poster", "cover", "compact", "external"] as const;
export type CatchEventCardVariant = (typeof catchEventCardVariants)[number];

export const catchEventCardStatuses = ["on-sale", "sold-out", "cancelled", "live", "past"] as const;
export type CatchEventCardStatus = (typeof catchEventCardStatuses)[number];

/** A poster count: 26 booked. */
export interface CatchEventCardCount {
  value: ReactNode;
  label: ReactNode;
}

export interface CatchEventCardProps {
  variant?: CatchEventCardVariant;
  title: string;
  format: CatchFormat;
  /** "Trivia", "Social run". */
  formatLabel?: ReactNode;
  /** The pill on posters and covers: "Tonight · doors 7:30", "Sat 8:00 PM". */
  when?: string;
  place?: ReactNode;
  /** The top-right flag on covers: "Sold out", "Live now". */
  flag?: string;
  counts?: readonly CatchEventCardCount[];
  people?: readonly CatchPersonAvatarItem[];
  peopleTotal?: number;
  price?: ReactNode;
  imageUrl?: string;
  /** external: where it is hosted, such as "Luma". */
  source?: string;
  status?: CatchEventCardStatus;
  href?: string;
  onPress?: () => void;
  /** The shared-element name the card grows into the event page hero with. */
  transitionName?: string;
}

const plus = (count: number) => `+${count}`;

/**
 * catch.event_card: an event as a card. The poster takes its format colour;
 * cover and compact lead with the photo, or the format colour and the title
 * when there is none or it fails to load; an external event only links out.
 */
export function CatchEventCard({
  variant = "poster", title, format, formatLabel, when, place, flag, counts, people, peopleTotal, price, imageUrl, source, status, href, onPress, transitionName,
}: CatchEventCardProps) {
  const [failed, setFailed] = useState(false);
  const transition = transitionName ? ({viewTransitionName: transitionName} as CSSProperties) : undefined;
  if (variant === "poster") {
    return (
      <CatchSurface block="spotlight" className={styles.card} color={format} data-status={status} data-variant="poster" href={href} onPress={onPress} style={transition}>
        <span className={styles.top}>
          {when ? <CatchBadge label={when} recipe="solid" size="md" /> : null}
          {formatLabel ? <CatchText variant="label-kicker">{formatLabel}</CatchText> : null}
        </span>
        <span className={styles.titles}>
          <CatchText as="h2" variant="display-title">{title}</CatchText>
          {place ? <CatchText className={styles.place} variant="body">{place}</CatchText> : null}
        </span>
        {counts || people ? (
          <span className={styles.foot}>
            {counts ? (
              <span className={styles.counts}>
                {counts.map((count, index) => (
                  <span className={styles.count} key={index}>
                    <CatchText numeric variant="display-section">{count.value}</CatchText>
                    <CatchText variant="label-kicker">{count.label}</CatchText>
                  </span>
                ))}
              </span>
            ) : null}
            {people ? <CatchAvatarRow countLabelBuilder={plus} items={people} limit={4} size={28} totalCount={peopleTotal} /> : null}
          </span>
        ) : null}
      </CatchSurface>
    );
  }
  if (variant === "external") {
    return (
      <CatchSurface className={styles.card} data-format={format} data-variant="external" href={href} onPress={onPress}>
        <span className={styles.top}>
          <span className={styles.source}><span aria-hidden="true" className={styles.dot} data-format={format} />{formatLabel}</span>
          {source ? <CatchText tone="secondary" variant="label-kicker">on {source}</CatchText> : null}
        </span>
        <CatchText maxLines={2} variant="title-bar">{title}</CatchText>
        {when ? <CatchText tone="secondary" variant="body-small">{when}{place ? <> · {place}</> : null}</CatchText> : null}
        <span className={styles.out}>Tickets<CatchIcon name="openExternal" size={16} /></span>
      </CatchSurface>
    );
  }
  const photo = imageUrl && !failed ? imageUrl : undefined;
  const body = (
    <>
      <span className={styles.media} data-format={format} data-variant={variant} style={transition}>
        {photo ? <img alt="" className={styles.image} loading="lazy" onError={() => setFailed(true)} src={photo} /> : (
          <span className={styles.mediaTitle}>
            {formatLabel ? <CatchText variant="label-kicker">{formatLabel}</CatchText> : null}
            <CatchText variant={variant === "compact" ? "display-xs" : "display-section"}>{title}</CatchText>
          </span>
        )}
        {when ? <span className={styles.when}><CatchBadge label={when} size="md" /></span> : null}
        {flag ? <span className={styles.flag}><CatchBadge label={flag} recipe="solid" size="md" /></span> : null}
      </span>
      <span className={styles.meta}>
        {photo ? <CatchText maxLines={2} variant="title-bar">{title}</CatchText> : null}
        {place ? <CatchText maxLines={1} tone="secondary" variant="body-small">{place}</CatchText> : null}
        {price || people ? (
          <span className={styles.line}>
            {price ? <CatchText variant="label-action">{price}</CatchText> : null}
            {people ? <CatchAvatarRow countLabelBuilder={plus} items={people} limit={3} size={24} totalCount={peopleTotal} /> : null}
          </span>
        ) : null}
      </span>
    </>
  );
  const shared = {className: styles.card, "data-pressable": href || onPress ? "" : undefined, "data-status": status, "data-variant": variant};
  if (href) return <a {...shared} href={href}>{body}</a>;
  if (onPress) return <button {...shared} onClick={onPress} type="button">{body}</button>;
  return <div {...shared}>{body}</div>;
}
