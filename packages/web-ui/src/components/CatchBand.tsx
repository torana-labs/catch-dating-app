import type {HTMLAttributes, ReactNode} from "react";
import type {Ground} from "./palette";
import styles from "./CatchBand.module.css";

/** A Website v2 ground from the palette tokens (CAT-245). */
export type CatchBandGround = Ground;

/**
 * Vertical rhythm of a band. Each role steps down on a page narrower than
 * 840px, as the boards do.
 */
export type CatchBandSpacing = "none" | "compact" | "regular" | "spacious";

/** `content` centres children at the page content width; `full` runs edge to edge. */
export type CatchBandWidth = "content" | "full";

export type CatchBandElement = "section" | "div" | "header" | "footer" | "aside" | "main";

export interface CatchBandProps
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "color" | "style"> {
  as?: CatchBandElement;
  children: ReactNode;
  /** Defaults to white. */
  ground?: CatchBandGround;
  /** Space below the content; defaults to `regular`. */
  pb?: CatchBandSpacing;
  /** Space above the content; defaults to `regular`. */
  pt?: CatchBandSpacing;
  width?: CatchBandWidth;
}

/**
 * A full-width page section on one ground. Library text inside takes the
 * ground's ink and secondary ink, and the ink ground resolves components
 * through the dark theme. The band declares the `catch-page` container, so
 * every Website v2 layout inside it switches to its phone arrangement when the
 * page is narrower than 840px.
 */
export function CatchBand({
  as: Element = "section",
  children,
  ground = "white",
  pb = "regular",
  pt = "regular",
  width = "content",
  ...props
}: CatchBandProps) {
  return (
    <Element
      {...props}
      className={styles.band}
      data-catch-theme={ground === "ink" ? "dark" : "light"}
      data-ground={ground}
    >
      <div className={styles.inner} data-pb={pb} data-pt={pt} data-width={width}>
        {children}
      </div>
    </Element>
  );
}
