"use client";

import {useId, type ReactNode} from "react";
import {catchGroundIsNight, type CatchFormat} from "./catchCoreVocabulary";
import {useCatch} from "./catchRootContext";
import {CatchIcon} from "./CatchIcon";
import {CatchLegacyText} from "./CatchLegacyText";
import {CatchText} from "./CatchText";
import styles from "./CatchChoiceTile.module.css";

/**
 * The system ChoiceCard layouts, as Flutter's CatchChoiceTileVariant. row: full
 * width with a radio at the end. tile: a card in a grid with a tick when
 * selected. day: a weekday over its date in a strip. add: dashed, to add one
 * more (a photo, a step).
 */
export const catchChoiceTileVariants = ["row", "tile", "day", "add"] as const;
export type CatchChoiceTileVariant = (typeof catchChoiceTileVariants)[number];

/**
 * How a system card stands out at rest. attention draws the games yellow ring
 * (this one needs the host); vacant a dashed edge for an empty slot that can
 * be taken.
 */
export const catchChoiceTileEmphases = ["regular", "attention", "vacant"] as const;
export type CatchChoiceTileEmphasis = (typeof catchChoiceTileEmphases)[number];

export interface CatchChoiceTileProps {
  title: string;
  subtitle?: string;
  selected?: boolean;
  /** Null disables the tile, as in Flutter. */
  onTap?: (() => void) | null;
  /** Without a variant the tile keeps its leading radio; a variant draws the system card. */
  variant?: CatchChoiceTileVariant;
  /** A selected system card fills with this format colour instead of an ink outline. */
  format?: CatchFormat;
  /** A leading glyph for a row or tile, or the add card's glyph (add by default). */
  icon?: ReactNode;
  /** A small mark, such as "4 of 4": at the end of a row, in a tile's corner. */
  meta?: string;
  /** A system card only: attention or vacant at rest. The selected outline and focus ring win. */
  emphasis?: CatchChoiceTileEmphasis;
}

/**
 * catch.option_card: one mutually exclusive checked target; the caller owns
 * selection. Without a variant it is the leading-radio tile; with one it is
 * the system ChoiceCard. An add card is a plain button with no checked state.
 */
export function CatchChoiceTile(props: CatchChoiceTileProps) {
  return props.variant === undefined ? <LegacyTile {...props} /> : <SystemCard {...props} variant={props.variant} />;
}

function LegacyTile({title, subtitle, selected = false, onTap}: CatchChoiceTileProps) {
  const id = useId();
  return <button type="button" className={styles.tile} role="radio" aria-checked={selected}
    aria-labelledby={`${id}-title`} aria-describedby={subtitle ? `${id}-subtitle` : undefined}
    disabled={onTap == null} onClick={onTap ?? undefined} data-selected={selected || undefined}>
    <svg className={styles.icon} aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />{selected ? <path d="m7 12 3 3 7-7" /> : null}
    </svg>
    <span className={styles.copy}>
      <CatchLegacyText as="span" id={`${id}-title`} variant="titleS" color="ink">{title}</CatchLegacyText>
      {subtitle ? <CatchLegacyText as="span" id={`${id}-subtitle`} variant="supporting">{subtitle}</CatchLegacyText> : null}
    </span>
  </button>;
}

function SystemCard({title, subtitle, selected: selectedProp = false, onTap, variant, format, icon, meta, emphasis = "regular"}:
  CatchChoiceTileProps & {variant: CatchChoiceTileVariant}) {
  const id = useId();
  const {ground} = useCatch();
  const add = variant === "add";
  const day = variant === "day";
  const selected = selectedProp && !add;
  const formatFill = selected && format !== undefined;
  const dayFill = selected && day;
  const hasSubtitle = subtitle !== undefined && subtitle !== "";
  const onTile = ground === "tile" || ground === "nested";
  // Flutter's dashed edge: always on an add card, and on a vacant card that
  // draws no other border (not selected or filled; the CSS hides it under focus).
  const dashed = add || (emphasis === "vacant" && !selected);
  const titleId = `${id}-title`;
  const subtitleId = hasSubtitle ? `${id}-subtitle` : undefined;
  const metaId = meta ? `${id}-meta` : undefined;
  // A day names itself by weekday and date, so two Mondays never share a name.
  const labelledBy = day ? [titleId, subtitleId].filter(Boolean).join(" ") : titleId;
  const describedBy = (day ? [metaId] : [subtitleId, metaId]).filter(Boolean).join(" ") || undefined;

  const copy = day
    ? <span className={styles.systemCopy}>
      <CatchText id={titleId} variant="label-badge" className={styles.dayText}>{title}</CatchText>
      {hasSubtitle ? <CatchText id={subtitleId} variant="display-xs" numeric className={styles.dayText}>{subtitle}</CatchText> : null}
    </span>
    : <span className={styles.systemCopy}>
      <CatchText id={titleId} variant="title-row">{title}</CatchText>
      {hasSubtitle ? <CatchText id={subtitleId} variant="body-small" className={styles.secondary}>{subtitle}</CatchText> : null}
    </span>;
  const metaText = meta ? <CatchText id={metaId} variant="label-action" className={`${styles.secondary} ${styles.meta}`}>{meta}</CatchText> : null;
  const leading = icon ? <span className={styles.leading} aria-hidden="true">{icon}</span> : null;

  const content = variant === "row"
    ? <>{leading}{copy}{metaText}<span className={styles.radio} aria-hidden="true" /></>
    : variant === "tile"
      ? <>{leading}{metaText}{copy}{selected ? <span className={styles.tick} aria-hidden="true"><CatchIcon name="check" size={16} /></span> : null}</>
      : day
        ? copy
        : <>
          <span className={styles.addIcon} aria-hidden="true">{icon ?? <CatchIcon name="add" size={24} />}</span>
          <CatchText id={titleId} variant="label-action" align="center">{title}</CatchText>
        </>;

  return <button type="button" className={styles.system} role={add ? undefined : "radio"} aria-checked={add ? undefined : selected}
    aria-labelledby={labelledBy} aria-describedby={describedBy} disabled={onTap == null} onClick={onTap ?? undefined}
    data-variant={variant} data-selected={selected || undefined} data-format={formatFill ? format : undefined}
    data-day-fill={dayFill || undefined} data-emphasis={emphasis === "regular" ? undefined : emphasis}
    data-on={onTile ? "tile" : catchGroundIsNight(ground) ? "night" : undefined}>
    {content}
    {dashed ? <svg className={styles.dash} aria-hidden="true" focusable="false"><rect width="100%" height="100%" /></svg> : null}
  </button>;
}
