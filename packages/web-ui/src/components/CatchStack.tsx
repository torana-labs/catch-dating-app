"use client";

import type {HTMLAttributes} from "react";
import {
  catchSizeClasses,
  type CatchStackAlign,
  type CatchStackDirection,
  type CatchStackGap,
  type CatchStackJustify,
} from "./catchCoreVocabulary";
import {useCatch} from "./catchRootContext";
import styles from "./CatchStack.module.css";

export type CatchStackElement = "div" | "section" | "header" | "footer" | "ul" | "ol" | "nav" | "main" | "aside";

/**
 * Gaps the website has beyond the shared scale, which is pinned to Flutter's
 * CatchStackGap: 14 (space.micro14, the organiser page's rail) and `profile`,
 * the organiser page's section rhythm, 56 wide and 44 on compact (the
 * WebOrgV2 board's .main).
 */
export const catchWebStackGaps = [14, "profile"] as const;
export type CatchWebStackGap = (typeof catchWebStackGaps)[number];

export interface CatchStackProps extends HTMLAttributes<HTMLElement> {
  /** Defaults to column. */
  direction?: CatchStackDirection;
  /**
   * A spacing token in pixels; `section` is 28 on compact and 40 wider. A web
   * gap is the website's alone. Defaults to 12.
   */
  gap?: CatchStackGap | CatchWebStackGap;
  align?: CatchStackAlign;
  justify?: CatchStackJustify;
  wrap?: boolean;
  /** Children share the width equally (rows only): an equal row is a grid. */
  equal?: boolean;
  /** Rows only: stack into a column below this size class (a two-column web section on a phone). */
  collapseBelow?: "medium" | "expanded";
  /**
   * Rows only (proposal E1): one child keeps a fixed rail width, 380px
   * (`narrow`, a booking rail), 420px (`wide`, an organiser rail) or 240px
   * (`sidebar`, layout.sidebar: the organiser page's rating beside its
   * reviews), or its own width (`fit`, a field's submit button, centred on
   * the row), and the
   * other takes the rest. Pair it with `collapseBelow` so the two stack on a phone.
   */
  railWidth?: CatchStackRailWidth;
  /** With `railWidth`: the child that is the rail. Defaults to end (the last child). */
  railSide?: "start" | "end";
  /** With `railWidth`: the rail sticks below the top of the window while the other child scrolls past. */
  stickyRail?: boolean;
  /**
   * Web only: a hairline above the stack, 24px over its content, as the
   * organiser board's closing "Made with Catch" row.
   */
  dividerAbove?: boolean;
  as?: CatchStackElement;
}

export type CatchStackRailWidth = "narrow" | "wide" | "sidebar" | "fit";

/**
 * catch.stack: lays children out in a column or a row with a token gap. Use
 * it instead of hand-written flex boxes. Below `collapseBelow` a row renders
 * as a column, with `equal` off and only a center or end alignment kept.
 */
export function CatchStack({
  direction = "column",
  gap = 12,
  align,
  justify,
  wrap,
  equal,
  collapseBelow,
  railWidth,
  railSide = "end",
  stickyRail,
  dividerAbove,
  as: Element = "div",
  className,
  children,
  ...rest
}: CatchStackProps) {
  const {sizeClass} = useCatch();
  let resolvedDirection = direction;
  let resolvedEqual = equal;
  let resolvedAlign = align;
  let resolvedRail = direction === "row" ? railWidth : undefined;
  if (direction === "row" && collapseBelow && catchSizeClasses.indexOf(sizeClass) < catchSizeClasses.indexOf(collapseBelow)) {
    resolvedDirection = "column";
    resolvedEqual = false;
    resolvedAlign = align === "center" || align === "end" ? align : undefined;
    resolvedRail = undefined;
  }
  return (
    <Element
      {...rest}
      className={className ? `${styles.stack} ${className}` : styles.stack}
      data-align={resolvedAlign}
      data-direction={resolvedDirection}
      data-divider-above={dividerAbove ? "" : undefined}
      data-equal={resolvedEqual ? "" : undefined}
      data-gap={gap}
      data-justify={justify}
      data-rail={resolvedRail}
      data-rail-side={resolvedRail ? railSide : undefined}
      data-sticky-rail={resolvedRail && stickyRail ? "" : undefined}
      data-wrap={wrap ? "" : undefined}
    >
      {children}
    </Element>
  );
}
