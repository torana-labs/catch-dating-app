"use client";

import type {Ground} from "./palette";
import {CatchButton} from "./CatchButton";
import {CatchText} from "./CatchText";
import styles from "./CatchBreadcrumbRow.module.css";

/** One page above the current one. */
export interface CatchBreadcrumbRowLink {
  href: string;
  /** Resolved copy; the caller localizes it. */
  label: string;
}

export interface CatchBreadcrumbRowProps {
  /** The pages above the current one, outermost first. */
  links: readonly CatchBreadcrumbRowLink[];
  /** The current page's name: the last item, marked as the current page and not a link. */
  current: string;
  /** The navigation's accessible name, such as "Breadcrumb". Resolved copy. */
  label: string;
  /**
   * The Website v2 ground the row sits on, when no CatchSurface band tells it:
   * its text takes that ground's inks, and the ink ground the dark theme.
   * Leave it out inside a band, whose ground the row already reads.
   */
  ground?: Ground;
  /** Called when a link is followed, such as to record the click. */
  onLinkPressed?: (link: CatchBreadcrumbRowLink) => void;
}

/**
 * Where the current page sits in the site: a navigation landmark holding an
 * ordered list of the pages above it, each a neutral text link (a text
 * CatchButton with an href), separated by a quiet slash, and then the
 * current page in ink, marked `aria-current="page"`. The row wraps on a
 * narrow page and draws no box; it takes the inks of the band or ground it
 * sits on.
 */
export function CatchBreadcrumbRow({links, current, label, ground, onLinkPressed}: CatchBreadcrumbRowProps) {
  return (
    <nav
      aria-label={label}
      className={ground ? `${styles.row} ${styles.onGround}` : styles.row}
      data-catch-theme={ground ? (ground === "ink" ? "dark" : "light") : undefined}
      data-ground={ground}
    >
      <ol className={styles.list}>
        {links.map((link) => (
          <li className={styles.item} key={`${link.href}-${link.label}`}>
            <CatchButton
              href={link.href}
              label={link.label}
              onPressed={onLinkPressed ? () => onLinkPressed(link) : undefined}
              recipe="text"
              tone="neutral"
            />
            <span aria-hidden="true" className={styles.separator}>/</span>
          </li>
        ))}
        <li className={styles.item}>
          <CatchText aria-current="page" className={styles.current} variant="label-action">{current}</CatchText>
        </li>
      </ol>
    </nav>
  );
}
