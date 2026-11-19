import {Children, isValidElement, type HTMLAttributes, type ReactNode} from "react";
import type {CatchGapSize} from "./CatchGap";
import styles from "./CatchGrid.module.css";

/** The most columns the grid shows, when its width has room for them. */
export type CatchGridColumns = 2 | 3 | 4;

/**
 * How small an item may get: 1 for cards (at least 15rem, one column on a
 * phone), 2 for items that read well small, such as photo tiles (at least
 * 9rem, never fewer than two to a row).
 */
export type CatchGridCompactColumns = 1 | 2;

/** `stretch` gives every item in a row the row's height. */
export type CatchGridAlignment = "stretch" | "start";

/** `ul` and `ol` wrap each child in a list item. */
export type CatchGridElement = "div" | "ul" | "ol";

export interface CatchGridProps
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "style"> {
  /** Defaults to stretch. */
  align?: CatchGridAlignment;
  as?: CatchGridElement;
  /** One child per cell. */
  children: ReactNode;
  columns: CatchGridColumns;
  /** Defaults to 1. */
  compactColumns?: CatchGridCompactColumns;
  /** Space between cells; defaults to `CatchGaps.related`. */
  gap?: CatchGapSize;
}

// Children.toArray drops empty children and gives each element a stable key.
const keyOf = (child: ReactNode, index: number) =>
  isValidElement(child) && child.key !== null ? child.key : index;

/**
 * Equal responsive columns for a fixed set of items. The grid shows up to
 * `columns` columns (never more than it has items) and keeps its rows even
 * as it narrows: all in one row, then half (for an even count), then one
 * column, stepping by its own width so that every item keeps its minimum.
 * @deprecated Legacy: use CatchStack direction="row" equal collapseBelow; deleted in P7.
 */
export function CatchGrid({
  align = "stretch",
  as: Element = "div",
  children,
  columns,
  compactColumns = 1,
  gap = "related",
  ...props
}: CatchGridProps) {
  const list = Element !== "div";
  const items = Children.toArray(children);
  return (
    <div className={styles.frame}>
      <Element
        {...props}
        className={styles.grid}
        data-align={align}
        data-columns={Math.max(1, Math.min(columns, items.length))}
        data-compact-columns={compactColumns}
        data-gap={gap}
      >
        {list
          ? items.map((child, index) => (
            <li className={styles.item} key={keyOf(child, index)}>{child}</li>
          ))
          : children}
      </Element>
    </div>
  );
}
