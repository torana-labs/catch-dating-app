import {Children, type ReactNode} from "react";
import {CatchButton} from "./CatchButton";
import {CatchIconTile} from "./CatchIconTile";
import {CatchText} from "./CatchText";
import styles from "./CatchErrorState.module.css";

export type CatchErrorStateMode = "fullScreen" | "inline" | "compact";

interface CatchErrorStateBase {
  title: string;
  message: string;
  /** Defaults to the error glyph. */
  icon?: ReactNode;
  /** Further actions after the retry button. */
  actions?: ReactNode;
  mode?: CatchErrorStateMode;
}

export type CatchErrorStateProps = CatchErrorStateBase &
  ({onRetry?: undefined; retryLabel?: string} | {onRetry: () => void; retryLabel: string});

// Lucide "rotate-cw" (ISC).
const retryGlyph = (
  <svg fill="none" focusable="false" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
  </svg>
);

/**
 * Flutter's CatchErrorState: centred recovery content under the error
 * medallion, with an optional retry and further actions. Full screen centres
 * it in at most 420px; inline and compact inherit their section's containment.
 */
export function CatchErrorState({title, message, icon, actions, mode = "fullScreen", onRetry, retryLabel}: CatchErrorStateProps) {
  const compact = mode === "compact";
  const extra = Children.toArray(actions);
  return (
    <div className={styles.error} data-mode={mode}>
      <span className={styles.medallion}><CatchIconTile icon={icon} recipe="error" /></span>
      <CatchText as="span" textAlign="center" variant={compact ? "sectionTitle" : "titleL"}>{title}</CatchText>{" "}
      <CatchText as="p" color="ink2" maxLines={compact ? 4 : 8} textAlign="center" variant="bodyLead">{message}</CatchText>
      {onRetry || extra.length > 0 ? (
        <div className={styles.actions}>
          {onRetry ? <CatchButton label={retryLabel} leading={retryGlyph} onPressed={onRetry} size={compact ? "md" : "lg"} /> : null}
          {extra}
        </div>
      ) : null}
    </div>
  );
}
