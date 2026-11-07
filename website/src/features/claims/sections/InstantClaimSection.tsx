import {
  CatchButton,
  CatchChoiceTile,
  CatchField,
  CatchIcon,
  CatchIndexRow,
  CatchNotice,
  CatchPaneLayout,
  CatchSection,
  CatchStack,
  CatchSurface,
  CatchText,
  type CatchNoticeTone,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {claimFlowCopy as flow} from "@content/claimFlow";
import {claimGuidance} from "@content/claimGuidance";
import {claimVerificationCopy as copy} from "@content/claimVerification";
import {interpolateContent as fill} from "@content/interpolate";
import {Form} from "../../../shared/ui/primitives";
import {renderAccountForm} from "../../account/accountForm";
import type {HostListing} from "../../organizers/types";
import type {InstantClaimController} from "../useInstantClaimController";
import {ClaimHead, ClaimPageCard, ClaimSteps, SplitOnly, UnsplitOnly, claimFormatForListing} from "./ClaimParts";

type Controller = InstantClaimController;

/** A submit button's press is the form's submit; the button needs a handler to stay enabled. */
const submitsForm = () => undefined;

const titleId = "instant-claim-title";

/**
 * The whole claim for one listing, board for board: sign in with a phone
 * (RbWebClaimSignIn), choose a check (Choose), send the code (Code, laid out
 * as RbWebClaimDesktop on a wide page) until it is yours (Done), with a staff
 * review as the fallback (Review, Sent). The phase is the controller's; this
 * only draws it.
 */
export function InstantClaimPanel({controller, listing, pendingReview = false, onChangeListing}: {
  controller: Controller; listing: HostListing; pendingReview?: boolean; onChangeListing?: () => void;
}) {
  const {phase} = controller;
  const claimed = phase === "done";
  const card = <ClaimPageCard claimed={claimed} listing={listing} onChange={claimed ? undefined : onChangeListing} />;
  const stepsCurrent = phase === "account" || phase === "unavailable" ? 0 : claimed ? null : 1;
  const instagramCode = phase === "code" && controller.attempt?.method === "instagramMessage" && !controller.expired;
  return (
    <CatchPaneLayout
      aside={
        <SplitOnly>
          <CatchStack gap={16}>
            {card}
            <ClaimSteps current={stepsCurrent} />
            {instagramCode ? <CatchText tone="secondary" variant="body-small">{flow.codeAside}</CatchText> : null}
          </CatchStack>
        </SplitOnly>
      }
      main={
        <CatchStack aria-labelledby={titleId} as="section" gap={24}>
          {head(controller, listing)}
          <UnsplitOnly>
            {phase === "code" ? null : card}
            {phase === "account" ? <ClaimSteps current={0} /> : null}
          </UnsplitOnly>
          {pendingReview && phase !== "done" && phase !== "unavailable" ? notice("pending-review", copy.pendingReview, "status", "pending") : null}
          {renderPhase(controller, listing)}
          {controller.error ? <CatchStack role="alert">{notice("error", controller.error, "danger", "error")}</CatchStack> : null}
        </CatchStack>
      }
      pattern="reading"
    />
  );
}

function head(controller: Controller, listing: HostListing) {
  const firstName = controller.account?.account?.displayName?.trim().split(/\s+/u)[0] ?? "";
  switch (controller.phase) {
  case "unavailable":
    return <ClaimHead body={copy.unavailable} id={titleId} title={fill(flow.signIn.title, {name: listing.name})} />;
  case "account":
    return <ClaimHead body={flow.signIn.body} id={titleId} title={fill(flow.signIn.title, {name: listing.name})} />;
  case "loading":
  case "choose":
    return <ClaimHead id={titleId} title={flow.choose.title} />;
  case "code":
    return controller.attempt?.method === "lumaDescription" ?
      <ClaimHead body={flow.lumaCode.body} id={titleId} title={flow.lumaCode.title} /> :
      <ClaimHead body={fill(flow.instagramCode.body, {handle: controller.attempt?.proofTarget ?? ""})} id={titleId} title={flow.instagramCode.title} />;
  case "review":
    return <ClaimHead body={controller.methods.length > 0 ? flow.review.body : copy.noMethods} id={titleId} title={flow.review.title} />;
  case "requested":
    return <ClaimHead id={titleId} title={flow.sent.title} />;
  case "done":
    return <ClaimHead body={fill(flow.done.body, {name: listing.name})} id={titleId}
      title={firstName ? fill(flow.done.title, {name: firstName}) : flow.done.titleWithoutName} />;
  default:
    return null;
  }
}

function renderPhase(controller: Controller, listing: HostListing) {
  switch (controller.phase) {
  case "unavailable":
    return <CatchStack align="start"><CatchButton href="/help/" label={claimGuidance.help} variant="secondary" /></CatchStack>;
  case "account":
    return renderAccountForm(controller.account, {askBirthDate: false, sendCodeLabel: flow.signIn.sendCode});
  case "loading":
    return <CatchText role="status" tone="secondary" variant="body-small">{copy.loadingOptions}</CatchText>;
  case "choose":
    return renderChoose(controller);
  case "code":
    return renderCode(controller, listing);
  case "review":
    return renderReview(controller);
  case "requested":
    return renderSent(controller, listing);
  case "done":
    return renderDone(listing);
  default:
    return null;
  }
}

/** A notice in the flow: the system Notice tinted by its tone, with its icon. */
function notice(id: string, title: string, tone: CatchNoticeTone, icon: "pending" | "error" | "success" | "warning", message?: string) {
  return <CatchNotice dismissLabel="" notice={{id, title, message, tone, icon: <CatchIcon name={icon} />}} />;
}

function renderChoose(controller: Controller) {
  const {methods, chosen, catchInstagramHandle} = controller;
  if (!chosen) return null;
  return (
    <CatchStack gap={12}>
      <CatchText id="claim-methods-label" variant="label-action">{copy.methodsLabel}</CatchText>
      <CatchStack aria-labelledby="claim-methods-label" gap={8} role="radiogroup">
        {methods.map((item) => (
          <CatchChoiceTile
            key={item.method}
            onTap={() => controller.setMethod(item.method)}
            selected={chosen.method === item.method}
            subtitle={item.method === "instagramMessage" ? copy.instagramSub(item.proofTarget ?? "", catchInstagramHandle ?? "") : copy.lumaSub}
            title={item.method === "instagramMessage" ? copy.instagramTitle : copy.lumaTitle}
          />
        ))}
      </CatchStack>
      <CatchButton fill label={copy.showCode} onPressed={() => void controller.showCode()} status={controller.starting ? "loading" : "idle"} />
      <CatchButton fill label={copy.reviewOffer} onPressed={controller.openReview} variant="quiet" />
    </CatchStack>
  );
}

/** The code on its spotlight, the numbered steps, the actions and the live status. */
function renderCode(controller: Controller, listing: HostListing) {
  const {attempt} = controller;
  if (!attempt) return null;
  const other = <CatchStack align="start"><CatchButton label={copy.otherMethod} onPressed={controller.chooseAgain} size="sm" variant="quiet" /></CatchStack>;
  if (controller.expired) {
    return (
      <CatchStack gap={16}>
        <CatchStack role="status">{notice("expired", copy.expired, "warning", "warning")}</CatchStack>
        <CatchButton fill label={copy.newCode} onPressed={() => void controller.showCode()} status={controller.starting ? "loading" : "idle"} />
        {other}
      </CatchStack>
    );
  }
  const copyButton = <CatchButton fill label={controller.copied ? copy.copied : copy.copyCode} leadingIcon="copy" onPressed={controller.copyCode} variant="secondary" />;
  const format = claimFormatForListing(listing);
  if (attempt.method === "instagramMessage") {
    const catchHandle = attempt.catchInstagramHandle ?? controller.catchInstagramHandle ?? "";
    const spaced = `${attempt.code.slice(0, 3)} ${attempt.code.slice(3)}`;
    const status = controller.rejection === "wrongSender" ? notice("wrong-sender", copy.wrongSender(attempt.proofTarget), "warning", "warning") :
      controller.rejection === "codeNotFound" ? notice("code-not-found", copy.codeNotFound, "warning", "warning") :
        notice("waiting", copy.waiting, "status", "pending");
    return (
      <CatchStack gap={16}>
        <CodeSpotlight code={<CatchText aria-label={copy.codeLabel(attempt.code)} as="p" numeric variant="display-hero">{spaced}</CatchText>}
          format={format} kicker={copy.instagramHeading(catchHandle)} note={copy.instagramNote(attempt.proofTarget)} />
        <Steps steps={copy.instagramSteps(attempt.proofTarget, catchHandle)} />
        <CatchStack gap={8}>
          <CatchButton fill href={`https://ig.me/m/${encodeURIComponent(catchHandle)}`} label={copy.openInstagram} leadingIcon="openExternal" newTab />
          {copyButton}
        </CatchStack>
        <CatchStack aria-live="polite" role="status">{status}</CatchStack>
        {other}
      </CatchStack>
    );
  }
  return (
    <CatchStack gap={16}>
      <CodeSpotlight code={<CatchText as="p" numeric variant="display-xl">{attempt.proofText}</CatchText>}
        format={format} kicker={copy.lumaHeading} note={copy.lumaWaiting(attempt.proofTarget)} />
      <Steps steps={copy.lumaSteps} />
      <CatchStack gap={8}>
        <CatchButton fill label={copy.checkLuma} onPressed={() => void controller.checkLuma()} status={controller.checking ? "loading" : "idle"} />
        {copyButton}
      </CatchStack>
      {controller.lumaMissing ? <CatchStack aria-live="polite" role="status">{notice("luma-missing", copy.lumaNotFound, "warning", "warning")}</CatchStack> : null}
      {other}
    </CatchStack>
  );
}

function CodeSpotlight({kicker, code, note, format}: {kicker: string; code: ReactNode; note: string; format: ReturnType<typeof claimFormatForListing>}) {
  return (
    <CatchSurface block="spotlight" color={format}>
      <CatchText variant="label-kicker">{kicker}</CatchText>
      {code}
      <CatchText variant="body-small">{note}</CatchText>
    </CatchSurface>
  );
}

function Steps({steps}: {steps: readonly string[]}) {
  return (
    <CatchSection>
      {steps.map((step, index) => <CatchIndexRow density="compact" key={step} rank={index + 1} title={step} wrap />)}
    </CatchSection>
  );
}

/** Staff review: the signed-in account supplies the name and phone, so only proof is asked for. */
function renderReview(controller: Controller) {
  const canGoBack = controller.methods.length > 0;
  return (
    <Form noValidate onSubmit={controller.requestReview} pending={controller.requesting}>
      <CatchStack gap={12}>
        <CatchField helperText={copy.proofLinksHint} id="claim-proof-links" maxLines={3} onChanged={(value) => controller.setProofLinks(value)}
          recipe="input" required title={copy.proofLinks} value={controller.proofLinks} />
        <CatchField id="claim-note" maxLength={1000} maxLines={2} onChanged={(value) => controller.setNote(value)} recipe="input" title={copy.note}
          value={controller.note} />
        <CatchButton fill label={copy.requestReview} onPressed={submitsForm} status={controller.requesting ? "loading" : "idle"} type="submit" />
        {canGoBack ? <CatchButton fill label={copy.useCode} onPressed={controller.chooseAgain} variant="quiet" /> : null}
        <CatchText tone="secondary" variant="body-small">{flow.reviewFootnote}</CatchText>
      </CatchStack>
    </Form>
  );
}

/**
 * The review is sent. The controller keeps this phase for the visit, so a
 * code is offered by opening the claim again, where a pending review still
 * lets the owner prove it straight away.
 */
function renderSent(controller: Controller, listing: HostListing) {
  const firstName = controller.account?.account?.displayName?.trim().split(/\s+/u)[0] ?? "";
  return (
    <CatchStack gap={12}>
      <CatchStack role="status">
        {notice("sent", flow.sent.noticeTitle, "success", "success", firstName ? fill(flow.sent.notice, {name: firstName}) : flow.sent.noticeWithoutName)}
      </CatchStack>
      <CatchButton fill href={`/claim/${encodeURIComponent(listing.slug)}/`} label={flow.sent.useCode} variant="secondary" />
      <CatchButton fill href={listing.path} label={flow.sent.backToPage} variant="quiet" />
    </CatchStack>
  );
}

function renderDone(listing: HostListing) {
  return (
    <CatchStack gap={16} role="status">
      <CatchSection title={flow.next.title}>
        {flow.next.items.map((item) => (
          <CatchIndexRow chevron density="regular" href={listing.path} icon={item.icon} key={item.title} subtitle={item.subtitle} title={item.title} wrap />
        ))}
      </CatchSection>
      <CatchButton fill href={listing.path} label={flow.next.openPage} />
      <CatchButton fill href="/host/" label={flow.next.host} variant="secondary" />
    </CatchStack>
  );
}
