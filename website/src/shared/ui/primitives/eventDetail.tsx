import {useEffect, useId, useRef} from "react";
import type {FormHTMLAttributes, ReactNode} from "react";
import {Button} from "./actions";
import {CheckboxField} from "./forms";
import {classNames} from "./foundation";

// The event booking controls the guest entry still uses. The event page
// itself is drawn by @catch/web-ui (CAT-252); these go when booking moves
// into the sticky aside.

/** One action model, two placements; only the mobile bar is fixed. */
export function EventGuestActions({children, price, status}: {
  children: ReactNode; price: string; status: string;
}) {
  return <>
    <div className="event-guest-action">{children}<p role="status">{status}</p></div>
    <div className="event-guest-mobile"><div><strong>{price}</strong><span>{status}</span></div>{children}</div>
  </>;
}

export function EventGuestDialog({open, onClose, title, closeLabel, children}: {
  open: boolean; onClose: () => void; title: string; closeLabel: string; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} aria-labelledby={id} className="event-guest-dialog"
    onCancel={(event) => {event.preventDefault(); onClose();}}>
    <div className="event-guest-dialog__heading"><h2 id={id}>{title}</h2>
      <Button variant="ghost" onClick={onClose}>{closeLabel}</Button></div>
    {children}
  </dialog>;
}

export function EventRegistrationForm({
  children,
  className,
  ...props
}: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form {...props} className={classNames("event-registration", className)}>
      {children}
    </form>
  );
}

export function EventRegistrationPrivacy({children}: {children: ReactNode}) {
  return <p className="event-registration__privacy">{children}</p>;
}

export function EventRegistrationConsents({children}: {children: ReactNode}) {
  return <div className="event-registration__consents">{children}</div>;
}

export function EventRegistrationConsent(
  props: Parameters<typeof CheckboxField>[0]
) {
  return (
    <CheckboxField
      {...props}
      className={classNames("event-registration__consent", props.className)}
    />
  );
}
