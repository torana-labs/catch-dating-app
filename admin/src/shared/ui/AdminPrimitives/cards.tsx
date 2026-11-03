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

