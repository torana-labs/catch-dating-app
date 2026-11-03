import type {HTMLAttributes, ReactNode} from "react";
import styles from "./CatchInset.module.css";

/**
 * Semantic inset roles, named after the generic Flutter `CatchInsets`
 * constants. Each role resolves to the same spacing steps as its Flutter
 * constant. Page insets belong to `CatchPageBody`.
 */
export type CatchInsetPadding =
  | "content"
  | "contentDense"
  | "contentRelaxed"
  | "contentSpacious"
  | "contentBlock"
  | "contentHorizontal"
  | "contentVertical"
  | "contentVerticalCompact"
  | "contentVerticalRelaxed"
  | "contentVerticalSpacious"
  | "emptyStateContent"
  | "pageHorizontal";

export type CatchInsetElement = "div" | "section" | "article" | "header" | "footer" | "aside";

export interface CatchInsetProps
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "style"> {
  as?: CatchInsetElement;
  children: ReactNode;
  padding: CatchInsetPadding;
}

/**
 * Pads its child by one semantic inset: Flutter `Padding(CatchInsets.*)`.
 * @deprecated Legacy: use CatchSurface padding (block="plain" for no box) or CatchStack; deleted in P7.
 */
export function CatchInset({
  as: Element = "div",
  children,
  padding,
  ...props
}: CatchInsetProps) {
  return (
    <Element {...props} className={styles.inset} data-padding={padding}>
      {children}
    </Element>
  );
}
