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
  type AdminMetricGridColumns,
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
import {AdminEyebrow} from "./shell";

export function StatusBanner({
  children,
  icon,
  tone,
}: {
  children: ReactNode;
  icon: ReactNode;
  tone: "error" | "success";
}) {
  return (
    <div
      className={tone === "error" ? "error-banner" : "success-banner"}
      role={tone === "error" ? "alert" : "status"}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}

export function AdminMetricGrid({
  ariaLabel,
  children,
  className = "",
  columns = "auto",
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  columns?: AdminMetricGridColumns;
}) {
  return (
    <section
      className={classNames(
        "metric-grid",
        columns !== "auto" && `columns-${columns}`,
        className
      )}
      aria-label={ariaLabel}
    >
      {children}
    </section>
  );
}

export function AdminSectionCaption({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow: ReactNode;
}) {
  return (
    <div className="admin-section-caption">
      <AdminEyebrow as="span">{eyebrow}</AdminEyebrow>
      <span>{children}</span>
    </div>
  );
}

export function AdminMetricCard({
  caption,
  footer,
  label,
  tone = "normal",
  value,
  variant = "card",
}: {
  caption?: ReactNode;
  footer?: ReactNode;
  label: ReactNode;
  tone?: MetricTone;
  value: ReactNode;
  variant?: MetricVariant;
}) {
  return (
    <article className={classNames(
      variant === "tile" ? "metric-tile" : "metric-card",
      tone === "attention" && "attention",
      Boolean(caption) && "has-caption",
      Boolean(footer) && "has-footer"
    )}>
      <span className="metric-label">{label}</span>
      <div className="metric-value">{value}</div>
      {caption ? <small className="metric-caption">{caption}</small> : null}
      {footer ? <small className="metric-footer">{footer}</small> : null}
    </article>
  );
}

export function AdminPublishingLoadbar({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={classNames("publishing-loadbar", className)}>
      {children}
    </div>
  );
}

export function AdminSurfacePreview({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={classNames("surface-preview", className)}>
      {children}
    </div>
  );
}

export function AdminMutedCell({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span {...props} className={classNames("muted-cell", className)}>
      {children}
    </span>
  );
}

export function AdminEventSupplyReviewGrid({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={classNames("event-supply-review-grid", className)}>
      {children}
    </div>
  );
}

export function AdminEventSupplyDetail({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <aside {...props} className={classNames("event-supply-detail", className)}>
      {children}
    </aside>
  );
}

export function AdminEventSupplyLinks({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={classNames("event-supply-links", className)}>
      {children}
    </div>
  );
}
