import {useEffect, useId, useRef, useState} from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  FieldsetHTMLAttributes,
  HTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import {UiLabel as WebUiLabel} from "@catch/web-ui";
import {
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import {AdminIconButton} from "./actions";
import {
  blockPendingAnchorClick,
  useAdminOperationPending,
} from "../../pendingOperation";

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

export function AdminBrandMark({
  children,
  className = "",
  size = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  size?: AdminBrandMarkSize;
}) {
  return (
    <div {...props} className={classNames("brand-mark", size === "large" && "large", className)}>
      {children}
    </div>
  );
}

export function AdminWorkspace({
  children,
  className = "",
  intakeMode = false,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  intakeMode?: boolean;
}) {
  const operationPending = useAdminOperationPending();
  return (
    <main
      {...props}
      aria-busy={operationPending || undefined}
      className={classNames(
        "workspace",
        intakeMode && "intake-route-workspace",
        className
      )}
      onClickCapture={(event) => {
        blockPendingAnchorClick(event, operationPending);
        props.onClickCapture?.(event);
      }}
    >
      <fieldset
        className="admin-pending-operation-boundary"
        disabled={operationPending}
      >
        {children}
      </fieldset>
    </main>
  );
}

export function AdminSignInScreen({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <main {...props} className={classNames("signin-screen", className)}>
      {children}
    </main>
  );
}

export function AdminSignInPanel({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <section {...props} className={classNames("signin-panel", className)}>
      {children}
    </section>
  );
}

export function AdminSignInMeta({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("signin-meta", className)}>
      {children}
    </div>
  );
}

export function AdminSignInActions({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("signin-actions", className)}>
      {children}
    </div>
  );
}

export function AdminEyebrow({
  as = "div",
  children,
  className = "",
}: {
  as?: AdminEyebrowElement;
  children: ReactNode;
  className?: string;
}) {
  const classes = classNames("intake-eyebrow", className);
  if (as === "span") {
    return <WebUiLabel className={classes}>{children}</WebUiLabel>;
  }
  return <WebUiLabel as="div" className={classes}>{children}</WebUiLabel>;
}
