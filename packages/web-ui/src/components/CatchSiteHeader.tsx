import type {ReactNode} from "react";
import {CatchBand} from "./CatchBand";
import {CatchText} from "./CatchText";
import styles from "./CatchSiteHeader.module.css";

export interface CatchSiteHeaderLink {
  href: string;
  label: string;
  /** Marks the link to the page being shown. */
  current?: boolean;
  /**
   * Kept on a page narrower than 840px. Other links leave the bar there, as
   * the boards do; the footer carries every one of them.
   */
  compact?: boolean;
}

export interface CatchSiteHeaderProps {
  brandHref: string;
  /** The wordmark, such as "Catch". */
  brandLabel: string;
  links: readonly CatchSiteHeaderLink[];
  /** The accessible name of the navigation, such as "Main". */
  navLabel: string;
  /** Controls after the links on every width, such as a city picker. */
  actions?: ReactNode;
  /** Controls after those on a page at least 840px wide, such as "Get the app". */
  wideActions?: ReactNode;
}

/**
 * The Website v2 site header: the wordmark, the main links and the page's own
 * controls on one row, at the page content width.
 */
export function CatchSiteHeader({actions, brandHref, brandLabel, links, navLabel, wideActions}: CatchSiteHeaderProps) {
  return (
    <CatchBand as="header" pb="none" pt="none">
      <div className={styles.row}>
        <a className={styles.brand} href={brandHref}>
          <CatchText as="span" color="inherit" variant="displayS">{brandLabel}</CatchText>
        </a>
        <nav aria-label={navLabel} className={styles.nav}>
          <ul className={styles.links}>
            {links.map((link) => (
              <li data-compact={link.compact || undefined} key={link.href}>
                <a aria-current={link.current ? "page" : undefined} className={styles.link} href={link.href}>
                  <CatchText as="span" color="inherit" variant="supportingStrong">{link.label}</CatchText>
                </a>
              </li>
            ))}
          </ul>
          {actions}
          {wideActions ? <span className={styles.wide}>{wideActions}</span> : null}
        </nav>
      </div>
    </CatchBand>
  );
}
