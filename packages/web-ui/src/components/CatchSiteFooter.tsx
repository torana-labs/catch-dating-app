import type {ReactNode} from "react";
import {CatchBand} from "./CatchBand";
import {CatchLegacyText} from "./CatchLegacyText";
import {CatchText} from "./CatchText";
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

/** How many link columns a wide page shows. */
export type CatchSiteFooterColumns = 2 | 3 | 4 | 5;

export interface CatchSiteFooterProps {
  brandHref: string;
  /** The wordmark, such as "Catch". */
  brandLabel: string;
  /** In `columns` columns on a wide page, two below 840px; none leaves out the navigation. */
  groups: readonly CatchSiteFooterGroup[];
  /** The accessible name of the footer navigation, such as "Footer". */
  navLabel: string;
  /** The line across from the wordmark. */
  tagline: string;
  /** A product line after the wordmark, such as "for weddings". */
  brandSubBrand?: string;
  /** A quiet line under the tagline, such as who operates the site. */
  note?: string;
  /** Called when a link is followed, such as to record the click. */
  onLinkPressed?: (link: CatchSiteFooterLink) => void;
  /** Link columns on a wide page; defaults to 4. Below 840px there are always two. */
  columns?: CatchSiteFooterColumns;
  /**
   * A band across the top of the footer, over a hairline, such as a help
   * line with its actions. Its content lies in one row that wraps, its ends
   * pushed apart; the caller supplies the heading and D20 buttons.
   */
  header?: ReactNode;
  /** Numbered notes under the link columns, such as a statistic's source; each item carries its own number. */
  footnotes?: readonly ReactNode[];
}

/**
 * The Website v2 site footer on the ink ground: an optional header band over
 * a hairline, titled link columns (four by default, up to five), each link
 * flush with its title and the rows evenly spaced, optional footnotes, then
 * the wordmark with the tagline on its baseline.
 */
export function CatchSiteFooter({
  brandHref,
  brandLabel,
  brandSubBrand,
  columns = 4,
  footnotes = [],
  groups,
  header,
  navLabel,
  note,
  onLinkPressed,
  tagline,
}: CatchSiteFooterProps) {
  return (
    <CatchBand as="footer" ground="ink" pb="compact" pt="regular">
      {header ? <div className={styles.header}>{header}</div> : null}
      {groups.length > 0 ? (
        <nav aria-label={navLabel} className={styles.groups} data-columns={columns}>
          {groups.map((group) => (
            <div className={styles.group} key={group.title}>
              <CatchLegacyText as="h2" color="ink2" variant="supportingStrong">{group.title}</CatchLegacyText>
              <ul className={styles.links}>
                {group.links.map((link) => (
                  <li key={`${link.href}-${link.label}`}>
                    <a className={styles.link} href={link.href} onClick={onLinkPressed ? () => onLinkPressed(link) : undefined}>
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
      ) : null}
      {footnotes.length > 0 ? (
        <ol className={styles.footnotes}>
          {footnotes.map((footnote, index) => (
            // The notes are a fixed, ordered list: each one's place is its identity.
            <li key={index}><CatchText tone="secondary" variant="body-meta">{footnote}</CatchText></li>
          ))}
        </ol>
      ) : null}
      <div className={styles.base}>
        <CatchWordmark href={brandHref} size="band" subBrand={brandSubBrand}>{brandLabel}</CatchWordmark>
        <div className={styles.lines}>
          <CatchLegacyText as="p" color="ink2" variant="supporting">{tagline}</CatchLegacyText>
          {note ? <CatchLegacyText as="p" color="ink2" variant="supporting">{note}</CatchLegacyText> : null}
        </div>
      </div>
    </CatchBand>
  );
}
