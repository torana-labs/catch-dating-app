"use client";

import {useId, type HTMLAttributes, type ReactNode} from "react";
import {catchBandActions, catchBandColor, type CatchBandAction} from "./catchBandParts";
import type {CatchTextTone} from "./catchCoreVocabulary";
import {CatchBandHeader} from "./CatchBandHeader";
import {CatchStack} from "./CatchStack";
import {CatchStoreButton, type CatchStoreButtonProps} from "./CatchStoreButton";
import {CatchSurface} from "./CatchSurface";
import type {Ground} from "./palette";
import styles from "./CatchCtaSection.module.css";

export interface CatchCtaSectionProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The headline. Resolved copy; the caller localizes it. */
  title: string;
  /** Defaults to 2. */
  level?: 1 | 2;
  kicker?: string;
  kickerTone?: CatchTextTone;
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
}

/**
 * The closing call to action of a website page (the playbook kit's final
 * band): a CatchBandHeader, D20 actions, store badges and a capture slot for
 * the page's own phone form, beside an optional media column, on a Website
 * v2 ground. The columns stack below 840px. The band is a section named by
 * its headline.
 */
export function CatchCtaSection({
  title,
  level = 2,
  kicker,
  kickerTone,
  lead,
  actions,
  stores,
  capture,
  media,
  flush = false,
  ground,
  ...rest
}: CatchCtaSectionProps) {
  const titleId = `${useId()}-title`;
  const isFlush = flush && media != null;
  const copy = (
    <CatchStack className={styles.copy} gap={24}>
      <CatchBandHeader kicker={kicker} kickerTone={kickerTone} lead={lead} level={level} title={title} titleId={titleId} />
      {catchBandActions(actions)}
      {capture != null ? <div className={styles.capture}>{capture}</div> : null}
      {stores && stores.length > 0 ? (
        <CatchStack as="ul" className={styles.stores} direction="row" gap={12} wrap>
          {stores.map((store) => <li key={store.store}><CatchStoreButton {...store} /></li>)}
        </CatchStack>
      ) : null}
    </CatchStack>
  );
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
