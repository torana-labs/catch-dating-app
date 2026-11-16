"use client";

import type {CSSProperties, ReactNode} from "react";
import type {CatchIconName} from "../icons/catchIconRoles";
import {CatchButton} from "./CatchButton";
import {CatchIcon} from "./CatchIcon";
import {CatchIconAction} from "./CatchIconAction";
import {CatchText} from "./CatchText";
import styles from "./CatchBanner.module.css";

/** Flutter `CatchBannerTone`: the message pigment. */
export type CatchBannerTone = "primary" | "success" | "warning" | "danger" | "neutral";

/**
 * Flutter `CatchBannerVariant`. message: body feedback. error: a compact inline
 * failure, always danger, announced politely. status: the first of `statuses`
 * as one full-width band. statuses: every status as a full-width band.
 */
export type CatchBannerVariant = "message" | "error" | "status" | "statuses";

/** Flutter `CatchBannerAction`: an action on a status band. */
export interface CatchBannerAction {
  /** Resolved copy; with an icon it is the icon button's name. */
  label: string;
  /** Draws a ghost icon button (Flutter's plain one) instead of a text action. */
  icon?: CatchIconName;
  /** Null disables the action, as in Flutter. */
  onPressed: (() => void) | null;
}

/** Flutter `CatchBannerStatus`: one durable status band, such as offline. */
export interface CatchBannerStatus {
  /** Stable identity; a band's key. */
  id: string;
  /** The short label, set as a kicker. */
  label: string;
  message: string;
  /** Decorative; drawn in the status colour. */
  icon?: ReactNode;
  /** A CSS colour, normally a theme token such as `var(--catch-theme-warning)`. */
  color: string;
  actions?: readonly CatchBannerAction[];
}

export interface CatchBannerProps {
  /** Resolved copy; the caller localizes it. */
  message?: string;
  /** A heading line above the message, beside the icon. */
  title?: string;
  /** Defaults to primary. The error variant is always danger. */
  tone?: CatchBannerTone;
  /** Defaults to message. */
  variant?: CatchBannerVariant;
  /** Replaces the tone's glyph beside the title. */
  icon?: ReactNode;
  /** The retry action's label; required with onRetry. */
  retryLabel?: string;
  /** Adds a retry text action after the actions. */
  onRetry?: () => void;
  /** status and statuses: the bands, in order. */
  statuses?: readonly CatchBannerStatus[];
  /** Actions under the copy, such as a text CatchButton. */
  actions?: ReactNode;
}

const toneGlyph: Record<CatchBannerTone, CatchIconName> = {
  primary: "info",
  success: "success",
  warning: "warning",
  danger: "error",
  neutral: "info",
};

function StatusBand({status}: {status: CatchBannerStatus}) {
  const actions = status.actions ?? [];
  return (
    <div
      className={styles.status}
      data-status={status.id}
      role="status"
      style={{"--catch-banner-status": status.color} as CSSProperties}
    >
      <span className={styles.statusRow}>
        {status.icon != null ? <span aria-hidden="true" className={styles.statusIcon}>{status.icon}</span> : null}
        <span className={styles.statusCopy}>
          <CatchText className={styles.statusLabel} variant="label-kicker">{status.label}</CatchText>
          <CatchText as="p" className={styles.statusMessage} variant="body-small">{status.message}</CatchText>
        </span>
      </span>
      {actions.length > 0 ? (
        <span className={styles.statusActions}>
          {actions.map((action) => action.icon ? (
            <CatchIconAction
              icon={action.icon}
              key={action.label}
              label={action.label}
              onPressed={action.onPressed}
              variant="ghost"
            />
          ) : (
            <CatchButton
              foregroundColor="var(--catch-banner-status-ink)"
              key={action.label}
              label={action.label}
              onPressed={action.onPressed}
              recipe="text"
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}

/**
 * catch.banner on the web: persistent feedback inside content that is
 * already on screen. A message is tinted by its tone, with an optional title
 * beside the tone's glyph, the copy, and actions under it (a retry action
 * last). The error variant is the compact inline failure, always danger and
 * announced politely. The status variants draw durable context (offline, a
 * rehearsal) as full-width bands: a kicker and message in a readable mix of
 * the status colour, with actions at the end that drop under the copy on a
 * narrow band. A banner never dismisses itself; transient, dismissible
 * delivery is CatchNotice.
 */
export function CatchBanner({
  message = "",
  title,
  tone = "primary",
  variant = "message",
  icon,
  retryLabel,
  onRetry,
  statuses = [],
  actions,
}: CatchBannerProps) {
  if (variant === "statuses" || variant === "status") {
    const bands = variant === "status" ? statuses.slice(0, 1) : statuses;
    if (bands.length === 0) return null;
    return (
      <div className={styles.statuses}>
        {bands.map((status) => <StatusBand key={status.id} status={status} />)}
      </div>
    );
  }
  const resolvedTone: CatchBannerTone = variant === "error" ? "danger" : tone;
  const heading = title?.trim() ? title : undefined;
  const retry = onRetry ? <CatchButton label={retryLabel ?? ""} onPressed={onRetry} recipe="text" /> : null;
  return (
    <div
      className={styles.banner}
      data-tone={resolvedTone}
      data-variant={variant}
      role={variant === "error" ? "status" : undefined}
    >
      {heading ? (
        <span className={styles.heading}>
          <span aria-hidden="true" className={styles.glyph}>{icon ?? <CatchIcon name={toneGlyph[resolvedTone]} />}</span>
          <CatchText as="p" className={styles.title} variant="title-row">{heading}</CatchText>
        </span>
      ) : null}
      <CatchText as="p" className={styles.message} variant="body-small">{message}</CatchText>
      {actions || retry ? <span className={styles.actions}>{actions}{retry}</span> : null}
    </div>
  );
}
