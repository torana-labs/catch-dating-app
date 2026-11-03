import type {CSSProperties, HTMLAttributes, ReactNode} from "react";
import styles from "./CatchLegacyText.module.css";

/**
 * Text roles, named after the matching `CatchTextStyles` roles in Flutter.
 * The six display steps set Archivo (blueprint D19); every other role binds
 * the platform typography profile the Flutter role reads.
 * @deprecated Legacy: use CatchText's CatchTextVariant (the 19 type roles); deleted in P7.
 */
export type CatchLegacyTextVariant =
  | "displayXs"
  | "displayS"
  | "displayM"
  | "displayL"
  | "displayXl"
  | "displayXxl"
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

/**
 * Theme color roles, named after the Flutter `CatchTokens` fields.
 * @deprecated Legacy: use CatchText's tone; deleted in P7.
 */
export type CatchTextColor =
  | "ink"
  | "ink2"
  | "ink3"
  | "primary"
  | "danger"
  | "positiveText"
  | "attentionText"
  | "inherit";

/**
 * Website v2 palette accents for coloured sentence-case labels: each draws its
 * deep shade under a light theme and the accent itself under a dark one, so a
 * label clears AA on white, paper and ink.
 * @deprecated Legacy: use CatchText's tone; deleted in P7.
 */
export type CatchTextAccent = "coral" | "pink" | "yellow" | "mint" | "indigo" | "magenta";

/** @deprecated Legacy: use CatchText's align; deleted in P7. */
export type CatchTextAlign = "start" | "center" | "end";

/** @deprecated Legacy: use CatchText's as; deleted in P7. */
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

/** @deprecated Legacy: use CatchText (variant, tone, as, align, maxLines, numeric); deleted in P7. */
export interface CatchLegacyTextProps
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "color" | "style"> {
  /** The semantic element. Choose headings by document outline, not size. */
  as?: CatchTextElement;
  children: ReactNode;
  /** Overrides the role's default color with another theme role, or a palette accent. */
  color?: CatchTextColor | CatchTextAccent;
  /** Clamps the text to this many lines with an ellipsis. */
  maxLines?: number;
  textAlign?: CatchTextAlign;
  variant: CatchLegacyTextVariant;
}

/**
 * The pre-redesign text component, in the CatchTextStyles roles.
 * @deprecated Legacy: use CatchText; deleted in P7.
 */
export function CatchLegacyText({
  as: Element = "p",
  children,
  color,
  maxLines,
  textAlign,
  variant,
  ...props
}: CatchLegacyTextProps) {
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
