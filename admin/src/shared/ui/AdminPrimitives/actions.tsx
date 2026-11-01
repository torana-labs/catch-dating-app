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
import {SelectControl, ToggleButtonControl, ToggleGroupControl} from "@catch/web-ui";
import {CheckCircle2, FileWarning, Lock, RefreshCw} from "lucide-react";
import {useAdminOperationPending} from "../../pendingOperation";

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

export function AdminIconButton({
  children,
  className = "",
  label,
  title,
  type = "button",
  ...props
}: {
  children: ReactNode;
  className?: string;
  label: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      className={`icon-button ${className}`.trim()}
      title={title ?? label}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function AdminLinkButton({
  children,
  className = "",
  icon,
  label,
  onClick,
  tabIndex,
  variant = "ghost",
  ...props
}: {
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
  label?: string;
  variant?: "ghost" | "icon";
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const operationPending = useAdminOperationPending();
  const classes = [
    variant === "icon" ? "icon-button" : "ghost-button",
    className,
  ].filter(Boolean).join(" ");
  return (
    <a
      {...props}
      aria-disabled={operationPending || undefined}
      aria-label={label}
      className={classes}
      data-pending-operation-blocked={operationPending || undefined}
      onClick={(event) => {
        if (operationPending) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
      tabIndex={operationPending ? -1 : tabIndex}
      title={props.title ?? label}
    >
      {icon}
      {children}
    </a>
  );
}

export function FilePickerButton({
  children,
  className = "",
  icon,
  inputLabel,
  ...props
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  inputLabel: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "aria-label" | "type">) {
  return (
    <label className={`ghost-button ${className}`.trim()}>
      {icon}
      {children}
      <input aria-label={inputLabel} type="file" {...props} />
    </label>
  );
}

export function SearchField({
  ariaLabel,
  className = "",
  icon,
  onChange,
  value,
  ...props
}: {
  ariaLabel: string;
  className?: string;
  icon?: ReactNode;
  onChange?: (value: string) => void;
  value?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "aria-label" | "onChange" | "value">) {
  return (
    <div className={`search-control ${className}`.trim()}>
      {icon}
      <input
        aria-label={ariaLabel}
        onChange={(event) => onChange?.(event.target.value)}
        value={value}
        {...props}
      />
    </div>
  );
}

export function InlineTextField({
  ariaLabel,
  className = "",
  onChange,
  value,
  ...props
}: {
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
  value: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "aria-label" | "className" | "onChange" | "value">) {
  return (
    <input
      aria-label={ariaLabel}
      className={className}
      onChange={(event) => onChange(event.target.value)}
      value={value}
      {...props}
    />
  );
}

export function SegmentedControl<T extends string>({
  ariaLabel,
  className = "",
  mobileLayout = "equal",
  mobileSelectLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  className?: string;
  mobileLayout?: "content" | "equal";
  mobileSelectLabel?: string;
  options: Array<{disabled?: boolean; id: T; label: ReactNode; mobileLabel?: string}>;
  value: T;
  onChange: (value: T) => void;
}) {
  const group = (
    <ToggleGroupControl
      aria-label={ariaLabel}
      className={classNames(
        "segmented",
        mobileLayout === "content" && "segmented-content-mobile",
        className
      )}
    >
      {options.map((option) => (
        <ToggleButtonControl
          className={value === option.id ? "selected" : ""}
          disabled={option.disabled}
          key={option.id}
          onClick={() => onChange(option.id)}
          selected={value === option.id}
        >
          {option.label}
        </ToggleButtonControl>
      ))}
    </ToggleGroupControl>
  );
  if (!mobileSelectLabel) return group;
  return (
    <div className="segmented-responsive">
      <div className="segmented-responsive-desktop">{group}</div>
      <label className="field-control segmented-responsive-mobile">
        <span>{mobileSelectLabel}</span>
        <SelectControl aria-label={ariaLabel} value={value}
          onChange={(event) => onChange(event.target.value as T)}>
          {options.map((option) => (
            <option disabled={option.disabled} key={option.id} value={option.id}>
              {option.mobileLabel ??
                (typeof option.label === "string" ? option.label : option.id)}
            </option>
          ))}
        </SelectControl>
      </label>
    </div>
  );
}
