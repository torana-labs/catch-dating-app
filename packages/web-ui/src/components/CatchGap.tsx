import type {HTMLAttributes, ReactNode} from "react";
import styles from "./CatchGap.module.css";

/**
 * Semantic gap roles, named after the Flutter `CatchGaps` constants. Each role
 * resolves to the same spacing step as its Flutter constant.
 */
export type CatchGapSize =
  | "headerTitleToSubtitle"
  | "inline"
  | "related"
  | "formField"
  | "section"
  | "majorSection";

/** Main axis, as in Flutter's `Flex.direction`. */
export type CatchGapDirection = "vertical" | "horizontal";

/** Flutter `MainAxisAlignment` values supported on the web. */
export type CatchGapMainAxisAlignment = "start" | "center" | "end" | "spaceBetween";

/** Flutter `CrossAxisAlignment` values supported on the web. */
export type CatchGapCrossAxisAlignment = "start" | "center" | "end" | "stretch" | "baseline";

export type CatchGapElement =
  | "div"
  | "section"
  | "article"
  | "header"
  | "footer"
  | "nav"
  | "aside"
  | "ul"
  | "ol"
  | "dl"
  | "li"
  | "form"
  | "fieldset";

export interface CatchGapProps
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "style"> {
  as?: CatchGapElement;
  children: ReactNode;
  /** Cross-axis alignment. Defaults to stretch, as a web block does. */
  crossAxisAlignment?: CatchGapCrossAxisAlignment;
  direction?: CatchGapDirection;
  mainAxisAlignment?: CatchGapMainAxisAlignment;
  /** The semantic gap between children. */
  size: CatchGapSize;
  /** Lets horizontal children flow onto further lines, as Flutter's `Wrap`. */
  wrap?: boolean;
}

/**
 * Lays its children out along one axis, separated by one semantic gap: the
 * web counterpart of Flutter `Column`/`Row`/`Wrap` with `spacing: CatchGaps.*`.
 * @deprecated Legacy: use CatchStack (direction, gap, align, justify, wrap); deleted in P7.
 */
export function CatchGap({
  as: Element = "div",
  children,
  crossAxisAlignment = "stretch",
  direction = "vertical",
  mainAxisAlignment = "start",
  size,
  wrap = false,
  ...props
}: CatchGapProps) {
  return (
    <Element
      {...props}
      className={styles.gap}
      data-cross-axis={crossAxisAlignment}
      data-direction={direction}
      data-main-axis={mainAxisAlignment}
      data-size={size}
      data-wrap={wrap || undefined}
    >
      {children}
    </Element>
  );
}
