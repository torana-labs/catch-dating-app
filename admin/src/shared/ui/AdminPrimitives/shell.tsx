import {useEffect, useId, useRef, useState} from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  FieldsetHTMLAttributes,
  HTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import {UiLabel as WebUiLabel} from "@catch/web-ui";
import {
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import {AdminIconButton} from "./actions";
import {
  blockPendingAnchorClick,
  useAdminOperationPending,
} from "../../pendingOperation";

import {
  classNames,
  layoutSpanClass,
  type SelectOption,
  type AlertTone,
  type MetricTone,
  type MetricVariant,
  type QualityRowTone,
  type AdminOverviewQueueIntent,
  type AdminOverviewSignalTone,
  type DataTableVariant,
  type AdminFormVariant,
  type AdminEditorGridElement,
  type AdminTagRowElement,
  type EmptyStateVariant,
  type AdminLayoutSpan,
  type AdminEyebrowElement,
  type AdminIntakeGateTone,
  type AdminBrandMarkSize,
  type AdminMarketingStepStatus,
  type AdminMarketingNewPostAccent,
  type ReviewDecision,
  type ReviewDecisionHandler,
  type ReviewDecisionResponse,
  type PageHeaderProps,
  type PanelProps,
} from "./shared";

export function AdminAppShell({
  children,
  className = "",
  intakeMode = false,
  sidebarCollapsed = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  intakeMode?: boolean;
  sidebarCollapsed?: boolean;
}) {
  return (
    <div
      {...props}
      className={classNames(
        "app-shell",
        intakeMode && "intake-route-shell",
        sidebarCollapsed && "sidebar-collapsed",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminSidebar({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <aside {...props} className={classNames("sidebar", className)}>
      {children}
    </aside>
  );
}

export function AdminSidebarToggle({
  collapsed,
  controlsId,
  onCollapsedChange,
  ...props
}: {
  collapsed: boolean;
  controlsId: string;
  onCollapsedChange: (collapsed: boolean) => void;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-controls" | "aria-expanded" | "aria-label" | "children" |
  "className" | "onClick" | "title"
>) {
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <AdminIconButton
      {...props}
      aria-controls={controlsId}
      aria-expanded={!collapsed}
      className="admin-sidebar-toggle"
      label={label}
      onClick={() => onCollapsedChange(!collapsed)}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
    </AdminIconButton>
  );
}

export function AdminBrandBlock({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("brand-block", className)}>
      {children}
    </div>
  );
}

export function AdminBrandMark({
  children,
  className = "",
  size = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  size?: AdminBrandMarkSize;
}) {
  return (
    <div {...props} className={classNames("brand-mark", size === "large" && "large", className)}>
      {children}
    </div>
  );
}

export function AdminBrandCopy({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("brand-copy", className)}>
      {children}
    </div>
  );
}

export function AdminBrandTitle({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("brand-title", className)}>
      {children}
    </div>
  );
}

export function AdminNavList({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <nav {...props} className={classNames("nav-list", className)}>
      {children}
    </nav>
  );
}

export function AdminNavGroup({
  children,
  className = "",
  label,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  label: string;
}) {
  return (
    <section
      {...props}
      aria-label={label}
      className={classNames("admin-nav-group", className)}
    >
      <h2 className="admin-nav-group-label">{label}</h2>
      <div className="admin-nav-group-items">{children}</div>
    </section>
  );
}

export function AdminWorkspace({
  children,
  className = "",
  intakeMode = false,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  intakeMode?: boolean;
}) {
  const operationPending = useAdminOperationPending();
  return (
    <main
      {...props}
      aria-busy={operationPending || undefined}
      className={classNames(
        "workspace",
        intakeMode && "intake-route-workspace",
        className
      )}
      onClickCapture={(event) => {
        blockPendingAnchorClick(event, operationPending);
        props.onClickCapture?.(event);
      }}
    >
      <fieldset
        className="admin-pending-operation-boundary"
        disabled={operationPending}
      >
        {children}
      </fieldset>
    </main>
  );
}

export function AdminTopbar({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <header {...props} className={classNames("topbar", className)}>
      {children}
    </header>
  );
}

export function AdminTopbarActions({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("topbar-actions", className)}>
      {children}
    </div>
  );
}

export function AdminAccountMenu({
  defaultOpen = false,
  isSigningOut = false,
  mode,
  onSignOut,
  roles,
  userLabel = "Signed in",
}: {
  defaultOpen?: boolean;
  isSigningOut?: boolean;
  mode: string;
  onSignOut?: () => void;
  roles: readonly string[];
  userLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const avatarLabel = adminAccountAvatarLabel(userLabel);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const handleSignOut = () => {
    setIsOpen(false);
    onSignOut?.();
  };

  return (
    <div className="admin-account-menu" ref={containerRef}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label="Account menu"
        className="admin-account-trigger"
        onClick={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className="admin-account-avatar">
          {avatarLabel}
        </span>
        <span className="admin-account-trigger-copy">
          <strong>{userLabel}</strong>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="admin-account-chevron"
          size={15}
          strokeWidth={1.9}
        />
      </button>
      {isOpen ? (
        <div
          aria-label="Account details"
          className="admin-account-panel"
          id={panelId}
          role="region"
        >
          <span className="admin-account-label">Signed in as</span>
          <strong className="admin-account-identity" title={userLabel}>
            {userLabel}
          </strong>
          {mode === "sample" ? (
            <p className="admin-account-context">
              Local preview data. Production writes are unavailable.
            </p>
          ) : null}
          <div aria-label="Admin roles" className="admin-account-roles">
            {roles.length > 0 ? (
              roles.map((role) => (
                <span className="admin-account-role" key={role}>
                  {adminAccountRoleLabel(role)}
                </span>
              ))
            ) : (
              <span className="admin-account-role muted">No admin roles</span>
            )}
          </div>
          {onSignOut ? (
            <button
              className="admin-account-sign-out"
              disabled={isSigningOut}
              onClick={handleSignOut}
              type="button"
            >
              <LogOut aria-hidden="true" size={16} strokeWidth={1.9} />
              {isSigningOut ? "Signing out" : "Sign out"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function adminAccountRoleLabel(role: string): string {
  const words = role
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/[-_]+/gu, " ")
    .trim()
    .toLowerCase();
  return words ? `${words[0]!.toUpperCase()}${words.slice(1)}` : "Account";
}

function adminAccountAvatarLabel(userLabel: string): string {
  const identity = userLabel.split("@")[0]?.trim() ?? "";
  const words = identity.split(/[^\p{L}\p{N}]+/gu).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]![0] ?? ""}${words.at(-1)?.[0] ?? ""}`.toUpperCase();
  }
  const compact = words[0]?.replace(/[^\p{L}\p{N}]/gu, "") ?? "";
  return compact.slice(0, 2).toUpperCase() || "CA";
}

export function AdminSignInScreen({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <main {...props} className={classNames("signin-screen", className)}>
      {children}
    </main>
  );
}

export function AdminSignInPanel({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <section {...props} className={classNames("signin-panel", className)}>
      {children}
    </section>
  );
}

export function AdminSignInMeta({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("signin-meta", className)}>
      {children}
    </div>
  );
}

export function AdminSignInActions({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("signin-actions", className)}>
      {children}
    </div>
  );
}

export function AdminEyebrow({
  as = "div",
  children,
  className = "",
}: {
  as?: AdminEyebrowElement;
  children: ReactNode;
  className?: string;
}) {
  const classes = classNames("intake-eyebrow", className);
  if (as === "span") {
    return <WebUiLabel className={classes}>{children}</WebUiLabel>;
  }
  return <WebUiLabel as="div" className={classes}>{children}</WebUiLabel>;
}
