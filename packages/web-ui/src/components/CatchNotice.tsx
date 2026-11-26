"use client";

import type {CSSProperties, ReactNode} from "react";
import {CatchAvatar} from "./CatchAvatar";
import type {CatchPersonAvatarItem} from "./CatchAvatarRow";
import type {CatchIconName} from "../icons/catchIconRoles";
import {CatchButton} from "./CatchButton";
import {CatchIcon} from "./CatchIcon";
import {CatchLegacyText} from "./CatchLegacyText";
import {CatchText} from "./CatchText";
import styles from "./CatchNotice.module.css";

/** Flutter `CatchNoticeTone`: status is the system's info tone; neutral the grey tile. */
export type CatchNoticeTone = "status" | "success" | "warning" | "danger" | "event" | "neutral";

/** Flutter `CatchNoticeAction`: the quiet button under an inline notice's copy. */
export interface CatchNoticeAction {
  label: string;
  /** Null or omitted disables the action, as in Flutter. */
  onPressed?: (() => void) | null;
}

/** Flutter `CatchNoticeData`. An arrival notice sets onOpen: the whole notice opens it. */
export interface CatchNoticeData {
  id: string;
  title: string;
  message?: string;
  /** Defaults to an info glyph. */
  icon?: ReactNode;
  person?: CatchPersonAvatarItem;
  /** A CSS colour that replaces the tone's colour. */
  accentColor?: string;
  tone?: CatchNoticeTone;
  actionLabel?: string;
  onAction?: () => void;
  onOpen?: () => void;
  /** Milliseconds before the host dismisses it; null keeps it until dismissed. */
  duration?: number | null;
  dedupeKey?: string;
  priority?: number;
  dismissible?: boolean;
}

/** Flutter's default `CatchNotice` constructor: the floating notice. */
export interface CatchNoticeFloatingProps {
  recipe?: "standard";
  notice: CatchNoticeData;
  /** Caller-resolved name of the dismiss control. */
  dismissLabel: string;
  onDismiss?: () => void;
}

/**
 * Flutter `CatchNotice.inline`: a tinted block in the flow (help, a warning, a
 * result) with its icon, an optional title and the body copy.
 */
export interface CatchNoticeInlineProps {
  recipe: "inline";
  body: string;
  title?: string;
  /** Defaults to status, the system's info tone in indigo. */
  tone?: CatchNoticeTone;
  /** Defaults to the tone's glyph: success, warning, error or info. */
  icon?: ReactNode;
  /** A quiet small button under the copy. */
  action?: CatchNoticeAction;
  /** Anything more than one action, such as a row of two buttons; replaces the action. */
  footer?: ReactNode;
}

/** Flutter named constructors map to the typed recipe prop (D9). */
export type CatchNoticeProps = CatchNoticeFloatingProps | CatchNoticeInlineProps;

// Lucide "info" and "x" (ISC).
const infoGlyph = (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
);
const closeGlyph = (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
);

const inlineGlyph: Record<CatchNoticeTone, CatchIconName> = {
  status: "info",
  success: "success",
  warning: "warning",
  danger: "error",
  event: "info",
  neutral: "info",
};

/**
 * Flutter `CatchNotice.inline`: the tone's tint behind a 20px glyph in its
 * deep colour, a title-row title and body-small copy, and a quiet small
 * action or a footer under the copy. Only a danger notice is a live region.
 */
function CatchNoticeInline({action, body, footer, icon, title, tone = "status"}: CatchNoticeInlineProps) {
  return (
    <div aria-live={tone === "danger" ? "polite" : undefined} className={styles.inline} data-tone={tone}>
      <span aria-hidden="true" className={styles.inlineIcon}>{icon ?? <CatchIcon name={inlineGlyph[tone]} size={20} />}</span>
      <span className={styles.inlineCopy}>
        {title ? <CatchText variant="title-row">{title}</CatchText> : null}
        <CatchText variant="body-small">{body}</CatchText>
        {footer != null ? (
          <span className={styles.inlineFooter}>{footer}</span>
        ) : action ? (
          <span className={styles.inlineAction}>
            <CatchButton label={action.label} onPressed={action.onPressed ?? null} size="sm" variant="quiet" />
          </span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * Flutter's CatchNotice: a floating notice tinted by its tone, with an icon or
 * person, a title and message, and an optional action and dismiss control.
 * An arrival notice opens as a whole and has no inline controls. The host
 * places it, times it and mounts it in CatchNoticeRegion. `recipe="inline"`
 * is Flutter's `CatchNotice.inline`, a tinted block in the page's flow.
 */
export function CatchNotice(props: CatchNoticeProps) {
  if (props.recipe === "inline") return <CatchNoticeInline {...props} />;
  return <CatchNoticeFloating {...props} />;
}

function CatchNoticeFloating({notice, dismissLabel, onDismiss}: CatchNoticeFloatingProps) {
  const arrival = notice.onOpen !== undefined;
  const action = notice.actionLabel && notice.onAction && !arrival ? notice : null;
  const dismissible = onDismiss !== undefined && !arrival;
  const style = notice.accentColor ? ({"--catch-notice-tone": notice.accentColor} as CSSProperties) : undefined;
  const body = (
    <>
      {notice.person ? (
        <span className={styles.lead}><CatchAvatar imageUrl={notice.person.imageUrl} initials={notice.person.initials} name={notice.person.name} size={36} /></span>
      ) : (
        <span aria-hidden="true" className={`${styles.lead} ${styles.icon}`}>{notice.icon ?? infoGlyph}</span>
      )}
      <span className={styles.copy}>
        <CatchLegacyText as="span" variant="titleS">{notice.title}</CatchLegacyText>
        {notice.message ? <>{" "}<CatchLegacyText as="span" color="ink2" variant="supporting">{notice.message}</CatchLegacyText></> : null}
      </span>
    </>
  );
  if (arrival) {
    return (
      <button
        className={styles.notice}
        data-tone={notice.tone ?? "event"}
        onClick={() => {
          onDismiss?.();
          notice.onOpen?.();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && onDismiss) onDismiss();
        }}
        style={style}
        type="button"
      >
        {body}
      </button>
    );
  }
  return (
    <div className={styles.notice} data-tone={notice.tone ?? "status"} style={style}>
      {body}
      {action ? (
        <span className={styles.action}>
          <CatchButton label={action.actionLabel ?? ""} onPressed={action.onAction ?? null} size="md" variant="secondary" />
        </span>
      ) : null}
      {dismissible ? (
        <button aria-label={dismissLabel} className={styles.dismiss} onClick={onDismiss} title={dismissLabel} type="button">
          {closeGlyph}
        </button>
      ) : null}
    </div>
  );
}
