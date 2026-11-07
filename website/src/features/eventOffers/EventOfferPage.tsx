import {
  CatchBadge,
  CatchButton,
  CatchField,
  CatchIcon,
  CatchLoadingIndicator,
  CatchPageBody,
  CatchPaneLayout,
  CatchRoot,
  CatchStack,
  CatchSurface,
  CatchText,
  useCatchPane,
} from "@catch/web-ui";
import {useEffect, useRef, type ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {publicSiteCopy, siteFooterLegalLinks} from "@content/site";
import {
  eventOfferCopy as text,
  eventOfferPageCopy as page,
  offerCodeSent,
  offerRefundDeadline,
  offerCancellationRefund,
} from "../../content/eventOffer";
import {usePendingRequestNavigationBlocked} from "../../shared/pendingRequest";
import {PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {Form} from "../../shared/ui/primitives";
import type {OfferCredential} from "./offerCredential";
import {useOfferCheckoutController} from "./useOfferCheckoutController";
import {formatOfferAmount, paymentCopy} from "./offerCheckoutModel";

const noop = () => undefined;
const titleId = "offer-title";

export function EventOfferPage({credential}: {credential: OfferCredential | null}) {
  const controller = useOfferCheckoutController(credential);
  return <EventOfferView {...controller} />;
}

const longDate = (millis: number) => new Intl.DateTimeFormat("en-IN", {dateStyle: "full", timeStyle: "short"}).format(millis);
const holdTime = (millis: number) => new Intl.DateTimeFormat("en-IN", {weekday: "short", day: "numeric", month: "short",
  hour: "numeric", minute: "2-digit"}).format(millis);

/**
 * An organiser's offer to an approved guest (CAT-252), drawn as the RbWebOffer
 * board on the white ground: the hold badge, the title, the place card, the
 * take-the-place button and the app note, in the reading lane under the site
 * top bar. The offer link is a private credential, and its event is known
 * only once the guest has verified their phone, so the offer keeps its own
 * private page; a confirmed place goes on to the event. The phase, the
 * credential and the checkout are the controller's; this only draws them.
 */
export function EventOfferView(controller: ReturnType<typeof useOfferCheckoutController>) {
  const {phase, grant, payment, admission, cancellationReview} = controller;
  const card = phase === "ready" && (grant || payment || admission) ? <PlaceCard controller={controller} /> : null;
  return (
    <CatchRoot theme="day">
      <PublicSiteHeader />
      <WebsitePageMain id="offer">
        <CatchPageBody gutter={false} pb="s0" pt="s4">
          <CatchPaneLayout
            aside={card && !cancellationReview ? <SplitOnly>{card}</SplitOnly> : undefined}
            main={
              <CatchStack aria-labelledby={titleId} as="section" gap={24}>
                <OfferSteps card={cancellationReview ? null : card} controller={controller} />
              </CatchStack>
            }
            pattern="reading"
          />
        </CatchPageBody>
      </WebsitePageMain>
      <OfferSiteFooter />
    </CatchRoot>
  );
}

type Controller = ReturnType<typeof useOfferCheckoutController>;

/** Beside the lane on a wide page; on a phone the card sits in the lane, under the title. */
function SplitOnly({children}: {children: ReactNode}) {
  return useCatchPane().split ? <>{children}</> : null;
}

function UnsplitOnly({children}: {children: ReactNode}) {
  return useCatchPane().split ? null : <>{children}</>;
}

/** The page's opening: the page title and its lead. */
function OfferHead({title, body}: {title: string; body?: ReactNode}) {
  return (
    <CatchStack gap={8}>
      <CatchText as="h1" id={titleId} variant="page-title">{title}</CatchText>
      {body ? <CatchText tone="secondary" variant="body">{body}</CatchText> : null}
    </CatchStack>
  );
}

function OfferStatus({controller}: {controller: Controller}) {
  return (
    <CatchText role="status" tone={controller.status.tone === "is-error" ? "danger" : "secondary"} variant="body-small">
      {controller.status.message}
    </CatchText>
  );
}

function OfferSteps({controller, card}: {controller: Controller; card: ReactNode}) {
  const {phase, pending, grant, payment, admission, cancellationReview} = controller;
  // Links hold while an offer or payment request is in flight.
  const go = usePendingRequestNavigationBlocked() ? null : noop;
  // A cancellation review opens on the choice that keeps the place.
  const keep = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (cancellationReview) keep.current?.querySelector("button")?.focus();
  }, [cancellationReview]);

  if (phase === "loading") {
    return (
      <>
        <OfferHead title={grant?.eventName ?? text.invitationTitle} />
        <CatchLoadingIndicator label={text.loading} />
      </>
    );
  }
  if (phase === "phone" || phase === "otp") {
    return (
      <>
        <OfferHead body={phase === "phone" ? text.phoneBody : offerCodeSent(controller.phone)}
          title={phase === "phone" ? text.phoneTitle : text.otpTitle} />
        <Form noValidate onSubmit={phase === "phone" ? controller.sendCode : controller.verifyCode} pending={pending}>
          <CatchStack gap={16}>
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
            <CatchStack gap={4}>
              <CatchButton fill label={phase === "phone" ? text.send : text.verify}
                onPressed={phase === "otp" && controller.code.length !== 6 ? null : noop}
                status={pending ? "loading" : "idle"} type="submit" />
              {phase === "otp" ? (
                <CatchButton fill label={text.changeNumber} onPressed={pending ? null : controller.changePhone} variant="quiet" />
              ) : null}
            </CatchStack>
            <OfferStatus controller={controller} />
          </CatchStack>
        </Form>
      </>
    );
  }
  if (phase === "unavailable") {
    return (
      <>
        <OfferHead body={text.unavailableBody} title={text.unavailableTitle} />
        <OfferStatus controller={controller} />
        <CatchStack gap={4}>
          {controller.hasInvitation ? <CatchButton fill label={text.retry} onPressed={() => void controller.load()}
            status={pending ? "loading" : "idle"} /> : null}
          {controller.hasInvitation ? <CatchButton fill label={text.verifyAnother}
            onPressed={pending ? null : controller.changePhone} variant="secondary" /> : null}
          <CatchButton fill href="/help/" label={text.help} onPressed={go} variant="quiet" />
        </CatchStack>
      </>
    );
  }

  const policy = payment?.cancellationPolicy ?? (grant?.amountPaise ? grant.cancellationPolicy : null);
  const copy = admission ? {title: text.confirmed, body: text.eventAccess} : cancellationReview ? {title: text.cancelTitle,
    body: cancellationReview.refundAmountPaise > 0 ?
      offerCancellationRefund(formatOfferAmount(cancellationReview.refundAmountPaise)) : text.noRefund} : payment ? paymentCopy(payment) : {
    title: page.placeTitle,
    body: grant?.freeAdmission ? text.freeInvitationBody : text.invitationBody,
  };
  const eventId = admission?.eventId ?? (payment?.status === "admitted" ? payment.eventId || grant?.eventId : undefined);
  const holdEnds = payment?.checkout ? payment.expiresAtMillis : !payment && !admission && grant ? grant.expiresAtMillis : null;
  const takeLabel = grant?.freeAdmission ? page.takeFree : payment ? text.continueCheckout :
    fill(page.takePaid, {amount: formatOfferAmount(grant?.amountPaise ?? 0)});
  return (
    <>
      {holdEnds !== null && !cancellationReview ? (
        <CatchStack align="start">
          <CatchBadge icon={<CatchIcon name="pending" size={16} />} label={fill(page.heldUntil, {time: holdTime(holdEnds)})} tone="warning" />
        </CatchStack>
      ) : null}
      <OfferHead title={copy.title} />
      {card ? <UnsplitOnly>{card}</UnsplitOnly> : null}
      <CatchText variant="body">{copy.body}</CatchText>
      {payment?.mode === "test" ? <CatchText role="status" tone="secondary" variant="body-small">{text.testMode}</CatchText> : null}
      {policy && !cancellationReview ? (
        <CatchStack gap={4}>
          <CatchText variant="label-action">{text.cancellationTerms}</CatchText>
          <CatchText tone="secondary" variant="body-small">
            {offerRefundDeadline(new Intl.DateTimeFormat("en-IN", {dateStyle: "medium", timeStyle: "short"}).format(policy.refundDeadlineMillis))}
          </CatchText>
        </CatchStack>
      ) : null}
      <CatchStack gap={4} key={cancellationReview ? "cancel" : "offer"}>
        {cancellationReview ? <>
          <CatchButton fill label={text.confirmCancellation} onPressed={() => void controller.cancelAdmission()}
            status={pending ? "loading" : "idle"} variant="danger" />
          <div ref={keep}>
            <CatchButton fill label={text.keepAdmission} onPressed={pending ? null : controller.dismissCancellation}
              variant="secondary" />
          </div>
        </> : <>
          {!admission && (!payment || payment.checkout) ? (
            <CatchButton fill label={takeLabel} onPressed={() => void controller.pay()} status={pending ? "loading" : "idle"} />
          ) : null}
          {eventId ? <CatchButton fill href={`/booking/${encodeURIComponent(eventId)}/`} label={text.eventAccess}
            onPressed={go} /> : null}
          {payment?.cancellationQuote ? <CatchButton fill label={text.cancelAdmission}
            onPressed={pending ? null : () => void controller.reviewCancellation()} variant="quiet" /> : null}
          {payment && !["refunded", "cancelled"].includes(payment.status) ? <CatchButton fill label={text.refresh}
            onPressed={pending ? null : () => void controller.check()} variant="quiet" /> : null}
          {payment?.status === "admitted" || payment?.status === "refunded" || payment?.status === "cancelled" ||
            payment?.status === "reviewRequired" ? <CatchButton fill href="/help/" label={text.help} onPressed={go}
              variant="quiet" /> : null}
        </>}
      </CatchStack>
      <OfferStatus controller={controller} />
      {!cancellationReview ? <CatchText tone="secondary" variant="body-small">{page.appNote}</CatchText> : null}
    </>
  );
}

