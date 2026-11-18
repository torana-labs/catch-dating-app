"use client";

import {
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {useCatch} from "./catchRootContext";
import {CatchIcon} from "./CatchIcon";
import {CatchText} from "./CatchText";
import styles from "./CatchNavMenu.module.css";

/** One page the menu links to. */
export interface CatchNavMenuLink {
  href: string;
  /** Resolved copy; the caller localizes it. */
  label: string;
  /** A quiet line under the label. */
  sublabel?: string;
  /** Marks the link as the page the visitor is on. */
  current?: boolean;
}

/** A titled column of links in a wide panel, such as the "For hosts" menu's Product and By format. */
export interface CatchNavMenuSection {
  /** The column's heading. Resolved copy. */
  title: string;
  links: readonly CatchNavMenuLink[];
}

export interface CatchNavMenuProps {
  /** The trigger's visible label, which names the group of links. Resolved copy. */
  label: string;
  /** The panel's links as one plain list. */
  links?: readonly CatchNavMenuLink[];
  /**
   * Titled columns side by side in a wider panel, in place of `links` (the
   * playbook's "For hosts" menu); each column's list is named by its title.
   */
  sections?: readonly CatchNavMenuSection[];
  /** Marks the trigger as the section the current page belongs to. */
  current?: boolean;
  /** Which trigger edge the panel lines up with. Defaults to start. */
  align?: "start" | "end";
  /** Called when a link is followed, such as to record the click. */
  onLinkPressed?: (link: CatchNavMenuLink) => void;
  /**
   * button (the default): a small quiet button. link: plain text in the site
   * header's page-link type with the canvas's 14px chevron, among the links.
   */
  appearance?: "button" | "link";
}

/** Below the medium window size (600px) the header's phone menu carries these links instead. */
const compactQuery = "(max-width: 599px)";

function subscribeCompact(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => undefined;
  const query = window.matchMedia(compactQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const compactNow = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(compactQuery).matches;

/** Server markup is the wide menu; the stylesheet hides it on a phone until hydration decides. */
const compactOnServer = () => false;

function linksIn(panel: HTMLElement | null) {
  return panel ? [...panel.querySelectorAll<HTMLAnchorElement>("a[href]")] : [];
}

/** The gutter a wide panel keeps from the window's edges, in px. */
const windowGutter = 16;

/**
 * Moves an open panel back inside the window: a sectioned panel is wider
 * than the trigger's room on a narrow laptop, so it shifts toward the start
 * until its far edge clears the gutter, never past the near one.
 */
function keepInWindow(panel: HTMLElement | null) {
  if (!panel || typeof window === "undefined") return;
  panel.style.removeProperty("translate");
  const {left, right} = panel.getBoundingClientRect();
  const overflow = right - (window.innerWidth - windowGutter);
  const shift = overflow > 0 ? Math.min(overflow, Math.max(0, left - windowGutter)) : 0;
  if (shift > 0) panel.style.setProperty("translate", `${-shift}px 0`);
}

/**
 * A desktop site navigation menu: a disclosure button, the group's label with
 * a chevron, that shows and hides a panel of links under it (the playbook
 * header's "For hosts" and "Resources"). The button carries aria-expanded and
 * controls the panel. Escape closes the panel and returns focus to the button;
 * a press outside it or focus leaving it closes it. Arrow Down on the button
 * opens it at the first link; in the panel, the arrow keys, Home and End move
 * between links, across columns in a sectioned panel. The links are plain
 * lists, not an ARIA menu, so each keeps its link semantics; a sectioned
 * panel names each column's list by its title and stays inside the window.
 * Below 600px it renders nothing, and the header's phone menu carries the
 * links.
 */
export function CatchNavMenu({label, links, sections, current = false, align = "start", onLinkPressed, appearance = "button"}: CatchNavMenuProps) {
  const compact = useSyncExternalStore(subscribeCompact, compactNow, compactOnServer);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const focusFirst = useRef(false);
  const panelId = `${useId()}-panel`;
  const {ground} = useCatch();

  useLayoutEffect(() => {
    if (open && sections) keepInWindow(panel.current);
  }, [open, sections]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    if (focusFirst.current) {
      focusFirst.current = false;
      linksIn(panel.current)[0]?.focus();
    }
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, close]);

  useEffect(() => {
    if (compact) setOpen(false);
  }, [compact]);

  if (compact) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close(true);
      return;
    }
    const rows = linksIn(panel.current);
    const index = rows.indexOf(document.activeElement as HTMLAnchorElement);
    if (index < 0) {
      if (event.key === "ArrowDown" && event.target === button.current) {
        event.preventDefault();
        if (open) rows[0]?.focus();
        else {
          focusFirst.current = true;
          setOpen(true);
        }
      }
      return;
    }
    const move = (to: number) => {
      event.preventDefault();
      rows[(to + rows.length) % rows.length]?.focus();
    };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(rows.length - 1);
  };

  const follow = (link: CatchNavMenuLink) => {
    onLinkPressed?.(link);
    close(false);
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (open && next && !event.currentTarget.contains(next)) close(false);
  };

  return (
    <div className={styles.menu} data-align={align} onBlur={onBlur} onKeyDown={onKeyDown} ref={root}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className={styles.trigger}
        data-appearance={appearance}
        data-current={current || undefined}
        data-on={ground}
        data-recipe="default"
        data-size="sm"
        data-variant="quiet"
        onClick={() => setOpen((value) => !value)}
        ref={button}
        type="button"
      >
        <span className={styles.label}>{label}</span>
        <span aria-hidden="true" className={styles.chevron} data-open={open || undefined}><CatchIcon name="expand" size={16} /></span>
      </button>
      <div
        className={styles.panel}
        data-sections={sections ? "" : undefined}
        hidden={!open}
        id={panelId}
        ref={panel}
        style={sections ? {"--catch-nav-menu-sections": sections.length} as CSSProperties : undefined}
      >
        {sections ? sections.map((section, index) => (
          <div className={styles.section} key={section.title}>
            <CatchText as="p" className={styles.sectionTitle} id={`${panelId}-${index}`} tone="secondary" variant="label-kicker">{section.title}</CatchText>
            <LinkList labelledBy={`${panelId}-${index}`} links={section.links} onFollow={follow} />
          </div>
        )) : <LinkList links={links ?? []} onFollow={follow} />}
      </div>
    </div>
  );
}

/** A list of the menu's links; in a sectioned panel its column heading names it. */
function LinkList({labelledBy, links, onFollow}: {labelledBy?: string; links: readonly CatchNavMenuLink[]; onFollow: (link: CatchNavMenuLink) => void}) {
  return (
    <ul aria-labelledby={labelledBy} className={styles.links}>
      {links.map((link) => (
        <li key={`${link.href}-${link.label}`}>
          <a aria-current={link.current ? "page" : undefined} className={styles.link} href={link.href} onClick={() => onFollow(link)}>
            <CatchText variant="title-row">{link.label}</CatchText>
            {link.sublabel ? <>{" "}<CatchText tone="secondary" variant="body-small">{link.sublabel}</CatchText></> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
