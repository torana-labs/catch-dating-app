import type {HTMLAttributes, ReactNode} from "react";
import styles from "./CatchAdminCommandStack.module.css";

export type CatchAdminCommandStackProps = Omit<HTMLAttributes<HTMLDivElement>, "className" | "style"> & {
  children: ReactNode;
};

export type CatchAdminCommandRowProps = Omit<HTMLAttributes<HTMLDivElement>, "className" | "style"> & {
  /** A `<span>` label and the `<code>` command it names. */
  children: ReactNode;
};

/**
 * Admin T4 (D18): the stack of operator commands a marketing panel lists.
 * Registered in design/admin/components.json; only Admin renders it.
 */
export function CatchAdminCommandStack({children, ...props}: CatchAdminCommandStackProps) {
  return (
    <div {...props} className={styles.stack}>
      {children}
    </div>
  );
}

/** Admin T4 (D18): one labelled operator command inside `CatchAdminCommandStack`. */
export function CatchAdminCommandRow({children, ...props}: CatchAdminCommandRowProps) {
  return (
    <div {...props} className={styles.row}>
      {children}
    </div>
  );
}
