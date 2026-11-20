import {
  CatchBadge,
  CatchButton,
  CatchChip,
  CatchField,
  CatchGroundCard,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchQrCode,
  CatchSection,
  CatchStack,
  CatchStoreButton,
  CatchText,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {tryItCopy as copy} from "@content/tryIt";
import type {PlaybookLeadForm} from "../../content/playbook/playbookContract";
import {Form} from "../../shared/ui/primitives";
import {SignInSheetView} from "../account/SignInSheet";
import {useSignInSheetController} from "../account/useSignInSheetController";
import {useAppDownloadCtas} from "../marketing/useAppDownloadCtas";
import type {TryItFlowState, TryItOrganizerMatch, TryItOrganizerProposal, TryItStage, TryItSummary} from "./tryItFlow";
import {tryItCities, tryItEventWhen, tryItKitLinks, tryItLocalDate, type TryItToolKind} from "./tryItModel";
import {useTryItToolController, type TryItToolController} from "./useTryItToolController";

/** Where the tool sits: a try-it band's second column (a card), or a closing band's capture row. */
export type TryItPlacement = "split" | "cta";

/** The tools that read a link; the plan-a-night tool draws its own card (./NightPlanTryIt.tsx). */
type TryItLinkToolKind = Exclude<TryItToolKind, "night">;

interface TryItToolProps {
  readonly form: PlaybookLeadForm;
  readonly tool: TryItLinkToolKind;
  readonly placement: TryItPlacement;
  readonly analyticsPlacement: string;
}

const noop = () => undefined;

function SummaryText({summary, live = false}: {summary: TryItSummary; live?: boolean}) {
  return (
    <CatchStack aria-live={live ? "polite" : undefined} gap={4} role={live ? "status" : undefined}>
      <CatchText as="h3" variant="display-xs">{summary.headline}</CatchText>
      {summary.lines.map((line) => <CatchText as="p" key={line} tone="secondary" variant="body">{line}</CatchText>)}
    </CatchStack>
  );
}

function claimHref(organizerId: string): string {
  return `/claim/?organizerId=${encodeURIComponent(organizerId)}`;
}

/** What the organiser import read from the page: the parts it found, as rows. */
function OrganizerFound({proposal, verifyNote = false}: {proposal: TryItOrganizerProposal; verifyNote?: boolean}) {
  const found = copy.tools.organizer.found;
  const rows: {title: string; value: string}[] = [];
  if (proposal.name) rows.push({title: found.name, value: proposal.name});
  if (proposal.instagramHandle) rows.push({title: found.instagram, value: `@${proposal.instagramHandle}`});
  if (proposal.categories.length) rows.push({title: found.tags, value: proposal.categories.join(", ")});
  if (proposal.sources.length) rows.push({title: found.links, value: proposal.sources.map((source) => source.platform).join(", ")});
  return (
    <CatchStack gap={8}>
      {rows.length || proposal.description || proposal.eventCount ? (
        <CatchSection container="tile" title={found.title}>
          {rows.map((row) => <CatchIndexRow density="compact" key={row.title} subtitle={row.value} title={row.title} wrap />)}
          {proposal.description ? <CatchIndexRow body={proposal.description} density="compact" title={found.about} wrap /> : null}
          {proposal.eventCount ? <CatchIndexRow density="compact" title={fill(found.events, {count: String(proposal.eventCount)})} wrap /> : null}
          {proposal.events.slice(0, 3).map((event) => (
            <CatchIndexRow density="compact" key={`${event.sourceUrl}-${event.startAt}`} subtitle={tryItEventWhen(event.startAt)}
              title={event.title ?? copy.choose.noTitle} wrap />
          ))}
        </CatchSection>
      ) : null}
      {verifyNote && proposal.verificationNeeded ? <CatchText as="p" tone="secondary" variant="body-small">{found.verify}</CatchText> : null}
    </CatchStack>
  );
}

/** Organisers already on the site that the page may belong to, each with its way to claim. */
function Candidates({match}: {match: TryItOrganizerMatch}) {
  return (
    <CatchSection container="tile" title={copy.listed.possible}>
      {match.candidates.map((candidate) => (
        <CatchIndexRow density="compact" key={candidate.organizerId} title={candidate.name} wrap
          trailing={candidate.claimable ? <CatchButton href={claimHref(candidate.organizerId)} label={copy.listed.claim} size="sm" variant="secondary" /> : undefined}
          subtitle={candidate.claimable ? undefined : copy.listed.managed} />
      ))}
    </CatchSection>
  );
}

/** "Claim it in Catch Host": the store badges and the number to sign in with. Nothing is live until then. */
function ClaimInHost({phone, placement}: {phone: string | null; placement: string}) {
  const stores = useAppDownloadCtas({placement, app: "host"});
  return (
    <CatchStack gap={12}>
      <CatchText as="p" variant="body">{copy.nothingLive}</CatchText>
      <CatchText as="h3" variant="display-xs">{copy.claimInHost.title}</CatchText>
      <CatchText as="p" tone="secondary" variant="body">{fill(copy.claimInHost.lead, {phone: phone ?? ""})}</CatchText>
      <CatchStack direction="row" gap={12} wrap>
        {stores.map((store) => (
          <CatchStoreButton badgeSrc={store.badgeSrc} comingSoon={store.comingSoon} href={store.href || undefined} key={store.store}
            label={store.accessibleLabel} onClick={store.onClick} size="m" store={store.store} />
        ))}
      </CatchStack>
    </CatchStack>
  );
}

function problemText(stage: Extract<TryItStage, {name: "problem"}>): string[] {
  if (stage.reason === "refused" && stage.summary) return [stage.summary.headline, ...stage.summary.lines];
  return [copy.problems[stage.reason === "refused" ? "link_unreadable" : stage.reason]];
}

function fieldText(problem: TryItFlowState["fields"][keyof TryItFlowState["fields"]]): string | null {
  if (!problem) return null;
  if (problem === "linkRequired" || problem === "linkInvalid") return copy[problem];
  if (problem === "brandRequired" || problem === "cityRequired") return copy.account[problem];
  return copy.tools.kit[problem];
}

function StartStep({controller, form, tool, placement}: {controller: TryItToolController; form: PlaybookLeadForm; tool: TryItLinkToolKind; placement: TryItPlacement}) {
  const {state, flow} = controller;
  const card = copy.tools[tool];
  const inputMode = state.busy ? "inactive" : "editable";
  const link = (
    <CatchField autoComplete="url" errorText={fieldText(state.fields.link)} inputHint={card.placeholder} inputMode={inputMode}
      keyboardType="url" labelMode={placement === "cta" ? "hidden" : "visible"} onChanged={flow.setLink} recipe="input" required
      title={form.label} value={state.link} />
  );
  const button = (
    <CatchButton label={form.submitLabel} onPressed={noop} status={state.busy ? "loading" : "idle"} type="submit"
      variant={placement === "cta" ? "secondary" : "primary"} />
  );
  const channels = tool === "kit" && placement === "split" ? (
    <CatchField errorText={fieldText(state.fields.channels)} helperText={copy.tools.kit.channelsHint} inputHint={copy.tools.kit.channelsPlaceholder}
      inputMode={inputMode} labelMode="visible" onChanged={flow.setChannels} recipe="input" title={copy.tools.kit.channels} value={state.channels} />
  ) : null;
  return (
    <CatchStack gap={12}>
      <Form aria-label={placement === "split" ? card.title : form.submitLabel} noValidate onSubmit={controller.submit} pending={state.busy}>
        {placement === "cta" ? (
          <CatchStack align="start" collapseBelow="medium" direction="row" gap={8} railWidth="fit">{link}{button}</CatchStack>
        ) : (
          <CatchStack gap={12}>{link}{channels}<CatchStack align="start">{button}</CatchStack></CatchStack>
        )}
      </Form>
      {tool === "kit" && state.remembered ? (
        <CatchStack align="start">
          <CatchButton label={fill(copy.tools.kit.useDraft, {name: state.remembered.name})} onPressed={state.busy ? null : () => void flow.useRemembered()}
            size="sm" variant="quiet" />
        </CatchStack>
      ) : null}
      {tool === "organizer" && placement === "split" ? <CatchText as="p" tone="secondary" variant="body-small">{copy.tools.organizer.chip}</CatchText> : null}
      <CatchText as="p" tone="secondary" variant="body-meta">{form.note ?? copy.private}</CatchText>
    </CatchStack>
  );
}

function AccountStep({controller}: {controller: TryItToolController}) {
  const {state, flow} = controller;
  const sheet = useSignInSheetController({onSignedIn: () => void flow.signedIn()});
  const verified = Boolean(state.caller?.phoneNumber);
  const cities = tryItCities();
  const inputMode = state.busy ? "inactive" : "editable";
  const button = (
    <CatchButton label={verified ? copy.account.continue : copy.account.continueWithPhone} onPressed={noop}
      status={state.busy ? "loading" : "idle"} type="submit" />
  );
  return (
    <Form aria-label={copy.account.title} noValidate onSubmit={controller.continueAccount} pending={state.busy}>
      <CatchStack gap={12}>
        <CatchText as="h3" variant="display-xs">{copy.account.title}</CatchText>
        <CatchText as="p" tone="secondary" variant="body">{verified ? copy.account.signedInLead : copy.account.lead}</CatchText>
        <CatchField autoComplete="organization" errorText={fieldText(state.fields.brand)} inputHint={copy.account.brandHint} inputMode={inputMode}
          labelMode="visible" onChanged={flow.setBrand} recipe="input" required title={copy.account.brand} value={state.brand} />
        <CatchField<string> errorText={fieldText(state.fields.city)} hintText={copy.account.cityHint} inputMode={inputMode}
          itemLabelBuilder={(id) => cities.find((city) => city.id === id)?.label ?? id} labelMode="visible" onChanged={flow.setCity}
          recipe="select" required title={copy.account.city} value={state.cityId} values={cities.map((city) => city.id)} />
        {verified ? <CatchText as="p" tone="secondary" variant="body-small">{fill(copy.account.signedInAs, {phone: state.caller?.phoneNumber ?? ""})}</CatchText> : null}
        <CatchStack align="start">
          {verified ? button : (
            <SignInSheetView onClose={() => {sheet.reset(); flow.closeSignIn();}} open={state.signIn} sheet={sheet} trigger={button} />
          )}
        </CatchStack>
        <CatchText as="p" tone="secondary" variant="body-meta">{copy.private}</CatchText>
      </CatchStack>
    </Form>
  );
}

function Confirm({label, controller, back = true}: {label: string; controller: TryItToolController; back?: boolean}) {
  const {state, flow} = controller;
  return (
    <CatchStack align="start" direction="row" gap={8} wrap>
      <CatchButton label={label} onPressed={state.busy ? null : () => void (state.stage.name === "workspace" ? flow.confirmWorkspace() : flow.confirm())}
        status={state.busy ? "loading" : "idle"} />
      {back ? <CatchButton label={copy.review.back} onPressed={state.busy ? null : flow.startOver} variant="quiet" /> : null}
    </CatchStack>
  );
}

function ChannelsStep({controller, name}: {controller: TryItToolController; name: string}) {
  const {state, flow} = controller;
  const kit = copy.tools.kit;
  const links = tryItKitLinks(state.channels, state.people);
  return (
    <Form aria-label={fill(kit.linksFor, {name})} noValidate onSubmit={controller.makeLinks} pending={state.busy}>
      <CatchStack gap={12}>
        <CatchText as="h3" variant="display-xs">{fill(kit.linksFor, {name})}</CatchText>
        <CatchField errorText={fieldText(state.fields.channels)} helperText={kit.channelsHint} inputHint={kit.channelsPlaceholder}
          inputMode={state.busy ? "inactive" : "editable"} labelMode="visible" onChanged={flow.setChannels} recipe="input" required
          title={kit.channels} value={state.channels} />
        {links.length ? (
          <CatchSection container="tile">
            {links.map((link, index) => (
              <CatchIndexRow density="compact" key={`${link.label}-${index}`} title={link.label} wrap
                trailing={<CatchChip label={kit.promoter} onChanged={() => flow.togglePerson(link.label)} recipe="selectable"
                  selected={link.kind === "promoter"} />} />
            ))}
          </CatchSection>
        ) : null}
        <CatchStack align="start">
          <CatchButton label={kit.makeLinks} onPressed={noop} status={state.busy ? "loading" : "idle"} type="submit" />
        </CatchStack>
      </CatchStack>
    </Form>
  );
}

function StageBody({controller, form, tool, placement, analyticsPlacement}: TryItToolProps & {controller: TryItToolController}) {
  const {state, flow} = controller;
  const {stage} = state;
  switch (stage.name) {
    case "start":
      return <StartStep controller={controller} form={form} placement={placement} tool={tool} />;
    case "account":
      return <AccountStep controller={controller} />;
    case "workspace":
      return (
        <CatchStack gap={12}>
          <SummaryText live summary={stage.summary} />
          <Confirm controller={controller} label={copy.workspace.confirm} />
        </CatchStack>
      );
    case "working":
      return (
        <CatchStack aria-live="polite" gap={12} role="status">
          <CatchStack align="center" direction="row" gap={12}>
            <CatchLoadingIndicator label={copy.working.busy} />
            <CatchText as="h3" variant="display-xs">{stage.summary?.headline ?? copy.working.title}</CatchText>
          </CatchStack>
          {stage.summary?.lines.map((line) => <CatchText as="p" key={line} tone="secondary" variant="body">{line}</CatchText>)}
        </CatchStack>
      );
    case "choose":
      return (
        <CatchStack gap={12}>
          <CatchStack aria-live="polite" gap={4} role="status">
            <CatchText as="h3" variant="display-xs">{copy.choose.title}</CatchText>
            <CatchText as="p" tone="secondary" variant="body">{fill(copy.choose.lead, {count: String(stage.events.length)})}</CatchText>
          </CatchStack>
          <CatchSection container="tile">
            {stage.events.map((event) => (
              <CatchIndexRow density="compact" key={event.eventKey} onTap={state.busy ? null : () => void flow.chooseEvent(event.eventKey)}
                subtitle={[tryItEventWhen(event.startAt), event.venue].filter(Boolean).join(" · ")} title={event.title ?? copy.choose.noTitle} wrap />
            ))}
          </CatchSection>
          <CatchStack align="start"><CatchButton label={copy.review.back} onPressed={state.busy ? null : flow.startOver} variant="quiet" /></CatchStack>
        </CatchStack>
      );
    case "review":
      return (
        <CatchStack gap={12}>
          <SummaryText live summary={stage.summary} />
          {stage.step === "organizer" ? <OrganizerFound proposal={stage.proposal} /> : null}
          {stage.step === "organizer" && stage.match ? <Candidates match={stage.match} /> : null}
          {stage.step === "kit" ? (
            <CatchSection container="tile">
              {stage.links.map((link) => <CatchIndexRow density="compact" key={link.label} subtitle={link.kind === "promoter" ? copy.tools.kit.done.promoter : copy.tools.kit.done.channel} title={link.label} />)}
            </CatchSection>
          ) : null}
          <CatchText as="p" tone="secondary" variant="body-small">{copy.review.note}</CatchText>
          <Confirm controller={controller} label={copy.tools[stage.step === "kit" ? "kit" : stage.step].confirm} />
        </CatchStack>
      );
    case "channels":
      return <ChannelsStep controller={controller} name={stage.draft.name} />;
    case "done":
      return (
        <CatchStack gap={16}>
          <SummaryText live summary={stage.summary} />
          {stage.step === "organizer" && stage.proposal ? <OrganizerFound proposal={stage.proposal} verifyNote /> : null}
          {stage.step === "event" ? (
            <CatchSection container="tile" title={copy.tools.event.draft.title}>
              <CatchIndexRow density="compact" status={copy.tools.event.draft.status} title={stage.draft.name} wrap
                subtitle={fill(copy.tools.event.draft.when, {date: tryItLocalDate(stage.draft.localDate), time: stage.draft.localStartTime})} />
            </CatchSection>
          ) : null}
          {stage.step === "event" ? <CatchText as="p" tone="secondary" variant="body">{copy.tools.event.draft.lead}</CatchText> : null}
          {stage.step === "kit" ? (
            <CatchStack gap={12}>
              <CatchSection container="tile" title={copy.tools.kit.done.title}>
                {stage.links.map((link) => (
                  <CatchIndexRow density="compact" key={link.label} title={link.label} wrap
                    body={link.url ?? undefined} subtitle={link.kind === "promoter" ? copy.tools.kit.done.promoter : copy.tools.kit.done.channel}
                    trailing={link.url ? <CatchQrCode label={fill(copy.tools.kit.done.qr, {label: link.label})} size="s" value={link.url} /> : undefined} />
                ))}
              </CatchSection>
            </CatchStack>
          ) : null}
          <ClaimInHost phone={state.caller?.phoneNumber ?? null} placement={analyticsPlacement} />
        </CatchStack>
      );
    case "listed": {
      const [first] = stage.match.candidates;
      return (
        <CatchStack gap={12}>
          <SummaryText live summary={stage.summary} />
          {first?.claimable ? (
            <CatchStack align="start" gap={8}>
              <CatchText as="p" tone="secondary" variant="body">{copy.listed.claimLead}</CatchText>
              <CatchButton href={claimHref(first.organizerId)} label={copy.listed.claim} />
            </CatchStack>
          ) : (
            <CatchStack align="start" gap={8}>
              <CatchText as="p" tone="secondary" variant="body">{copy.listed.managed}</CatchText>
              <CatchButton href="/help/" label={copy.listed.help} variant="secondary" />
            </CatchStack>
          )}
          {stage.match.candidates.length > 1 ? <Candidates match={{...stage.match, candidates: stage.match.candidates.slice(1)}} /> : null}
          <CatchStack align="start"><CatchButton label={copy.review.back} onPressed={flow.startOver} variant="quiet" /></CatchStack>
        </CatchStack>
      );
    }
    case "problem": {
      const retriable = !["invalid", "link_unreadable", "refused", "market_not_open", "multiple_organizers", "not_configured", "not_allowed"].includes(stage.reason);
      const [headline, ...lines] = problemText(stage);
      return (
        <CatchStack gap={12}>
          <CatchStack aria-live="assertive" gap={4} role="alert">
            <CatchText as="h3" variant="display-xs">{headline}</CatchText>
            {lines.map((line) => <CatchText as="p" key={line} tone="secondary" variant="body">{line}</CatchText>)}
          </CatchStack>
          <CatchStack align="start" direction="row" gap={8} wrap>
            {retriable ? <CatchButton label={copy.problem.retry} onPressed={state.busy ? null : () => void flow.retry()} status={state.busy ? "loading" : "idle"} /> : null}
            <CatchButton label={retriable ? copy.problem.startOver : copy.review.back} onPressed={flow.startOver} variant={retriable ? "quiet" : "primary"} />
          </CatchStack>
        </CatchStack>
      );
    }
  }
}

function TryItTool(props: TryItToolProps) {
  const controller = useTryItToolController(props.tool);
  const body = <StageBody {...props} controller={controller} />;
  const atRest = controller.state.stage.name === "start";
  if (props.placement === "cta" && atRest) return body;
  const card = copy.tools[props.tool];
  return (
    <CatchGroundCard ground="white" outlined>
      <CatchStack gap={16}>
        {props.placement === "split" ? (
          <CatchStack align="start" gap={8}>
            <CatchBadge label={copy.kicker} size="sm" tone="gold" />
            <CatchText as="h3" variant="title-bar">{card.title}</CatchText>
          </CatchStack>
        ) : null}
        {body}
      </CatchStack>
    </CatchGroundCard>
  );
}

/**
 * A page's try-it tool in a tool form's place: the band's card (a split) or
 * the closing band's capture row (a cta), running its command end to end.
 * Keyed by page, band and form, so each starts empty.
 */
export function tryItToolNode(props: {form: PlaybookLeadForm; tool: TryItLinkToolKind; placement: TryItPlacement; pageId: string; sectionId: string}): ReactNode {
  const key = `${props.pageId}-${props.sectionId}-${props.form.id}`;
  return <TryItTool analyticsPlacement={`try_it_${props.pageId}_${props.sectionId}`} form={props.form} key={key} placement={props.placement} tool={props.tool} />;
}
