"use client";

import type {ButtonHTMLAttributes} from "react";
import type {CatchIconName} from "../icons/catchIconGlyphs";
import {useCatch} from "./catchRootContext";
import {CatchIcon} from "./CatchIcon";
import styles from "./CatchIconAction.module.css";

/** outlined: the default circle. filled: ink, or paper on night. ghost: no outline. overlay: over photos. */
export const catchIconActionVariants = ["outlined", "filled", "ghost", "overlay"] as const;
export type CatchIconActionVariant = (typeof catchIconActionVariants)[number];

/** lg 44, md 40, sm 32; the touch target never drops below 44. */
export const catchIconActionSizes = ["lg", "md", "sm"] as const;
export type CatchIconActionSize = (typeof catchIconActionSizes)[number];

export const catchIconActionShapes = ["round", "square"] as const;
export type CatchIconActionShape = (typeof catchIconActionShapes)[number];

export interface CatchIconActionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  icon: CatchIconName;
  /** Required: what the button does, read aloud and shown on hover. */
  label: string;
  variant?: CatchIconActionVariant;
  size?: CatchIconActionSize;
  shape?: CatchIconActionShape;
  /** A count in the corner. */
  badge?: number;
  /** For toggles such as save and follow. */
  pressed?: boolean;
  /** Null disables the button. */
  onPressed?: (() => void) | null;
  /** Renders a link. */
  href?: string;
  type?: "button" | "submit";
}

/** catch.icon_button: back, close, share, more and every other icon-only action. Always labelled. */
export function CatchIconAction({icon, label, variant = "outlined", size = "lg", shape = "round", badge, pressed, onPressed, onClick, href, className, disabled, type = "button", ...rest}: CatchIconActionProps) {
  const {ground} = useCatch();
  const count = badge ? badge > 99 ? "99+" : String(badge) : undefined;
  // The visible count belongs in the accessible name (WCAG 2.5.3 label in name).
  const name = count ? `${label} ${count}` : label;
  const shared = {
    "aria-label": name,
    className: className ? `${styles.button} ${className}` : styles.button,
    "data-on": ground,
    "data-shape": shape,
    "data-size": size,
    "data-variant": variant,
    title: name,
  };
  const body = (
    <>
      <CatchIcon name={icon} size={size === "sm" ? 16 : 20} />
      {count ? <span aria-hidden="true" className={styles.badge}>{count}</span> : null}
    </>
  );
  if (href) return <a {...shared} href={href}>{body}</a>;
  return (
    <button
      {...shared}
      aria-pressed={pressed}
      disabled={disabled || onPressed === null}
      onClick={(event) => {
        onClick?.(event);
        onPressed?.();
      }}
      type={type}
      {...rest}
    >
      {body}
    </button>
  );
}
