import {
  CatchButton,
  CatchConsentNote,
  CatchField,
  CatchGroundCard,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchSection,
  CatchStack,
  CatchText,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {walkthroughBookingCopy as copy} from "@content/walkthroughBooking";
import type {PlaybookLeadForm} from "../../content/playbook/playbookContract";
import {Form} from "../../shared/ui/primitives";
import {SignInSheetView} from "../account/SignInSheet";
import {useSignInSheetController} from "../account/useSignInSheetController";
import {useWalkthroughBookingController, type WalkthroughBookingController} from "./useWalkthroughBookingController";
import {useStepFocus, walkthroughSlotGridNode} from "./WalkthroughSlotGrid";
import {
  walkthroughDayOf,
  walkthroughIndiaTime,
  walkthroughLocalTime,
  walkthroughManageHref,
  walkthroughManagePageLive,
  type WalkthroughProblem,
} from "./walkthroughModel";

const noop = () => undefined;

/** The words for a refused booking. */
export function walkthroughProblemText(problem: WalkthroughProblem): string {
  const words = copy.problems;
  switch (problem) {
    case "slot_taken": return words.slotTaken;
    case "slot_unavailable": return words.slotUnavailable;
    case "booking_closed": return words.bookingClosed;
    case "has_upcoming_booking": return words.hasUpcoming;
    case "phone": return words.phone;
    case "phone_mismatch": return words.phoneMismatch;
    case "invalid": return words.invalid;
    case "rate_limited": return words.rateLimited;
    case "app_check": return words.appCheck;
    case "not_configured": return words.notConfigured;
    case "offline": return words.offline;
    case "not_found": return copy.manage.problems.notFound;
    case "not_yours": return copy.manage.problems.notYours;
    case "slot_started": return copy.manage.problems.slotStarted;
    case "booking_cancelled": return copy.manage.problems.bookingCancelled;
    case "too_many_changes": return copy.manage.problems.tooManyChanges;
    case "request_changed":
    case "failed": return words.failed;
  }
}

/** "Wed 18 Nov, 4:00 PM IST" for a slot start, from its day's label. */
function slotWhen(dayLabel: string, startAt: string): string {
  return fill(copy.chosen, {day: dayLabel, time: walkthroughIndiaTime(startAt)});
}

function Heading({text, focus}: {text: string; focus: string}) {
  return <CatchText as="h2" id={focus} tabIndex={-1} variant="title-bar">{text}</CatchText>;
}

function PickStep({controller, focus}: {controller: WalkthroughBookingController; focus: string}) {
  const {slots} = controller;
  if (!slots) return null;
  return (
    <Form aria-label={copy.title} noValidate onSubmit={controller.continueToDetails}>
      <CatchStack gap={16}>
        <Heading focus={focus} text={copy.title} />
        {controller.notice ? <CatchText as="p" role="alert" variant="body">{controller.notice}</CatchText> : null}
        {walkthroughSlotGridNode({day: controller.day, onDay: controller.pickDay, onSlot: controller.pickSlot, slotStartAt: controller.slotStartAt,
          slots, timeZone: controller.timeZone})}
        <CatchStack align="start">
          <CatchButton label={copy.continue} onPressed={noop} type="submit" />
        </CatchStack>
      </CatchStack>
    </Form>
  );
}

function UpcomingLink({managePath}: {managePath: string | null}) {
  if (walkthroughManagePageLive && managePath) {
    return <CatchStack align="start"><CatchButton href={managePath} label={copy.done.manage} size="sm" variant="secondary" /></CatchStack>;
  }
  return <CatchText as="p" tone="secondary" variant="body-small">{copy.done.changeOnWhatsapp}</CatchText>;
}

function DetailsStep({controller, focus}: {controller: WalkthroughBookingController; focus: string}) {
  const sheet = useSignInSheetController({onSignedIn: () => void controller.signedIn()});
  const {slotStartAt} = controller;
  const day = walkthroughDayOf(controller.slots, slotStartAt);
  if (!slotStartAt || !day) return null;
  const local = walkthroughLocalTime(slotStartAt, controller.timeZone);
  const verified = Boolean(controller.phone);
  const inputMode = controller.busy ? "inactive" : "editable";
  const button = (
    <CatchButton label={verified ? copy.phone.book : copy.phone.confirmAndBook} onPressed={noop}
      status={controller.busy ? "loading" : "idle"} type="submit" />
  );
  return (
    <CatchStack gap={16}>
      <Heading focus={focus} text={copy.details.title} />
      <CatchStack gap={4}>
        <CatchSection container="tile">
          <CatchIndexRow density="compact" title={slotWhen(day.label, slotStartAt)} wrap
            subtitle={local && controller.timeZone ? fill(copy.localTime, {local, zone: controller.timeZone}) : undefined} />
        </CatchSection>
        <CatchStack align="start">
          <CatchButton label={copy.changeTime} onPressed={controller.busy ? null : controller.changeTime} size="sm" variant="quiet" />
        </CatchStack>
      </CatchStack>
      <Form aria-label={copy.details.title} noValidate onSubmit={controller.submitDetails} pending={controller.busy}>
        <CatchStack gap={12}>
          {controller.fields.map((field) => (
            <CatchField autoComplete={field.name === "name" ? "name" : field.name === "orgName" ? "organization" : "off"}
              errorText={controller.fieldErrors[field.name] ?? null} inputHint={field.placeholder} inputMode={inputMode} key={field.name}
              labelMode="visible" onChanged={controller.setAnswer(field.name)} recipe="input" required title={field.label}
              value={controller.answers[field.name] ?? ""} />
          ))}
          <CatchText as="p" tone="secondary" variant="body-small">
            {verified ? fill(copy.phone.bookingFor, {phone: controller.phone ?? ""}) : copy.phone.lead}
          </CatchText>
          <CatchStack align="start">
            {/* The sheet stays mounted once the number is confirmed, so the read that confirms it never moves focus out of a field. */}
            <SignInSheetView onClose={() => {sheet.reset(); controller.closeSignIn();}} open={controller.signIn && !verified} sheet={sheet} trigger={button} />
          </CatchStack>
          <CatchConsentNote href="/privacy/" linkLabel={playbookCopy.leadForm.privacy} text={playbookCopy.leadForm.consent} />
        </CatchStack>
      </Form>
      {controller.problem ? (
        <CatchStack gap={8} role="alert">
          <CatchText as="p" variant="body">{walkthroughProblemText(controller.problem.problem)}</CatchText>
          {controller.problem.problem === "has_upcoming_booking" ? <UpcomingLink managePath={controller.problem.managePath} /> : null}
        </CatchStack>
      ) : null}
    </CatchStack>
  );
}

function DoneStep({stage, controller, focus}: {
  stage: Extract<WalkthroughBookingController["stage"], {name: "done"}>;
  controller: WalkthroughBookingController;
  focus: string;
}) {
  const {booking} = stage;
  const local = walkthroughLocalTime(booking.slot.startAt, controller.timeZone);
  const day = walkthroughDayOf(controller.slots, booking.slot.startAt);
  const when = day ? slotWhen(day.label, booking.slot.startAt) : booking.slot.label;
  return (
    <CatchStack gap={12}>
      <Heading focus={focus} text={fill(copy.done.title, {when})} />
      {local && controller.timeZone ? <CatchText as="p" tone="secondary" variant="body">{fill(copy.localTime, {local, zone: controller.timeZone})}</CatchText> : null}
      <CatchText as="p" variant="label-action">{copy.done.next}</CatchText>
      <CatchText as="p" variant="body">{fill(copy.done.confirm, {phone: stage.phone ?? ""})}</CatchText>
      {walkthroughManagePageLive ? (
        <CatchStack align="start" gap={8}>
          <CatchText as="p" tone="secondary" variant="body">{copy.done.manageLead}</CatchText>
          <CatchButton href={walkthroughManageHref(booking.managePath, stage.manageToken)} label={copy.done.manage} variant="secondary" />
        </CatchStack>
      ) : <CatchText as="p" tone="secondary" variant="body">{copy.done.changeOnWhatsapp}</CatchText>}
    </CatchStack>
  );
}

function unavailableText(reason: "noSlots" | "bookingClosed" | "loadFailed"): string {
  return copy.problems[reason];
}

function WalkthroughBooking({form, fallback}: {form: PlaybookLeadForm; fallback: ReactNode}) {
  const controller = useWalkthroughBookingController(form);
  const {stage} = controller;
  const focus = useStepFocus(stage.name);
  if (stage.name === "unavailable") {
    return (
      <CatchStack gap={12}>
        <CatchStack align="start" gap={8} role="status">
          <CatchText as="p" variant="body">{unavailableText(stage.reason)}</CatchText>
          {stage.reason === "loadFailed" ? <CatchButton label={copy.retry} onPressed={controller.load} size="sm" variant="secondary" /> : null}
        </CatchStack>
        {fallback}
      </CatchStack>
    );
  }
  return (
    <CatchGroundCard ground="white" outlined>
      {stage.name === "loading" ? (
        <CatchStack align="center" direction="row" gap={12} role="status">
          <CatchLoadingIndicator label={copy.loading} />
          <CatchText as="p" variant="body">{copy.loading}</CatchText>
        </CatchStack>
      ) : null}
      {stage.name === "pick" ? <PickStep controller={controller} focus={focus} /> : null}
      {stage.name === "details" ? <DetailsStep controller={controller} focus={focus} /> : null}
      {stage.name === "done" ? <DoneStep controller={controller} focus={focus} stage={stage} /> : null}
    </CatchGroundCard>
  );
}

/**
 * The walkthrough page's booking in its lead form's place: the open slots
 * by day in India time, the visitor's details and code-verified WhatsApp
 * number, then the booking and what happens next. When no slot can be
 * booked (none open, booking closed, or the slots could not be read) it says
 * so and shows `fallback`, the page's request form. Keyed by page, band and
 * form, so each starts afresh.
 */
export function walkthroughBookingNode(props: {form: PlaybookLeadForm; pageId: string; sectionId: string; fallback: ReactNode}): ReactNode {
  return <WalkthroughBooking fallback={props.fallback} form={props.form} key={`${props.pageId}-${props.sectionId}-${props.form.id}`} />;
}
