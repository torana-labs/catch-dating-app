import {useLayoutEffect, useMemo, useRef, useState, type ReactNode} from "react";
import {CatchPaneContext, type CatchPaneSlot} from "./catchPaneLayoutContext";
import styles from "./CatchPaneLayout.module.css";

/**
 * queue: a work queue; the table fills the width and the selected item opens in a 440px inspector
 * (480px from 1,440), and in a narrow window the inspector replaces the table. list-detail: a 360px
 * list beside the selected item. feed: a feed with a 360px side pane. reading: a 600px reading lane
 * with a side pane. wide-table: one full-width table that scrolls sideways.
 */
export type CatchPaneLayoutMode = "queue" | "list-detail" | "feed" | "reading" | "wide-table";

export interface CatchPaneLayoutProps {
  pattern: CatchPaneLayoutMode;
  /** The feed, the list, the queue's table or the page. */
  main: ReactNode;
  /** queue and list-detail: the selected item. */
  detail?: ReactNode;
  /** feed and reading: the side pane. */
  aside?: ReactNode;
  /** queue and list-detail when one pane replaces the other: show the detail instead of the main pane. */
  detailOpen?: boolean;
}

/** The narrowest width, in px, at which each pattern places its panes side by side. */
const splitWidth: Record<CatchPaneLayoutMode, number> = {
  queue: 900,
  "list-detail": 600,
  feed: 960,
  reading: 960,
  "wide-table": Number.POSITIVE_INFINITY,
};

function Pane({slot, split, children}: {slot: CatchPaneSlot; split: boolean; children: ReactNode}) {
  const value = useMemo(() => ({slot, split}), [slot, split]);
  return (
    <CatchPaneContext.Provider value={value}>
      <div className={styles.pane} data-slot={slot}>{children}</div>
    </CatchPaneContext.Provider>
  );
}

/**
 * One layout for every Admin and host workspace screen. It measures its own width, decides the
 * columns and pane widths for the pattern, and folds the second pane away when there is no room.
 * Start each pane with a CatchWorkspaceHeader; a detail beside its list drops its back arrow and
 * breadcrumb, and both return when the detail replaces the list.
 */
export function CatchPaneLayout({pattern, main, detail, aside, detailOpen = false}: CatchPaneLayoutProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(element.getBoundingClientRect().width);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // Before the first measurement (and in tests without layout) the panes split, as on a desktop.
  const split = width === null || width === 0 ? true : width >= splitWidth[pattern];
  const second = pattern === "queue" || pattern === "list-detail" ? detail : aside;
  const hasSecond = second != null && second !== false;
  return (
    <div
      className={styles.panes}
      data-detail-open={detailOpen ? "" : undefined}
      data-pattern={pattern}
      data-split={split && pattern !== "wide-table" ? "" : undefined}
      ref={ref}
    >
      <Pane slot="main" split={split}>{main}</Pane>
      {hasSecond ? <Pane slot={pattern === "queue" || pattern === "list-detail" ? "detail" : "aside"} split={split}>{second}</Pane> : null}
    </div>
  );
}
