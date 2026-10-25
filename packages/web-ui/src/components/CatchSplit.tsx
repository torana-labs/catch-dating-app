import type {HTMLAttributes, ReactNode} from "react";
import styles from "./CatchSplit.module.css";

/**
 * Column widths: `even` is 1:1, `sevenFive` is 7:5, and the rails fix one
 * column at 380px (`narrowRail`) or 420px (`wideRail`) beside a fluid one.
 */
export type CatchSplitRatio = "even" | "sevenFive" | "narrowRail" | "wideRail";

/** The side a rail sits on. */
export type CatchSplitRailSide = "start" | "end";

/** Space between the columns; it narrows when they stack. */
export type CatchSplitGap = "compact" | "regular" | "wide";

export type CatchSplitAlignment = "start" | "center" | "end" | "stretch";

export type CatchSplitElement = "div" | "section" | "article";

export interface CatchSplitProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "style"> {
  /** Cross-axis alignment of the two columns; defaults to start. */
  align?: CatchSplitAlignment;
  as?: CatchSplitElement;
  /** The end column (right in left-to-right pages). */
  end: ReactNode;
  /** Defaults to regular. */
  gap?: CatchSplitGap;
  /** For a rail ratio, the column that takes the fixed width. Defaults to start. */
  railSide?: CatchSplitRailSide;
  /** Defaults to even. */
  ratio?: CatchSplitRatio;
  /** The start column (left in left-to-right pages). */
  start: ReactNode;
}

/**
 * Two columns at a set ratio that stack into one when the page (the nearest
 * `catch-page` container, which `CatchBand` declares) is narrower than 840px.
 * Stacked columns keep source order, so reading and focus order never change.
 */
export function CatchSplit({
  align = "start",
  as: Element = "div",
  end,
  gap = "regular",
  railSide = "start",
  ratio = "even",
  start,
  ...props
}: CatchSplitProps) {
  const rail = ratio === "narrowRail" || ratio === "wideRail";
  return (
    <Element
      {...props}
      className={styles.split}
      data-align={align}
      data-gap={gap}
      data-rail-side={rail ? railSide : undefined}
      data-ratio={ratio}
    >
      <div className={styles.column} data-column="start">{start}</div>
      <div className={styles.column} data-column="end">{end}</div>
    </Element>
  );
}
