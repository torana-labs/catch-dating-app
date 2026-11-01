import {Children, useEffect, useRef, useState, type CSSProperties, type ReactNode} from "react";
import {useCatchViewport} from "./catchViewportContext";
import styles from "./CatchRail.module.css";

export interface CatchRailProps {
  /** Each item's width in px, or auto to fit each item (a row of chips). */
  itemWidth?: number | "auto";
  /** auto: scroll on phones and tablets, wrap into a grid on desktops. */
  wrap?: "auto" | "never" | "always";
  /** The list's accessible name. */
  label: string;
  children: ReactNode;
}

type Edges = "start" | "end" | "both" | undefined;

/**
 * Flutter's CatchRail on the web: a horizontal row that scrolls with snapping and a peek of the
 * next item, and fades whichever edge hides more. On desktops it wraps into a grid unless told
 * never to. A row of filter chips is a rail with itemWidth "auto".
 */
export function CatchRail({itemWidth = 260, wrap = "auto", label, children}: CatchRailProps) {
  const {sizeClass} = useCatchViewport();
  const wraps = wrap === "always" || (wrap === "auto" && sizeClass === "expanded");
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<Edges>(undefined);
  useEffect(() => {
    const element = ref.current;
    if (!element || wraps) return;
    const update = () => {
      const overflows = element.scrollWidth > element.clientWidth + 1;
      const start = element.scrollLeft > 1;
      const end = element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
      setEdges(!overflows ? undefined : start && end ? "both" : start ? "start" : end ? "end" : undefined);
    };
    update();
    element.addEventListener("scroll", update, {passive: true});
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [wraps]);
  return (
    <div
      aria-label={label}
      className={styles.rail}
      data-auto={itemWidth === "auto" ? "" : undefined}
      data-fade={wraps ? undefined : edges}
      data-wrap={wraps ? "" : undefined}
      ref={ref}
      role="list"
      // A rail that scrolls can be scrolled from the keyboard even when its items are not focusable.
      tabIndex={edges ? 0 : undefined}
      style={{"--catch-rail-item": itemWidth === "auto" ? "max-content" : `${itemWidth}px`} as CSSProperties}
    >
      {Children.toArray(children).map((child, index) => (
        <div className={styles.item} key={index} role="listitem">{child}</div>
      ))}
    </div>
  );
}
