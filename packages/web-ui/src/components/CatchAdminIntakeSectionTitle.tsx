import type {HTMLAttributes, ReactNode} from "react";
import styles from "./CatchAdminIntakeSectionTitle.module.css";

export type CatchAdminIntakeSectionTitleProps = Omit<HTMLAttributes<HTMLDivElement>, "className" | "style"> & {
  children: ReactNode;
};

/**
 * Admin T4 (D18): the uppercase title of an Admin intake section.
 * Registered in design/admin/components.json; only Admin renders it.
 */
export function CatchAdminIntakeSectionTitle({children, ...props}: CatchAdminIntakeSectionTitleProps) {
  return (
    <div {...props} className={styles.title}>
      {children}
    </div>
  );
}
