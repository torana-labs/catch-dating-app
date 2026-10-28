import {ToggleButtonControl, ToggleGroupControl} from "@catch/web-ui";
import type {ButtonHTMLAttributes, HTMLAttributes, ReactNode} from "react";
import {classNames} from "@catch/web-ui";

export function ChoiceChip({
  children,
  selected,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed" | "type"> & {
  children: ReactNode;
  selected: boolean;
}) {
  return (
    <ToggleButtonControl
      className={classNames("choice-chip", selected && "is-selected")}
      selected={selected}
      {...props}
    >
      {children}
    </ToggleButtonControl>
  );
}

export function ChoiceChipGrid({
  children,
  className,
  ...props
}: Parameters<typeof ToggleGroupControl>[0]) {
  return (
    <ToggleGroupControl
      {...props}
      className={classNames("choice-chip-grid", className)}
    >
      {children}
    </ToggleGroupControl>
  );
}

export function ChoiceCard({
  body,
  selected,
  title,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed" | "type"> & {
  body: ReactNode;
  selected: boolean;
  title: ReactNode;
}) {
  return (
    <ToggleButtonControl
      className={classNames("choice-card", selected && "is-selected")}
      selected={selected}
      {...props}
    >
      <strong>{title}</strong>
      <span>{body}</span>
    </ToggleButtonControl>
  );
}
