import type {HTMLAttributes, ReactNode} from "react";
import styles from "./CatchAdminSearchCandidateHeader.module.css";

export type CatchAdminSearchCandidateHeaderProps = Omit<HTMLAttributes<HTMLElement>, "className" | "style"> & {
  /** The title block, then its trailing status. */
  children: ReactNode;
};

/**
 * Admin T4 (D18): the title row of an Admin supply record, with its status at
 * the trailing edge. Registered in design/admin/components.json; only Admin
 * renders it.
 */
export function CatchAdminSearchCandidateHeader({children, ...props}: CatchAdminSearchCandidateHeaderProps) {
  return (
    <header {...props} className={styles.header}>
      {children}
    </header>
  );
}
