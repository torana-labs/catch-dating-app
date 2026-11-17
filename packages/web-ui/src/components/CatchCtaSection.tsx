"use client";

import {useId, type HTMLAttributes, type ReactNode} from "react";
import {catchBandActions, catchBandColor, catchBandKickerAccent, type CatchBandAction} from "./catchBandParts";
import type {CatchTextTone} from "./catchCoreVocabulary";
import {CatchBandHeader, type CatchBandHeaderSize, type CatchKickerAccent} from "./CatchBandHeader";
import {CatchStack} from "./CatchStack";
import {CatchStoreButton, type CatchStoreButtonProps} from "./CatchStoreButton";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchCtaSection.module.css";

/**
 * One tile of the bento grid around the call to action (the homepage's app
 * band, .bento .tile): a colour or ink tile with a pill tag at its top, an
 * optional small white card, and one line at its foot.
 */
export interface CatchCtaSectionTile {
  id: string;
  ground: Ground;
  /** The pill tag, such as "Reminders". */
  tag: string;
  body: string;
  /** A small white card between the tag and the line, such as the soonest plan. */
  aside?: ReactNode;
  /** Spans two columns: the first wide tile under the tiles before the call to action, the second under those after it. */
  wide?: boolean;
}

export interface CatchCtaSectionProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The headline. Resolved copy; the caller localizes it. */
  title: string;
  /** Defaults to 2. */
  level?: 1 | 2;
  kicker?: string;
  kickerTone?: CatchTextTone;
  /** The kicker's accent on white, paper and ink; defaults to the kit's (indigo, coral on ink). A colour ground takes its secondary ink. */
  kickerAccent?: CatchKickerAccent;
  /** The canvas headline size; defaults to section (56px, 36px on phones). The homepage's app band takes feature. */
  titleSize?: CatchBandHeaderSize;
  lead?: string;
  /** D20 buttons: the first primary and the rest secondary unless named. */
  actions?: readonly CatchBandAction[];
  /** App store badges, in order; each is a CatchStoreButton. */
  stores?: readonly CatchStoreButtonProps[];
  /**
   * The phone-number capture under the actions: the page passes its real
   * form (a CatchField and a submit button), which owns its state and submit.
   */
  capture?: ReactNode;
  /** The second column, usually a phone CatchScreenPreview. */
  media?: ReactNode;
  /** The media runs to the band's bottom edge. Needs media. */
  flush?: boolean;
  /** The band's Website v2 ground; text takes its inks, and ink the dark theme. Defaults to the plain band. */
  ground?: Ground;
  /**
   * The bento grid (the homepage's app band): the copy and capture sit in a
   * paper tile in the middle column, two rows tall, with the first two tiles
   * before it, the next two after it and the wide tiles under them. Takes the
   * place of media.
   */
  tiles?: readonly CatchCtaSectionTile[];
}

function BentoTile({tile, wide}: {tile: CatchCtaSectionTile; wide?: "start" | "end"}) {
  return (
    <div className={styles.tile} data-catch-theme={tile.ground === "ink" ? "dark" : "light"} data-ground={tile.ground} data-wide={wide}>
      <CatchText as="span" className={styles.tag} variant="label-badge">{tile.tag}</CatchText>
      {tile.aside != null ? <div className={styles.mini} data-catch-theme="light">{tile.aside}</div> : null}
      <CatchText as="p" className={styles.tileBody} variant="body">{tile.body}</CatchText>
    </div>
  );
}

/**
 * The closing call to action of a website page (the playbook kit's final
 * band): a CatchBandHeader, D20 actions, store badges and a capture slot for
 * the page's own phone form, beside an optional media column, or in the
 * middle of a bento grid of tiles, on a Website v2 ground. The columns stack
 * below 840px. The band is a section named by
 * its headline.
 */
export function CatchCtaSection({
  title,
  level = 2,
  kicker,
  kickerTone,
  kickerAccent,
  titleSize = "section",
  lead,
  actions,
  stores,
  capture,
  media,
  flush = false,
  ground,
  tiles,
  ...rest
}: CatchCtaSectionProps) {
  const titleId = `${useId()}-title`;
  const isFlush = flush && media != null;
  const copy = (
    <CatchStack className={styles.copy} gap={24}>
      <CatchBandHeader kicker={kicker} kickerAccent={catchBandKickerAccent(kickerAccent, ground, "indigo")} kickerTone={kickerTone} lead={lead} level={level} size={titleSize} title={title} titleId={titleId} />
      {catchBandActions(actions)}
      {capture != null ? <div className={styles.capture}>{capture}</div> : null}
      {stores && stores.length > 0 ? (
        <CatchStack as="ul" className={styles.stores} direction="row" gap={12} wrap>
          {stores.map((store) => <li key={store.store}><CatchStoreButton {...store} /></li>)}
        </CatchStack>
      ) : null}
    </CatchStack>
  );
  if (tiles && tiles.length > 0) {
    let wideCount = 0;
    const tile = (item: CatchCtaSectionTile) => {
      const wide = item.wide ? (wideCount++ === 0 ? "start" : "end") : undefined;
      return <BentoTile key={item.id} tile={item} wide={wide} />;
    };
    const narrow = tiles.filter((item) => !item.wide);
    const wide = tiles.filter((item) => item.wide);
    return (
      <CatchSurface {...rest} aria-labelledby={titleId} as="section" block="band" color={catchBandColor(ground)} data-layout="bento">
        <div className={styles.bento}>
          {narrow.slice(0, 2).map(tile)}
          <div className={styles.mid} data-catch-theme="light">{copy}</div>
          {narrow.slice(2).map(tile)}
          {wide.map(tile)}
        </div>
      </CatchSurface>
    );
  }
  return (
    <CatchSurface
      {...rest}
      aria-labelledby={titleId}
      as="section"
      block="band"
      color={catchBandColor(ground)}
      data-flush={isFlush ? "" : undefined}
      padding={isFlush ? "none" : undefined}
    >
      {media != null ? (
        <CatchStack align={isFlush ? "end" : "center"} className={isFlush ? styles.flush : undefined} collapseBelow="expanded" direction="row" equal gap={64}>
          <div className={styles.text}>{copy}</div>
          <div className={styles.media}>{media}</div>
        </CatchStack>
      ) : copy}
    </CatchSurface>
  );
}
