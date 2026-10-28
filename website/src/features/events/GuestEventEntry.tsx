import {CatchButton, CatchCheckboxInput, CatchField, CatchGap, CatchText} from "@catch/web-ui";
import {useState} from "react";
import {offerCodeSent} from "../../content/eventOffer";
import {approvalNotificationCopy as notificationCopy, eventPageCopy, guestEventCopy as copy} from "../../content/events";
import type {User} from "../../firebase";
import {usePendingRequestNavigationBlocked} from "../../shared/pendingRequest";
import {Form} from "../../shared/ui/primitives";
import {guestEventAction, type GuestEventState} from "./guestEventAction";
import {PublicEventRegistration} from "./PublicEventRegistration";
import {useApprovalNotificationsController} from "./useApprovalNotificationsController";
import {useGuestEventController} from "./useGuestEventController";

type Controller = ReturnType<typeof useGuestEventController>;
type Flow = {uid: string; mode: "free" | "paid"};
const noop = () => undefined;

/**
 * A Catch event's booking steps in the event page's booking card (CAT-252).
 * The card sticks beside the page, or opens in a sheet on a phone, so each
 * step takes the last one's place: the start, the guest's phone and code,
 * the existing free registration or paid checkout, then their place. The
 * server chooses admission; this only presents its answer.
 */
export function GuestEventEntry({eventId, startLabel}: {eventId: string; startLabel?: string}) {
  return <GuestEventEntryView controller={useGuestEventController(eventId)} eventId={eventId} startLabel={startLabel} />;
}

export function GuestEventEntryView({eventId, controller: c, startLabel}: {
  eventId: string; controller: Controller;
  /** The start action before the guest's state is known, such as "Book now". Without one the steps begin at once. */
  startLabel?: string;
}) {
  const [started, setStarted] = useState(startLabel === undefined);
  const [flow, setFlow] = useState<Flow | null>(null);
  const uid = c.user?.phoneNumber ? c.user.uid : null;
  const guest = c.error ? null : c.viewer?.guest ?? null;
  const mode = guest?.action === "registerFree" ? "free" : guest?.action === "bookPaid" ? "paid" : null;
  // A status refresh can move a guest mid-checkout to recoverPayment, so the
  // transaction stays mounted until the guest changes identity. A guest who
  // started before signing in goes straight on once the server allows it.
  if (flow && flow.uid !== uid) setFlow(null);
  else if (!flow && started && uid && mode) setFlow({uid, mode});

  if (c.loading) return <CatchButton fullWidth label={copy.loading} onPressed={null} />;
  if (flow && flow.uid === uid) {
    return <PublicEventRegistration eventId={eventId} key={`${eventId}:${flow.uid}`} mode={flow.mode} />;
  }
  if (!uid) {
    return started || startLabel === undefined ? <PhoneStep c={c} /> :
      <Start label={startLabel} note={copy.ready} onStart={() => setStarted(true)} />;
  }
  const notifications = c.user && guest?.applicationStatus ?
    <ApprovalNotifications eventId={eventId} key={`${eventId}:${uid}`} user={c.user} /> : null;
  return (
    <CatchGap size="section">
      {!guest ? <CatchText as="p" color="ink2" role="status" variant="bodyM">{copy.unavailable}</CatchText> :
        mode ? <Start label={guestEventAction(guest, eventId).label} note={guestEventAction(guest, eventId).status}
          onStart={() => setFlow({uid, mode})} /> :
          <GuestStatus eventId={eventId} guest={guest} />}
      {notifications}
      <CatchGap direction="horizontal" size="inline" wrap>
        <CatchButton label={copy.refresh} onPressed={() => void c.refresh()} size="sm" variant="quiet" />
        <CatchButton label={copy.changeAccount} onPressed={() => void c.changeAccount()} size="sm" variant="quiet" />
      </CatchGap>
    </CatchGap>
  );
}

function Start({label, note, onStart}: {label: string; note: string; onStart: () => void}) {
  return (
    <CatchGap size="related">
      <CatchButton fullWidth label={label} onPressed={onStart} />
      <CatchText as="p" color="ink2" role="status" variant="bodyS">{note}</CatchText>
    </CatchGap>
  );
}

