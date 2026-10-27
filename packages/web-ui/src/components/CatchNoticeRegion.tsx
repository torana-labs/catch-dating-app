import type {ReactNode} from "react";
import styles from "./CatchNoticeRegion.module.css";

export interface CatchNoticeRegionProps {
  /** Names the region, such as "Notifications". */
  label: string;
  children?: ReactNode;
}

/**
 * The one place notices appear: a polite live region fixed above the page's
 * bottom edge and safe area, centred and as wide as the content allows.
 */
export function CatchNoticeRegion({label, children}: CatchNoticeRegionProps) {
  return (
    <section aria-label={label} aria-live="polite" className={styles.region}>
      {children}
    </section>
  );
}
