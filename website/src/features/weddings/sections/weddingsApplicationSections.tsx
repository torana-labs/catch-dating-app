import {
  CatchBadge,
  CatchButton,
  CatchChip,
  CatchField,
  CatchIcon,
  CatchIndexRow,
  CatchPageBody,
  CatchPaneLayout,
  CatchRoot,
  CatchSection,
  CatchStack,
  CatchStepper,
  CatchSurface,
  CatchText,
  CatchTopBar,
} from "@catch/web-ui";
import {interpolateContent as fill} from "@content/interpolate";
import {weddingsCopy} from "@content/weddings";
import type {WeddingsApplicationController, WeddingsStepOne} from "../useWeddingsController";
import {firstName, stepTwoSummary} from "../weddingsModel";

const one = weddingsCopy.stepOne;
const two = weddingsCopy.stepTwo;

/** A labelled row of chips: single choice is a radiogroup, multiple choice a group of pressed toggles. */
function ChipGroup({id, label, options, selected, onPressed, multiple = false, size}: {
  id: string;
  label: string;
  options: readonly string[];
  selected: (option: string) => boolean;
  onPressed: (option: string) => void;
  multiple?: boolean;
  size?: "sm";
}) {
  return (
    <CatchStack gap={8}>
      <CatchText id={id} variant="label-action">{label}</CatchText>
      <CatchStack aria-labelledby={id} direction="row" gap={size ? 6 : 8} role={multiple ? "group" : "radiogroup"} wrap>
        {options.map((option) => (
          <CatchChip key={option} kind={multiple ? "filter" : "choice"} label={option} onPressed={() => onPressed(option)} selected={selected(option)} size={size} />
        ))}
      </CatchStack>
    </CatchStack>
  );
}

/**
 * Step 1 of the pilot application. On the landing its Continue is a link to
 * the application page that first hands the answers over; on the application
 * page it moves on to step 2.
 */
export function StepOneCard({stepOne, onContinue, continueHref, idPrefix}: {
  stepOne: WeddingsStepOne;
  onContinue: () => void;
  continueHref?: string;
  idPrefix: string;
}) {
  const {draft, update} = stepOne;
  return (
    <CatchSurface aria-labelledby={`${idPrefix}-title`} as="section" block="floating">
      <CatchStack align="center" direction="row" justify="between">
        <CatchText as="h3" id={`${idPrefix}-title`} variant="display-sm">{one.title}</CatchText>
        <CatchText tone="secondary" variant="label-kicker">{one.step}</CatchText>
      </CatchStack>
      <CatchStack direction="row" equal gap={8}>
        <CatchField autoComplete="name" inputHint={one.name.hint} onChanged={(value) => update("name", value)} recipe="input" title={one.name.label} value={draft.name} />
        <CatchField autoComplete="organization" inputHint={one.company.hint} onChanged={(value) => update("company", value)} recipe="input" title={one.company.label}
          value={draft.company} />
      </CatchStack>
      <CatchField autoComplete="tel-national" inputHint={one.phone.hint} keyboardType="phone" onChanged={(value) => update("phone", value)} prefixText={one.phone.prefix}
        recipe="input" title={one.phone.label} value={draft.phone} />
      <CatchStack direction="row" equal gap={8}>
        <CatchField keyboardType="date" onChanged={(value) => update("date", value)} recipe="input" title={one.date.label} value={draft.date} />
        <CatchField inputHint={one.destination.hint} onChanged={(value) => update("destination", value)} recipe="input" title={one.destination.label} value={draft.destination} />
      </CatchStack>
      <ChipGroup id={`${idPrefix}-guests`} label={one.guests.label} onPressed={(option) => update("guests", option)} options={one.guests.options}
        selected={(option) => draft.guests === option} />
      <ChipGroup id={`${idPrefix}-tools`} label={one.tools.label} multiple onPressed={stepOne.toggleTool} options={one.tools.options}
        selected={(option) => draft.tools.includes(option)} />
      <CatchButton fill href={continueHref} label={one.continue} onPressed={stepOne.complete ? onContinue : null} />
      <CatchText tone="secondary" variant="body-small">{one.reply}</CatchText>
    </CatchSurface>
  );
}

