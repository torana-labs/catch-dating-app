import type {
  ButtonHTMLAttributes,
  FieldsetHTMLAttributes,
  FormHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";
import {CatchBadge, CatchText} from "@catch/web-ui";
import {Lock} from "lucide-react";

import {
  classNames,
  layoutSpanClass,
  type AlertTone,
  type QualityRowTone,
  type AdminFormVariant,
  type PanelProps,
} from "./shared";


export function AlertRow({
  children,
  className = "",
  icon,
  title,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  title?: ReactNode;
  tone?: AlertTone;
}) {
  return (
    <QualityRow className={className} icon={icon} tone={tone}>
      {title ? <strong>{title}</strong> : null}
      <span>{children}</span>
    </QualityRow>
  );
}

export function QualityRow({
  children,
  className = "",
  icon,
  tone = "base",
  ...props
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  tone?: QualityRowTone;
} & HTMLAttributes<HTMLDivElement>) {
  const toneClass = tone === "base" || tone === "neutral" ? "" : tone;
  return (
    <div className={classNames("quality-row", toneClass, className)} {...props}>
      {icon}
      <div>
        {children}
      </div>
    </div>
  );
}

export function QualityList({
  children,
  className = "",
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={classNames("quality-list", className)} {...props}>
      {children}
    </div>
  );
}

export function AdminForm({
  children,
  className = "",
  variant = "default",
  ...props
}: {
  children: ReactNode;
  className?: string;
  variant?: AdminFormVariant;
} & FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      {...props}
      className={classNames(variant === "publishing" && "publishing-form", className)}
    >
      {children}
    </form>
  );
}

export function AdminEditorSection({
  children,
  className = "",
  ...props
}: FieldsetHTMLAttributes<HTMLFieldSetElement> & {
  children: ReactNode;
}) {
  return (
    <fieldset {...props} className={classNames("editor-section", className)}>
      {children}
    </fieldset>
  );
}

export function AdminFieldGrid({
  children,
  className = "",
  columns = 2,
}: {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div className={classNames("form-grid", columns === 2 && "two", columns === 3 && "three", className)}>
      {children}
    </div>
  );
}

export function AdminPanel({
  action,
  children,
  className = "",
  icon,
  span,
  title,
}: PanelProps) {
  return (
    <article className={classNames("panel", layoutSpanClass(span), className)}>
      <header className="panel-header">
        <div className="panel-title">
          {icon}
          <CatchText as="h2" variant="titleL">{title}</CatchText>
        </div>
        {action ? <span>{action}</span> : null}
      </header>
      {children}
    </article>
  );
}

export function Panel({
  action,
  children,
  className = "",
  icon,
  span,
  title,
}: PanelProps) {
  return (
    <section className={classNames("panel", layoutSpanClass(span), className)}>
      <header className="panel-header">
        <div className="panel-title">
          {icon}
          <CatchText as="h2" variant="titleL">{title}</CatchText>
        </div>
        <span>{action}</span>
      </header>
      {children}
    </section>
  );
}

export function StateRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode | null;
}) {
  return (
    <div className="state-row">
      <span>{label}</span>
      <strong>{value ?? "none"}</strong>
    </div>
  );
}
