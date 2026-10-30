import type {HTMLAttributes, ReactNode} from "react";
import styles from "./CatchAdminIntakeSourceList.module.css";

export type CatchAdminIntakeSourceListProps = Omit<HTMLAttributes<HTMLDivElement>, "className" | "style"> & {
  /** The source rows, in order. */
  children: ReactNode;
};

/**
 * Admin T4 (D18): the list of source rows under an Admin supply record.
 * Registered in design/admin/components.json; only Admin renders it.
 */
export function CatchAdminIntakeSourceList({children, ...props}: CatchAdminIntakeSourceListProps) {
  return (
    <div {...props} className={styles.list}>
      {children}
    </div>
  );
}
