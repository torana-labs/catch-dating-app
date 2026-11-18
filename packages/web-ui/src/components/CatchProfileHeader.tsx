"use client";

import type {ReactNode} from "react";
import {CatchAvatar} from "./CatchAvatar";
import {CatchHeroImage} from "./CatchHeroImage";
import {CatchLegacyText} from "./CatchLegacyText";
import {useCatch} from "./catchRootContext";
import type {Ground, SharedGround} from "./palette";
import styles from "./CatchProfileHeader.module.css";

/** One figure in the stats line, read as "<value> <label>", such as "2,140 followers". */
export interface CatchProfileHeaderStat {
  label: string;
  value: string;
}

/**
 * rail: the WebOrgV2 board's rail header, a 170px cover over the copy and
 * the actions under it. hero: the organiser page's owner-approved hero
 * (17 Nov 2026), the cover across the content width with a 144px logo over
 * its foot, then the copy on the left and the actions on the right, at the
 * foot of the copy; a page narrower than 840px stacks the actions under it.
 */
export type CatchProfileHeaderLayout = "rail" | "hero";

export interface CatchProfileHeaderProps {
  /** Controls under the identity, such as follow and share buttons. */
  actions?: ReactNode;
  /** Labels under the name, such as a women-led badge. */
  badges?: ReactNode;
  /** The cover photo's alternative text. Without one the photo is decorative. */
  coverAlt?: string;
  /** The cover's ground when there is no photo; defaults to coral. */
  coverGround?: Ground;
  coverUrl?: string | null;
  /** Defaults to rail. */
  layout?: CatchProfileHeaderLayout;
  /** A line under the headline, such as the area and handle. */
  meta?: string;
  /** Defaults to the first letters of the name. */
  monogram?: string;
  /** The monogram's ground; defaults to white. */
  monogramGround?: SharedGround;
  name: string;
  /** The name's element, by document outline; defaults to h1. */
  nameElement?: "h1" | "h2";
  /** The one-line description under the name. */
  headline?: string;
  stats?: readonly CatchProfileHeaderStat[];
  /** A neutral note under the name, such as "Built from public pages · not claimed yet". */
  tag?: string;
  /** Shows the verified seal beside the name, read aloud as this label. */
  verifiedLabel?: string;
}

/** The monogram's outer size by layout: the board's 88px rail logo, or the hero's 144px (96px below 840px). */
const monogramSize = {rail: 88, hero: 144, heroCompact: 96} as const;
/** The white ring round the monogram. */
const monogramRing = 4;

/**
 * Website v2 profile header: a cover with the monogram over its foot, the
 * name with an optional verified seal, a tag, any badges, the headline, a
 * meta line and a stats line, then the caller's actions: under the copy in
 * the rail layout, across from it in the hero.
 */
export function CatchProfileHeader({
  actions,
  badges,
  coverAlt,
  coverGround = "coral",
  coverUrl,
  layout = "rail",
  meta,
  monogram,
  monogramGround = "white",
  name,
  nameElement = "h1",
  headline,
  stats = [],
  tag,
  verifiedLabel,
}: CatchProfileHeaderProps) {
  const {sizeClass} = useCatch();
  const photo = Boolean(coverUrl?.trim());
  const hero = layout === "hero";
  const size = hero ? (sizeClass === "expanded" ? monogramSize.hero : monogramSize.heroCompact) : monogramSize.rail;
  const copy = (
    <div className={styles.copy}>
      <span className={styles.nameRow}>
        <CatchLegacyText as={nameElement} variant="displayM">{name}</CatchLegacyText>
        {verifiedLabel ? (
          <svg aria-label={verifiedLabel} className={styles.seal} focusable="false" role="img" viewBox="0 0 24 24">
            <title>{verifiedLabel}</title>
            <path d="M12 2l2.4 2.1 3.2-.3.7 3.1 2.8 1.6-1.3 2.9 1.3 2.9-2.8 1.6-.7 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.7-3.1-2.8-1.6 1.3-2.9-1.3-2.9 2.8-1.6.7-3.1 3.2.3z" />
            <path className={styles.check} d="M8.5 12l2.5 2.5 4.5-5" />
          </svg>
        ) : null}
      </span>
      {tag ? <span className={styles.tag}><CatchLegacyText as="span" color="inherit" variant="statusLabel">{tag}</CatchLegacyText></span> : null}
      {badges ? <div className={styles.badges}>{badges}</div> : null}
      {headline ? <CatchLegacyText variant="bodyL">{headline}</CatchLegacyText> : null}
      {meta ? <CatchLegacyText color="ink2" variant="bodyM">{meta}</CatchLegacyText> : null}
      {stats.length ? (
        <p className={styles.stats}>
          {stats.map((stat) => (
            <CatchLegacyText as="span" key={`${stat.value} ${stat.label}`} variant="bodyM">
              <strong className={styles.value}>{stat.value}</strong>{` ${stat.label}`}
            </CatchLegacyText>
          ))}
        </p>
      ) : null}
    </div>
  );
  return (
    <div className={styles.header} data-layout={layout}>
      <div className={styles.identity}>
        <span className={styles.cover} data-ground={photo ? undefined : coverGround}>
          {photo ? <CatchHeroImage imageUrl={coverUrl} semanticLabel={coverAlt} showScrim={false} /> : null}
        </span>
        <span aria-hidden="true" className={styles.monogram}>
          <CatchAvatar
            borderColor="var(--catch-palette-white)"
            borderWidth={monogramRing}
            ground={monogramGround}
            initials={monogram}
            name={name}
            recipe="monogram"
            size={size}
          />
        </span>
      </div>
      {hero ? (
        <div className={styles.heroRow}>
          {copy}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      ) : (
        <>
          {copy}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </>
      )}
    </div>
  );
}
