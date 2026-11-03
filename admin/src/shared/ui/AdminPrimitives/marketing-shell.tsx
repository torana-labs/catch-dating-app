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

import {SegmentedControl} from "./actions";
import {AdminEyebrow} from "./shell";
import {CatchLegacyText} from "@catch/web-ui";

export function PageHeader({
  actions,
  children,
  className = "",
  eyebrow,
  title,
}: PageHeaderProps) {
  return (
    <header className={`marketing-ops-header ${className}`.trim()}>
      <div>
        {eyebrow ? <AdminEyebrow>{eyebrow}</AdminEyebrow> : null}
        <CatchLegacyText as="h2" variant="titleL">{title}</CatchLegacyText>
        {children ? <CatchLegacyText as="p" variant="supporting">{children}</CatchLegacyText> : null}
      </div>
      {actions}
    </header>
  );
}

export function AdminMarketingOpsShell({
  children,
  className = "",
  variant,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  variant?: "studio";
}) {
  return (
    <section
      {...props}
      className={classNames("marketing-ops-shell", variant === "studio" && "marketing-studio-shell", className)}
    >
      {children}
    </section>
  );
}

export function AdminMarketingStudioActions({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-studio-actions", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingStudioNav({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-studio-nav", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingTabs<T extends string>({
  ariaLabel,
  className = "",
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  className?: string;
  options: Array<{disabled?: boolean; id: T; label: ReactNode}>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <SegmentedControl
      ariaLabel={ariaLabel}
      className={classNames("marketing-tabs", className)}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}

export function AdminMarketingStudioStack({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-studio-stack", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingStudioSummary({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <section {...props} className={classNames("marketing-studio-summary", className)}>
      {children}
    </section>
  );
}

export function AdminMarketingStudioSummaryItem({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function AdminMarketingStudioFilterTabs<T extends string>({
  ariaLabel,
  className = "",
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  className?: string;
  options: Array<{disabled?: boolean; id: T; label: ReactNode}>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <SegmentedControl
      ariaLabel={ariaLabel}
      className={classNames("marketing-studio-filter-row", className)}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}

export function AdminMarketingPostBoard({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-post-board", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingBoardColumn({
  children,
  className = "",
  count,
  title,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  count: ReactNode;
  title: ReactNode;
}) {
  return (
    <section {...props} className={classNames("marketing-board-column", className)}>
      <header>
        <span>{title}</span>
        <strong>{count}</strong>
      </header>
      {children}
    </section>
  );
}

export function AdminMarketingBoardList({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-board-list", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingPostTypeBadge({
  children,
  className = "",
  draftType,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  draftType: string;
}) {
  return (
    <span {...props} className={classNames("marketing-post-type", draftType, className)}>
      {children}
    </span>
  );
}
