import type {ReactNode} from "react";
import {CatchText} from "./CatchText";
import type {PaletteAccent} from "./palette";
import styles from "./CatchLinkTile.module.css";

export interface CatchLinkTileProps {
  /** The pinned tile's ground; defaults to coral. Unpinned tiles sit on paper. */
  accent?: PaletteAccent;
  href: string;
  /** A 22px glyph in the leading icon tile; without one the tile has no icon tile. */
  icon?: ReactNode;
  /** Opens the link in a new tab; `newTabLabel` then tells screen readers. */
  newTab?: boolean;
  /** Read after the title when the link opens a new tab, such as "opens in a new tab". */
  newTabLabel?: string;
  /** Called before navigation, such as for click tracking. */
  onClick?: () => void;
  /** Pins the tile on an accent ground above the plain links. */
  pinned?: boolean;
  /** An owner-only performance line, such as "412 clicks · 12% of visits". */
  stats?: string;
  /** Supporting line, such as "1,300 members · route updates and rain calls". */
  subtitle?: string;
  title: string;
}

/**
 * One link in an organiser's link list: an optional icon tile, title,
 * subtitle, an optional stats line, and an outward arrow. A pinned link takes
 * an accent ground.
 */
export function CatchLinkTile({
  accent = "coral",
  href,
  icon,
  newTab = false,
  newTabLabel,
  onClick,
  pinned = false,
  stats,
  subtitle,
  title,
}: CatchLinkTileProps) {
  return (
    <a
      className={styles.tile}
      data-catch-theme="light"
      data-ground={pinned ? accent : "paper"}
      data-icon={icon ? "" : undefined}
      data-pinned={pinned || undefined}
      href={href}
      onClick={onClick}
      rel={newTab ? "noopener noreferrer" : undefined}
      target={newTab ? "_blank" : undefined}
    >
      {icon ? <span aria-hidden="true" className={styles.icon}>{icon}</span> : null}
      {/* The spaces between lines keep the link's accessible name readable. */}
      <span className={styles.copy}>
        <CatchText as="span" variant="sectionTitle">{title}</CatchText>
        {subtitle ? <>{" "}<CatchText as="span" variant="bodyS">{subtitle}</CatchText></> : null}
        {stats ? <>{" "}<span className={styles.stats}>{stats}</span></> : null}
        {newTab && newTabLabel ? <>{" "}<span className={styles.visuallyHidden}>{`(${newTabLabel})`}</span></> : null}
      </span>
      <svg aria-hidden="true" className={styles.arrow} focusable="false" viewBox="0 0 24 24">
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    </a>
  );
}
