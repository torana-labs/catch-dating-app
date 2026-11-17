"use client";

import type {HTMLAttributes} from "react";
import {catchGroundIsNight, type CatchGround, type CatchTextTone} from "./catchCoreVocabulary";
import {useCatch} from "./catchRootContext";
import type {Ground} from "./palette";
import {CatchStack} from "./CatchStack";
import {CatchText} from "./CatchText";
import styles from "./CatchBandHeader.module.css";

/** start: flush with the band's edge. center: centred, the lead held to the reading lane. */
export type CatchBandHeaderAlign = "start" | "center";

/** column: kicker, headline and lead stacked. row: the lead across from the headline, stacked below medium. */
export type CatchBandHeaderDirection = "column" | "row";

/**
 * The canvas's display headline sizes (D26, playbook-panels.css .d-hero,
 * .d-sec and .d-sm): hero 80px (44px on phones), section 56px (36px), feature
 * 42px (32px), the homepage's app band, and small 30px (26px). All take the
 * hero role's weight, .98 leading and -0.03em tracking; small keeps the
 * display-section role's 1.05 leading.
 */
export type CatchBandHeaderSize = "hero" | "section" | "feature" | "small";

/**
 * A kicker's accent (playbook kit `.k` colours): the palette's deep tone on
 * white and paper, its bright fill on the ink ground. On a colour ground a
 * kicker takes the ground's secondary ink, whatever its accent.
 */
export type CatchKickerAccent = "pink" | "mint" | "indigo" | "coral" | "yellow";

/** Where a kicker sits: day (white or paper), night (the ink ground) or a colour ground. */
type KickerGround = "day" | "night" | "colour";

function kickerGround(ground: Ground | undefined, context: CatchGround): KickerGround {
  if (ground) return ground === "ink" ? "night" : ground === "white" || ground === "paper" ? "day" : "colour";
  if (catchGroundIsNight(context)) return "night";
  return context === "colour" ? "colour" : "day";
}

interface CatchBandKickerProps {
  children: string;
  /** The accent the kicker takes on white, paper and ink; leave it out for the secondary ink. */
  accent?: CatchKickerAccent;
  /** An explicit tone instead of an accent, such as success on a legal page. */
  tone?: CatchTextTone;
  align?: "center";
  /** The Website v2 ground, when no surface tells the kicker what it sits on. */
  ground?: Ground;
}

/**
 * A section kicker in the canvas's type (13px/18px at .04em) and colour: its
 * accent on white, paper and ink, the ground's secondary ink on a colour, or
 * an explicit tone. CatchBandHeader draws one; sections whose kicker sits
 * outside a header (a price, a story) draw it directly.
 */
export function CatchBandKicker({children, accent, tone, align, ground}: CatchBandKickerProps) {
  const on = kickerGround(ground, useCatch().ground);
  const accented = tone == null && accent != null && on !== "colour";
  return (
    <CatchText
      align={align}
      className={styles.kicker}
      data-accent={accented ? accent : undefined}
      data-on={accented ? on : undefined}
      tone={accented ? "inherit" : tone ?? "secondary"}
      variant="label-kicker"
    >
      {children}
    </CatchText>
  );
}

export interface CatchBandHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The headline. Resolved copy; the caller localizes it. */
  title: string;
  /** A short label above the headline. */
  kicker?: string;
  /** The kicker's colour as a tone; it wins over kickerAccent. Without either, the secondary ink of what the header sits on. */
  kickerTone?: CatchTextTone;
  /** The kicker's accent on white, paper and ink (a colour ground always takes its secondary ink). */
  kickerAccent?: CatchKickerAccent;
  /** One or two sentences under (or across from) the headline, in the secondary ink. */
  lead?: string;
  /** Renders the headline as an h1 or an h2. Defaults to 2. */
  level?: 1 | 2;
  /** The canvas headline size; without one the headline takes the page-title role (38, 48 and 64px by size class). */
  size?: CatchBandHeaderSize;
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
 * an optional lead. The headline takes one of the canvas's sizes (D26), or
 * the page-title role (38, 48 and 64px by size class) without one. A row header
 * sets the lead across from the headline on a wide page, as the host landing's
 * sections do. It draws no box; the band behind it owns the fill. It renders a
 * plain div, not a header element: a page has many bands, and a header outside
 * a section or article is a banner landmark, which a page may have only once.
 */
export function CatchBandHeader({
  title,
  kicker,
  kickerTone,
  kickerAccent,
  lead,
  level = 2,
  size,
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
      {kicker ? <CatchBandKicker accent={kickerAccent} align={textAlign} ground={ground} tone={kickerTone}>{kicker}</CatchBandKicker> : null}
      <CatchText
        align={textAlign}
        as={level === 1 ? "h1" : "h2"}
        className={styles.title}
        data-display={size}
        id={titleId}
        variant={size ? (size === "small" ? "display-section" : "display-hero") : "page-title"}
      >
        {title}
      </CatchText>
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
