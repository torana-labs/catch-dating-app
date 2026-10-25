"use client";

import type {ReactNode} from "react";
import styles from "./CatchControlSurface.module.css";

export type CatchControlSurfaceSize = "floating" | "compact" | "md";
export type CatchControlSurfaceVariant = "rounded" | "pill";
export type CatchControlSurfaceTone = "surface" | "raised";
export type CatchControlSurfaceStatus = "resting" | "focused" | "error";

export interface CatchControlSurfaceProps {
  child: ReactNode;
  size?: CatchControlSurfaceSize;
  variant?: CatchControlSurfaceVariant;
  tone?: CatchControlSurfaceTone;
  enabled?: boolean;
  status?: CatchControlSurfaceStatus;
  onTap?: () => void;
  semanticButton?: boolean;
}

/** Canonical Flutter control shell; raw padding remains native-only. */
export function CatchControlSurface({
  child,
  size = "md",
  variant = "rounded",
  tone = "surface",
  enabled = true,
  status = "resting",
  onTap,
  semanticButton = false,
}: CatchControlSurfaceProps) {
  const attributes = {
    className: styles.surface,
    "data-size": size,
    "data-variant": variant,
    "data-tone": tone,
    "data-status": status,
    "data-enabled": enabled,
  };
  return onTap || semanticButton
    ? <button {...attributes} type="button" disabled={!enabled}
        onClick={enabled ? onTap : undefined}>{child}</button>
    : <div {...attributes}>{child}</div>;
}
