import {useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type UIEvent} from "react";
import {
  CatchViewportContext,
  catchViewportSizeClassFor,
  type CatchViewportRegister,
  type CatchViewportSizeClass,
  type CatchViewportState,
} from "./catchViewportContext";
import styles from "./CatchViewport.module.css";

export interface CatchViewportProps {
  /** quiet for Admin, set once here; every part inside reads it, so screens never restyle parts. */
  register?: CatchViewportRegister;
  /** auto measures the viewport's own width; or force a size class. */
  sizeClass?: CatchViewportSizeClass | "auto";
  /** window fills the browser window; parent fills the box it sits in (a story, a preview). */
  fill?: "window" | "parent";
  /** A CatchTabBar: a bottom bar on phones, a rail or a sidebar wider. */
  navigation?: ReactNode;
  /** A CatchTopBar over the body. */
  topBar?: ReactNode;
  /** A bottom action bar under the body. */
  dock?: ReactNode;
  /** Overlays (sheets, dialogs, toasts) drawn over the screen. */
  overlay?: ReactNode;
  /** The scrolling body: a CatchWorkspaceHeader and a CatchPaneLayout, or a page body. */
  children?: ReactNode;
}

function initialSizeClass(): CatchViewportSizeClass {
  return typeof window === "undefined" ? "expanded" : catchViewportSizeClassFor(window.innerWidth);
}

/**
 * Flutter's CatchViewport on the web: a whole screen. It measures its size class, places the
 * navigation at the bottom, in a rail or in a sidebar, and lays out the top bar, the scrolling
 * body, the dock and overlays. The body tells the top bar when it has scrolled.
 */
export function CatchViewport({
  register = "app",
  sizeClass = "auto",
  fill = "window",
  navigation,
  topBar,
  dock,
  overlay,
  children,
}: CatchViewportProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<CatchViewportSizeClass>(initialSizeClass);
  const [scrolled, setScrolled] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (sizeClass !== "auto" || !element) return;
    // A box with no layout yet (or no layout engine) keeps the window's size class.
    const update = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) setMeasured(catchViewportSizeClassFor(width));
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [sizeClass]);
  const onBodyScroll = useCallback((event: UIEvent<HTMLElement>) => {
    setScrolled((event.currentTarget as HTMLElement).scrollTop > 4);
  }, []);
  const resolved = sizeClass === "auto" ? measured : sizeClass;
  const value = useMemo<CatchViewportState>(
    () => ({sizeClass: resolved, register, scrolled, inShell: true, onBodyScroll}),
    [resolved, register, scrolled, onBodyScroll],
  );
  return (
    <CatchViewportContext.Provider value={value}>
      <div className={styles.viewport} data-fill={fill} data-register={register} data-size={resolved} ref={ref}>
        {navigation != null ? <div className={styles.navigation}>{navigation}</div> : null}
        {topBar != null ? <div className={styles.top}>{topBar}</div> : null}
        <div className={styles.body} data-catch-viewport-body="" onScroll={onBodyScroll}>{children}</div>
        {dock != null ? <div className={styles.dock}>{dock}</div> : null}
        {overlay}
      </div>
    </CatchViewportContext.Provider>
  );
}
