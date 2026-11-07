import type {ReactNode} from "react";
import {DataTableControl, classNames} from "@catch/web-ui";

export function DataTable({
  ariaLabel,
  children,
  className,
  reveal = false,
  tableClassName,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  reveal?: boolean;
  tableClassName?: string;
}) {
  return (
    <DataTableControl
      ariaLabel={ariaLabel}
      className={className}
      data-reveal={reveal || undefined}
      tableClassName={tableClassName}
    >
      {children}
    </DataTableControl>
  );
}
