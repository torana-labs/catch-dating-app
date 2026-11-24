import {
  CatchButton,
  CatchField,
  CatchFormStepList,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchSection,
  CatchStack,
  CatchStepper,
  CatchText,
  type CatchFormStepListStatus,
} from "@catch/web-ui";
import {interpolateContent as fill} from "@content/interpolate";
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
import {publicCheckoutFlowCopy as flow} from "../../content/publicCheckout";
import {usePendingRequestNavigationBlocked} from "../../shared/pendingRequest";
import {Form} from "../../shared/ui/primitives";
import { EventSmsPreferencePanel } from "../eventMessaging/EventSmsPreferencePanel";
import { EventRcsPreferencesPanel } from "../eventMessaging/EventRcsPreferencesPanel";
import { EventWhatsappPreferencesPanel } from "../eventMessaging/EventWhatsappPreferencesPanel";
import {checkoutPlaces, MAX_CHECKOUT_PLACES, type CheckoutPlaceFields} from "./checkoutPlaces";
import {phoneFieldCopy} from "@content/phoneField";
import {activePhoneCountry} from "@content/markets";
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
type CheckoutView = ReturnType<typeof usePublicCheckoutController>;

const stepKeys = ["phone", "review", "pay", "confirmed"] as const;

/** Where the booking is on the board's rail: phone, review, pay, then confirmed. */
export function checkoutStep(c: Pick<CheckoutView, "phase" | "quote" | "payment" | "admission">): number {
  if (c.admission) return stepKeys.length;
  if (c.payment) return 2;
  if (c.quote) return 1;
  return 0;
}

function CheckoutSteps({current}: {current: number}) {
  const statusLabel = (status: CatchFormStepListStatus) => flow.steps.status[status];
  return (
    <CatchFormStepList
      current={current < stepKeys.length ? current : undefined}
      direction="row"
      items={stepKeys.map((key, index) => ({index, title: flow.steps[key], status: index < current ? "complete" : "needsInformation"}))}
      label={flow.steps.label}
      statusLabelBuilder={statusLabel}
    />
  );
}

const countLabel = (forms: {one: string; other: string}, count: number, amount?: string) =>
  count === 1 ? fill(forms.one, amount === undefined ? {} : {amount}) as string :
    fill(forms.other, amount === undefined ? {count} : {count, amount}) as string;

/** The price rows of a multi-place booking: the member's own place, then the guests' places. */
function PlaceRows({fields}: {fields: CheckoutPlaceFields}) {
  const places = checkoutPlaces(fields);
  if (places.placeCount < 2) return null;
  if (places.memberPlaceCount === 1) {
    const guests = places.placeCount - 1;
    return (
      <>
        <CatchIndexRow density="compact" title={flow.places.memberPlace} value={money(places.unitAmountPaise)} />
        <CatchIndexRow density="compact" title={countLabel(flow.places.guestPlaces, guests, money(places.guestUnitAmountPaise))}
          value={money(places.guestUnitAmountPaise * guests)} />
      </>
    );
  }
  return (
    <CatchIndexRow density="compact" title={fill(flow.places.perPlace, {count: places.placeCount, amount: money(places.unitAmountPaise)})}
      value={money(places.unitAmountPaise * places.placeCount)} />
  );
}

/**
 * The checkout as the LiveCheckout board lays it out: the step rail, the
 * step's heading, the booking summary rows, then the step's fields and
 * actions. It sits in the event page's booking card and on the booking page.
 */
