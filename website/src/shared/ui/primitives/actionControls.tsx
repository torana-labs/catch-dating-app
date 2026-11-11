import type {AnchorHTMLAttributes, ReactNode} from "react";
import {classNames} from "@catch/web-ui";
import {usePendingRequestNavigationBlocked} from "../../pendingRequest";

export type ButtonVariant = "primary" | "ghost" | "ghost-light";

export type ButtonSize = "default" | "small";

export function ButtonLink({
  children,
  className,
  onClick,
  size,
  tabIndex,
  variant,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  const navigationBlocked = usePendingRequestNavigationBlocked();
  return (
    <a
      {...props}
      aria-disabled={navigationBlocked || undefined}
      className={buttonClassName({className, size, variant})}
      data-pending-navigation-blocked={navigationBlocked || undefined}
      onClick={(event) => {
        if (navigationBlocked) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
      tabIndex={navigationBlocked ? -1 : tabIndex}
    >
      {children}
    </a>
  );
}

export function PlainLink({
  children,
  className,
  onClick,
  tabIndex,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
}) {
  const navigationBlocked = usePendingRequestNavigationBlocked();
  return (
    <a
      {...props}
      aria-disabled={navigationBlocked || undefined}
      className={className}
      data-pending-navigation-blocked={navigationBlocked || undefined}
      onClick={(event) => {
        if (navigationBlocked) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
      tabIndex={navigationBlocked ? -1 : tabIndex}
    >
      {children}
    </a>
  );
}

export function buttonClassName({
  className,
  size = "default",
  variant = "primary",
}: {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return classNames(
    "button",
    size === "small" && "button--small",
    variant === "ghost" && "button--ghost",
    variant === "ghost-light" && "button--ghost-light",
    className
  );
}
