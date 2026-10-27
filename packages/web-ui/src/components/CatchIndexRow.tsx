import type {ReactNode} from "react";
import {CatchText, type CatchTextVariant} from "./CatchText";
import styles from "./CatchIndexRow.module.css";

export interface CatchIndexRowProps {
  title: string;
  /** Web only: the row links here. A link row can still report `onTap`. */
  href?: string;
  /** A row with `onTap` and no `href` is a button; with neither it is passive. */
  onTap?: (() => void) | null;
  /** A second line under the title, in the secondary ink. */
  subtitle?: string;
  /** Content under the copy, such as badges and a price. Phrasing content only. */
  footer?: ReactNode;
  leading?: ReactNode;
  /** Trailing content. Inside a link or button row it must not be interactive. */
  trailing?: ReactNode;
  selected?: boolean;
  /** Replaces the name read from the row's content. */
  semanticLabel?: string;
  /** Flutter's titleStyle, as a text role. */
  titleVariant?: CatchTextVariant;
  titleMaxLines?: number;
}

/**
 * Flutter's CatchIndexRow: a hairline browse row with optional leading and
 * trailing content, and a subtitle and footer stacked under the title.
 */
export function CatchIndexRow({
  title,
  href,
  onTap,
  subtitle,
  footer,
  leading,
  trailing,
  selected = false,
  semanticLabel,
  titleVariant = "titleL",
  titleMaxLines = 1,
}: CatchIndexRowProps) {
  const subtitleText = subtitle?.trim();
  const stacked = Boolean(subtitleText) || footer != null;
  const body = (
    <>
      {leading != null ? <span className={styles.leading}>{leading}</span> : null}
      <span className={styles.copy}>
        <CatchText as="span" color="ink" maxLines={titleMaxLines} variant={titleVariant}>{title}</CatchText>
        {subtitleText ? <CatchText as="span" color="ink2" maxLines={2} variant="supporting">{subtitleText}</CatchText> : null}
        {footer != null ? <span className={styles.footer}>{footer}</span> : null}
      </span>
      {trailing != null ? <span className={styles.trailing}>{trailing}</span> : null}
    </>
  );
  const shared = {
    "aria-current": selected ? ("true" as const) : undefined,
    "aria-label": semanticLabel,
    className: styles.row,
    "data-stacked": stacked || undefined,
  };
  if (href !== undefined) {
    return <a {...shared} href={href} onClick={onTap ?? undefined}>{body}</a>;
  }
  if (onTap != null) {
    return <button {...shared} onClick={onTap} type="button">{body}</button>;
  }
  return <div {...shared}>{body}</div>;
}
