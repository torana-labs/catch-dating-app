import type {HTMLAttributes, ReactNode} from "react";
import type {Ground} from "./palette";
import styles from "./CatchGroundCard.module.css";

/** `regular` pads 20px and `roomy` 28px; each steps down by 4px or 8px below 840px. */
export type CatchGroundCardPadding = "regular" | "roomy";

export type CatchGroundCardElement = "div" | "section" | "article" | "aside";

export interface CatchGroundCardProps
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "color" | "style"> {
  as?: CatchGroundCardElement;
  children: ReactNode;
  /** Defaults to white. */
  ground?: Ground;
  /** A hairline in the ground's ink, for a card on a page of the same ground. */
  outlined?: boolean;
  /** Defaults to regular. */
  padding?: CatchGroundCardPadding;
}

/**
 * Website v2 card: one Website v2 ground at radius lg with an optional
 * hairline, holding whatever the page arranges inside it. Library text inside
 * takes the ground's inks, and the ink ground resolves through the dark theme.
 */
export function CatchGroundCard({
  as: Element = "div",
  children,
  ground = "white",
  outlined = false,
  padding = "regular",
  ...props
}: CatchGroundCardProps) {
  return (
    <Element
      {...props}
      className={styles.card}
      data-catch-theme={ground === "ink" ? "dark" : "light"}
      data-ground={ground}
      data-outlined={outlined || undefined}
      data-padding={padding}
    >
      {children}
    </Element>
  );
}
