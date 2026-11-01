import {Fragment, type MouseEvent, type ReactNode} from "react";
import type {CatchIconName} from "../icons/catchIconGlyphs";
import {CatchIcon} from "./CatchIcon";
import {useCatchViewport} from "./catchViewportContext";
import styles from "./CatchTabBar.module.css";

/** One destination. The same list draws the sidebar, the rail and the phone bar. */
export interface CatchTabBarItem {
  value: string;
  label: string;
  /** Drawn in the rail and the phone bar; the quiet register's sidebar is text only. */
  icon?: CatchIconName;
  href?: string;
  /** A count that needs attention. The sidebar draws it right-aligned. */
  badge?: number;
  /** Sidebar: a heading drawn above the first item of each section ("Work", "Records"). The rail draws a rule. */
  section?: string;
  /** Phone bar: when any item is pinned, only pinned items show, followed by More. */
  pinned?: boolean;
}

/** Who the app is acting as, or who is signed in. */
export interface CatchTabBarIdentity {
  title: string;
  note?: string;
  href?: string;
}

export interface CatchTabBarAction {
  label: string;
  icon?: CatchIconName;
  href?: string;
  onPressed?: () => void;
}

export interface CatchTabBarMore {
  label?: string;
  href?: string;
  onPressed?: () => void;
  badge?: number;
}

export type CatchTabBarLayout = "auto" | "bottom" | "rail" | "sidebar";

export interface CatchTabBarProps {
  items: readonly CatchTabBarItem[];
  /** The current destination's value. */
  active: string;
  /** Called with an item's value. With an href too, a plain click calls this instead of following the link. */
  onChanged?: (value: string) => void;
  /** auto follows the viewport: a bottom bar on phones, a rail on tablets, a sidebar on desktops. */
  layout?: CatchTabBarLayout;
  /** Sidebar and rail: the app's mark or who the app is acting as, in the shared 56px header row. */
  header?: ReactNode | CatchTabBarIdentity;
  /** Sidebar and rail: the one primary action ("New event"). */
  primaryAction?: CatchTabBarAction;
  /** Sidebar: who is signed in. */
  footer?: ReactNode | CatchTabBarIdentity;
  /** The navigation landmark's name. */
  label?: string;
  /** Phone bar with pinned items: where More goes. */
  more?: CatchTabBarMore;
}

const isIdentity = (value: unknown): value is CatchTabBarIdentity =>
  typeof value === "object" && value !== null && !("$$typeof" in value) && "title" in value;

function Identity({identity, compact}: {identity: CatchTabBarIdentity; compact: boolean}) {
  const initial = identity.title.trim().charAt(0).toUpperCase();
  const inner = (
    <>
      <span aria-hidden="true" className={styles.mark}>{initial}</span>
      {compact ? <span className={styles.hiddenLabel}>{identity.title}</span> : (
        <span className={styles.identityText}>
          <span className={styles.identityTitle}>{identity.title}</span>
          {identity.note ? <span className={styles.identityNote}>{identity.note}</span> : null}
        </span>
      )}
    </>
  );
  return identity.href
    ? <a className={styles.identity} href={identity.href}>{inner}</a>
    : <span className={styles.identity}>{inner}</span>;
}

function countLabel(count: number) {
  return count > 99 ? "99+" : String(count);
}

function followsPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * Flutter's CatchTabBar on the web: the app's destinations as a bottom bar, a 96px rail or a
 * 240px sidebar, from one list of items. The sidebar groups items under section headings with
 * counts on the right; the rail draws a rule between sections; the phone bar shows the pinned
 * items followed by More.
 */
export function CatchTabBar({
  items: allItems,
  active,
  onChanged,
  layout = "auto",
  header,
  primaryAction,
  footer,
  label = "Main",
  more,
}: CatchTabBarProps) {
  const {sizeClass} = useCatchViewport();
  const placed = layout !== "auto" ? layout : sizeClass === "compact" ? "bottom" : sizeClass === "medium" ? "rail" : "sidebar";
  const pinning = placed === "bottom" && allItems.some((item) => item.pinned);
  const items = pinning ? allItems.filter((item) => item.pinned) : allItems;
  const moreCurrent = pinning && !items.some((item) => item.value === active);

  const destination = (
    key: string,
    content: ReactNode,
    current: boolean,
    href: string | undefined,
    onSelect: (() => void) | undefined,
    className = styles.item,
  ) => {
    const common = {"aria-current": current ? ("page" as const) : undefined, className};
    if (href) {
      return (
        <a key={key} {...common} href={href} onClick={onSelect ? (event) => {
          if (!followsPlainClick(event)) return;
          event.preventDefault();
          onSelect();
        } : undefined}>{content}</a>
      );
    }
    return <button key={key} {...common} onClick={onSelect} type="button">{content}</button>;
  };

  const itemContent = (icon: CatchIconName | undefined, text: string, badge: number | undefined) => (
    <>
      <span className={styles.icon}>
        {icon ? <CatchIcon icon={icon} size="lg" /> : null}
        {badge ? <span className={styles.badge}>{countLabel(badge)}</span> : null}
      </span>
      <span className={styles.label}>{text}</span>
    </>
  );

  return (
    <nav aria-label={label} className={styles.bar} data-layout={placed}>
      {placed !== "bottom" && header != null ? (
        <div className={styles.header}>{isIdentity(header) ? <Identity compact={placed === "rail"} identity={header} /> : header}</div>
      ) : null}
      {placed !== "bottom" && primaryAction ? (
        destination(
          "primary",
          <>
            <CatchIcon icon={primaryAction.icon ?? "add"} size="control" />
            <span className={placed === "rail" ? styles.hiddenLabel : undefined}>{primaryAction.label}</span>
          </>,
          false,
          primaryAction.href,
          primaryAction.onPressed,
          styles.primary,
        )
      ) : null}
      <div className={styles.items}>
        {items.map((item, index) => {
          const heading = placed !== "bottom" && item.section && item.section !== items[index - 1]?.section
            ? <span className={styles.section} data-first={index === 0 ? "" : undefined} role="presentation">{placed === "sidebar" ? item.section : null}</span>
            : null;
          const link = destination(
            item.value,
            itemContent(item.icon, item.label, item.badge),
            item.value === active,
            item.href,
            onChanged ? () => onChanged(item.value) : undefined,
          );
          return heading ? <Fragment key={item.value}>{heading}{link}</Fragment> : link;
        })}
        {pinning ? destination("more", itemContent("more", more?.label ?? "More", more?.badge), moreCurrent, more?.href, more?.onPressed) : null}
      </div>
      {placed === "sidebar" && footer != null ? (
        <div className={styles.footer}>{isIdentity(footer) ? <Identity compact={false} identity={footer} /> : footer}</div>
      ) : null}
    </nav>
  );
}
