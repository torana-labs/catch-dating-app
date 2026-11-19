import {useEffect, useRef, type ReactNode, type RefObject} from "react";
import {CatchWordmark} from "./CatchWordmark";
import styles from "./CatchSiteFooter.module.css";

export interface CatchSiteFooterLink {
  href: string;
  label: string;
  /** A quiet note after the label, such as "soon" for a city not yet open. */
  note?: string;
}

/**
 * An item that does something on the page instead of going somewhere, such as
 * the site's "Privacy choices", which reopens the consent banner. The footer
 * draws it exactly as it draws its links.
 */
export interface CatchSiteFooterAction {
  label: string;
  onPressed: () => void;
}

export interface CatchSiteFooterGroup {
  title: string;
  links: readonly CatchSiteFooterLink[];
  /** One action after the links, such as "Privacy choices" at the end of Help and legal. */
  action?: CatchSiteFooterAction;
}

/** How many link columns a wide page shows. */
export type CatchSiteFooterColumns = 2 | 3 | 4 | 5;

export interface CatchSiteFooterProps {
  brandHref: string;
  /** The wordmark, such as "Catch". */
  brandLabel: string;
  /**
   * Side by side in `columns` columns when every column is wide enough for
   * its longest link; on narrower pages the groups flow down as many columns
   * as fit, each group starting where the one above it ends, and two on a
   * phone. None leaves out the navigation.
   */
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
  /** Link columns on a wide page; defaults to 4. Narrower pages flow the groups into fewer columns, and a phone always has two. */
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
 * Sizes the link columns from their content. Each column is as narrow as the
 * longest link or group title on one line, measured as the page draws it
 * (`--catch-site-footer-column-min`), so adding or renaming a link needs no
 * other change. It measures by letting every link and title take its
 * one-line width for a moment (`data-measuring`) and reading it back in the
 * same task, so nothing is painted in between. When every group fits side by side at that width the groups
 * sit in one row (`data-layout="row"`); otherwise they flow down as many
 * columns as fit. It measures again when the footer resizes or a web font
 * arrives. Before it runs (server render, no ResizeObserver) the groups flow
 * at the canvas's column width.
 */
function useContentSizedColumns(navRef: RefObject<HTMLElement | null>, columns: number, groups: readonly CatchSiteFooterGroup[]) {
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const measure = () => {
      nav.dataset.measuring = "";
      let longest = 0;
      for (const item of nav.querySelectorAll<HTMLElement>(`.${styles.heading}, .${styles.link}`)) {
        longest = Math.max(longest, item.getBoundingClientRect().width);
      }
      delete nav.dataset.measuring;
      if (longest === 0) return;
      const width = Math.ceil(longest) + 1;
      const flow = nav.firstElementChild;
      const gap = flow ? Number.parseFloat(getComputedStyle(flow).columnGap) || 0 : 0;
      nav.style.setProperty("--catch-site-footer-column-min", `${width}px`);
      nav.dataset.layout = nav.clientWidth >= columns * width + (columns - 1) * gap ? "row" : "flow";
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(nav);
    document.fonts?.addEventListener("loadingdone", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", schedule);
    };
  }, [navRef, columns, groups]);
}

/**
 * The design canvas's site footer (playbook KitFooter, `.pg .foot`): an inset
 * card on the ink ground with 36px corners (28px on phones). An optional top
 * band over a hairline, titled link groups, optional footnotes, the giant
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
  const navRef = useRef<HTMLElement>(null);
  useContentSizedColumns(navRef, columns, groups);
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
          <nav aria-label={navLabel} className={styles.groups} data-columns={columns} ref={navRef}>
            <div className={styles.flow}>
              {groups.map((group) => (
                <div className={styles.group} key={group.title}>
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
                    {group.action ? (
                      <li>
                        <button className={styles.link} onClick={group.action.onPressed} type="button">{group.action.label}</button>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ))}
            </div>
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
