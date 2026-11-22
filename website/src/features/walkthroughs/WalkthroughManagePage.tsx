import {
  CatchBadge,
  CatchButton,
  CatchField,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchPageBody,
  CatchPaneLayout,
  CatchSection,
  CatchStack,
  CatchText,
  CatchTopBar,
} from "@catch/web-ui";
import {brand} from "@content/brand";
import {hostWalkthroughHref} from "@content/site";
import {interpolateContent as fill} from "@content/interpolate";
import {walkthroughBookingCopy as copy} from "@content/walkthroughBooking";
import {Form} from "../../shared/ui/primitives";
import {SignInSheetView} from "../account/SignInSheet";
import {useSignInSheetController} from "../account/useSignInSheetController";
import {walkthroughProblemText} from "./WalkthroughBooking";
import {useStepFocus, WalkthroughSlotGrid} from "./WalkthroughSlotGrid";
import {useWalkthroughManageController, type WalkthroughManageController} from "./useWalkthroughManageController";
import {walkthroughIndiaDay, walkthroughIndiaTime, walkthroughLocalTime} from "./walkthroughModel";

const noop = () => undefined;
const words = copy.manage;

function Heading({text, focus}: {text: string; focus: string}) {
  return <CatchText as="h1" id={focus} tabIndex={-1} variant="page-title">{text}</CatchText>;
}

function Problem({controller}: {controller: WalkthroughManageController}) {
  return controller.problem ? <CatchText as="p" role="alert" variant="body">{walkthroughProblemText(controller.problem)}</CatchText> : null;
}

function BookingSummary({controller}: {controller: WalkthroughManageController}) {
  const {booking} = controller;
  if (!booking) return null;
  const start = booking.slot.startAt;
  const local = walkthroughLocalTime(start, controller.timeZone);
  const status = booking.status === "cancelled" ? words.status.cancelled : booking.confirmed ? words.status.confirmed : words.status.booked;
  return (
    <CatchSection container="tile">
      <CatchIndexRow density="compact" title={fill(copy.chosen, {day: walkthroughIndiaDay(start), time: walkthroughIndiaTime(start)})} wrap
        subtitle={local && controller.timeZone ? fill(copy.localTime, {local, zone: controller.timeZone}) : undefined}
        trailing={<CatchBadge label={status} size="sm" tone={booking.status === "cancelled" ? "neutral" : booking.confirmed ? "success" : "gold"} />} />
    </CatchSection>
  );
}

function Ready({controller, focus}: {controller: WalkthroughManageController; focus: string}) {
  const {booking} = controller;
  if (!booking) return null;
  const cancelled = booking.status === "cancelled";
  const lead = cancelled ? words.cancelledLead : !booking.canChange ? words.started : booking.confirmed ? words.confirmedLead : words.pending;
  return (
    <CatchStack gap={16}>
      <Heading focus={focus} text={words.title} />
      {controller.notice ? <CatchText as="p" role="status" variant="body">{controller.notice}</CatchText> : null}
      <BookingSummary controller={controller} />
      <CatchText as="p" tone="secondary" variant="body">{lead}</CatchText>
      <Problem controller={controller} />
      {booking.canChange ? (
        <CatchStack direction="row" gap={8} wrap>
          <CatchButton label={words.move} onPressed={controller.startMove} variant="primary" />
          <CatchButton label={words.cancel} onPressed={controller.startCancel} variant="secondary" />
        </CatchStack>
      ) : null}
      {cancelled ? <CatchStack align="start"><CatchButton href={hostWalkthroughHref} label={words.bookAgain} variant="secondary" /></CatchStack> : null}
    </CatchStack>
  );
}

function Move({controller, focus}: {controller: WalkthroughManageController; focus: string}) {
  return (
    <Form aria-label={words.moveTitle} noValidate onSubmit={controller.confirmMove} pending={controller.busy}>
      <CatchStack gap={16}>
        <Heading focus={focus} text={words.moveTitle} />
        <BookingSummary controller={controller} />
        {controller.notice ? <CatchText as="p" role="alert" variant="body">{controller.notice}</CatchText> : null}
        {controller.slotsProblem ? (
          <CatchStack align="start" gap={8} role="alert">
            <CatchText as="p" variant="body">{copy.problems.loadFailed}</CatchText>
            <CatchButton label={copy.retry} onPressed={controller.reloadSlots} size="sm" variant="secondary" />
          </CatchStack>
        ) : !controller.slots ? (
          <CatchStack align="center" direction="row" gap={12} role="status">
            <CatchLoadingIndicator label={copy.loading} />
            <CatchText as="p" variant="body">{copy.loading}</CatchText>
          </CatchStack>
        ) : controller.slots.bookingOpen && controller.slots.days.length ? (
          <WalkthroughSlotGrid day={controller.day} onDay={controller.pickDay} onSlot={controller.pickSlot} slotStartAt={controller.slotStartAt}
            slots={controller.slots} timeZone={controller.timeZone} />
        ) : <CatchText as="p" role="status" variant="body">{copy.done.changeOnWhatsapp}</CatchText>}
        <Problem controller={controller} />
        <CatchStack direction="row" gap={8} wrap>
          {controller.slots?.days.length ? (
            <CatchButton label={words.moveConfirm} onPressed={noop} status={controller.busy ? "loading" : "idle"} type="submit" />
          ) : null}
          <CatchButton label={words.back} onPressed={controller.busy ? null : controller.back} variant="quiet" />
        </CatchStack>
      </CatchStack>
    </Form>
  );
}

