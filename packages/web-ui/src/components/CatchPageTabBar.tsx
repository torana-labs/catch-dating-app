import {useEffect, useRef, useState, type CSSProperties, type ReactNode} from "react";
import styles from "./CatchPageTabBar.module.css";

export interface CatchPageTabBarOption {
  value: string;
  label: ReactNode;
  count?: number;
  /** Renders the item as a link when it opens another screen. */
  href?: string;
}

export interface CatchPageTabBarProps {
  options: readonly CatchPageTabBarOption[];
  /** The chosen view's value. */
  selected: string;
  onChanged?: (value: string) => void;
  /** md 40px, sm 32px. */
  size?: "md" | "sm";
  /** Fill the width with equal items. */
  fill?: boolean;
  /** The tab list's accessible name. */
  label: string;
}

/**
 * Flutter's CatchPageTabBar on the web: two to five views of the same thing on one screen, with
 * a pill under the chosen view and counts beside labels. Views never clip: when they do not fit
 * the bar scrolls with a fading edge and keeps the chosen view in sight.
 */
export function CatchPageTabBar({options, selected: active, onChanged, size = "md", fill = false, label}: CatchPageTabBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const index = Math.max(0, options.findIndex((item) => item.value === active));
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setOverflows(element.scrollWidth > element.clientWidth + 1);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [options.length]);
  useEffect(() => {
    const element = ref.current;
    const chosen = element?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (element && chosen && overflows) element.scrollLeft = Math.max(0, chosen.offsetLeft - 24);
  }, [index, overflows]);
  const sliding = fill && !overflows;
  return (
    <div
      aria-label={label}
      className={styles.bar}
      data-fill={fill ? "" : undefined}
      data-scroll={overflows ? "" : undefined}
      data-size={size}
      ref={ref}
      role="tablist"
      style={{"--catch-tabs-count": options.length, "--catch-tabs-index": index} as CSSProperties}
    >
      {sliding ? <span aria-hidden="true" className={styles.pill} /> : null}
      {options.map((item) => {
        const selected = item.value === active;
        const body = <>{item.label}{item.count != null ? <>{" "}<span className={styles.count}>{item.count}</span></> : null}</>;
        return item.href && !selected ? (
          <a
            aria-selected={false}
            className={styles.item}
            href={item.href}
            key={item.value}
            onClick={onChanged ? (event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onChanged(item.value);
            } : undefined}
            role="tab"
          >
            {body}
          </a>
        ) : (
          <button
            aria-selected={selected}
            className={styles.item}
            data-sliding={sliding ? "" : undefined}
            key={item.value}
            onClick={() => onChanged?.(item.value)}
            role="tab"
            type="button"
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
