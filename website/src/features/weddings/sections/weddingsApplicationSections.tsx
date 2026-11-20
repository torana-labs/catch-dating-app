import {
  CatchButton,
  CatchChip,
  CatchField,
  CatchFlowLayout,
  CatchFormStepList,
  CatchGroundCard,
  CatchIcon,
  CatchIndexRow,
  CatchMeter,
  CatchRoot,
  CatchSection,
  CatchStack,
  CatchStepList,
  CatchStepper,
  CatchSurface,
  CatchText,
  CatchTopBar,
  type CatchFormStepListStatus,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {weddingsCopy} from "@content/weddings";
import {weddingsApplyCopy} from "../../../content/weddingsApply";
import {PublicSiteFooter, WebsitePageMain} from "../../../shared/site";
import type {WeddingsApplicationController, WeddingsStepOne} from "../useWeddingsController";
import {firstName, sentSummary, stepTwoContact, stepTwoSummary} from "../weddingsModel";
import {phoneFieldCopy} from "@content/phoneField";
import {activePhoneCountry} from "@content/markets";

const one = weddingsCopy.stepOne;
const two = weddingsCopy.stepTwo;
const sent = weddingsCopy.sent;

/** A labelled row of chips with its error: single choice is a radiogroup, multiple choice a group of pressed toggles. */
function ChipGroup({id, label, options, selected, onPressed, multiple = false, error}: {
  id: string;
  label: string;
  options: readonly string[];
  selected: (option: string) => boolean;
  onPressed: (option: string) => void;
  multiple?: boolean;
  error?: string;
}) {
  return (
    <CatchStack gap={8}>
      <CatchText id={id} variant="label-action">{label}</CatchText>
      <CatchStack aria-labelledby={id} direction="row" gap={8} role={multiple ? "group" : "radiogroup"} wrap>
        {options.map((option) => (
          <CatchChip key={option} kind={multiple ? "filter" : "choice"} label={option} onPressed={() => onPressed(option)} selected={selected(option)} />
        ))}
      </CatchStack>
      {error ? <CatchText role="alert" tone="danger" variant="body-meta">{error}</CatchText> : null}
    </CatchStack>
  );
}

/**
 * Step 1 of the pilot application (RbWebWeddings' pilot band). On the landing
 * its Continue is a link to the application page once the answers are
 * complete; on the application page it moves on to step 2. Missing answers
 * show their errors after Continue is pressed.
 */
export function StepOneCard({stepOne, onContinue, continueHref, idPrefix, titleAs = "h3", bare = false}: {
  stepOne: WeddingsStepOne;
  /** h1 when the card is the page's subject. */
  titleAs?: "h1" | "h3";
  onContinue: () => void;
  continueHref?: string;
  idPrefix: string;
  /** The application page's step 1: the fields alone, as a flow block under the flow's own head and step rail. */
  bare?: boolean;
}) {
  const {draft, update, errors} = stepOne;
  // A plain function, not a component: a component made per render would remount the fields on every change.
  const frame = (children: ReactNode) => bare ? (
    <CatchGroundCard ground="white" outlined padding="spacious"><CatchStack gap={20}>{children}</CatchStack></CatchGroundCard>
  ) : (
    <CatchSurface aria-labelledby={`${idPrefix}-title`} as="section" block="floating" padding="lg">
      <CatchStack align="baseline" direction="row" gap={8} justify="between" wrap>
        <CatchText as={titleAs} id={`${idPrefix}-title`} variant="display-sm">{one.title}</CatchText>
        <CatchText tone="secondary" variant="label-action">{one.step}</CatchText>
      </CatchStack>
      <CatchMeter kind="segments" label={one.step} max={2} thickness={4} value={1} />
      {children}
    </CatchSurface>
  );
  return frame(
    <>
      <ChipGroup error={errors.who} id={`${idPrefix}-who`} label={one.who.label} onPressed={(option) => update("who", option)} options={one.who.options}
        selected={(option) => draft.who === option} />
      <ChipGroup error={errors.what} id={`${idPrefix}-what`} label={one.what.label} onPressed={(option) => update("what", option)} options={one.what.options}
        selected={(option) => draft.what === option} />
      <CatchStack collapseBelow="medium" direction="row" equal gap={12}>
        <CatchField autoComplete="name" errorText={errors.name} inputHint={one.name.hint} onChanged={(value) => update("name", value)} recipe="input" title={one.name.label}
          value={draft.name} />
        <CatchField autoComplete="organization" inputHint={one.company.hint} onChanged={(value) => update("company", value)} recipe="input" title={one.company.label}
          value={draft.company} />
      </CatchStack>
      <CatchField copy={phoneFieldCopy} countryCode={activePhoneCountry} errorText={errors.phone} inputHint={one.phone.hint}
        onChanged={(value) => update("phone", value)} recipe="phone" title={one.phone.label} value={draft.phone} />
      <CatchStack collapseBelow="medium" direction="row" equal gap={12}>
        <CatchField errorText={errors.date} keyboardType="date" onChanged={(value) => update("date", value)} recipe="input" title={one.date.label} value={draft.date} />
        <CatchField errorText={errors.destination} inputHint={one.destination.hint} onChanged={(value) => update("destination", value)} recipe="input"
          title={one.destination.label} value={draft.destination} />
      </CatchStack>
      <ChipGroup error={errors.guests} id={`${idPrefix}-guests`} label={one.guests.label} onPressed={(option) => update("guests", option)} options={one.guests.options}
        selected={(option) => draft.guests === option} />
      <ChipGroup id={`${idPrefix}-tools`} label={one.tools.label} multiple onPressed={stepOne.toggleTool} options={one.tools.options}
        selected={(option) => draft.tools.includes(option)} />
      <CatchButton fill href={stepOne.complete ? continueHref : undefined} label={one.continue} onPressed={onContinue} trailingIcon="forward" />
      <CatchText tone="secondary" variant="body-small">{one.reply}</CatchText>
    </>,
  );
}

function Counter({title, subtitle, unit, min, max, value, onChanged}: {
  title: string;
  subtitle: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  onChanged: (value: number) => void;
}) {
  return (
    <CatchIndexRow subtitle={subtitle} title={title} wrap
      trailing={<CatchStepper decreaseSemanticLabel={fill(two.fewer, {unit})} increaseSemanticLabel={fill(two.more, {unit})} max={max} min={min}
        onChanged={onChanged} value={value} />} />
  );
}

/** Step 2's form (RbWebWeddingsApply): the shape of the weekend, then Send. */
function StepTwoForm({application}: {application: WeddingsApplicationController}) {
  const {stepTwo, updateStepTwo, stepTwoErrors: errors} = application;
  return (
    <CatchGroundCard aria-labelledby="weddings-step-two-form" as="section" ground="white" outlined padding="spacious">
      <CatchStack gap={20}>
      <CatchText as="h2" id="weddings-step-two-form" variant="display-sm">{two.title}</CatchText>
      <CatchSection container="tile" dividers="between">
        <Counter max={two.functions.max} min={two.functions.min} onChanged={(value) => updateStepTwo("functions", value)}
          subtitle={two.functions.subtitle} title={two.functions.title} unit={two.functions.one} value={stepTwo.functions} />
        <Counter max={two.hotels.max} min={two.hotels.min} onChanged={(value) => updateStepTwo("hotels", value)}
          subtitle={two.hotels.subtitle} title={two.hotels.title} unit={two.hotels.one} value={stepTwo.hotels} />
        <Counter max={two.team.max} min={two.team.min} onChanged={(value) => updateStepTwo("team", value)}
          subtitle={two.team.subtitle} title={two.team.title} unit={two.team.one} value={stepTwo.team} />
      </CatchSection>
      <ChipGroup error={errors.flying} id="weddings-flying" label={two.flying.label} onPressed={(option) => updateStepTwo("flying", option)} options={two.flying.options}
        selected={(option) => stepTwo.flying === option} />
      <ChipGroup error={errors.wants} id="weddings-wants" label={two.wants.label} multiple onPressed={application.toggleWant} options={two.wants.options}
        selected={(option) => stepTwo.wants.includes(option)} />
      <CatchField errorText={errors.lastTime} helperText={fill(two.lastTime.count, {length: stepTwo.lastTime.length, max: two.lastTime.max})} inputHint={two.lastTime.hint}
        maxLines={4} onChanged={(value) => updateStepTwo("lastTime", value)} recipe="input" title={two.lastTime.label} value={stepTwo.lastTime} />
      <ChipGroup error={errors.heard} id="weddings-heard" label={two.heard.label} onPressed={(option) => updateStepTwo("heard", option)} options={two.heard.options}
        selected={(option) => stepTwo.heard === option} />
      <CatchStack collapseBelow="medium" direction="row" gap={8} justify="end">
        <CatchButton label={two.back} onPressed={application.changeStepOne} variant="secondary" />
        <CatchButton label={two.send} onPressed={application.canSend ? () => void application.send() : null} status={application.sending ? "loading" : "idle"} />
      </CatchStack>
      {application.error ? <CatchText role="alert" tone="danger" variant="body-small">{application.error}</CatchText> : null}
      <CatchText tone="secondary" variant="body-small">{two.consent}</CatchText>
      </CatchStack>
    </CatchGroundCard>
  );
}

/** After Send: the thanks, what was sent, and the way back. */
function SentCard({application}: {application: WeddingsApplicationController}) {
  return (
    <CatchGroundCard aria-labelledby="weddings-sent-title" aria-live="polite" as="section" ground="white" outlined padding="spacious">
      <CatchStack gap={20}>
      <CatchStack align="center" direction="row" gap={8}>
        <CatchIcon label={sent.badge} name="success" size={24} />
        <CatchText tone="success" variant="label-action">{sent.badge}</CatchText>
      </CatchStack>
      <CatchText as="h2" id="weddings-sent-title" variant="display-lg">{fill(sent.title, {name: firstName(application.stepOne.draft.name)})}</CatchText>
      <CatchText variant="body-lead">{sent.body}</CatchText>
      <CatchSurface block="tile" padding="md">
        <CatchText tone="secondary" variant="label-kicker">{sent.summaryTitle}</CatchText>
        <CatchText variant="body">{sentSummary(application.stepTwo)}</CatchText>
      </CatchSurface>
      <CatchStack direction="row" gap={8} wrap>
        <CatchButton href="/weddings/" label={sent.back} />
        <CatchButton href="/weddings/#follow" label={sent.follow} variant="secondary" />
      </CatchStack>
      <CatchStack align="start"><CatchButton label={sent.edit} onPressed={application.reopen} size="sm" variant="quiet" /></CatchStack>
      </CatchStack>
    </CatchGroundCard>
  );
}

/** The application's progress on the board's rail: step 1, then step 2. */
function ApplicationSteps({current}: {current: number}) {
  const status = (value: CatchFormStepListStatus) => weddingsApplyCopy.stepStatus[value];
  return <CatchFormStepList current={current} direction="row" label={weddingsApplyCopy.stepsLabel} statusLabelBuilder={status}
    items={weddingsApplyCopy.steps.map((title, index) => ({index, title, status: index < current ? "complete" : "needsInformation"}))} />;
}

/** Step 2 and the sent state as flow blocks: the summary, the form or the thanks, then what happens next. */
function StepTwoPage({application}: {application: WeddingsApplicationController}) {
  const done = application.stage === "sent";
  return (
    <CatchFlowLayout kicker={done ? sent.kicker : two.kicker} kickerTone="info"
      navigation={done ? undefined : <ApplicationSteps current={1} />} title={done ? sent.heading : two.heading}>
      <CatchGroundCard ground="white" outlined>
        <CatchStack gap={4}>
          <CatchText tone="secondary" variant="label-kicker">{two.yours}</CatchText>
          <CatchText variant="title-row">{stepTwoSummary(application.stepOne.draft)}</CatchText>
          <CatchText tone="secondary" variant="body-small">{stepTwoContact(application.stepOne.draft)}</CatchText>
          <CatchStack align="start">
            <CatchButton label={two.change} leadingIcon="back" onPressed={application.changeStepOne} size="sm" variant="quiet" />
          </CatchStack>
        </CatchStack>
      </CatchGroundCard>
      {done ? <SentCard application={application} /> : <StepTwoForm application={application} />}
      <CatchGroundCard ground="white" outlined>
        <CatchStack gap={16}>
          <CatchText as="h2" variant="display-sm">{two.nextTitle}</CatchText>
          <CatchStepList steps={two.next} />
        </CatchStack>
      </CatchGroundCard>
    </CatchFlowLayout>
  );
}

/**
 * The application on the LiveWeddingsApply board: the kit's flow with its
 * step rail, at step 1 if the landing did not hand it over, step 2, or sent.
 */
export function WeddingsApplicationView({application}: {application: WeddingsApplicationController}) {
  return (
    <CatchRoot format="nightsOut" theme="day">
      <CatchTopBar homeHref="/weddings/" links={[{label: sent.back, href: "/weddings/"}]} linksLabel={weddingsCopy.header.title} title={weddingsCopy.header.title}
        variant="site" />
      <WebsitePageMain id="top">
        {application.stage === "stepOne" ? (
          <CatchFlowLayout kicker={one.step} kickerTone="info" navigation={<ApplicationSteps current={0} />} title={one.title}>
            <StepOneCard bare idPrefix="weddings-apply-one" onContinue={application.continueToStepTwo} stepOne={application.stepOne} />
          </CatchFlowLayout>
        ) : <StepTwoPage application={application} />}
      </WebsitePageMain>
      <PublicSiteFooter tagline={weddingsCopy.foot.body} variant="host" wordmark={weddingsCopy.foot.title} />
    </CatchRoot>
  );
}
