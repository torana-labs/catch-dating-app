import type {ReactNode} from "react";
import {classNames} from "@catch/web-ui";

export type SelectOption = string | {label: string; value: string};

/**
 * CatchField's select `values` and `itemLabelBuilder` for an option list whose
 * values are strings; spread it onto the field.
 */
export function selectOptions(options: readonly SelectOption[]): {
  itemLabelBuilder: (value: string) => string;
  values: string[];
} {
  const labels = new Map(options.map((option) =>
    typeof option === "string" ? [option, option] : [option.value, option.label]));
  return {
    itemLabelBuilder: (value) => labels.get(value) ?? value,
    values: [...labels.keys()],
  };
}

export type AlertTone = "neutral" | "warning" | "success" | "blocked";
export type MetricTone = "normal" | "attention";
export type MetricVariant = "card" | "tile";
export type AdminMetricGridColumns = 3 | 4 | 6 | "auto";
export type QualityRowTone = "base" | AlertTone | string;
export type AdminOverviewQueueIntent = "danger" | "warning" | "neutral";
export type AdminSignalTone = "neutral" | "green" | "teal" | "orange" | "red";
export type AdminOverviewSignalTone = AdminSignalTone;
export type DataTableVariant = "default" | "workbench";
export type AdminFormVariant = "default" | "publishing";
export type AdminEditorGridElement = "div" | "section";
export type AdminTagRowElement = "div" | "span";
export type EmptyStateVariant = "row" | "workbench" | "editor" | "marketing";
export type AdminLayoutSpan = 1 | 2 | 3;
export type AdminEyebrowElement = "div" | "span";
export type AdminIntakeGateTone = "passed" | "blocked" | string;
export type AdminBrandMarkSize = "default" | "large";
export type AdminMarketingStepStatus = "active" | "done" | "todo";
export type AdminMarketingNewPostAccent = "event" | "feature" | "soon";
export type ReviewDecision = "approve" | "needs_changes" | "hold" | "reject" |
  "export_ready";

export type ReviewDecisionHandler = (input: {
  targetType: string;
  targetId: string;
  decision: ReviewDecision;
  edits?: Record<string, unknown>;
  defaultNote: string;
}) => Promise<unknown>;

export interface ReviewDecisionResponse {
  decisionStatus: string;
  decisionPath: string;
}

export type PageHeaderProps = {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
};

export type PanelProps = {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  icon: ReactNode;
  span?: AdminLayoutSpan;
  title: string;
};

export {classNames};

export function layoutSpanClass(span?: AdminLayoutSpan) {
  if (span === 3) return "span-3";
  if (span === 2) return "span-2";
  return undefined;
}