export function PublicPaidRegistrationView(c: CheckoutView) {
  const { phase, pending, quote, payment, admission, cancellationReview } = c;
  // Older fixtures predate multi-place booking: they book one place.
  const places = c.places ?? 1;
  const guestNames = c.guestNames ?? [];
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
  const priced: CheckoutPlaceFields | null = payment ?? quote;
  const bookedPlaces = priced ? checkoutPlaces(priced).placeCount : 1;
  const maxPlaces = Math.max(1, Math.min(MAX_CHECKOUT_PLACES, c.placesLeft ?? MAX_CHECKOUT_PLACES));
  const placesLocked = pending || c.nameLocked;
  const payLabel = quote && bookedPlaces > 1 ? fill(flow.places.pay, {count: bookedPlaces, amount: money(quote.amountPaise)}) :
    quote ? copy.pay(money(quote.amountPaise)) : text.continueCheckout;
  return (
    <CatchStack gap={20}>
      {c.allowNewBookings && !cancellationReview && phase !== "loading" && phase !== "unavailable" ? (
        <CheckoutSteps current={checkoutStep(c)} />
      ) : null}
      {!c.allowNewBookings && (phase === "phone" || phase === "otp") ? (
        <CatchText as="p" variant="body">{copy.closedRecovery}</CatchText>
      ) : null}
      {phase === "phone" || phase === "otp" ? (
        <Form noValidate onSubmit={phase === "phone" ? c.sendCode : c.verifyCode} pending={pending}>
          <CatchStack gap={12}>
            {phase === "phone" ? (
              <CatchField
                recipe="phone"
                id={`${c.recaptchaId}-phone`}
                title={text.phoneLabel}
                copy={phoneFieldCopy}
                countryCode={activePhoneCountry}
                helperText={eventPageCopy.booking.phoneNote}
                inputHint={text.phonePlaceholder}
                value={c.phone}
                onChanged={c.setPhone}
              />
            ) : (
              <>
                <CatchText as="p" tone="secondary" variant="body-small">{offerCodeSent(c.phone)}</CatchText>
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
          </CatchStack>
        </Form>
      ) : phase === "loading" || phase === "unavailable" ? (
        <CatchStack gap={12}>
          {pending || !c.status.message ? <CatchLoadingIndicator label={copy.loading} /> : null}
          {c.status.message ? (
            <CatchButton fullWidth label={text.retry} onPressed={pending ? null : () => void c.load()} />
          ) : null}
        </CatchStack>
      ) : (
        <>
          <CatchStack gap={6}>
            <CatchText as="h2" variant="title-row">{display.title}</CatchText>
            <CatchText as="p" tone="secondary" variant="body">{display.body}</CatchText>
          </CatchStack>
          {priced ? (
            <CatchSection container="tile" dividers="between" title={flow.summary.label}>
              <PlaceRows fields={priced} />
              <CatchIndexRow density="compact" title={flow.summary.total} value={money(priced.amountPaise)} />
              <CatchIndexRow density="compact" title={flow.summary.when} value={date(payment?.startTimeMillis ?? quote!.startTimeMillis)} />
              {policy && !cancellationReview ? (
                <CatchIndexRow density="compact" subtitle={offerRefundDeadline(date(policy.refundDeadlineMillis))}
                  title={text.cancellationTerms} wrap />
              ) : null}
            </CatchSection>
          ) : null}
          {payment?.mode === "test" ? <CatchText as="p" role="status" variant="body-small">{text.testMode}</CatchText> : null}
          {payment?.checkout ? (
            <CatchText as="p" tone="secondary" variant="body-small">{offerHoldEnds(date(payment.expiresAtMillis))}</CatchText>
          ) : null}
          {c.previousPayment ? (
            <CatchStack gap={12}>
              <CatchText as="p" variant="body-small">{copy.previousCheckout(money(c.previousPayment.amountPaise))}</CatchText>
              <CatchButton fullWidth href={`/booking/${encodeURIComponent(c.previousPayment.eventId)}/?payment=${c.previousPayment.paymentId}`}
                label={copy.previousBookingLink} onPressed={go} variant="quiet" />
            </CatchStack>
          ) : null}
          {quote && !admission ? (
            <CatchStack gap={12}>
              {c.allowNewBookings && c.changePlaces ? (
                <CatchIndexRow
                  density="regular"
                  subtitle={fill(flow.places.hint, {max: maxPlaces})}
                  title={flow.places.label}
                  trailing={(
                    <CatchStepper
                      decreaseSemanticLabel={flow.places.fewer}
                      enabled={!placesLocked}
                      increaseSemanticLabel={flow.places.more}
                      max={maxPlaces}
                      min={1}
                      onChanged={(value) => void c.changePlaces(value)}
                      value={places}
                      valueLabelBuilder={(value) => countLabel(flow.places.value, value)}
                    />
                  )}
                  wrap
                />
              ) : null}
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
              {guestNames.map((guest, index) => (
                <CatchField
                  recipe="input"
                  helperText={index === 0 ? flow.places.guestNameHint : undefined}
                  id={`${c.recaptchaId}-guest-${index}`}
                  // Guests are the places after the booker's: guest 2, 3 and 4.
                  key={`guest-${index}`}
                  maxLength={80}
                  inputMode={pending || c.nameLocked ? "inactive" : "editable"}
                  title={fill(flow.places.guestName, {number: index + 2})}
                  value={guest}
                  onChanged={(value) => c.setGuestName(index, value)}
                />
              ))}
              <CatchText as="p" tone="secondary" variant="body-small">{copy.signedIn(c.user?.phoneNumber ?? c.phone)}</CatchText>
            </CatchStack>
          ) : null}
          {admission && bookedPlaces > 1 ? (
            <CatchText as="p" variant="body-small">{fill(flow.places.held, {count: bookedPlaces})}</CatchText>
          ) : null}
          <CatchStack gap={12} key={cancellationReview ? "cancel" : "checkout"}>
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
                  <CatchButton fullWidth label={payment ? text.continueCheckout : payLabel}
                    onPressed={() => void c.pay()} status={pending ? "loading" : "idle"} />
                ) : null}
                {!admission && (quote || payment?.checkout) ? (
                  <>
                    <CatchText as="p" tone="secondary" variant="body-small">{eventPageCopy.booking.securePayment}</CatchText>
                  </>
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
          </CatchStack>
          {admission && !cancellationReview ? (
            <>
              <EventSmsPreferencePanel eventId={admission.eventId} attendeeId={admission.attendeeId} />
              <EventRcsPreferencesPanel eventId={admission.eventId} attendeeId={admission.attendeeId} />
              <EventWhatsappPreferencesPanel eventId={admission.eventId} attendeeId={admission.attendeeId} />
            </>
          ) : null}
        </>
      )}
      <CatchText as="p" role="status" tone={c.status.tone === "is-error" ? "danger" : "secondary"} variant="body-small">{c.status.message}</CatchText>
    </CatchStack>
  );
}
