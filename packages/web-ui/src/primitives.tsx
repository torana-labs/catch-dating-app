import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

export function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export interface UiLabelProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "span";
  children: ReactNode;
}

export function UiLabel({as: Element = "span", children, ...props}: UiLabelProps) {
  return <Element {...props}>{children}</Element>;
}

export interface CheckboxControlProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {}

export function CheckboxControl(props: CheckboxControlProps) {
  return <input type="checkbox" {...props} />;
}

interface FieldControlValidationProps {
  descriptionId?: string;
  invalid?: boolean;
}

export interface SelectControlProps
  extends Omit<
      SelectHTMLAttributes<HTMLSelectElement>,
      "aria-describedby" | "aria-invalid"
    >,
    FieldControlValidationProps {}

export function SelectControl({
  descriptionId,
  invalid = false,
  ...props
}: SelectControlProps) {
  return (
    <select
      {...props}
      aria-describedby={descriptionId}
      aria-invalid={invalid || undefined}
    />
  );
}

export type ToggleGroupControlProps =
  Omit<HTMLAttributes<HTMLDivElement>, "aria-label" | "aria-labelledby" | "role"> &
  (
    | {"aria-label": string; "aria-labelledby"?: never}
    | {"aria-label"?: never; "aria-labelledby": string}
  );

export function ToggleGroupControl(props: ToggleGroupControlProps) {
  return <div {...props} role="group" />;
}

export interface ToggleButtonControlProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed" | "type"> {
  selected: boolean;
}

export function ToggleButtonControl({
  selected,
  ...props
}: ToggleButtonControlProps) {
  return (
    <button
      {...props}
      aria-pressed={selected}
      data-selected={selected || undefined}
      type="button"
    />
  );
}
