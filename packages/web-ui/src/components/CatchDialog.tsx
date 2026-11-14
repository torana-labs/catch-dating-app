import {useEffect, useId, useRef, type ReactNode} from "react";
import {CatchButton} from "./CatchButton";
import {CatchIconAction} from "./CatchIconAction";
import {CatchText} from "./CatchText";
import styles from "./CatchDialog.module.css";

export interface CatchDialogAction {
  label: string;
  onPressed: (() => void) | null;
}

interface CatchDialogBase {
  open: boolean;
  /** Escape, the scrim and Cancel (or the close button) all call this. */
  onClose: () => void;
  title: string;
}

/** `CatchDialog.confirmation`: a modal confirmation for a risky action. */
export interface CatchDialogConfirmationProps extends CatchDialogBase {
  recipe?: "confirmation";
  message?: string;
  /** Extra content under the message, such as a reason field. */
  children?: ReactNode;
  /** The confirming action; danger draws it as a destructive button. */
  confirm: CatchDialogAction & {tone?: "default" | "danger"};
  /** The dismissing action; "Cancel" by default. */
  cancel?: CatchDialogAction;
}

/** Flutter's default `CatchDialog`: slotted content with optional trailing actions. */
export interface CatchDialogContentProps extends CatchDialogBase {
  recipe: "content";
  /** Supporting copy under the title. */
  subtitle?: string;
  children: ReactNode;
  /** Trailing actions, such as CatchButtons; the close button always dismisses. */
  actions?: ReactNode;
  /** Names the close button in the header. */
  closeLabel: string;
}

export type CatchDialogProps = CatchDialogConfirmationProps | CatchDialogContentProps;

/**
 * Flutter's CatchDialog on the web: a centred modal in a native dialog. It
 * traps focus, closes on Escape and the scrim, and returns focus to whatever
 * opened it. The confirmation recipe confirms a risky action (ban an account,
 * publish, write off a bill) with the confirming action last; the content
 * recipe holds page content that is too big for a dropdown, such as a pass,
 * under a title with a close button, scrolling inside when the window is short.
 */
export function CatchDialog(props: CatchDialogProps) {
  const {open, onClose, title} = props;
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);
  const content = props.recipe === "content";
  const message = props.recipe === "content" ? props.subtitle : props.message;
  return (
    <dialog
      aria-describedby={message ? messageId : undefined}
      aria-labelledby={titleId}
      className={styles.dialog}
      data-recipe={content ? "content" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        // Escape on keydown, as CatchSheet does, so the caller's state, not the browser, closes it.
        if (event.key !== "Escape") return;
        event.preventDefault();
        onClose();
      }}
      ref={ref}
    >
      {props.recipe === "content" ? (
        <div className={styles.frame}>
          <div className={styles.header}>
            <span className={styles.heading}>
              <CatchText as="h2" id={titleId} variant="display-xs">{title}</CatchText>
              {message ? <CatchText as="p" id={messageId} tone="secondary" variant="body">{message}</CatchText> : null}
            </span>
            <CatchIconAction icon="close" label={props.closeLabel} onPressed={onClose} size="md" variant="filled" />
          </div>
          <div className={styles.content}>{props.children}</div>
          {props.actions != null ? <div className={styles.actions}>{props.actions}</div> : null}
        </div>
      ) : (
        <div className={styles.body}>
          <h2 className={styles.title} id={titleId}>{title}</h2>
          {message ? <p className={styles.message} id={messageId}>{message}</p> : null}
          {props.children}
          <div className={styles.actions}>
            <CatchButton label={props.cancel?.label ?? "Cancel"} onPressed={props.cancel?.onPressed ?? onClose} size="md" variant="secondary" />
            <CatchButton label={props.confirm.label} onPressed={props.confirm.onPressed} size="md"
              variant={props.confirm.tone === "danger" ? "danger" : "primary"} />
          </div>
        </div>
      )}
    </dialog>
  );
}
