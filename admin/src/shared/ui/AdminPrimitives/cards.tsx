import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  FieldsetHTMLAttributes,
  FormHTMLAttributes,
  HTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
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

export function AdminCard({
  children,
  className = "",
  span,
  variant = "marketing",
}: {
  children: ReactNode;
  className?: string;
  span?: AdminLayoutSpan;
  variant?: "marketing" | "searchCandidate" | "intake";
}) {
  const baseClass = variant === "searchCandidate" ?
    "search-candidate-card" :
    variant === "intake" ?
    "intake-card" :
    "marketing-card";
  return (
    <article className={classNames(baseClass, layoutSpanClass(span), className)}>
      {children}
    </article>
  );
}

export function AdminCardList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={classNames("marketing-card-list", className)}>{children}</div>;
}

export function AdminStatGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={classNames("marketing-stat-grid", className)}>{children}</div>;
}

export function AdminDiffList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={classNames("diff-list", className)}>{children}</div>;
}

export function AdminDiffRow({
  after,
  before,
  field,
}: {
  after: ReactNode;
  before: ReactNode;
  field: ReactNode;
}) {
  return (
    <div className="diff-row">
      <strong>{field}</strong>
      <span>{before}</span>
      <span>{after}</span>
    </div>
  );
}

export function SelectableCardButton({
  children,
  className = "marketing-post-card",
  selected = false,
  type = "button",
  ...props
}: {
  children: ReactNode;
  className?: string;
  selected?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${className} ${selected ? "selected" : ""}`.trim()}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function CardHeader({
  action,
  children,
  className = "",
  variant = "marketing",
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "marketing" | "searchCandidate" | "intake";
}) {
  const baseClass = variant === "searchCandidate" ?
    "search-candidate-header" :
    variant === "intake" ?
    "intake-card-header" :
    "marketing-card-header";
  return (
    <header className={`${baseClass} ${className}`.trim()}>
      {children}
      {action}
    </header>
  );
}

export function AdminTagList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames("intake-tags", className)}>
      {children}
    </div>
  );
}

export function AdminRowTitle({
  children,
  className = "",
  compact = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div {...props} className={classNames("row-title", compact && "compact", className)}>
      {children}
    </div>
  );
}

export function AdminTagRow({
  as = "div",
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: AdminTagRowElement;
  children: ReactNode;
}) {
  if (as === "span") {
    return (
      <span {...props} className={classNames("tag-row", className)}>
        {children}
      </span>
    );
  }

  return (
    <div {...props} className={classNames("tag-row", className)}>
      {children}
    </div>
  );
}

export function AdminRoadmapList({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("roadmap-list", className)}>
      {children}
    </div>
  );
}

export function AdminRoadmapListItem({
  actionable = false,
  children,
  className = "",
  tone = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  actionable?: boolean;
  children: ReactNode;
  tone?: "default" | "blocker" | "warning";
}) {
  return (
    <div
      {...props}
      className={classNames(
        "roadmap-list-item",
        actionable && "actionable",
        tone !== "default" && tone,
        className
      )}
    >
      {children}
    </div>
  );
}
