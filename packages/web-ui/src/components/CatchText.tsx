import type {CSSProperties, HTMLAttributes, ReactNode} from "react";
import styles from "./CatchText.module.css";

/**
 * Text roles, named after the matching `CatchTextStyles` roles in Flutter.
 * Each role binds the platform typography profile the Flutter role reads.
 */
export type CatchTextVariant =
  | "headline"
  | "titleL"
  | "sectionTitle"
  | "titleS"
  | "bodyLead"
  | "bodyL"
  | "bodyM"
  | "bodyS"
  | "supporting"
  | "supportingStrong"
  | "fieldLabel"
  | "statusLabel"
  | "metric";

/** Theme color roles, named after the Flutter `CatchTokens` fields. */
export type CatchTextColor =
  | "ink"
  | "ink2"
  | "ink3"
  | "primary"
  | "danger"
  | "positiveText"
  | "attentionText"
  | "inherit";

export type CatchTextAlign = "start" | "center" | "end";

export type CatchTextElement =
  | "p"
  | "span"
  | "div"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "strong"
  | "em"
  | "small"
  | "dt"
  | "dd"
  | "li"
  | "figcaption"
  | "legend"
  | "time";

export interface CatchTextProps
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "color" | "style"> {
  /** The semantic element. Choose headings by document outline, not size. */
  as?: CatchTextElement;
  children: ReactNode;
  /** Overrides the role's default color with another theme role. */
  color?: CatchTextColor;
  /** Clamps the text to this many lines with an ellipsis. */
  maxLines?: number;
  textAlign?: CatchTextAlign;
  variant: CatchTextVariant;
}

export function CatchText({
  as: Element = "p",
  children,
  color,
  maxLines,
  textAlign,
  variant,
  ...props
}: CatchTextProps) {
  const clamp = maxLines !== undefined && maxLines > 0 ? maxLines : undefined;
  return (
    <Element
      {...props}
      className={styles.text}
      data-align={textAlign}
      data-color={color}
      data-max-lines={clamp === undefined ? undefined : ""}
      data-variant={variant}
      style={clamp === undefined
        ? undefined
        : ({"--catch-text-max-lines": clamp} as CSSProperties)}
    >
      {children}
    </Element>
  );
}
