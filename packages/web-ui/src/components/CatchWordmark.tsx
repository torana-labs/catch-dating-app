import type {ReactNode} from "react";
import styles from "./CatchWordmark.module.css";

/** bar: the site top bar; band: the footer's ink band. */
export type CatchWordmarkSize = "bar" | "band";

export interface CatchWordmarkProps {
  /** The brand, such as "Catch". */
  children: ReactNode;
  /** A product line after the brand, such as "for hosts" or "for weddings". */
  subBrand?: ReactNode;
  size?: CatchWordmarkSize;
  /** Makes the wordmark a link, such as to the homepage. */
  href?: string;
  /** The accessible name when it differs from the visible words. */
  label?: string;
}

/**
 * catch.wordmark: the brand typed in Archivo's display voice, the one 78%
 * width, weight and tracking ratio every display heading uses (blueprint
 * D19), so the top bar and the footer can never drift apart. It never wraps;
 * a sub-brand rides on the same line.
 */
export function CatchWordmark({children, href, label, size = "bar", subBrand}: CatchWordmarkProps) {
  const words = <>{children}{subBrand ? <>{" "}<span className={styles.sub}>{subBrand}</span></> : null}</>;
  return href === undefined
    ? <span aria-label={label} className={styles.wordmark} data-size={size}>{words}</span>
    : <a aria-label={label} className={styles.wordmark} data-size={size} href={href}>{words}</a>;
}
