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
