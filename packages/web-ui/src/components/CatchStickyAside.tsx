"use client";

import {type ReactNode, useEffect, useRef, useState} from "react";
import {CatchButton} from "./CatchButton";
import {CatchDock} from "./CatchDock";
import {CatchSheet} from "./CatchSheet";
import styles from "./CatchStickyAside.module.css";

export interface CatchStickyAsideProps {
  /** Names the aside, and the sheet it becomes on a phone. */
  label: string;
  children: ReactNode;
  /** The docked bar's summary on a phone, such as the price and spots left. */
  dock: ReactNode;
  /** The docked bar's button, which opens the sheet. */
  openLabel: string;
  /** The sheet's dismiss action. */
  closeLabel: string;
  /** The sheet's heading; the label names it without one. */
  sheetTitle?: string;
}

/**
 * Website v2 sticky aside (CAT-248), inside a CatchBand. From 840px its
 * content sticks beside the page as it scrolls. On a narrower page a docked bar holds a summary and an
 * open action, and the content opens in a bottom sheet. The content renders
 * once, in whichever place the page width calls for.
 */
export function CatchStickyAside({label, children, dock, openLabel, closeLabel, sheetTitle}: CatchStickyAsideProps) {
  const probe = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // The probe takes a width only under the catch-page container query, so
    // the aside switches exactly where the other layouts stack.
    const element = probe.current;
    if (!element) return undefined;
    const measure = () => setCompact(element.getBoundingClientRect().width > 0);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!compact) setOpen(false);
  }, [compact]);

  return (
    <div className={styles.anchor} data-compact={compact || undefined}>
      <span aria-hidden="true" className={styles.probe} ref={probe} />
      {compact ? (
        <>
          <div className={styles.dock} data-catch-sticky-dock="">
            <CatchDock>
              <div className={styles.bar}>
                <div className={styles.summary}>{dock}</div>
                <CatchButton label={openLabel} onPressed={() => setOpen(true)} size="md" />
              </div>
            </CatchDock>
          </div>
          <CatchSheet
            closeLabel={closeLabel}
            label={label}
            onClose={() => setOpen(false)}
            open={open}
            recipe="filter"
            title={sheetTitle ?? label}
          >
            {children}
          </CatchSheet>
        </>
      ) : (
        <aside aria-label={label} className={styles.aside}>{children}</aside>
      )}
    </div>
  );
}
