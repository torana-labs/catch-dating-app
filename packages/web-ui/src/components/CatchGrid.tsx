import {Children, isValidElement, type HTMLAttributes, type ReactNode} from "react";
import type {CatchGapSize} from "./CatchGap";
import styles from "./CatchGrid.module.css";

/** Columns on a page at least 840px wide. */
export type CatchGridColumns = 2 | 3 | 4;

/** Columns on a narrower page. */
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
 * Equal responsive columns. The column count follows the page (the nearest
 * `catch-page` container, which `CatchBand` declares) rather than the grid's
 * own width, so a grid in a narrow page column keeps its desktop count.
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
  return (
    <Element
      {...props}
      className={styles.grid}
      data-align={align}
      data-columns={columns}
      data-compact-columns={compactColumns}
      data-gap={gap}
    >
      {list
        ? Children.toArray(children).map((child, index) => (
          <li className={styles.item} key={keyOf(child, index)}>{child}</li>
        ))
        : children}
    </Element>
  );
}
