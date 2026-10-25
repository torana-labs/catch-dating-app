"use client";

import type {CSSProperties, ReactNode} from "react";
import {CatchAvatar} from "./CatchAvatar";
import type {CatchPersonAvatarItem} from "./CatchAvatarRow";
import {CatchButton} from "./CatchButton";
import {CatchText} from "./CatchText";
import styles from "./CatchNotice.module.css";

export type CatchNoticeTone = "status" | "success" | "warning" | "danger" | "event";

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

export interface CatchNoticeProps {
  notice: CatchNoticeData;
  /** Caller-resolved name of the dismiss control. */
  dismissLabel: string;
  onDismiss?: () => void;
}

// Lucide "info" and "x" (ISC).
const infoGlyph = (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
);
const closeGlyph = (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
);

/**
 * Flutter's CatchNotice: a floating notice tinted by its tone, with an icon or
 * person, a title and message, and an optional action and dismiss control.
 * An arrival notice opens as a whole and has no inline controls. The host
 * places it, times it and mounts it in CatchNoticeRegion.
 */
export function CatchNotice({notice, dismissLabel, onDismiss}: CatchNoticeProps) {
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
        <CatchText as="span" variant="titleS">{notice.title}</CatchText>
        {notice.message ? <>{" "}<CatchText as="span" color="ink2" variant="supporting">{notice.message}</CatchText></> : null}
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
