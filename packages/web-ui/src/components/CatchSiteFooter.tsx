import type {ReactNode} from "react";
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
  /** In `columns` columns on a wide page, two on a phone; none leaves out the navigation. */
  groups: readonly CatchSiteFooterGroup[];
  /** The accessible name of the footer navigation, such as "Footer". */
  navLabel: string;
  /** The legal line's first part, under the wordmark. */
  tagline: string;
  /** A product line after the wordmark, such as "for weddings". */
  brandSubBrand?: string;
  /** The legal line's second part, such as who operates the site. */
  note?: string;
  /** Called when a link is followed, such as to record the click. */
  onLinkPressed?: (link: CatchSiteFooterLink) => void;
  /** Link columns on a wide page; defaults to 4. On a phone there are always two. */
  columns?: CatchSiteFooterColumns;
  /**
   * The top band's title, such as a help line, set at the canvas's 22px. With
   * `headerActions` it draws the canvas's top band over a hairline.
   */
  headerTitle?: ReactNode;
  /** The top band's small buttons, at the canvas's 38px. */
  headerActions?: ReactNode;
  /**
   * A free-form top band in place of `headerTitle` and `headerActions`. Its
   * content lies in one row that wraps, its ends pushed apart.
   */
  header?: ReactNode;
  /** Numbered notes under the link columns, such as a statistic's source; each item carries its own number. */
  footnotes?: readonly ReactNode[];
}

/**
 * The design canvas's site footer (playbook KitFooter, `.pg .foot`): an inset
 * card on the ink ground with 36px corners (28px on phones). An optional top
 * band over a hairline, titled link columns, optional footnotes, the giant
 * coral wordmark across the card, and the legal line under it.
 */
export function CatchSiteFooter({
  brandHref,
  brandLabel,
  brandSubBrand,
  columns = 4,
  footnotes = [],
  groups,
  header,
  headerActions,
  headerTitle,
  navLabel,
  note,
  onLinkPressed,
  tagline,
}: CatchSiteFooterProps) {
  const top = headerTitle != null || headerActions != null ? (
    <div className={styles.top}>
      {headerTitle != null ? <h2 className={styles.title}>{headerTitle}</h2> : null}
      {headerActions != null ? <div className={styles.actions}>{headerActions}</div> : null}
    </div>
  ) : header ? <div className={styles.top}>{header}</div> : null;
  return (
    <footer className={styles.footer} data-catch-theme="dark">
      <div className={styles.card}>
        {top}
        {groups.length > 0 ? (
          <nav aria-label={navLabel} className={styles.groups} data-columns={columns}>
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className={styles.heading}>{group.title}</h2>
                <ul className={styles.links}>
                  {group.links.map((link) => (
                    <li key={`${link.href}-${link.label}`}>
                      <a className={styles.link} href={link.href} onClick={onLinkPressed ? () => onLinkPressed(link) : undefined}>
                        {link.label}
                        {link.note ? <>{" "}<span className={styles.note}>{`· ${link.note}`}</span></> : null}
                      </a>
                    </li>
                  ))}
                  {group.trailing ? <li className={styles.link}>{group.trailing}</li> : null}
                </ul>
              </div>
            ))}
          </nav>
        ) : null}
        {footnotes.length > 0 ? (
          <ol className={styles.footnotes}>
            {footnotes.map((footnote, index) => (
              // The notes are a fixed, ordered list: each one's place is its identity.
              <li key={index}>{footnote}</li>
            ))}
          </ol>
        ) : null}
        <p className={styles.mark}>
          <CatchWordmark href={brandHref} size="band" subBrand={brandSubBrand}>{brandLabel}</CatchWordmark>
        </p>
        <div className={styles.legal}>
          <span>{tagline}</span>
          {note ? <span>{note}</span> : null}
        </div>
      </div>
    </footer>
  );
}
