import type {HTMLAttributes, ReactNode} from "react";

import {classNames} from "./shared";

export function AdminDecisionFooterShell({
  children,
  className = "",
  compact = false,
  layout = "default",
  sticky = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  compact?: boolean;
  layout?: "default" | "publishing-actions";
  sticky?: boolean;
}) {
  return (
    <div
      {...props}
      className={classNames(
        "marketing-decision-footer",
        "admin-decision-footer",
        compact && "compact",
        layout === "publishing-actions" && "publishing-actions",
        sticky && "sticky",
        className
      )}
    >
      {children}
    </div>
  );
}
