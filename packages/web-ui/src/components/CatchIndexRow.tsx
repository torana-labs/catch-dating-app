"use client";

import type {ReactNode} from "react";
import type {CatchIconName} from "../icons/catchIconRoles";
import {CatchButton} from "./CatchButton";
import type {CatchFormat} from "./catchCoreVocabulary";
import {useCatch} from "./catchRootContext";
import {CatchIcon} from "./CatchIcon";
import {CatchLegacyText, type CatchLegacyTextVariant} from "./CatchLegacyText";
import {CatchMarker, type CatchMarkerProps} from "./CatchMarker";
import {CatchMeter} from "./CatchMeter";
import {CatchText} from "./CatchText";
import styles from "./CatchIndexRow.module.css";

/** compact 10, regular 12, roomy 14 vertical padding: the system ListRow's rhythm. */
export const catchIndexRowDensities = ["compact", "regular", "roomy"] as const;
export type CatchIndexRowDensity = (typeof catchIndexRowDensities)[number];

export const catchIndexRowStatusTones = ["secondary", "success", "warning", "danger", "info"] as const;
export type CatchIndexRowStatusTone = (typeof catchIndexRowStatusTones)[number];

/** The tint behind a leading icon: a format colour or a status. */
export type CatchIndexRowIconTone = CatchFormat | "neutral" | "success" | "warning" | "danger" | "info";

/** A small action button on the right of the row. */
export interface CatchIndexRowAction {
  label: string;
  onPressed?: () => void;
  variant?: "secondary" | "primary";
}

export interface CatchIndexRowProps {
  title: string;
  /** Web only: the row links here. A link row can still report `onTap`. */
  href?: string;
  /** A row with `onTap` and no `href` is a button; with neither it is passive. */
  onTap?: (() => void) | null;
  /** A second line under the title, in the secondary ink. */
  subtitle?: string;
  /** Longer text that wraps under the title (a step, a review, a message). */
  body?: ReactNode;
  /** A third line in the secondary ink. */
  meta?: ReactNode;
  /** Content under the copy, such as badges and a price. Phrasing content only. */
  footer?: ReactNode;
  leading?: ReactNode;
  /** Leading shortcuts, in this order of precedence after `leading`. A date tile: Thu over 7, in the format colour. */
  date?: {day: string; date: string | number; format?: CatchFormat};
  icon?: CatchIconName;
  iconTone?: CatchIndexRowIconTone;
  marker?: CatchMarkerProps;
  rank?: number;
  /** A time before the leading element ("6:30 PM"). */
  time?: string;
  /** Trailing content. Inside a link or button row it must not be interactive. */
  trailing?: ReactNode;
  /** A value on the right ("Meher", "₹7,400", "42"). */
  value?: ReactNode;
  /** Status text at the end of the title line ("Tonight", "Full"). */
  status?: ReactNode;
  statusTone?: CatchIndexRowStatusTone;
  /** A meter under the copy. */
  progress?: {value: number; max?: number; label: string};
  /** A small button on the right; only on a passive row. */
  action?: CatchIndexRowAction;
  /** A chevron on the right; on by default for a system-density link row with nothing else trailing. */
  chevron?: boolean;
  /**
   * Draws the system ListRow: the density's padding, no line of its own (the
   * Section around it draws lines) and system type. Without it the row keeps
   * Flutter's 66px browse row.
   */
  density?: CatchIndexRowDensity;
  /** Lets the title and subtitle wrap instead of ending in "…". */
  wrap?: boolean;
  selected?: boolean;
  /** Replaces the name read from the row's content. */
  semanticLabel?: string;
  /** Flutter's titleStyle, as a text role; the browse row only. */
  titleVariant?: CatchLegacyTextVariant;
  titleMaxLines?: number;
}

const formatTones = new Set<string>(["run", "dinner", "games", "courts", "nightsOut"]);

/**
 * catch.index_row: one row for every list. Flutter's CatchIndexRow browse row
 * by default; with a density, the system ListRow, whose leading slot takes an
 * icon, a marker, a rank or a time, whose copy takes a body, a meta line and a
 * meter, and whose trailing slot takes a value, a status, an action and a
 * chevron.
 */
