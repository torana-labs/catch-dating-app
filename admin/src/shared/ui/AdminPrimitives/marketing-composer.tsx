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

import {SelectableCardButton} from "./cards";
import {AdminButton} from "./overview";

export function AdminMarketingComposer({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <section {...props} className={classNames("marketing-composer", className)}>
      {children}
    </section>
  );
}

export function AdminMarketingComposerHeader({
  children,
  className = "",
  status,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  status: ReactNode;
}) {
  return (
    <header {...props} className={classNames("marketing-composer-header", className)}>
      <div>{children}</div>
      {status}
    </header>
  );
}

export function AdminMarketingComposerBackButton({
  children,
  className = "",
  ...props
}: {
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <AdminButton {...props} className={classNames("marketing-composer-back", className)}>
      {children}
    </AdminButton>
  );
}

export function AdminMarketingStepStrip({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-step-strip", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingStepChip({
  children,
  className = "",
  marker,
  status = "todo",
  ...props
}: {
  children: ReactNode;
  className?: string;
  marker: ReactNode;
  status?: AdminMarketingStepStatus;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <SelectableCardButton
      {...props}
      className={classNames(
        "marketing-step-chip",
        status === "active" && "active",
        status === "done" && "done",
        className
      )}
    >
      <span>{marker}</span>
      <strong>{children}</strong>
    </SelectableCardButton>
  );
}

export function AdminMarketingStepLayout({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-step-layout", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingComposerFooter({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-composer-footer", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingPickerList({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-picker-list", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingPickerRow({
  children,
  className = "",
  marker,
  selected = false,
  status,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  marker?: ReactNode;
  selected?: boolean;
  status: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-picker-row", selected && "selected", className)}>
      <span>{marker}</span>
      <div>{children}</div>
      <em>{status}</em>
    </div>
  );
}

export function AdminMarketingFeatureShotGrid({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-feature-shot-grid", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingFeatureShotCard({
  children,
  className = "",
  headline,
  meta,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  headline: ReactNode;
  meta: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-feature-shot-card", className)}>
      {meta}
      <strong>{headline}</strong>
      {children}
    </div>
  );
}

export function AdminMarketingBrandContract({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-brand-contract", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingBrandContractItem({
  className = "",
  label,
  value,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div {...props} className={className}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}