function Counter({title, subtitle, unit, min, max, value, onChanged}: {
  title: string;
  subtitle?: string;
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

/** Step 2 (RbWebWeddingsApply): the shape of the weekend, then Send. */
function StepTwo({application}: {application: WeddingsApplicationController}) {
  const {stepTwo, updateStepTwo} = application;
  return (
    <CatchStack aria-labelledby="weddings-step-two-title" as="section" gap={20}>
      <CatchStack gap={6}>
        <CatchText tone="secondary" variant="label-kicker">{two.step}</CatchText>
        <CatchText as="h1" id="weddings-step-two-title" variant="page-title">{two.title}</CatchText>
        <CatchText tone="secondary" variant="body-small">{stepTwoSummary(application.stepOne.draft)}</CatchText>
      </CatchStack>
      <CatchSection container="tile">
        <Counter max={two.functions.max} min={two.functions.min} onChanged={(value) => updateStepTwo("functions", value)}
          subtitle={two.functions.subtitle} title={two.functions.title} unit={two.functions.unit} value={stepTwo.functions} />
        <Counter max={two.hotels.max} min={two.hotels.min} onChanged={(value) => updateStepTwo("hotels", value)}
          title={two.hotels.title} unit={two.hotels.unit} value={stepTwo.hotels} />
        <Counter max={two.team.max} min={two.team.min} onChanged={(value) => updateStepTwo("team", value)}
          subtitle={two.team.subtitle} title={two.team.title} unit={two.team.unit} value={stepTwo.team} />
      </CatchSection>
      <ChipGroup id="weddings-flying" label={two.flying.label} onPressed={(option) => updateStepTwo("flying", option)} options={two.flying.options}
        selected={(option) => stepTwo.flying === option} size="sm" />
      <ChipGroup id="weddings-wants" label={two.wants.label} multiple onPressed={application.toggleWant} options={two.wants.options}
        selected={(option) => stepTwo.wants.includes(option)} size="sm" />
      <CatchField inputHint={two.lastTime.hint} maxLength={1000} maxLines={3} onChanged={(value) => updateStepTwo("lastTime", value)} recipe="input"
        title={two.lastTime.label} value={stepTwo.lastTime} />
      <CatchField itemLabelBuilder={(item) => item} onChanged={(value) => updateStepTwo("heard", value ?? two.heard.initial)} recipe="select" title={two.heard.label}
        value={stepTwo.heard} values={two.heard.options} />
      <CatchButton fill label={two.send} onPressed={application.canSend ? () => void application.send() : null} status={application.sending ? "loading" : "idle"} />
      {application.error ? <CatchText role="alert" tone="danger" variant="body-small">{application.error}</CatchText> : null}
      <CatchText tone="secondary" variant="body-small">{two.reply}</CatchText>
    </CatchStack>
  );
}

/** After Send: the thanks tile and what happens next. */
function Sent({name}: {name: string}) {
  const sent = weddingsCopy.sent;
  return (
    <CatchStack aria-labelledby="weddings-sent-title" aria-live="polite" as="section" gap={20}>
      <CatchSurface block="tile">
        <CatchStack align="start"><CatchBadge icon={<CatchIcon name="check" size={16} />} label={sent.badge} tone="success" /></CatchStack>
        <CatchText as="h1" id="weddings-sent-title" variant="display-title">{fill(sent.title, {name: firstName(name)})}</CatchText>
        <CatchText variant="body">{sent.body}</CatchText>
      </CatchSurface>
      <CatchSection title={sent.nextTitle}>
        {sent.next.map((step, index) => <CatchIndexRow density="compact" key={step.title} rank={index + 1} subtitle={step.body} title={step.title} wrap />)}
      </CatchSection>
    </CatchStack>
  );
}

/** The application's current stage: step 1 if the landing did not hand it over, step 2, or sent. */
export function WeddingsApplicationView({application}: {application: WeddingsApplicationController}) {
  return (
    <CatchRoot format="nightsOut" theme="day">
      <CatchTopBar homeHref="/weddings/" title={weddingsCopy.header.title} variant="site" />
      <CatchPageBody as="main" gutter={false} pb="s0" pt="s4">
        <CatchPaneLayout
          main={application.stage === "sent" ? <Sent name={application.stepOne.draft.name} /> :
            application.stage === "stepTwo" ? <StepTwo application={application} /> :
            <StepOneCard idPrefix="weddings-apply" onContinue={application.continueToStepTwo} stepOne={application.stepOne} />}
          pattern="reading"
        />
      </CatchPageBody>
    </CatchRoot>
  );
}
