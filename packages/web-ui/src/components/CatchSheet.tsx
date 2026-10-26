"use client";

import {type CSSProperties, type ReactNode, useEffect, useId, useRef} from "react";
import {CatchBadge, type CatchBadgeTone} from "./CatchBadge";
import {CatchButton} from "./CatchButton";
import {CatchText} from "./CatchText";
import styles from "./CatchSheet.module.css";

export type CatchSheetMode = "content" | "scrollable";

interface CatchSheetBase {
  open: boolean;
  /** The reader dismissed the sheet: Escape, the backdrop or the filter's close action. */
  onClose: () => void;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Names the sheet when it has no title. */
  label?: string;
  trailing?: ReactNode;
  badge?: string;
  badgeTone?: CatchBadgeTone;
}

/** Flutter's default `CatchSheet`: header, body and footer at their natural height. */
export interface CatchSheetDefaultProps extends CatchSheetBase {
  recipe?: "default";
  footer?: ReactNode;
  /** A glyph in an ink tile beside the title: the branded header. */
  glyph?: ReactNode;
  grabber?: boolean;
  /** Flutter's keyboard inset handling; the browser resizes the viewport itself. */
  keyboardSafe?: boolean;
  mode?: CatchSheetMode;
  /** Flutter's legacy padding: replaces the sheet's content padding. */
  padding?: CSSProperties["padding"];
}

/** `CatchSheet.standard`: bounded to 90% of the viewport with one scroll owner. */
export interface CatchSheetStandardProps extends CatchSheetBase {
  recipe: "standard";
  footer?: ReactNode;
  glyph?: ReactNode;
  pinFooter?: boolean;
}

/** `CatchSheet.filter`: immediate filters with a pinned close action. */
export interface CatchSheetFilterProps extends CatchSheetBase {
  recipe: "filter";
  title: string;
  closeLabel: string;
}

export type CatchSheetProps = CatchSheetDefaultProps | CatchSheetStandardProps | CatchSheetFilterProps;

/**
 * Flutter's CatchSheet on the web: a modal bottom sheet (a native dialog)
 * with the grabber, a plain or branded header, the body and a footer. It
 * docks to the viewport's bottom edge and stays within the content width.
 */
export function CatchSheet(props: CatchSheetProps) {
  const {open, onClose, children, title, subtitle, label, trailing, badge, badgeTone = "neutral"} = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const recipe = props.recipe ?? "default";
  const bounded = recipe !== "default";
  const grabber = props.recipe === undefined || props.recipe === "default" ? props.grabber ?? true : true;
  const glyph = props.recipe === "filter" ? undefined : props.glyph;
  const footer = props.recipe === "filter"
    ? <CatchButton label={props.closeLabel} onPressed={onClose} recipe="sheet" role="dismiss" />
    : props.footer;
  const pinned = props.recipe === "filter" || (props.recipe === "standard" && Boolean(props.pinFooter));
  const padding = props.recipe === undefined || props.recipe === "default" ? props.padding : undefined;
  const scrollable = bounded || (props.recipe === undefined || props.recipe === "default" ? props.mode === "scrollable" : false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const right = badge ? <CatchBadge label={badge} recipe="functional" tone={badgeTone} /> : trailing;
  const hasHeader = Boolean(title) || glyph != null || right != null;
  return (
    <dialog
      aria-label={title ? undefined : label}
      aria-labelledby={title ? titleId : undefined}
      className={styles.sheet}
      data-bounded={bounded || undefined}
      data-pinned={pinned && footer != null ? true : undefined}
      data-scrollable={scrollable || undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        // Escape on keydown, so the caller's state, not the browser, closes the sheet.
        if (event.key !== "Escape") return;
        event.preventDefault();
        onClose();
      }}
      ref={dialog}
    >
      <div className={styles.surface}>
        <div className={styles.scroll} style={padding === undefined ? undefined : {padding}}>
          {grabber ? <span aria-hidden="true" className={styles.grabber} /> : null}
          {hasHeader ? (
            <div className={styles.header} data-branded={glyph != null || undefined}>
              {glyph != null ? <span aria-hidden="true" className={styles.glyph}>{glyph}</span> : null}
              <span className={styles.heading}>
                {title ? <CatchText as="h2" id={titleId} variant="titleL">{title}</CatchText> : null}
                {subtitle ? <CatchText as="p" color="ink2" variant={glyph != null ? "bodyS" : "bodyM"}>{subtitle}</CatchText> : null}
              </span>
              {right != null ? <span className={styles.trailing}>{right}</span> : null}
            </div>
          ) : null}
          <div className={styles.body}>{children}</div>
          {footer != null && !pinned ? <div className={styles.footer}>{footer}</div> : null}
        </div>
        {footer != null && pinned ? <div className={styles.pinnedFooter}>{footer}</div> : null}
      </div>
    </dialog>
  );
}
