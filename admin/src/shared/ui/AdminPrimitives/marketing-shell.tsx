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
  type ChipTone,
  type AlertTone,
  type TagTone,
  type MetricTone,
  type MetricVariant,
  type QualityRowTone,
  type AdminOverviewQueueIntent,
  type AdminOverviewSignalTone,
  type RiskTone,
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

import {SegmentedControl} from "./actions";
import {AdminEyebrow} from "./shell";
import {CatchText} from "@catch/web-ui";

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
        <CatchText as="h2" variant="titleL">{title}</CatchText>
        {children ? <CatchText as="p" variant="supporting">{children}</CatchText> : null}
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

export function AdminIntakeEventWorkspaceShell({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <AdminMarketingOpsShell
      {...props}
      className={classNames("intake-event-workspace", className)}
    >
      {children}
    </AdminMarketingOpsShell>
  );
}

export function AdminIntakeWorkspaceHeader({
  actions,
  children,
  className = "",
  eyebrow,
  title,
  ...props
}: HTMLAttributes<HTMLElement> & {
  actions?: ReactNode;
  children?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
}) {
  return (
    <section {...props} className={classNames("intake-workspace-header", className)}>
      <div>
        {eyebrow ? <AdminEyebrow>{eyebrow}</AdminEyebrow> : null}
        <CatchText as="h2" variant="titleL">{title}</CatchText>
        {children ? <CatchText as="p" variant="supporting">{children}</CatchText> : null}
      </div>
      {actions}
    </section>
  );
}

export function AdminIntakeWorkspaceTabs<T extends string>({
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
      className={classNames("intake-workspace-tabs", className)}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}

export function AdminIntakeLayout({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <section {...props} className={classNames("main-grid", "intake-layout", className)}>
      {children}
    </section>
  );
}

export function AdminMarketingStudioHeader({
  className = "",
  ...props
}: PageHeaderProps) {
  return (
    <PageHeader
      {...props}
      className={classNames("marketing-studio-header", className)}
    />
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