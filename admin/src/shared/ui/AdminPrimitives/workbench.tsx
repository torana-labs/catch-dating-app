import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  DetailsHTMLAttributes,
  FieldsetHTMLAttributes,
  FormHTMLAttributes,
  HTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import {EmptyStateControl} from "@catch/web-ui";
import {CheckCircle2, FileWarning, Lock, RefreshCw} from "lucide-react";

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

export function AdminToolbar({
  children,
  className = "",
  compact = false,
}: {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={classNames("workbench-toolbar", compact && "compact", className)}>
      {children}
    </div>
  );
}



export function AdminWorkbenchNote({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
}) {
  return (
    <p {...props} className={classNames("workbench-note", className)}>
      {children}
    </p>
  );
}

export function AdminWorkbenchStack({
  alignStart = false,
  children,
  className = "",
  compact = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  alignStart?: boolean;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      {...props}
      className={classNames(
        "workbench-stack",
        compact && "compact-stack",
        alignStart && "align-start",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminSecondaryDisclosure({
  children,
  className = "",
  summary,
  ...props
}: DetailsHTMLAttributes<HTMLDetailsElement> & {
  children: ReactNode;
  summary: ReactNode;
}) {
  return (
    <details
      {...props}
      className={classNames("admin-secondary-disclosure", className)}
    >
      <summary>{summary}</summary>
      <div className="admin-secondary-disclosure-content">{children}</div>
    </details>
  );
}

export function AdminChecklistStack({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("checklist-stack", className)}>
      {children}
    </div>
  );
}

export function AdminChecklistHeader({
  detail,
  label,
}: {
  detail: ReactNode;
  label: ReactNode;
}) {
  return (
    <div className="checklist-heading">
      <strong>{label}</strong>
      <span>{detail}</span>
    </div>
  );
}

export function AdminChecklistCopy({
  detail,
  label,
}: {
  detail: ReactNode;
  label: ReactNode;
}) {
  return (
    <span className="checklist-copy">
      <strong>{label}</strong>
      <small>{detail}</small>
    </span>
  );
}

export function AdminDirectoryScreenStack({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <AdminWorkbenchStack {...props} className={classNames("admin-directory-screen", className)} />
  );
}

export function AdminDetailScreenStack({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <AdminWorkbenchStack {...props} className={classNames("admin-detail-screen", className)} />
  );
}

export function AdminEditorGrid({
  as = "section",
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: AdminEditorGridElement;
  children: ReactNode;
}) {
  if (as === "div") {
    return (
      <div
        {...props}
        className={classNames("publishing-editor-grid", className)}
      >
        {children}
      </div>
    );
  }

  return (
    <section
      {...props}
      className={classNames("publishing-editor-grid", className)}
    >
      {children}
    </section>
  );
}

export function AdminStatusGrid({
  children,
  className = "",
  compact = false,
}: {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={classNames("admin-status-grid", compact && "compact", className)}>
      {children}
    </div>
  );
}

export function AdminFilterBar({
  ariaLabel,
  children,
  className = "",
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={classNames("analytics-controls", className)} aria-label={ariaLabel}>
      {children}
    </section>
  );
}

export function EmptyState({
  children,
  className = "",
  compact = false,
  icon,
  variant = "row",
}: {
  children: ReactNode;
  className?: string;
  compact?: boolean;
  icon?: ReactNode;
  variant?: EmptyStateVariant;
}) {
  const variantClass = variant === "workbench" ?
    "workbench-empty" :
    variant === "editor" ?
    "empty-editor" :
    variant === "marketing" ?
    "marketing-empty-state" :
    "empty-row";
  return (
    <EmptyStateControl
      className={classNames(variantClass, compact && "compact", className)}
      contentElement="span"
      icon={icon}
    >
      {children}
    </EmptyStateControl>
  );
}

export function AdminEventSupplyEmptyState({
  children,
  className = "",
  icon,
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <EmptyState
      className={classNames("event-supply-detail", className)}
      icon={icon}
      variant="workbench"
    >
      {children}
    </EmptyState>
  );
}

export function AdminFeatureLoadingState({
  label,
}: {
  label: ReactNode;
}) {
  return (
    <EmptyState
      variant="marketing"
      icon={<AdminLoadingIcon size={18} />}
    >
      {label}...
    </EmptyState>
  );
}

export function AdminLoadingIcon({
  active = true,
  size = 17,
  strokeWidth = 1.9,
}: {
  active?: boolean;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <RefreshCw
      aria-hidden="true"
      className={active ? "spin" : undefined}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}
