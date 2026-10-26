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

import {FilePickerButton} from "./actions";

export function AdminProfilePhotoGrid({
  ariaLabel,
  photos,
}: {
  ariaLabel: string;
  photos: ReadonlyArray<{alt: string; url: string}>;
}) {
  return (
    <div aria-label={ariaLabel} className="admin-profile-photo-grid">
      {photos.map((photo) => (
        <img
          alt={photo.alt}
          key={photo.url}
          loading="lazy"
          src={photo.url}
        />
      ))}
    </div>
  );
}

export function AdminMarketingImageEditor({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-image-editor", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingImageEditorHeader({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-image-editor-header", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingImageControls({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-image-controls", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingFilePickerButton({
  className = "",
  ...props
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  inputLabel: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "aria-label" | "type">) {
  return (
    <FilePickerButton
      {...props}
      className={classNames("marketing-file-button", className)}
    />
  );
}

export function AdminMarketingImageReviewRow({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-image-review-row", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingImageThumb({
  className = "",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img {...props} className={classNames("marketing-image-thumb", className)} />
  );
}

export function AdminFeatureDropCaptureThumb({
  className = "",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img {...props} className={classNames("feature-drop-capture-thumb", className)} />
  );
}

export function AdminMarketingImageMetaFields({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-image-meta-fields", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingImageSourceNote({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-image-source-note", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingImageEmpty({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-image-empty", className)}>
      {children}
    </div>
  );
}

export function AdminGuardrailList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames("guardrail-list", className)}>
      {children}
    </div>
  );
}

export function AdminIntakeSourceList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames("intake-source-list", className)}>
      {children}
    </div>
  );
}

export function AdminIntakeGateList({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("intake-gate-list", className)}>
      {children}
    </div>
  );
}

export function AdminIntakeGate({
  children,
  className = "",
  tone,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: AdminIntakeGateTone;
}) {
  return (
    <div {...props} className={classNames("intake-gate", tone, className)}>
      {children}
    </div>
  );
}
