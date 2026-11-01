import {useEffect, useId, useRef, type ReactNode} from "react";
import {CatchButton} from "./CatchButton";
import styles from "./CatchDialog.module.css";

export interface CatchDialogAction {
  label: string;
  onPressed: (() => void) | null;
}

export interface CatchDialogProps {
  open: boolean;
  /** Escape, the scrim and Cancel all call this. */
  onClose: () => void;
  title: string;
  message?: string;
  /** Extra content under the message, such as a reason field. */
  children?: ReactNode;
  /** The confirming action; danger draws it as a destructive button. */
  confirm: CatchDialogAction & {tone?: "default" | "danger"};
  /** The dismissing action; "Cancel" by default. */
  cancel?: CatchDialogAction;
}

/**
 * Flutter's CatchDialog on the web: a modal confirmation for a risky action (ban an account,
 * publish, write off a bill). It traps focus in the native dialog, closes on Escape and the
 * scrim, and puts the confirming action last.
 */
export function CatchDialog({open, onClose, title, message, children, confirm, cancel}: CatchDialogProps) {
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
  return (
    <dialog
      aria-describedby={message ? messageId : undefined}
      aria-labelledby={titleId}
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      ref={ref}
    >
      <div className={styles.body}>
        <h2 className={styles.title} id={titleId}>{title}</h2>
        {message ? <p className={styles.message} id={messageId}>{message}</p> : null}
        {children}
        <div className={styles.actions}>
          <CatchButton label={cancel?.label ?? "Cancel"} onPressed={cancel?.onPressed ?? onClose} size="md" variant="secondary" />
          <CatchButton label={confirm.label} onPressed={confirm.onPressed} size="md" variant={confirm.tone === "danger" ? "danger" : "primary"} />
        </div>
      </div>
    </dialog>
  );
}
