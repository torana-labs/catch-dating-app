import {CatchBand} from "./CatchBand";
import {CatchText} from "./CatchText";
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
            <CatchText as="h2" color="ink2" variant="supportingStrong">{group.title}</CatchText>
            <ul className={styles.links}>
              {group.links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <a className={styles.link} href={link.href}>
                    <CatchText as="span" color="inherit" variant="bodyM">{link.label}</CatchText>
                    {link.note ? <>{" "}<CatchText as="span" color="ink2" variant="supporting">{`· ${link.note}`}</CatchText></> : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className={styles.base}>
        <a className={styles.brand} href={brandHref}>
          <CatchText as="span" color="inherit" variant="displayL">{brandLabel}</CatchText>
        </a>
        <CatchText as="p" color="ink2" variant="supporting">{tagline}</CatchText>
      </div>
    </CatchBand>
  );
}
