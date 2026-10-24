import type {
  ButtonHTMLAttributes,
  FieldsetHTMLAttributes,
  FormHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";
import {CatchText, DataTableControl} from "@catch/web-ui";
import {Lock} from "lucide-react";

import {
  classNames,
  layoutSpanClass,
  type AlertTone,
  type QualityRowTone,
  type RiskTone,
  type DataTableVariant,
  type AdminFormVariant,
  type PanelProps,
} from "./shared";

import {AdminTag, AdminTagList} from "./cards";

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

export function DataTable({
  ariaLabel,
  children,
  className = "",
  compact = false,
  variant = "default",
  ...props
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  variant?: DataTableVariant;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <DataTableControl
      {...props}
      ariaLabel={ariaLabel}
      className={classNames(
        "table-wrap",
        variant === "workbench" && "workbench-table",
        compact && "compact",
        className
      )}
    >
      {children}
    </DataTableControl>
  );
}

export function AdminTableRow({
  children,
  className = "",
  selected = false,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & {
  children: ReactNode;
  selected?: boolean;
}) {
  return (
    <tr {...props} className={classNames(selected && "selected-row", className)}>
      {children}
    </tr>
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

export function AdminPublishingFormShell({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("publishing-form", className)}>
      {children}
    </div>
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

export function TableActionButton({
  children,
  className = "",
  type = "button",
  ...props
}: {
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`table-action ${className}`.trim()}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function RiskBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: RiskTone;
}) {
  return <span className={`risk ${tone}`}>{children}</span>;
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

export function AdminIntakePublicationBoundaryPanel({
  activeWorkspace,
}: {
  activeWorkspace: "events" | "organizers";
}) {
  const isEvents = activeWorkspace === "events";
  return (
    <Panel
      span={2}
      icon={<Lock size={18} strokeWidth={1.9} />}
      title="Intake publication boundary"
      action={isEvents ? "event review only" : "organizer review only"}
    >
      <AlertRow
        icon={<Lock size={16} strokeWidth={1.9} />}
        title={isEvents ? "Event candidates are not app events" : "Organizer approvals are not final publication"}
      >
        {isEvents ?
          "Review source-backed event candidates here. Creating an event, enabling bookings, and promoting it to members are separate actions." :
          "Review organizer evidence here. Publishing a listing, making it discoverable, and confirming ownership are separate actions."}
      </AlertRow>
      <QualityList>
        <StateRow
          label="Evidence"
          value={isEvents ?
            "Latest completed Supply Intake run" :
            "Latest reviewed organizer intake run"}
        />
        <StateRow
          label="Action here"
          value={isEvents ?
            "Record a review decision and any required corrections" :
            "Record review, curation, policy, and location decisions"}
        />
        <StateRow
          label="Separate actions"
          value={isEvents ?
            "Create event, publish, bookings, payments, and waitlists" :
            "Publish listing, search visibility, app discovery, and ownership transfer"}
        />
      </QualityList>
      <AdminTagList>
        {(isEvents ? [
          "source evidence",
          "dedupe",
          "location",
          "policy",
          "review note",
        ] : [
          "evidence",
          "surface curation",
          "policy gaps",
          "publication packet",
          "claim handoff",
        ]).map((label) => (
          <AdminTag key={label}>{label}</AdminTag>
        ))}
      </AdminTagList>
    </Panel>
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
