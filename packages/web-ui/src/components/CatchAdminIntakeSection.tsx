import type {HTMLAttributes, ReactNode} from "react";
import styles from "./CatchAdminIntakeSection.module.css";

export type CatchAdminIntakeSectionProps = Omit<HTMLAttributes<HTMLDivElement>, "className" | "style"> & {
  children: ReactNode;
  /** event-editor: a two-column field grid. event-ceiling: a tight stack. duplicate-comparison: side-by-side records. */
  variant?: "duplicate-comparison" | "event-ceiling" | "event-editor";
};

/**
 * Admin T4 (D18): one block of an intake workbench. Registered in design/admin/components.json;
 * only Admin's intake renders it, and it retires with the Inbox redraw.
 */
export function CatchAdminIntakeSection({children, variant, ...props}: CatchAdminIntakeSectionProps) {
  return (
    <div {...props} className={styles.section} data-variant={variant}>
      {children}
    </div>
  );
}
