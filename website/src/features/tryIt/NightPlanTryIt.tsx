import {
  CatchBadge,
  CatchButton,
  CatchField,
  CatchGroundCard,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchQrCode,
  CatchSection,
  CatchStack,
  CatchText,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {nightPlanFormats, nightPlanTryItCopy as copy, type NightPlanFormat} from "@content/nightPlanTryIt";
import {tryItCopy} from "@content/tryIt";
import type {PlaybookLeadForm} from "../../content/playbook/playbookContract";
import type {TryItProblem} from "../../shared/api/tryItCommands";
import {Form} from "../../shared/ui/primitives";
import {SignInSheetView} from "../account/SignInSheet";
import {useSignInSheetController} from "../account/useSignInSheetController";
import {tryItCities} from "./tryItModel";
import type {NightFieldProblem, NightPlanFlowState, NightPlanShown, NightStage} from "./nightPlanFlow";
import {
  nightPlanCapacityLine,
  nightPlanGroupLines,
  nightPlanHeadline,
  nightPlanMissions,
  nightPlanMixingLine,
  nightPlanRunOfShow,
} from "./nightPlanModel";
import {useNightPlanController, type NightPlanController} from "./useNightPlanController";

const noop = () => undefined;

function fieldText(problem: NightFieldProblem | undefined): string | null {
  if (!problem) return null;
  if (problem === "brandRequired" || problem === "cityRequired") return tryItCopy.account[problem];
  return copy[problem];
}

/** A problem in the night tool's words where the shared list words it for a link. */
function problemText(problem: TryItProblem): string {
  return problem === "invalid" || problem === "not_allowed" ? copy.problems[problem] : tryItCopy.problems[problem];
}

function StartStep({controller, form}: {controller: NightPlanController; form: PlaybookLeadForm}) {
  const {state, flow} = controller;
  const inputMode = state.busy ? "inactive" : "editable";
  return (
    <CatchStack gap={12}>
      <Form aria-label={copy.title} noValidate onSubmit={controller.submit} pending={state.busy !== null}>
        <CatchStack gap={12}>
          <CatchField<NightPlanFormat> errorText={fieldText(state.fields.format)} hintText={copy.formatHint} inputMode={inputMode}
            itemLabelBuilder={(format) => copy.formatLabels[format]} labelMode="visible" onChanged={flow.setFormat} recipe="select" required
            title={form.label} value={state.format} values={nightPlanFormats} />
          <CatchField errorText={fieldText(state.fields.guests)} inputHint={copy.guestsHint} inputMode={inputMode} keyboardType="number"
            labelMode="visible" onChanged={flow.setGuests} recipe="input" required title={copy.guests} value={state.guests} />
          <CatchStack align="start">
            <CatchButton label={form.submitLabel} onPressed={noop} status={state.busy ? "loading" : "idle"} type="submit" />
          </CatchStack>
        </CatchStack>
      </Form>
      <CatchText as="p" tone="secondary" variant="body-meta">{form.note ?? tryItCopy.private}</CatchText>
    </CatchStack>
  );
}

function AccountStep({controller}: {controller: NightPlanController}) {
  const {state, flow} = controller;
  const sheet = useSignInSheetController({onSignedIn: () => void flow.signedIn()});
  const account = tryItCopy.account;
  const verified = Boolean(state.caller?.phoneNumber);
  const cities = tryItCities();
  const inputMode = state.busy ? "inactive" : "editable";
  const button = (
    <CatchButton label={verified ? account.continue : account.continueWithPhone} onPressed={noop} status={state.busy ? "loading" : "idle"} type="submit" />
  );
  return (
    <Form aria-label={account.title} noValidate onSubmit={controller.continueAccount} pending={state.busy !== null}>
      <CatchStack gap={12}>
        <CatchText as="h3" variant="display-xs">{account.title}</CatchText>
        <CatchText as="p" tone="secondary" variant="body">{verified ? account.signedInLead : account.lead}</CatchText>
        <CatchField autoComplete="organization" errorText={fieldText(state.fields.brand)} inputHint={account.brandHint} inputMode={inputMode}
          labelMode="visible" onChanged={flow.setBrand} recipe="input" required title={account.brand} value={state.brand} />
        <CatchField<string> errorText={fieldText(state.fields.city)} hintText={account.cityHint} inputMode={inputMode}
          itemLabelBuilder={(id) => cities.find((city) => city.id === id)?.label ?? id} labelMode="visible" onChanged={flow.setCity}
          recipe="select" required title={account.city} value={state.cityId} values={cities.map((city) => city.id)} />
        {verified ? <CatchText as="p" tone="secondary" variant="body-small">{fill(account.signedInAs, {phone: state.caller?.phoneNumber ?? ""})}</CatchText> : null}
        <CatchStack align="start">
          {verified ? button : <SignInSheetView onClose={() => {sheet.reset(); flow.closeSignIn();}} open={state.signIn} sheet={sheet} trigger={button} />}
        </CatchStack>
        <CatchText as="p" tone="secondary" variant="body-meta">{tryItCopy.private}</CatchText>
      </CatchStack>
    </Form>
  );
}

/** The plan as night.plan answered it: groups, the mixing moment, the run of show and the missions. */
function PlanDetails({shown}: {shown: NightPlanShown}) {
  const {plan} = shown;
  const groups = nightPlanGroupLines(plan);
  const runOfShow = nightPlanRunOfShow(plan);
  const missions = nightPlanMissions(plan);
  const labels = groups.labels.length ?
    [groups.labels.join(" · "), groups.moreLabels ? fill(copy.groups.more, {count: String(groups.moreLabels)}) : ""].filter(Boolean).join(" ") : undefined;
  return (
    <CatchStack gap={12}>
      <CatchStack aria-live="polite" gap={4} role="status">
        <CatchText as="h3" variant="display-xs">{nightPlanHeadline(plan)}</CatchText>
        <CatchText as="p" tone="secondary" variant="body">{nightPlanCapacityLine(plan)}</CatchText>
      </CatchStack>
      <CatchSection container="tile" title={copy.groups.title}>
        <CatchIndexRow body={labels} density="compact" title={groups.title} wrap />
        {groups.notes.map((note) => <CatchIndexRow density="compact" key={note} title={note} wrap />)}
        {groups.limited ? <CatchIndexRow density="compact" title={groups.limited} wrap /> : null}
      </CatchSection>
      <CatchSection container="tile" title={copy.mixing.title}>
        <CatchIndexRow density="compact" title={nightPlanMixingLine(plan)} wrap />
      </CatchSection>
      <CatchSection container="tile" title={copy.runOfShow.title}>
        {runOfShow.steps.map((step) => <CatchIndexRow density="compact" key={step.stage} title={step.label} value={step.minutes} />)}
        <CatchIndexRow density="compact" title={runOfShow.total} />
      </CatchSection>
      {missions.length ? (
        <CatchSection container="tile" title={missions.length === 3 ? copy.missions.title : copy.missions.titleSome}>
          {missions.map((mission) => <CatchIndexRow body={mission.body} density="compact" key={mission.promptId} title={mission.title} wrap />)}
        </CatchSection>
      ) : null}
    </CatchStack>
  );
}

function refusalLines(reasons: readonly string[], summary: {lines: readonly string[]}): string[] {
  const refusals: Readonly<Record<string, string>> = copy.save.refusals;
  const known = reasons.filter((reason) => Object.hasOwn(refusals, reason)).map((reason) => refusals[reason]);
  return known.length ? known : [...summary.lines];
}

function Rehearsal({state, controller, shown}: {state: NightPlanFlowState; controller: NightPlanController; shown: NightPlanShown}) {
  const {rehearsal} = state;
  if (rehearsal.name === "ready") {
    return (
      <CatchStack aria-live="polite" gap={12} role="status">
        <CatchText as="h3" variant="display-xs">{copy.rehearsal.readyTitle}</CatchText>
        <CatchText as="p" tone="secondary" variant="body">{copy.rehearsal.readyLead}</CatchText>
        <CatchStack align="start" gap={12}>
          <CatchQrCode label={copy.rehearsal.qr} size="m" value={rehearsal.guestUrl} />
          <CatchButton href={rehearsal.guestUrl} label={copy.rehearsal.open} size="sm" variant="secondary" />
        </CatchStack>
        <CatchText as="p" tone="secondary" variant="body-small">{copy.rehearsal.sameAsHosts}</CatchText>
      </CatchStack>
    );
  }
  if (!shown.organizerId || !shown.rehearsalSetup) return null;
  const problem = rehearsal.name === "problem" ? rehearsal.problem : null;
  return (
    <CatchStack align="start" gap={8}>
      <CatchText as="p" variant="body">{copy.rehearsal.lead}</CatchText>
      <CatchButton label={copy.rehearsal.action} onPressed={state.busy ? null : () => void controller.flow.tryWithFriend()}
        status={state.busy === "rehearsal" ? "loading" : "idle"} />
      {problem ? (
        <CatchText as="p" role="alert" tone="secondary" variant="body-small">
          {problem === "rate_limited" || problem === "not_allowed" ? copy.rehearsal.problems[problem] : problemText(problem)}
        </CatchText>
      ) : null}
    </CatchStack>
  );
}

function Save({state, controller}: {state: NightPlanFlowState; controller: NightPlanController}) {
  const {save, draft} = state;
  if (!draft) return null;
  if (save.name === "saved") {
    return (
      <CatchStack aria-live="polite" gap={4} role="status">
        <CatchText as="h3" variant="display-xs">{fill(copy.save.saved, {name: draft.name})}</CatchText>
        <CatchText as="p" tone="secondary" variant="body">{fill(copy.save.savedLead, {phone: state.caller?.phoneNumber ?? ""})}</CatchText>
      </CatchStack>
    );
  }
  const lines = save.name === "refused" ? refusalLines(save.reasons, save.summary) : save.name === "problem" ? [problemText(save.problem)] : [];
  return (
    <CatchStack align="start" gap={8}>
      <CatchText as="p" variant="body">{fill(copy.save.lead, {name: draft.name})}</CatchText>
      <CatchButton label={copy.save.action} onPressed={state.busy ? null : () => void controller.flow.save()}
        status={state.busy === "save" ? "loading" : "idle"} variant="secondary" />
      {lines.length ? (
        <CatchStack aria-live="assertive" gap={4} role="alert">
          {lines.map((line) => <CatchText as="p" key={line} tone="secondary" variant="body-small">{line}</CatchText>)}
        </CatchStack>
      ) : null}
    </CatchStack>
  );
}

function PlanStep({controller, shown}: {controller: NightPlanController; shown: NightPlanShown}) {
  const {state, flow} = controller;
  // A refused answer that still carries the plan (no draft event, a different activity) says why under it.
  const refused = shown.status === "refused" && state.save.name === "idle" ? refusalLines(shown.reasons, shown.summary) : [];
  return (
    <CatchStack gap={16}>
      <PlanDetails shown={shown} />
      {refused.map((line) => <CatchText as="p" key={line} tone="secondary" variant="body">{line}</CatchText>)}
      <Rehearsal controller={controller} shown={shown} state={state} />
      <Save controller={controller} state={state} />
      <CatchStack align="start"><CatchButton label={copy.startOver} onPressed={state.busy ? null : flow.startOver} variant="quiet" /></CatchStack>
    </CatchStack>
  );
}

function ProblemStep({controller, stage}: {controller: NightPlanController; stage: Extract<NightStage, {name: "problem"}>}) {
  const {state, flow} = controller;
  const retriable = !["invalid", "refused", "market_not_open", "multiple_organizers", "not_configured", "not_allowed"].includes(stage.reason);
  const [headline, ...lines] = stage.reason === "refused" ?
    (stage.summary ? [stage.summary.headline, ...stage.summary.lines] : [tryItCopy.problems.failed]) : [problemText(stage.reason)];
  return (
    <CatchStack gap={12}>
      <CatchStack aria-live="assertive" gap={4} role="alert">
        <CatchText as="h3" variant="display-xs">{headline}</CatchText>
        {lines.map((line) => <CatchText as="p" key={line} tone="secondary" variant="body">{line}</CatchText>)}
      </CatchStack>
      <CatchStack align="start" direction="row" gap={8} wrap>
        {retriable ? <CatchButton label={tryItCopy.problem.retry} onPressed={state.busy ? null : () => void flow.retry()} status={state.busy ? "loading" : "idle"} /> : null}
        <CatchButton label={retriable ? tryItCopy.problem.startOver : copy.startOver} onPressed={flow.startOver} variant={retriable ? "quiet" : "primary"} />
      </CatchStack>
    </CatchStack>
  );
}

function StageBody({controller, form}: {controller: NightPlanController; form: PlaybookLeadForm}) {
  const {state, flow} = controller;
  const {stage} = state;
  switch (stage.name) {
    case "start":
      return <StartStep controller={controller} form={form} />;
    case "account":
      return <AccountStep controller={controller} />;
    case "workspace":
      return (
        <CatchStack gap={12}>
          <CatchStack aria-live="polite" gap={4} role="status">
            <CatchText as="h3" variant="display-xs">{stage.summary.headline}</CatchText>
            {stage.summary.lines.map((line) => <CatchText as="p" key={line} tone="secondary" variant="body">{line}</CatchText>)}
          </CatchStack>
          <CatchStack align="start" direction="row" gap={8} wrap>
            <CatchButton label={tryItCopy.workspace.confirm} onPressed={state.busy ? null : () => void flow.confirmWorkspace()}
              status={state.busy ? "loading" : "idle"} />
            <CatchButton label={copy.startOver} onPressed={state.busy ? null : flow.startOver} variant="quiet" />
          </CatchStack>
        </CatchStack>
      );
    case "working":
      return (
        <CatchStack align="center" aria-live="polite" direction="row" gap={12} role="status">
          <CatchLoadingIndicator label={tryItCopy.working.busy} />
          <CatchText as="h3" variant="display-xs">{copy.working}</CatchText>
        </CatchStack>
      );
    case "plan":
      return <PlanStep controller={controller} shown={stage} />;
    case "problem":
      return <ProblemStep controller={controller} stage={stage} />;
  }
}

/** The Room page's plan-a-night tool: a card running night.plan, the practice session and saving to the draft. */
function NightPlanTryIt({form}: {form: PlaybookLeadForm}) {
  const controller = useNightPlanController();
  return (
    <CatchGroundCard ground="white" outlined>
      <CatchStack gap={16}>
        <CatchStack align="start" gap={8}>
          <CatchBadge label={tryItCopy.kicker} size="sm" tone="gold" />
          <CatchText as="h3" variant="title-bar">{copy.title}</CatchText>
        </CatchStack>
        <StageBody controller={controller} form={form} />
      </CatchStack>
    </CatchGroundCard>
  );
}

/** The tool in a tool form's place, keyed by page, band and form so each starts empty. */
export function nightPlanTryItNode(props: {form: PlaybookLeadForm; pageId: string; sectionId: string}): ReactNode {
  return <NightPlanTryIt form={props.form} key={`${props.pageId}-${props.sectionId}-${props.form.id}`} />;
}