function Cancel({controller, focus}: {controller: WalkthroughManageController; focus: string}) {
  return (
    <Form aria-label={words.cancelTitle} noValidate onSubmit={controller.confirmCancel} pending={controller.busy}>
      <CatchStack gap={16}>
        <Heading focus={focus} text={words.cancelTitle} />
        <BookingSummary controller={controller} />
        <CatchField inputMode={controller.busy ? "inactive" : "editable"} labelMode="visible" maxLength={300} maxLines={3}
          onChanged={controller.setReason} recipe="input" title={words.cancelReason} value={controller.reason} />
        <Problem controller={controller} />
        <CatchStack direction="row" gap={8} wrap>
          <CatchButton label={words.cancelConfirm} onPressed={noop} status={controller.busy ? "loading" : "idle"} type="submit" />
          <CatchButton label={words.keep} onPressed={controller.busy ? null : controller.back} variant="quiet" />
        </CatchStack>
      </CatchStack>
    </Form>
  );
}

function SignInStep({controller, focus}: {controller: WalkthroughManageController; focus: string}) {
  const sheet = useSignInSheetController({onSignedIn: controller.signedIn});
  return (
    <CatchStack gap={16}>
      <Heading focus={focus} text={words.title} />
      <CatchText as="p" variant="body">{words.signInLead}</CatchText>
      <CatchStack align="start">
        <SignInSheetView onClose={() => {sheet.reset(); controller.closeSignIn();}} open={controller.signIn} sheet={sheet}
          trigger={<CatchButton label={words.signIn} onPressed={controller.openSignIn} />} />
      </CatchStack>
    </CatchStack>
  );
}

function Body({controller, focus}: {controller: WalkthroughManageController; focus: string}) {
  const {stage} = controller;
  switch (stage.name) {
    case "loading":
      return (
        <CatchStack gap={16}>
          <Heading focus={focus} text={words.title} />
          <CatchStack align="center" direction="row" gap={12} role="status">
            <CatchLoadingIndicator label={words.loading} />
            <CatchText as="p" variant="body">{words.loading}</CatchText>
          </CatchStack>
        </CatchStack>
      );
    case "missing":
    case "refused":
      return (
        <CatchStack gap={16}>
          <Heading focus={focus} text={words.title} />
          <CatchText as="p" role="alert" variant="body">{stage.name === "missing" ? words.problems.missing : walkthroughProblemText(stage.problem)}</CatchText>
          <CatchStack direction="row" gap={8} wrap>
            {stage.name === "refused" && ["offline", "failed", "app_check", "rate_limited"].includes(stage.problem) ? (
              <CatchButton label={copy.retry} onPressed={controller.read} />
            ) : null}
            <CatchButton href={hostWalkthroughHref} label={words.bookAgain} variant="secondary" />
          </CatchStack>
        </CatchStack>
      );
    case "signIn":
      return <SignInStep controller={controller} focus={focus} />;
    case "ready":
      return <Ready controller={controller} focus={focus} />;
    case "move":
      return <Move controller={controller} focus={focus} />;
    case "cancel":
      return <Cancel controller={controller} focus={focus} />;
  }
}

/**
 * The walkthrough booking's manage page, which the booking's managePath
 * opens (/start/walkthrough/manage?booking=…, with the manage token as
 * #t=… when it comes from the confirmation). It reads the booking, moves it
 * to another open time or cancels it. Pass the URL's search and hash; the
 * token never leaves the fragment except in the call that proves it.
 */
export function WalkthroughManagePage({search, hash}: {search: string; hash: string}) {
  const controller = useWalkthroughManageController({search, hash});
  const focus = useStepFocus(controller.stage.name);
  return (
    <>
      <CatchTopBar homeHref="/" title={brand.name} variant="site" />
      <CatchPageBody as="main" pt="s4">
        <CatchPaneLayout main={<Body controller={controller} focus={focus} />} pattern="reading" />
      </CatchPageBody>
    </>
  );
}
