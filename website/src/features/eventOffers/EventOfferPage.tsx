import {CatchButton, CatchField, CatchGap, CatchLoadingIndicator, CatchText} from "@catch/web-ui";
import {useEffect, useRef} from "react";
import {eventOfferCopy as text, offerCodeSent, offerHoldEnds, offerRefundDeadline, offerCancellationRefund} from "../../content/eventOffer";
import {usePendingRequestNavigationBlocked} from "../../shared/pendingRequest";
import {Form} from "../../shared/ui/primitives";
import {EventBookingFrame} from "../../shared/site/EventBookingFrame";
import type {OfferCredential} from "./offerCredential";
import {useOfferCheckoutController} from "./useOfferCheckoutController";
import {formatOfferAmount, paymentCopy} from "./offerCheckoutModel";

const noop = () => undefined;

export function EventOfferPage({credential}: {credential: OfferCredential | null}) {
  const controller = useOfferCheckoutController(credential);
  return <EventOfferView {...controller} />;
}

/**
 * An organiser's offer to an approved guest (CAT-252). The offer link is a
 * private credential, and its event is known only once the guest has verified
 * their phone, so the offer keeps its own private page. Its steps use the
 * event page's booking card, and a confirmed place goes on to the event.
 */
export function EventOfferView(controller: ReturnType<typeof useOfferCheckoutController>) {
  const {phase, pending, grant, payment, admission, cancellationReview} = controller;
  // Links hold while an offer or payment request is in flight.
  const go = usePendingRequestNavigationBlocked() ? null : noop;
  // A cancellation review opens on the choice that keeps the place.
  const keep = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (cancellationReview) keep.current?.querySelector("button")?.focus();
  }, [cancellationReview]);
  const status = (
    <CatchText as="p" color={controller.status.tone === "is-error" ? "danger" : "ink2"} role="status" variant="bodyS">
      {controller.status.message}
    </CatchText>
  );

  if (phase === "loading") {
    return <EventBookingFrame title={grant?.eventName ?? text.invitationTitle}><CatchLoadingIndicator label={text.loading} /></EventBookingFrame>;
  }
  if (phase === "phone" || phase === "otp") {
    return (
      <EventBookingFrame body={phase === "phone" ? text.phoneBody : offerCodeSent(controller.phone)}
        title={phase === "phone" ? text.phoneTitle : text.otpTitle}>
        <Form noValidate onSubmit={phase === "phone" ? controller.sendCode : controller.verifyCode} pending={pending}>
          <CatchGap size="related">
            {phase === "phone" ? (
              <CatchField autoComplete="tel" id="offer-phone" inputHint={text.phonePlaceholder} keyboardType="phone"
                onChanged={(value) => controller.setPhone(value.replace(/\s/gu, ""))} recipe="input" title={text.phoneLabel}
                value={controller.phone} />
            ) : (
              <CatchField autoComplete="one-time-code" id="offer-code" keyboardType="number" maxLength={6}
                onChanged={(value) => controller.setCode(value.replace(/\D/gu, ""))} recipe="input" title={text.codeLabel}
                value={controller.code} />
            )}
            {phase === "phone" ? <div id={controller.recaptchaId} /> : null}
            <CatchButton fullWidth label={phase === "phone" ? text.send : text.verify}
              onPressed={phase === "otp" && controller.code.length !== 6 ? null : noop}
              status={pending ? "loading" : "idle"} type="submit" />
            {phase === "otp" ? (
              <CatchButton fullWidth label={text.changeNumber} onPressed={pending ? null : controller.changePhone} variant="quiet" />
            ) : null}
            {status}
          </CatchGap>
        </Form>
      </EventBookingFrame>
    );
  }
  if (phase === "unavailable") {
    return (
      <EventBookingFrame body={text.unavailableBody} title={text.unavailableTitle}>
        <CatchGap size="related">
          {status}
          {controller.hasInvitation ? <CatchButton fullWidth label={text.retry} onPressed={() => void controller.load()}
            status={pending ? "loading" : "idle"} /> : null}
          {controller.hasInvitation ? <CatchButton fullWidth label={text.verifyAnother}
            onPressed={pending ? null : controller.changePhone} variant="secondary" /> : null}
          <CatchButton fullWidth href="/help/" label={text.help} onPressed={go} variant="quiet" />
        </CatchGap>
      </EventBookingFrame>
    );
  }

  const policy = payment?.cancellationPolicy ?? (grant?.amountPaise ? grant.cancellationPolicy : null);
  const copy = admission ? {title: text.confirmed, body: text.eventAccess} : cancellationReview ? {title: text.cancelTitle,
    body: cancellationReview.refundAmountPaise > 0 ?
      offerCancellationRefund(formatOfferAmount(cancellationReview.refundAmountPaise)) : text.noRefund} : payment ? paymentCopy(payment) : {
    title: grant?.eventName ?? text.invitationTitle,
    body: grant?.freeAdmission ? text.freeInvitationBody : text.invitationBody,
  };
  const eventId = admission?.eventId ?? (payment?.status === "admitted" ? payment.eventId || grant?.eventId : undefined);
  return (
    <EventBookingFrame body={copy.body} title={copy.title}>
      <CatchGap size="section">
        <CatchGap size="related">
          <CatchText as="h2" variant="titleS">
            {payment?.status === "refunded" ? text.refund : admission || grant?.freeAdmission ? text.invitationTitle : text.bookingAmount}
          </CatchText>
          <CatchText as="p" variant="sectionTitle">
            {admission || grant?.amountPaise === 0 ? text.freeAmount : formatOfferAmount(payment?.amountPaise ?? grant!.amountPaise)}
          </CatchText>
          {grant ? <CatchText as="p" variant="bodyM">
            {new Intl.DateTimeFormat("en-IN", {dateStyle: "full", timeStyle: "short"}).format(grant.startTimeMillis)}
          </CatchText> : null}
          {payment?.mode === "test" ? <CatchText as="p" role="status" variant="bodyS">{text.testMode}</CatchText> : null}
          {payment?.checkout ? <CatchText as="p" color="ink2" variant="bodyS">
            {offerHoldEnds(new Intl.DateTimeFormat("en-IN", {timeStyle: "short"}).format(payment.expiresAtMillis))}
          </CatchText> : null}
          {policy && !cancellationReview ? <>
            <CatchText as="p" variant="supportingStrong">{text.cancellationTerms}</CatchText>
            <CatchText as="p" color="ink2" variant="bodyS">
              {offerRefundDeadline(new Intl.DateTimeFormat("en-IN", {dateStyle: "medium", timeStyle: "short"}).format(policy.refundDeadlineMillis))}
            </CatchText>
          </> : null}
        </CatchGap>
        <CatchGap key={cancellationReview ? "cancel" : "offer"} size="related">
          {cancellationReview ? <>
            <CatchButton fullWidth label={text.confirmCancellation} onPressed={() => void controller.cancelAdmission()}
              status={pending ? "loading" : "idle"} variant="danger" />
            <div ref={keep}>
              <CatchButton fullWidth label={text.keepAdmission} onPressed={pending ? null : controller.dismissCancellation}
                variant="secondary" />
            </div>
          </> : <>
            {!admission && (!payment || payment.checkout) ? (
              <CatchButton fullWidth label={grant?.freeAdmission ? text.acceptFree : payment ? text.continueCheckout : text.reservePay}
                onPressed={() => void controller.pay()} status={pending ? "loading" : "idle"} />
            ) : null}
            {eventId ? <CatchButton fullWidth href={`/booking/${encodeURIComponent(eventId)}/`} label={text.eventAccess}
              onPressed={go} /> : null}
            {payment?.cancellationQuote ? <CatchButton fullWidth label={text.cancelAdmission}
              onPressed={pending ? null : () => void controller.reviewCancellation()} variant="quiet" /> : null}
            {payment && !["refunded", "cancelled"].includes(payment.status) ? <CatchButton fullWidth label={text.refresh}
              onPressed={pending ? null : () => void controller.check()} variant="quiet" /> : null}
            {payment?.status === "admitted" || payment?.status === "refunded" || payment?.status === "cancelled" ||
              payment?.status === "reviewRequired" ? <CatchButton fullWidth href="/help/" label={text.help} onPressed={go}
                variant="quiet" /> : null}
          </>}
        </CatchGap>
        {status}
      </CatchGap>
    </EventBookingFrame>
  );
}
