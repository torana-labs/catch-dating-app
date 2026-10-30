import type {HTMLAttributes, ReactNode} from "react";
import styles from "./CatchAdminIntakeDecision.module.css";

export type CatchAdminIntakeDecisionActionsProps = Omit<HTMLAttributes<HTMLDivElement>, "className" | "style"> & {
  /** Decision buttons; the first is the primary decision. */
  children: ReactNode;
};

export type CatchAdminIntakeDecisionStateProps = Omit<HTMLAttributes<HTMLDivElement>, "className" | "style"> & {
  /** An icon and a block holding the saved `<strong>` status and `<span>` path. */
  children: ReactNode;
};

/**
 * Admin T4 (D18): the review decision buttons in Admin's `DecisionFooter`.
 * Registered in design/admin/components.json; only Admin renders it.
 */
export function CatchAdminIntakeDecisionActions({children, ...props}: CatchAdminIntakeDecisionActionsProps) {
  return (
    <div {...props} className={styles.actions}>
      {children}
    </div>
  );
}

/** Admin T4 (D18): the saved review decision that replaces the decision buttons. */
export function CatchAdminIntakeDecisionState({children, ...props}: CatchAdminIntakeDecisionStateProps) {
  return (
    <div {...props} className={styles.state}>
      {children}
    </div>
  );
}
