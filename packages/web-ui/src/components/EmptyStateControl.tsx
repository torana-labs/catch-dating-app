import type {HTMLAttributes, ReactNode} from "react";

/**
 * The headless empty-state frame: optional live announcement around caller content, for admin and
 * website empty states not yet on CatchEmptyState. It retires as those move to CatchEmptyState,
 * the styled implementation of the same contract.
 */
export type EmptyStateAnnouncement = "assertive" | "off" | "polite";

export interface EmptyStateControlProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "aria-live" | "role"> {
  announce?: EmptyStateAnnouncement;
  contentElement?: "none" | "span";
  icon?: ReactNode;
}

export function EmptyStateControl({
  announce = "off",
  children,
  contentElement = "none",
  icon,
  ...props
}: EmptyStateControlProps) {
  const content = contentElement === "span" ? <span>{children}</span> : children;
  return (
    <div
      {...props}
      aria-live={announce === "off" ? undefined : announce}
      role={announce === "off" ? undefined : "status"}
    >
      {icon}
      {content}
    </div>
  );
}
