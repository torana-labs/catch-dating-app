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

export interface CatchStackProps extends HTMLAttributes<HTMLElement> {
  /** Defaults to column. */
  direction?: CatchStackDirection;
  /** A spacing token in pixels; `section` is 28 on compact and 40 wider. Defaults to 12. */
  gap?: CatchStackGap;
  align?: CatchStackAlign;
  justify?: CatchStackJustify;
  wrap?: boolean;
  /** Children share the width equally (rows only): an equal row is a grid. */
  equal?: boolean;
  /** Rows only: stack into a column below this size class (a two-column web section on a phone). */
  collapseBelow?: "medium" | "expanded";
  /**
   * Rows only (proposal E1): one child keeps a fixed rail width, 380px
   * (`narrow`, a booking rail) or 420px (`wide`, an organiser rail), and the
   * other takes the rest. Pair it with `collapseBelow` so the two stack on a phone.
   */
  railWidth?: CatchStackRailWidth;
  /** With `railWidth`: the child that is the rail. Defaults to end (the last child). */
  railSide?: "start" | "end";
  /** With `railWidth`: the rail sticks below the top of the window while the other child scrolls past. */
  stickyRail?: boolean;
  as?: CatchStackElement;
}

export type CatchStackRailWidth = "narrow" | "wide";

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
