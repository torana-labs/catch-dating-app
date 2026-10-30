import {ButtonControl} from "@catch/web-ui";
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

export function AdminIntakeSection({
  children,
  className = "",
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: "duplicate-comparison" | "event-ceiling" | "event-editor";
}) {
  return (
    <div
      {...props}
      className={classNames(
        "intake-section",
        variant ? `intake-${variant}` : "",
        className
      )}
    >
      {children}
    </div>
  );
}




export function AdminDecisionFooterShell({
  children,
  className = "",
  compact = false,
  layout = "default",
  sticky = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  compact?: boolean;
  layout?: "default" | "publishing-actions";
  sticky?: boolean;
}) {
  return (
    <div
      {...props}
      className={classNames(
        "marketing-decision-footer",
        "admin-decision-footer",
        compact && "compact",
        layout === "publishing-actions" && "publishing-actions",
        sticky && "sticky",
        className
      )}
    >
      {children}
    </div>
  );
}


export type AdminIntakeWorkbenchTone =
  | "neutral"
  | "warning"
  | "danger"
  | "success";

export interface AdminIntakeStageOption<TStage extends string> {
  id: TStage;
  label: ReactNode;
}

export function AdminIntakeTaskToolbar({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <section
      {...props}
      className={classNames("intake-task-toolbar", className)}
    >
      {children}
    </section>
  );
}

export function AdminIntakeWorkspaceFrame({
  children,
  chrome,
}: {
  children: ReactNode;
  chrome: ReactNode;
}) {
  return (
    <section className="intake-workspace-screen">
      <div className="intake-workspace-chrome">{chrome}</div>
      <div className="intake-workspace-content">{children}</div>
    </section>
  );
}

export function AdminIntakeStageRail<TStage extends string>({
  ariaLabel,
  className = "",
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  className?: string;
  options: Array<AdminIntakeStageOption<TStage>>;
  value: TStage;
  onChange: (value: TStage) => void;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={classNames("intake-stage-rail", className)}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <ButtonControl
            aria-current={selected ? "step" : undefined}
            className={selected ? "selected" : ""}
            key={option.id}
            onClick={() => onChange(option.id)}
            type="button"
          >
            <strong>{option.label}</strong>
          </ButtonControl>
        );
      })}
    </nav>
  );
}

export function AdminIntakeBoundaryNotice({
  actionLabel,
  children,
  className = "",
  title,
  onAction,
}: {
  actionLabel?: ReactNode;
  children: ReactNode;
  className?: string;
  title: ReactNode;
  onAction?: () => void;
}) {
  return (
    <section className={classNames("intake-boundary-notice", className)}>
      <div>
        <strong>{title}</strong>
        <span>{children}</span>
      </div>
      {actionLabel && onAction ? (
        <button onClick={onAction} type="button">{actionLabel}</button>
      ) : null}
    </section>
  );
}

export interface AdminIntakeQueueItem {
  age?: ReactNode;
  ageDays?: number | null;
  blocker?: ReactNode;
  blockerKey?: string | null;
  description: ReactNode;
  id: string;
  initials: ReactNode;
  kind?: ReactNode;
  market?: ReactNode;
  meta: ReactNode;
  pending?: boolean;
  source?: ReactNode;
  status: ReactNode;
  statusTone?: AdminIntakeWorkbenchTone;
  title: ReactNode;
  values?: Record<string, ReactNode>;
}

export interface AdminIntakeQueueFilter {
  id: string;
  label: ReactNode;
  selected: boolean;
}

export interface AdminIntakeQueueColumn {
  id: string;
  label: ReactNode;
  width?: string;
}

export interface AdminIntakeEvidenceRow {
  href?: string | null;
  id: string;
  meta: ReactNode;
  status: ReactNode;
  statusTone?: AdminIntakeWorkbenchTone;
  title: ReactNode;
}

export interface AdminIntakeImpactRow {
  id: string;
  label: ReactNode;
  tone?: AdminIntakeWorkbenchTone;
  value: ReactNode;
}

export interface AdminIntakeChecklistRow {
  id: string;
  label: ReactNode;
  meta: ReactNode;
  passed: boolean;
}

export type AdminIntakeInspectorSection =
  | {
    id: string;
    kind: "evidence";
    rows: AdminIntakeEvidenceRow[];
    title: ReactNode;
  }
  | {
    id: string;
    kind: "checklist";
    rows: AdminIntakeChecklistRow[];
    title: ReactNode;
  }
  | {
    id: string;
    kind: "impact";
    rows: AdminIntakeImpactRow[];
    title: ReactNode;
  }
  | {
    content: ReactNode;
    id: string;
    kind: "content" | "diagnostics";
    title: ReactNode;
  };

export interface AdminIntakeInspectorBlocker {
  action: ReactNode;
  id: string;
  label: ReactNode;
  tone?: "danger" | "warning";
}

export interface AdminIntakeWorkbenchDetail {
  action?: ReactNode;
  actionGate?: ReactNode;
  actions?: ReactNode;
  blockers?: AdminIntakeInspectorBlocker[];
  initials: ReactNode;
  readiness: {
    blockers: number;
    complete: number;
    label: ReactNode;
    total: number;
  };
  sections: AdminIntakeInspectorSection[];
  status: ReactNode;
  statusTone?: AdminIntakeWorkbenchTone;
  subtitle: ReactNode;
  title: ReactNode;
}

export {
  AdminIntakeReviewWorkbench,
} from "./intakeWorkbench";
export type {AdminIntakeBulkAction} from "./intakeWorkbench";
