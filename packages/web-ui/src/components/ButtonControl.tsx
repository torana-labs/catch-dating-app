import type {ButtonHTMLAttributes} from "react";

export interface ButtonControlProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-busy"> {
  loading?: boolean;
}

/**
 * The retiring headless button under the surface adapters (website Button and
 * StepRail, Admin AdminButton and AdminIntakeStageRail): a native button that
 * defaults to type button and is disabled and busy while loading. It draws
 * nothing; catch.button on the web is the styled CatchButton, and this goes
 * when the last adapter moves to it (the D20 call-site moves).
 */
export function ButtonControl({
  disabled,
  loading = false,
  type = "button",
  ...props
}: ButtonControlProps) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      type={type}
    />
  );
}
