import type {ReactNode} from "react";
import {CatchBand} from "./CatchBand";
import {CatchLegacyText} from "./CatchLegacyText";
import {CatchWordmark} from "./CatchWordmark";
import styles from "./CatchSiteFooter.module.css";

export interface CatchSiteFooterLink {
  href: string;
  label: string;
  /** A quiet note after the label, such as "soon" for a city not yet open. */
  note?: string;
}

export interface CatchSiteFooterGroup {
  title: string;
  links: readonly CatchSiteFooterLink[];
  /**
   * A control after the links, drawn in the links' type and colour, such as
   * the site's "Privacy choices" at the end of Help and legal.
   */
  trailing?: ReactNode;
}

export interface CatchSiteFooterProps {
  brandHref: string;
  /** The wordmark, such as "Catch". */
  brandLabel: string;
  /** Four columns on a wide page, two below 840px. */
  groups: readonly CatchSiteFooterGroup[];
  /** The accessible name of the footer navigation, such as "Footer". */
  navLabel: string;
  /** The line across from the wordmark. */
  tagline: string;
}

/** The Website v2 site footer on the ink ground: link columns, then the wordmark and tagline. */
export function CatchSiteFooter({brandHref, brandLabel, groups, navLabel, tagline}: CatchSiteFooterProps) {
  return (
    <CatchBand as="footer" ground="ink" pb="compact" pt="regular">
      <nav aria-label={navLabel} className={styles.groups}>
        {groups.map((group) => (
          <div className={styles.group} key={group.title}>
            <CatchLegacyText as="h2" color="ink2" variant="supportingStrong">{group.title}</CatchLegacyText>
            <ul className={styles.links}>
              {group.links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <a className={styles.link} href={link.href}>
                    <CatchLegacyText as="span" color="inherit" variant="bodyM">{link.label}</CatchLegacyText>
                    {link.note ? <>{" "}<CatchLegacyText as="span" color="ink2" variant="supporting">{`· ${link.note}`}</CatchLegacyText></> : null}
                  </a>
                </li>
              ))}
              {group.trailing ? (
                <li className={styles.link}>
                  <CatchLegacyText as="span" color="inherit" variant="bodyM">{group.trailing}</CatchLegacyText>
                </li>
              ) : null}
            </ul>
          </div>
        ))}
      </nav>
      <div className={styles.base}>
        <CatchWordmark href={brandHref} size="band">{brandLabel}</CatchWordmark>
        <CatchLegacyText as="p" color="ink2" variant="supporting">{tagline}</CatchLegacyText>
      </div>
    </CatchBand>
  );
}
