import {Children, type ReactNode} from "react";
import {CatchIconTile} from "./CatchIconTile";
import {CatchText} from "./CatchText";
import styles from "./CatchEmptyState.module.css";

export type CatchEmptyStateVariant = "stacked" | "inline";
export type CatchEmptyStateAnnouncement = "off" | "polite" | "assertive";

export interface CatchEmptyStateProps {
  icon?: ReactNode;
  title?: string;
  message?: string;
  /** Buttons for the empty state; two or more wrap 12px apart. */
  actions?: ReactNode;
  surface?: boolean;
  iconVariant?: "plain" | "bubble";
  variant?: CatchEmptyStateVariant;
  /** Web only: announce the state as a status, such as after a search empties a list. */
  announce?: CatchEmptyStateAnnouncement;
}

/**
 * Flutter's CatchEmptyState: successful-empty content, stacked and centred
 * under its icon tile or inline with the icon in the title line, with
 * optional actions.
 */
export function CatchEmptyState({
  icon,
  title,
  message,
  actions,
  surface = false,
  iconVariant = "plain",
  variant = "stacked",
  announce = "off",
}: CatchEmptyStateProps) {
  const actionList = Children.toArray(actions);
  const stacked = variant === "stacked";
  return (
    <div
      aria-live={announce === "off" ? undefined : announce}
      className={styles.empty}
      data-surface={surface || undefined}
      data-variant={variant}
      role={announce === "off" ? undefined : "status"}
    >
      {stacked && icon != null ? <CatchIconTile icon={icon} recipe="empty" variant={iconVariant} /> : null}
      {title ? (
        <span className={styles.title}>
          {!stacked && icon != null ? <span aria-hidden="true" className={styles.inlineIcon}>{icon}</span> : null}
          <CatchText as="span" textAlign={stacked ? "center" : undefined} variant="sectionTitle">{title}</CatchText>
        </span>
      ) : null}
      {message ? (
        <CatchText as="p" color="ink2" textAlign={stacked ? "center" : undefined} variant={stacked ? "bodyS" : "supporting"}>{message}</CatchText>
      ) : null}
      {actionList.length > 0 ? <div className={styles.actions}>{actionList}</div> : null}
    </div>
  );
}
