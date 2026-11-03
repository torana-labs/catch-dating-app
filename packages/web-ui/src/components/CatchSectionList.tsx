import {Children, type HTMLAttributes, type ReactNode} from "react";
import type {CatchGapSize} from "./CatchGap";
import styles from "./CatchSectionList.module.css";

export type CatchSectionListElement = "div" | "section" | "main" | "article" | "ol" | "ul";

/** Every list declares its empty policy, as Flutter's constructors require. */
export type CatchSectionListEmptyPolicy =
  | {emptyStateOmitted: true; emptyBuilder?: never}
  | {emptyStateOmitted: false; emptyBuilder: () => ReactNode};

export type CatchSectionListProps =
  Omit<HTMLAttributes<HTMLElement>, "className" | "style"> &
  CatchSectionListEmptyPolicy & {
    as?: CatchSectionListElement;
    /** Ordered complete sections. */
    children?: ReactNode;
    /** Gap between sections; defaults to `CatchGaps.section`. */
    gap?: CatchGapSize;
  };

/**
 * Ordered complete sections separated by the section rhythm, as Flutter's
 * plain `CatchSectionList`. Sections keep their own delimiters.
 * @deprecated Legacy: use CatchStack gap="section"; deleted in P7.
 */
export function CatchSectionList({
  as: Element = "div",
  children,
  emptyBuilder,
  emptyStateOmitted,
  gap = "section",
  ...props
}: CatchSectionListProps) {
  if (Children.toArray(children).length === 0) {
    return emptyStateOmitted ? null : <>{emptyBuilder()}</>;
  }
  return (
    <Element {...props} className={styles.list} data-gap={gap}>
      {children}
    </Element>
  );
}
