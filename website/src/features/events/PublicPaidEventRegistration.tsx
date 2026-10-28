import {CatchButton, CatchField, CatchGap, CatchLoadingIndicator, CatchText} from "@catch/web-ui";
import {useEffect, useRef} from "react";
import { usePublicCheckoutController } from "./usePublicCheckoutController";
import {
  eventDetailCopy,
  eventPageCopy,
  publicCheckoutCopy as copy,
} from "../../content/events";
import {
  eventOfferCopy as text,
  offerCodeSent,
  offerHoldEnds,
  offerRefundDeadline,
  offerCancellationRefund,
  offerPaymentCopy,
} from "../../content/eventOffer";
import {usePendingRequestNavigationBlocked} from "../../shared/pendingRequest";
import {Form} from "../../shared/ui/primitives";
import { EventSmsPreferencePanel } from "../eventMessaging/EventSmsPreferencePanel";
import { EventRcsPreferencesPanel } from "../eventMessaging/EventRcsPreferencesPanel";
import { EventWhatsappPreferencesPanel } from "../eventMessaging/EventWhatsappPreferencesPanel";
const noop = () => undefined;
const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount / 100,
  );
const date = (value: number) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);

export function PublicPaidEventRegistration({
  eventId,
  inviteToken,
  allowNewBookings = true,
  initialPaymentId = null,
  initialDisplayName = "",
}: {
  eventId: string;
  inviteToken: string | null;
  allowNewBookings?: boolean;
  initialPaymentId?: string | null;
  initialDisplayName?: string;
}) {
  return (
    <PublicPaidRegistrationView
      {...usePublicCheckoutController(
        eventId,
        inviteToken,
        allowNewBookings,
        initialPaymentId,
        initialDisplayName,
      )}
    />
  );
}
export function PublicPaidRegistrationView(
  c: ReturnType<typeof usePublicCheckoutController>,
) {
  const { phase, pending, quote, payment, admission, cancellationReview } = c;
  // Links hold while a booking or payment request is in flight.
  const go = usePendingRequestNavigationBlocked() ? null : noop;
  // A cancellation review opens on the choice that keeps the place.
  const keep = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (cancellationReview) keep.current?.querySelector("button")?.focus();
  }, [cancellationReview]);
  const policy = payment?.cancellationPolicy ?? quote?.cancellationPolicy;
  const display = cancellationReview
    ? {
        title: text.cancelTitle,
        body:
          cancellationReview.refundAmountPaise > 0
            ? offerCancellationRefund(
                money(cancellationReview.refundAmountPaise),
              )
            : text.noRefund,
      }
    : payment?.status === "admitted" && !admission
      ? { title: text.checkingPayment, body: copy.admissionUnavailable }
      : payment
        ? offerPaymentCopy(
            payment.status,
            payment.checkout !== null,
            payment.cancellationReason,
          )
        : admission
          ? { title: text.confirmed, body: copy.alreadyRegistered }
          : !c.allowNewBookings
            ? { title: copy.noBookingTitle, body: copy.noBooking }
            : { title: copy.reviewTitle, body: copy.reviewBody };
  return (
    <CatchGap size="section">
      {!c.allowNewBookings && (phase === "phone" || phase === "otp") ? (
        <CatchText as="p" variant="bodyM">{copy.closedRecovery}</CatchText>
      ) : null}
      {phase === "phone" || phase === "otp" ? (
        <Form noValidate onSubmit={phase === "phone" ? c.sendCode : c.verifyCode} pending={pending}>
          <CatchGap size="related">
            {phase === "phone" ? (
              <CatchField
                recipe="input"
                id={`${c.recaptchaId}-phone`}
                title={text.phoneLabel}
                autoComplete="tel"
                helperText={eventPageCopy.booking.phoneNote}
                inputHint={text.phonePlaceholder}
                value={c.phone}
                onChanged={(value) => c.setPhone(value.replace(/\s/gu, ""))}
                keyboardType="phone"
              />
            ) : (
              <>
                <CatchText as="p" color="ink2" variant="bodyS">{offerCodeSent(c.phone)}</CatchText>
                <CatchField
                  recipe="input"
                  id={`${c.recaptchaId}-code`}
                  title={text.codeLabel}
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={c.code}
                  onChanged={(value) => c.setCode(value.replace(/\D/gu, ""))}
                  keyboardType="number"
                />
              </>
            )}
            <div id={c.recaptchaId} />
            <CatchButton fullWidth label={phase === "phone" ? text.send : text.verify} type="submit"
              onPressed={phase === "otp" && c.code.length !== 6 ? null : noop} status={pending ? "loading" : "idle"} />
            {phase === "otp" ? (
              <CatchButton fullWidth label={text.changeNumber} onPressed={pending ? null : c.changePhone} variant="quiet" />
            ) : null}
          </CatchGap>
        </Form>
      ) : phase === "loading" || phase === "unavailable" ? (
        <CatchGap size="related">
          {pending || !c.status.message ? <CatchLoadingIndicator label={copy.loading} /> : null}
          {c.status.message ? (
            <CatchButton fullWidth label={text.retry} onPressed={pending ? null : () => void c.load()} />
          ) : null}
        </CatchGap>
      ) : (
        <>
          <CatchGap size="related">
            <CatchText as="h3" variant="titleS">{display.title}</CatchText>
            <CatchText as="p" variant="bodyM">{display.body}</CatchText>
            {quote || payment ? (
              <>
                <CatchText as="p" variant="sectionTitle">{money(payment?.amountPaise ?? quote!.amountPaise)}</CatchText>
                <CatchText as="p" variant="bodyM">{date(payment?.startTimeMillis ?? quote!.startTimeMillis)}</CatchText>
                {payment?.mode === "test" ? <CatchText as="p" role="status" variant="bodyS">{text.testMode}</CatchText> : null}
                {payment?.checkout ? (
                  <CatchText as="p" color="ink2" variant="bodyS">{offerHoldEnds(date(payment.expiresAtMillis))}</CatchText>
                ) : null}
              </>
            ) : null}
            {policy && !cancellationReview ? (
              <>
                <CatchText as="p" variant="supportingStrong">{text.cancellationTerms}</CatchText>
                <CatchText as="p" color="ink2" variant="bodyS">{offerRefundDeadline(date(policy.refundDeadlineMillis))}</CatchText>
              </>
            ) : null}
          </CatchGap>
          {c.previousPayment ? (
            <CatchGap size="related">
              <CatchText as="p" variant="bodyS">{copy.previousCheckout(money(c.previousPayment.amountPaise))}</CatchText>
              <CatchButton fullWidth href={`/booking/${encodeURIComponent(c.previousPayment.eventId)}/?payment=${c.previousPayment.paymentId}`}
                label={copy.previousBookingLink} onPressed={go} variant="quiet" />
            </CatchGap>
          ) : null}
          {quote && !admission ? (
            <CatchGap size="related">
              <CatchField
                recipe="input"
                id={`${c.recaptchaId}-name`}
                title={eventDetailCopy.hero.webRegistration.nameLabel}
                autoComplete="name"
                maxLength={120}
                inputMode={pending || c.nameLocked ? "inactive" : "editable"}
                value={c.name}
                onChanged={(value) => c.setName(value)}
              />
              <CatchText as="p" color="ink2" variant="bodyS">{copy.signedIn(c.user?.phoneNumber ?? c.phone)}</CatchText>
            </CatchGap>
          ) : null}
          <CatchGap key={cancellationReview ? "cancel" : "checkout"} size="related">
            {cancellationReview ? (
              <>
                <CatchButton fullWidth label={text.confirmCancellation} onPressed={() => void c.cancelAdmission()}
                  status={pending ? "loading" : "idle"} variant="danger" />
                <div ref={keep}>
                  <CatchButton fullWidth label={text.keepAdmission} onPressed={pending ? null : c.dismissCancellation}
                    variant="secondary" />
                </div>
              </>
            ) : (
              <>
                {!admission && (quote || payment?.checkout) ? (
                  <CatchButton fullWidth label={payment ? text.continueCheckout : copy.pay(money(quote!.amountPaise))}
                    onPressed={() => void c.pay()} status={pending ? "loading" : "idle"} />
                ) : null}
                {!admission && (quote || payment?.checkout) ? (
                  <CatchText as="p" color="ink2" variant="bodyS">{eventPageCopy.booking.securePayment}</CatchText>
                ) : null}
                {c.allowNewBookings && payment && ["expired", "refunded", "cancelled"].includes(payment.status) ? (
                  <CatchButton fullWidth label={copy.startAgain} onPressed={pending ? null : () => void c.startAgain()} />
                ) : null}
                {admission ? <CatchButton fullWidth href={`/booking/${encodeURIComponent(admission.eventId)}/`}
                  label={copy.eventAccess} onPressed={go} /> : null}
                {payment ? <CatchButton fullWidth href={`/booking/${encodeURIComponent(payment.eventId)}/?payment=${payment.paymentId}`}
                  label={copy.bookingLink} onPressed={go} variant="secondary" /> : null}
                {quote && c.status.tone === "is-error" ? (
                  <CatchButton fullWidth label={copy.reviewCurrentTerms} onPressed={pending ? null : () => void c.load(true)}
                    variant="secondary" />
                ) : null}
                {payment ? <CatchButton fullWidth label={text.refresh} onPressed={pending ? null : () => void c.check()}
                  variant="quiet" /> : null}
                {admission && payment?.cancellationQuote ? (
                  <CatchButton fullWidth label={text.cancelAdmission} onPressed={pending ? null : () => void c.reviewCancellation()}
                    variant="quiet" />
                ) : null}
                {!payment && !admission ? (
                  <CatchButton fullWidth label={text.verifyAnother} onPressed={pending ? null : c.changePhone} variant="quiet" />
                ) : null}
              </>
            )}
          </CatchGap>
          {admission && !cancellationReview ? (
            <>
              <EventSmsPreferencePanel eventId={admission.eventId} attendeeId={admission.attendeeId} />
              <EventRcsPreferencesPanel eventId={admission.eventId} attendeeId={admission.attendeeId} />
              <EventWhatsappPreferencesPanel eventId={admission.eventId} attendeeId={admission.attendeeId} />
            </>
          ) : null}
        </>
      )}
      <CatchText as="p" color={c.status.tone === "is-error" ? "danger" : "ink2"} role="status" variant="bodyS">{c.status.message}</CatchText>
    </CatchGap>
  );
}
