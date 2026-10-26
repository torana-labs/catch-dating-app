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
import {ButtonControl} from "@catch/web-ui";

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
  type AdminSignalTone,
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

import {AdminEyebrow} from "./shell";
import {EmptyState} from "./workbench";

export function AdminButton({
  children,
  className = "",
  icon,
  loading = false,
  loadingLabel,
  selected = false,
  type = "button",
  variant = "ghost",
  ...props
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  loading?: boolean;
  loadingLabel?: ReactNode;
  selected?: boolean;
  variant?: "ghost" | "primary" | "link";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = [
    variant === "primary" ?
      "primary-button" :
      variant === "link" ? "link-button" : "ghost-button",
    selected ? "selected" : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <ButtonControl className={classes} loading={loading} type={type} {...props}>
      {icon}
      {loading ? loadingLabel ?? children : children}
    </ButtonControl>
  );
}

export function AdminOverviewMainGrid({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <section {...props} className={classNames("main-grid", className)}>
      {children}
    </section>
  );
}

export function AdminOverviewAnalyticsClearButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
}) {
  return (
    <AdminButton
      {...props}
      className={classNames("analytics-clear", className)}
    />
  );
}

export function AdminOverviewQueueItems({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("queue-items", className)}>
      {children}
    </div>
  );
}

export function AdminOverviewQueueRow({
  children,
  className = "",
  intent,
  selected = false,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  intent: AdminOverviewQueueIntent;
  selected?: boolean;
}) {
  return (
    <article
      {...props}
      className={classNames("queue-row", intent, selected && "selected", className)}
    >
      {children}
    </article>
  );
}

export function AdminOverviewQueueRowActions({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("queue-row-actions", className)}>
      {children}
    </div>
  );
}

export function AdminOverviewQueueDecisionButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
}) {
  return (
    <AdminButton
      {...props}
      className={classNames("queue-decision-button", className)}
    />
  );
}

export function AdminOverviewQueueDetailPanel({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <section {...props} className={classNames("queue-detail-panel", className)}>
      {children}
    </section>
  );
}
