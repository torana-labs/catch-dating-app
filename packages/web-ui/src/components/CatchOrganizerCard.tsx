"use client";

import type {ReactNode} from "react";
import {CatchAvatar} from "./CatchAvatar";
import {CatchButton} from "./CatchButton";
import type {CatchFormat} from "./catchCoreVocabulary";
import {CatchLegacyText} from "./CatchLegacyText";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchOrganizerCard.module.css";

/** The system OrganiserCard: a tile with the logo square, name, a line about them and follow. */
export interface CatchOrganizerCardSystemProps {
  monogramGround?: undefined;
  name: string;
  /** Two letters for the logo square when there is no logo. */
  initials?: string;
  logoUrl?: string;
  /** The logo square's format colour; games by default. */
  color?: CatchFormat;
  meta?: ReactNode;
  following?: boolean;
  onFollow?: () => void;
  followLabel?: string;
  followingLabel?: string;
  href?: string;
}

/** The Website v2 paper card: monogram, name and subtitle, the next plan and a foot. */
export interface CatchOrganizerCardLegacyProps {
  name: string;
  /** What they run, such as "Sunday social runs". */
  subtitle: string;
  /** The monogram ground, usually the accent of the organiser's main format. */
  monogramGround: Ground;
  /** Defaults to the name's initials. */
  initials?: string;
  /** The organiser's page; the name links to it when given. */
  href?: string;
  /** The next plan, such as "Next: Fri 6:30 AM · Carter Road Social Run". */
  next: string;
  /** The quiet line at the foot, such as "212 followers" or "Joining at launch". */
  footnote: string;
  /** The foot's action, such as a Follow button or a claim link. */
  action?: ReactNode;
}

export type CatchOrganizerCardProps = CatchOrganizerCardSystemProps | CatchOrganizerCardLegacyProps;

/**
 * A Website v2 organiser card on paper: monogram, name and what they run,
 * the next plan, then a footnote across from an action.
 */
export function CatchOrganizerCard(props: CatchOrganizerCardProps) {
  return props.monogramGround === undefined ? <SystemOrganizerCard {...props} /> : <PaperOrganizerCard {...props} />;
}

function SystemOrganizerCard({name, initials, logoUrl, color = "games", meta, following, onFollow, followLabel = "Follow", followingLabel = "Following", href}: CatchOrganizerCardSystemProps) {
  const identity = (
    <>
      <span className={styles.logo} data-format={color}>{logoUrl ? <img alt="" src={logoUrl} /> : initials}</span>
      <span className={styles.text}>
        <CatchText maxLines={1} variant="title-row">{name}</CatchText>
        {meta ? <CatchText maxLines={1} tone="secondary" variant="body-small">{meta}</CatchText> : null}
      </span>
    </>
  );
  return (
    <CatchSurface className={styles.system}>
      {href ? <a className={styles.main} href={href}>{identity}</a> : <span className={styles.main}>{identity}</span>}
      {onFollow ? (
        <CatchButton label={following ? followingLabel : followLabel} onPressed={onFollow} size="sm" variant={following ? "secondary" : "primary"} />
      ) : null}
    </CatchSurface>
  );
}

function PaperOrganizerCard({action, footnote, href, initials, monogramGround, name, next, subtitle}: CatchOrganizerCardLegacyProps) {
  const title = <CatchLegacyText as="span" color="inherit" maxLines={2} variant="titleS">{name}</CatchLegacyText>;
  return (
    <article className={styles.card} data-catch-theme="light" data-ground="paper">
      <div className={styles.identity}>
        <CatchAvatar ground={monogramGround} initials={initials} name={name} recipe="monogram" size={52} />
        <div className={styles.names}>
          <CatchLegacyText as="h3" color="inherit" variant="titleS">
            {href ? <a className={styles.link} href={href}>{title}</a> : title}
          </CatchLegacyText>
          <CatchLegacyText as="p" color="ink2" variant="bodyS">{subtitle}</CatchLegacyText>
        </div>
      </div>
      <CatchLegacyText as="p" variant="bodyS">{next}</CatchLegacyText>
      <div className={styles.foot}>
        <CatchLegacyText as="span" color="ink2" variant="supportingStrong">{footnote}</CatchLegacyText>
        {action}
      </div>
    </article>
  );
}