function PhoneStep({c}: {c: Controller}) {
  return (
    <Form noValidate onSubmit={c.submit} pending={c.pending}>
      <CatchGap size="related">
        {c.codeSent ? (
          <CatchField
            autoComplete="one-time-code"
            errorText={c.message || null}
            helperText={offerCodeSent(c.phone)}
            id={`${c.recaptchaId}-code`}
            keyboardType="number"
            maxLength={6}
            onChanged={(value) => c.setCode(value.replace(/\D/gu, ""))}
            recipe="input"
            title={copy.code}
            value={c.code}
          />
        ) : (
          <CatchField
            autoComplete="tel"
            errorText={c.message || null}
            helperText={eventPageCopy.booking.phoneNote}
            id={`${c.recaptchaId}-phone`}
            inputMode={c.pending ? "inactive" : "editable"}
            keyboardType="phone"
            onChanged={(value) => c.setPhone(value)}
            recipe="input"
            title={copy.phone}
            value={c.phone}
          />
        )}
        <div id={c.recaptchaId} />
        <CatchButton fullWidth label={c.codeSent ? copy.verify : copy.continue} onPressed={noop}
          status={c.pending ? "loading" : "idle"} type="submit" />
        {c.codeSent ? <CatchButton fullWidth label={copy.changePhone} onPressed={c.pending ? null : c.changePhone}
          variant="quiet" /> : null}
        <CatchText as="p" color="ink2" variant="bodyS">{copy.privacy}</CatchText>
      </CatchGap>
    </Form>
  );
}

/** A state the guest can't book from here: what it means, and where it goes next. */
function GuestStatus({guest, eventId}: {guest: GuestEventState; eventId: string}) {
  // Links hold while a booking request is in flight.
  const go = usePendingRequestNavigationBlocked() ? null : noop;
  const action = guestEventAction(guest, eventId);
  const payment = guest.action === "recoverPayment" ? undefined :
    guest.offerPaymentId ? `/offer/?payment=${encodeURIComponent(guest.offerPaymentId)}` :
      guest.publicPaymentId ? `/booking/${encodeURIComponent(eventId)}/?payment=${encodeURIComponent(guest.publicPaymentId)}` :
        undefined;
  const help = ["unsupported", "unavailable", "awaitingOffer", "declined"].includes(guest.action);
  return (
    <CatchGap size="related">
      <CatchText as="p" role="status" variant="bodyM">{action.status}</CatchText>
      {action.href ? <CatchButton fullWidth href={action.href} label={action.label} onPressed={go} /> : null}
      {payment ? <CatchButton fullWidth href={payment} label={copy.payment} onPressed={go} variant="secondary" /> : null}
      {help ? <CatchButton fullWidth href="/help/" label={copy.help} onPressed={go} variant="secondary" /> : null}
    </CatchGap>
  );
}

function ApprovalNotifications({eventId, user}: {eventId: string; user: User}) {
  const c = useApprovalNotificationsController(eventId, user);
  if (c.loading) return <CatchText as="p" color="ink2" role="status" variant="bodyS">{notificationCopy.loading}</CatchText>;
  return (
    <Form noValidate onSubmit={c.save} pending={c.pending}>
      <CatchGap size="related">
        <CatchText as="h3" variant="titleS">{notificationCopy.title}</CatchText>
        <CatchText as="p" color="ink2" variant="bodyS">{notificationCopy.explanation}</CatchText>
        {c.value && c.choices ? <>
          {!c.value.available ? <CatchText as="p" variant="bodyS">{notificationCopy.unavailable}</CatchText> : null}
          <CatchCheckboxInput label={c.value.terms.phone} value={c.choices.phoneUpdates}
            onChanged={c.pending || !c.value.phoneVerified && !c.choices.phoneUpdates ? null :
              (value) => c.choose("phoneUpdates", value)} />
          <CatchCheckboxInput label={c.value.terms.email} value={c.choices.emailUpdates}
            onChanged={c.pending || !c.value.emailVerified && !c.choices.emailUpdates ? null :
              (value) => c.choose("emailUpdates", value)} />
          {!c.value.emailVerified ? <>
            <CatchText as="p" color="ink2" variant="bodyS">{notificationCopy.verifyFirst}</CatchText>
            <CatchField autoComplete="email" id={`${c.id}-email`} keyboardType="emailAddress"
              inputMode={c.pending ? "inactive" : user.email ? "readOnly" : "editable"}
              onChanged={(value) => c.setEmail(value)} recipe="input" title={notificationCopy.email} value={c.email} />
            <CatchButton label={notificationCopy.verify} onPressed={c.pending || !c.email.trim() ? null : () => void c.verify()}
              variant="secondary" />
          </> : null}
          <CatchButton label={notificationCopy.save} onPressed={noop} status={c.pending ? "loading" : "idle"} type="submit" />
        </> : null}
        <CatchButton label={notificationCopy.refresh} onPressed={c.pending ? null : () => void c.refresh()} variant="quiet" />
        <CatchText as="p" color="ink2" role="status" variant="bodyS">{c.message || (c.error ? notificationCopy.error : "")}</CatchText>
      </CatchGap>
    </Form>
  );
}
