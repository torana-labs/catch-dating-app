import {Children, isValidElement, type ReactNode} from "react";
import type {CatchGapSize} from "./CatchGap";
import styles from "./CatchScroller.module.css";

/** Item widths: 200, 280 or 360px, and 180, 248 or 296px on a phone. */
export type CatchScrollerItemWidth = "s" | "m" | "l";

/**
 * `page` pads the rail so its first item lines up with the page content edge
 * while items scroll out to the viewport edge; `none` pads nothing.
 */
export type CatchScrollerEdge = "page" | "none";

export interface CatchScrollerProps {
  /** One child per item. */
  children: ReactNode;
  /** Defaults to page. Place a page-edge rail in a full-width `CatchBand`. */
  edge?: CatchScrollerEdge;
  /** Space between items; defaults to `CatchGaps.formField`. */
  gap?: CatchGapSize;
  /** Items grow to share the row when they all fit, as the homepage's format tiles do. */
  grow?: boolean;
  /** Defaults to m. */
  itemWidth?: CatchScrollerItemWidth;
  /** The accessible name of the scrolling region. */
  label: string;
}

/**
 * A sideways rail of items that snap to its start edge. The region takes
 * keyboard focus so arrow keys scroll it.
 */
export function CatchScroller({
  children,
  edge = "page",
  gap = "formField",
  grow = false,
  itemWidth = "m",
  label,
}: CatchScrollerProps) {
  return (
    <div
      aria-label={label}
      className={styles.scroller}
      data-edge={edge}
      data-gap={gap}
      data-grow={grow || undefined}
      data-item-width={itemWidth}
      role="region"
      tabIndex={0}
    >
      <ul className={styles.track}>
        {Children.toArray(children).map((child, index) => (
          <li className={styles.item} key={isValidElement(child) && child.key !== null ? child.key : index}>{child}</li>
        ))}
      </ul>
    </div>
  );
}
