import type {HTMLAttributes, ReactNode} from "react";

/**
 * The headless table frame: a keyboard-reachable, named scroll region around a native table,
 * for admin and website tables not yet on CatchTable. It retires as those tables move to
 * CatchTable, the styled implementation of the same contract.
 */
type DataTableAccessibleName =
  | {ariaLabel: string; ariaLabelledBy?: never}
  | {ariaLabel?: never; ariaLabelledBy: string};

export type DataTableControlProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "aria-label" | "aria-labelledby" | "children" | "role"
> &
  DataTableAccessibleName & {
    children: ReactNode;
    tableClassName?: string;
  };

export function DataTableControl({
  ariaLabel,
  ariaLabelledBy,
  children,
  tableClassName,
  tabIndex = 0,
  ...props
}: DataTableControlProps) {
  return (
    <div
      {...props}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      role="region"
      tabIndex={tabIndex}
    >
      <table
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={tableClassName}
      >
        {children}
      </table>
    </div>
  );
}
