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
import {CheckCircle2, FileWarning, Lock} from "lucide-react";

import {
  classNames,
  layoutSpanClass,
  type SelectOption,
  type AlertTone,
  type MetricTone,
  type MetricVariant,
  type QualityRowTone,
  type AdminFormVariant,
  type EmptyStateVariant,
  type AdminLayoutSpan,
  type AdminEyebrowElement,
  type AdminBrandMarkSize,
  type AdminMarketingStepStatus,
  type AdminMarketingNewPostAccent,
  type ReviewDecision,
  type ReviewDecisionHandler,
  type ReviewDecisionResponse,
  type PageHeaderProps,
  type PanelProps,
} from "./shared";

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
