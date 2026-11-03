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
  as?: CatchStackElement;
}

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
  as: Element = "div",
  className,
  children,
  ...rest
}: CatchStackProps) {
  const {sizeClass} = useCatch();
  let resolvedDirection = direction;
  let resolvedEqual = equal;
  let resolvedAlign = align;
  if (direction === "row" && collapseBelow && catchSizeClasses.indexOf(sizeClass) < catchSizeClasses.indexOf(collapseBelow)) {
    resolvedDirection = "column";
    resolvedEqual = false;
    resolvedAlign = align === "center" || align === "end" ? align : undefined;
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
      data-wrap={wrap ? "" : undefined}
    >
      {children}
    </Element>
  );
}
