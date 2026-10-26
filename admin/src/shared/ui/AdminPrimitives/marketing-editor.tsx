// Slightly above the family target because the preview, carousel, and export controls share one editing-state contract.
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

export function TagList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`marketing-tag-row ${className}`.trim()}>
      {children}
    </div>
  );
}

export function AdminQueryList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames("marketing-query-list", className)}>
      {children}
    </div>
  );
}

export function AdminQueryRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames("marketing-query", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingSlideList({
  children,
  className = "",
  single = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  single?: boolean;
}) {
  return (
    <div
      {...props}
      className={classNames("marketing-slide-list", single && "single", className)}
    >
      {children}
    </div>
  );
}

export function AdminMarketingSlideEditor({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-slide-editor", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingSlideEditorTopline({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-slide-editor-topline", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingRecommendationList({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-recommendation-list", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingRecommendationItem({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-recommendation-item", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingAuditList({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-audit-list", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingAuditRow({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-audit-row", className)}>
      {children}
    </div>
  );
}

export function AdminFeatureDropFeatureList({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("feature-drop-feature-list", className)}>
      {children}
    </div>
  );
}

export function AdminFeatureDropFeatureEditor({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("feature-drop-feature-editor", className)}>
      {children}
    </div>
  );
}

export function AdminFeatureDropControlGrid({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("feature-drop-control-grid", className)}>
      {children}
    </div>
  );
}

export function AdminFeatureDropWideField({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("feature-drop-span-2", className)}>
      {children}
    </div>
  );
}

export function AdminFeatureDropPreviewGrid({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("feature-drop-preview-grid", className)}>
      {children}
    </div>
  );
}

export function AdminFeatureDropPreviewCard({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <figure {...props} className={classNames("feature-drop-preview-card", className)}>
      {children}
    </figure>
  );
}

export function AdminMarketingPreviewShell({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-preview-shell", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingPreviewToolbar({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-preview-toolbar", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingPreviewActions({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-preview-actions", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingCarouselPreview({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-carousel-preview", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingPreviewSlide({
  children,
  className = "",
  hasImage = false,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  hasImage?: boolean;
}) {
  return (
    <article
      {...props}
      className={classNames("marketing-preview-slide", hasImage && "has-image", className)}
    >
      {children}
    </article>
  );
}

export function AdminMarketingPreviewMeta({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-preview-meta", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingPreviewImage({
  className = "",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img {...props} className={classNames("marketing-preview-image", className)} />
  );
}

export function AdminMarketingPreviewBrandNote({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-preview-brand-note", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingPreviewCopy({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-preview-copy", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingExportStatus({
  children,
  className = "",
  tone,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: "error";
}) {
  return (
    <div
      {...props}
      className={classNames("marketing-export-status", tone === "error" && "error", className)}
    >
      {children}
    </div>
  );
}
