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

import {AdminLinkButton, InlineTextField} from "./actions";
import {SelectableCardButton} from "./cards";
import {AdminPanel} from "./data";
import {AdminEyebrow} from "./shell";
import {CatchText} from "@catch/web-ui";

export function AdminMarketingHelpText({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
}) {
  return (
    <p {...props} className={classNames("marketing-help-text", className)}>
      {children}
    </p>
  );
}

export function AdminMarketingComplianceList({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-compliance-list", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingEventLibraryGrid({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-event-library-grid", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingLibraryCard({
  action,
  children,
  className = "",
  description,
  eyebrow,
  title,
  ...props
}: HTMLAttributes<HTMLElement> & {
  action?: ReactNode;
  children?: ReactNode;
  description: ReactNode;
  eyebrow: ReactNode;
  title: ReactNode;
}) {
  return (
    <article {...props} className={classNames("marketing-library-card", className)}>
      <header>
        <AdminEyebrow as="span">{eyebrow}</AdminEyebrow>
        <CatchText as="h3" variant="sectionTitle">{title}</CatchText>
      </header>
      <CatchText as="p" variant="supporting">{description}</CatchText>
      {children}
      {action}
    </article>
  );
}

export function AdminMarketingCardLink({
  className = "",
  ...props
}: Parameters<typeof AdminLinkButton>[0]) {
  return (
    <AdminLinkButton
      {...props}
      className={classNames("marketing-card-link", className)}
    />
  );
}

export function AdminMarketingMediaGrid({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-media-grid", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingMediaCard({
  children,
  className = "",
  description,
  eyebrow,
  previewAlt,
  previewFallback,
  previewSrc,
  title,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
  description: ReactNode;
  eyebrow: ReactNode;
  previewAlt: string;
  previewFallback: ReactNode;
  previewSrc: string | null | undefined;
  title: ReactNode;
}) {
  return (
    <article {...props} className={classNames("marketing-media-card", className)}>
      {previewSrc ? (
        <img alt={previewAlt} loading="lazy" src={previewSrc} />
      ) : (
        previewFallback
      )}
      <div>
        <AdminEyebrow as="span">{eyebrow}</AdminEyebrow>
        <CatchText as="h3" variant="sectionTitle">{title}</CatchText>
        <CatchText as="p" variant="supporting">{description}</CatchText>
      </div>
      {children}
    </article>
  );
}

export function AdminMarketingNewPostGrid({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-new-post-grid", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingNewPostCard({
  accent,
  actionLabel,
  className = "",
  description,
  label,
  meta,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  accent: AdminMarketingNewPostAccent;
  actionLabel: ReactNode;
  description: ReactNode;
  label: ReactNode;
  meta: ReactNode;
}) {
  return (
    <SelectableCardButton
      {...props}
      className={classNames("marketing-new-post-card", accent, className)}
    >
      <span>{meta}</span>
      <strong>{label}</strong>
      <CatchText as="p" variant="supporting">{description}</CatchText>
      <small>{actionLabel}</small>
    </SelectableCardButton>
  );
}

export function AdminMarketingGuideLayout({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-guide-layout", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingDeliverable({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-deliverable", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingStackedSections({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-stacked-sections", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingGrid({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-grid", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingPanel({
  className = "",
  ...props
}: PanelProps) {
  return (
    <AdminPanel
      {...props}
      className={classNames("marketing-panel", className)}
    />
  );
}

export function AdminMarketingTitleInput({
  className = "",
  ...props
}: Parameters<typeof InlineTextField>[0]) {
  return (
    <InlineTextField
      {...props}
      className={classNames("marketing-title-input", className)}
    />
  );
}

export function AdminMarketingSection({
  children,
  className = "",
  meta,
  title,
  ...props
}: Omit<HTMLAttributes<HTMLElement>, "title"> & {
  children: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
}) {
  return (
    <section {...props} className={classNames("marketing-section", className)}>
      <AdminMarketingSectionHeader meta={meta} title={title} />
      {children}
    </section>
  );
}

export function AdminMarketingSectionHeader({
  className = "",
  meta,
  title,
  ...props
}: Omit<HTMLAttributes<HTMLElement>, "title"> & {
  meta?: ReactNode;
  title: ReactNode;
}) {
  return (
    <header {...props} className={classNames("marketing-section-header", className)}>
      <CatchText as="h3" variant="sectionTitle">{title}</CatchText>
      {meta ? <span>{meta}</span> : null}
    </header>
  );
}

export function AdminMarketingEditGrid({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-edit-grid", className)}>
      {children}
    </div>
  );
}

export function AdminMarketingAppCapturePreview({
  className = "",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...props}
      className={classNames("marketing-app-capture-preview", className)}
    />
  );
}

export function AdminMarketingAppMediaPaths({
  className = "",
  sourcePath,
  webPath,
  websitePath,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  sourcePath: ReactNode;
  webPath?: ReactNode;
  websitePath: ReactNode;
}) {
  return (
    <div {...props} className={classNames("marketing-app-media-paths", className)}>
      <div>
        <span>Source</span>
        <code>{sourcePath}</code>
      </div>
      <div>
        <span>Website</span>
        <code>{websitePath}</code>
      </div>
      {webPath ? (
        <div>
          <span>Public path</span>
          <code>{webPath}</code>
        </div>
      ) : null}
    </div>
  );
}