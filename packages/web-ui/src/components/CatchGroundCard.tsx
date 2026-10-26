import type {HTMLAttributes, ReactNode} from "react";
import type {Ground} from "./palette";
import styles from "./CatchGroundCard.module.css";

/** Inner space: `compact` for a card inside a card, `spacious` for a pitch. */
export type CatchGroundCardPadding = "compact" | "regular" | "spacious";

export type CatchGroundCardElement = "div" | "section" | "article" | "aside";

export interface CatchGroundCardProps
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "color" | "style"> {
  as?: CatchGroundCardElement;
  children: ReactNode;
  /** Defaults to paper. */
  ground?: Ground;
  /** A hairline in the ground's ink, for a card on a page of the same ground. */
  outlined?: boolean;
  /** Defaults to regular. */
  padding?: CatchGroundCardPadding;
}

/**
 * A Website v2 card: a rounded block on one ground that holds whatever the
 * page arranges in it, such as a share panel, a form step or a pitch. Library
 * text inside takes the ground's inks, and the ink ground resolves components
 * through the dark theme, as `CatchBand` does for a full-width section.
 */
export function CatchGroundCard({
  as: Element = "div",
  children,
  ground = "paper",
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