export function CatchIndexRow({
  title,
  href,
  onTap,
  subtitle,
  body: text,
  meta,
  footer,
  leading,
  date,
  icon,
  iconTone = "neutral",
  marker,
  rank,
  time,
  trailing,
  value,
  status,
  statusTone = "secondary",
  progress,
  action,
  chevron,
  density,
  wrap,
  selected = false,
  semanticLabel,
  titleVariant = "titleL",
  titleMaxLines = 1,
}: CatchIndexRowProps) {
  const {ground} = useCatch();
  const system = density !== undefined;
  const subtitleText = subtitle?.trim();
  const stacked = Boolean(subtitleText) || footer != null || text != null || meta != null || progress != null;
  const main = leading ?? (date ? (
    <span aria-hidden="true" className={styles.date} data-format={date.format}>
      <CatchText variant="label-badge">{date.day}</CatchText>
      <CatchText numeric variant="display-sm">{date.date}</CatchText>
    </span>
  ) : icon ? (
    <span className={styles.icon} data-format={formatTones.has(iconTone) ? iconTone : undefined} data-tone={iconTone}><CatchIcon name={icon} size={20} /></span>
  ) : marker ? <CatchMarker {...marker} /> : rank != null ? <CatchText className={styles.rank} numeric variant="display-sm">{rank}</CatchText> : null);
  const timeText = time ? <CatchText className={styles.time} numeric tone="secondary" variant="body-meta">{time}</CatchText> : null;
  const leadKind = time ? "time" : leading != null ? "custom" : date ? "date" : icon ? "icon" : marker ? "marker" : rank != null ? "rank" : undefined;
  const interactive = href !== undefined || onTap != null;
  const showChevron = chevron ?? (system && href !== undefined && trailing == null && action == null && !date);
  const titleNode = system
    ? <span className={styles.title}>{title}</span>
    : <CatchLegacyText as="span" color="ink" maxLines={titleMaxLines} variant={titleVariant}>{title}</CatchLegacyText>;
  const content = (
    <>
      {timeText || main != null ? (
        <span className={styles.leading}>{timeText}{main}</span>
      ) : null}
      <span className={styles.copy}>
        {status != null ? <span className={styles.line}>{titleNode}<span className={styles.status} data-tone={statusTone}>{status}</span></span> : titleNode}
        {subtitleText ? (system
          ? <span className={styles.subtitle}>{subtitleText}</span>
          : <CatchLegacyText as="span" color="ink2" maxLines={2} variant="supporting">{subtitleText}</CatchLegacyText>) : null}
        {text != null ? <span className={styles.text}>{text}</span> : null}
        {meta != null ? <span className={styles.meta}>{meta}</span> : null}
        {progress ? <CatchMeter label={progress.label} max={progress.max ?? 100} thickness={6} value={progress.value} /> : null}
        {footer != null ? <span className={styles.footer}>{footer}</span> : null}
      </span>
      {value != null || trailing != null || (action && !interactive) || showChevron ? (
        <span className={styles.trailing}>
          {value != null ? <span className={styles.value}>{value}</span> : null}
          {trailing}
          {action && !interactive ? <CatchButton label={action.label} onPressed={action.onPressed ?? null} size="sm" variant={action.variant ?? "secondary"} /> : null}
          {showChevron ? <span className={styles.chevron}><CatchIcon name="disclosure" size={16} /></span> : null}
        </span>
      ) : null}
    </>
  );
  const shared = {
    "aria-current": selected ? ("true" as const) : undefined,
    "aria-label": semanticLabel,
    className: styles.row,
    "data-catch-row-lead": leadKind,
    "data-density": density,
    "data-has-text": text != null ? "" : undefined,
    "data-on": system ? ground : undefined,
    "data-stacked": stacked || undefined,
    "data-wrap": wrap ? "" : undefined,
  };
  if (href !== undefined) {
    return <a {...shared} href={href} onClick={onTap ?? undefined}>{content}</a>;
  }
  if (onTap != null) {
    return <button {...shared} onClick={onTap} type="button">{content}</button>;
  }
  return <div {...shared}>{content}</div>;
}
