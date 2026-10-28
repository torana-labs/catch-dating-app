import type {ReactNode} from "react";
import {CatchAvatar} from "./CatchAvatar";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchOrganizerCard.module.css";

export interface CatchOrganizerCardProps {
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

/**
 * A Website v2 organiser card on paper: monogram, name and what they run,
 * the next plan, then a footnote across from an action.
 */
export function CatchOrganizerCard({action, footnote, href, initials, monogramGround, name, next, subtitle}: CatchOrganizerCardProps) {
  const title = <CatchText as="span" color="inherit" maxLines={2} variant="titleS">{name}</CatchText>;
  return (
    <article className={styles.card} data-catch-theme="light" data-ground="paper">
      <div className={styles.identity}>
        <CatchAvatar ground={monogramGround} initials={initials} name={name} recipe="monogram" size={52} />
        <div className={styles.names}>
          <CatchText as="h3" color="inherit" variant="titleS">
            {href ? <a className={styles.link} href={href}>{title}</a> : title}
          </CatchText>
          <CatchText as="p" color="ink2" variant="bodyS">{subtitle}</CatchText>
        </div>
      </div>
      <CatchText as="p" variant="bodyS">{next}</CatchText>
      <div className={styles.foot}>
        <CatchText as="span" color="ink2" variant="supportingStrong">{footnote}</CatchText>
        {action}
      </div>
    </article>
  );
}