/**
 * The board's place card: an ink spotlight (the offer does not say the
 * event's format) with the kicker, the event, its time and the amount.
 */
function PlaceCard({controller}: {controller: Controller}) {
  const {grant, payment, admission} = controller;
  const amount = payment?.status === "refunded" ? `${text.refund} · ${formatOfferAmount(payment.amountPaise)}` :
    admission || grant?.amountPaise === 0 ? text.freeAmount : formatOfferAmount(payment?.amountPaise ?? grant?.amountPaise ?? 0);
  return (
    <CatchSurface block="spotlight">
      <CatchText variant="label-kicker">{page.placeKicker}</CatchText>
      <CatchText as="h2" variant="display-sm">{grant?.eventName ?? text.invitationTitle}</CatchText>
      {grant ? <CatchText variant="body-small">{longDate(grant.startTimeMillis)}</CatchText> : null}
      <CatchText variant="label-action">{amount}</CatchText>
    </CatchSurface>
  );
}

/** The board's site footer: the wordmark beside the site and legal links, then the operator line. */
function OfferSiteFooter() {
  return (
    <CatchPageBody constrainToContentWidth pb="s8" pt="s6">
      <CatchStack as="footer" gap={12}>
        <CatchStack align="center" direction="row" gap={12} justify="between" wrap>
          <CatchText variant="display-xs">{publicSiteCopy.wordmark}</CatchText>
          <CatchStack aria-label={page.footerLabel} as="nav" direction="row" gap={4} wrap>
            {[...publicSiteCopy.nav, ...siteFooterLegalLinks].map((link) => (
              <CatchButton href={link.href} key={link.href} label={link.label} size="sm" variant="quiet" />
            ))}
          </CatchStack>
        </CatchStack>
        <CatchText tone="secondary" variant="body-meta">{publicSiteCopy.footerOperator}</CatchText>
      </CatchStack>
    </CatchPageBody>
  );
}
