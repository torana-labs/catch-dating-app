"use client";

import type {HTMLAttributes} from "react";
import type {CatchTextTone} from "./catchCoreVocabulary";
import type {Ground} from "./palette";
import {CatchStack} from "./CatchStack";
import {CatchText} from "./CatchText";
import styles from "./CatchBandHeader.module.css";

/** start: flush with the band's edge. center: centred, the lead held to the reading lane. */
export type CatchBandHeaderAlign = "start" | "center";

/** column: kicker, headline and lead stacked. row: the lead across from the headline, stacked below medium. */
export type CatchBandHeaderDirection = "column" | "row";

export interface CatchBandHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The headline. Resolved copy; the caller localizes it. */
  title: string;
  /** A short label above the headline. */
  kicker?: string;
  /** The kicker's colour; defaults to the secondary ink of what the header sits on. */
  kickerTone?: CatchTextTone;
  /** One or two sentences under (or across from) the headline, in the secondary ink. */
  lead?: string;
  /** Renders the headline as an h1 or an h2; both take the page-title role. Defaults to 2. */
  level?: 1 | 2;
  /** Defaults to start. A row header always starts at the edge. */
  align?: CatchBandHeaderAlign;
  /** Defaults to column. */
  direction?: CatchBandHeaderDirection;
  /**
   * The Website v2 ground the header sits on, when no CatchSurface band tells
   * it: its text takes that ground's inks, and the ink ground the dark theme.
   * Leave it out inside a band, whose ground the header already reads.
   */
  ground?: Ground;
  /** The headline's id, for the band's aria-labelledby. */
  titleId?: string;
}

/**
 * The opening of a website band: an optional kicker, a display headline and
 * an optional lead. The headline takes the page-title role (38, 48 and 64px by
 * size class), inside the 72px cap of blueprint D19 at every size. A row header
 * sets the lead across from the headline on a wide page, as the host landing's
 * sections do. It draws no box; the band behind it owns the fill. It renders a
 * plain div, not a header element: a page has many bands, and a header outside
 * a section or article is a banner landmark, which a page may have only once.
 */
export function CatchBandHeader({
  title,
  kicker,
  kickerTone = "secondary",
  lead,
  level = 2,
  align = "start",
  direction = "column",
  ground,
  titleId,
  ...rest
}: CatchBandHeaderProps) {
  const row = direction === "row";
  const textAlign = !row && align === "center" ? "center" : undefined;
  const heading = (
    <>
      {kicker ? <CatchText align={textAlign} tone={kickerTone} variant="label-kicker">{kicker}</CatchText> : null}
      <CatchText align={textAlign} as={level === 1 ? "h1" : "h2"} className={styles.title} id={titleId} variant="page-title">{title}</CatchText>
    </>
  );
  const leadText = lead
    ? <CatchText align={textAlign} as="p" className={styles.lead} tone="secondary" variant="body-lead">{lead}</CatchText>
    : null;
  return (
    <div
      {...rest}
      className={ground ? `${styles.header} ${styles.onGround}` : styles.header}
      data-align={row ? "start" : align}
      data-catch-theme={ground ? (ground === "ink" ? "dark" : "light") : undefined}
      data-direction={direction}
      data-ground={ground}
    >
      {row ? (
        <CatchStack align="end" collapseBelow="medium" direction="row" equal gap={48}>
          <CatchStack className={styles.part} gap={16}>{heading}</CatchStack>
          {leadText ? <div className={styles.part}>{leadText}</div> : null}
        </CatchStack>
      ) : (
        <CatchStack align={align === "center" ? "center" : undefined} gap={16}>
          {heading}
          {leadText}
        </CatchStack>
      )}
    </div>
  );
}
