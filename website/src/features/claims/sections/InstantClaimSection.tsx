import {CatchGap, CatchText} from "@catch/web-ui";
import {claimVerificationCopy as copy} from "@content/claimVerification";
import {
  ActionGroup,
  Button,
  ButtonLink,
  ChoiceCard,
  HostPreviewSection,
  HostPreviewSectionHead,
  VerificationMethodGrid,
} from "../../../shared/ui/primitives";
import {renderAccountForm} from "../../account/accountForm";
import type {HostListing} from "../../organizers/types";
import type {InstantClaimController} from "../useInstantClaimController";

/**
 * Proving ownership straight away (WebOrgV2 claim band). It sits outside the
 * review workspace because the account step is a form of its own.
 */
export function InstantClaimPanel({controller, listing}: {controller: InstantClaimController; listing: HostListing}) {
  if (controller.phase === "unavailable") return null;
  return (
    <HostPreviewSection aria-labelledby="instant-claim-title">
      <CatchGap size="section">
        <HostPreviewSectionHead titleId="instant-claim-title" title={copy.title} body={copy.body} />
        {renderPhase(controller, listing)}
        {controller.error ? <CatchText as="p" role="alert" variant="bodyS">{controller.error}</CatchText> : null}
      </CatchGap>
    </HostPreviewSection>
  );
}

function renderPhase(controller: InstantClaimController, listing: HostListing) {
  switch (controller.phase) {
  case "account":
    return <CatchGap size="related">
      <CatchText as="p" variant="bodyM">{copy.accountIntro}</CatchText>
      {renderAccountForm(controller.account)}
    </CatchGap>;
  case "loading":
    return <CatchText as="p" role="status" variant="bodyS">{copy.loadingOptions}</CatchText>;
  case "choose":
    return renderMethods(controller);
  case "code":
    return renderCode(controller);
  case "done":
    return <CatchGap size="related" role="status">
      <CatchText as="h3" variant="displayS">{copy.doneTitle}</CatchText>
      <CatchText as="p" variant="bodyM">{copy.doneBody}</CatchText>
      <ActionGroup variant="marketing"><ButtonLink href={listing.path}>{copy.openPage}</ButtonLink></ActionGroup>
    </CatchGap>;
  default:
    return null;
  }
}

function renderMethods(controller: InstantClaimController) {
  const {methods, chosen, catchInstagramHandle} = controller;
  if (!chosen) return <CatchText as="p" variant="bodyM">{copy.noMethods}</CatchText>;
  return <CatchGap size="related">
    <CatchText as="p" variant="supportingStrong">{copy.methodsLabel}</CatchText>
    <VerificationMethodGrid aria-label={copy.methodsLabel}>
      {methods.map((item) => (
        <ChoiceCard
          key={item.method}
          selected={chosen.method === item.method}
          onClick={() => controller.setMethod(item.method)}
          title={item.method === "instagramMessage" ? copy.instagramTitle : copy.lumaTitle}
          body={item.method === "instagramMessage" ?
            copy.instagramSub(item.proofTarget ?? "", catchInstagramHandle ?? "") : copy.lumaSub}
        />
      ))}
    </VerificationMethodGrid>
    <ActionGroup variant="marketing">
      <Button type="button" onClick={() => void controller.showCode()} loading={controller.starting}
        loadingLabel={copy.showingCode}>{copy.showCode}</Button>
    </ActionGroup>
  </CatchGap>;
}

function renderCode(controller: InstantClaimController) {
  const {attempt} = controller;
  if (!attempt) return null;
  if (controller.expired) {
    return <CatchGap size="related">
      <CatchText as="p" role="status" variant="bodyM">{copy.expired}</CatchText>
      <ActionGroup variant="marketing">
        <Button type="button" onClick={() => void controller.showCode()} loading={controller.starting}
          loadingLabel={copy.showingCode}>{copy.newCode}</Button>
        <Button type="button" variant="ghost" onClick={controller.chooseAgain}>{copy.otherMethod}</Button>
      </ActionGroup>
    </CatchGap>;
  }
  const copyButton = <Button type="button" variant="ghost" onClick={controller.copyCode}>
    {controller.copied ? copy.copied : copy.copyCode}</Button>;
  const otherButton = <Button type="button" variant="ghost" onClick={controller.chooseAgain}>{copy.otherMethod}</Button>;
  if (attempt.method === "instagramMessage") {
    const catchHandle = attempt.catchInstagramHandle ?? controller.catchInstagramHandle ?? "";
    const spaced = `${attempt.code.slice(0, 3)} ${attempt.code.slice(3)}`;
    return <CatchGap size="related">
      <CatchText as="h3" variant="titleS">{copy.instagramHeading(catchHandle)}</CatchText>
      <CatchText as="p" variant="displayM" aria-label={copy.codeLabel(attempt.code)}>{spaced}</CatchText>
      {renderSteps(copy.instagramSteps(attempt.proofTarget, catchHandle))}
      <ActionGroup variant="marketing">
        <ButtonLink href={`https://ig.me/m/${encodeURIComponent(catchHandle)}`} target="_blank" rel="noreferrer">
          {copy.openInstagram}</ButtonLink>
        {copyButton}
        {otherButton}
      </ActionGroup>
      <CatchText as="p" role="status" aria-live="polite" variant="bodyS">
        {controller.rejection === "wrongSender" ? copy.wrongSender(attempt.proofTarget) :
          controller.rejection === "codeNotFound" ? copy.codeNotFound : copy.waiting(attempt.proofTarget)}
      </CatchText>
    </CatchGap>;
  }
  return <CatchGap size="related">
    <CatchText as="h3" variant="titleS">{copy.lumaHeading}</CatchText>
    <CatchText as="p" variant="displayM">{attempt.proofText}</CatchText>
    {renderSteps(copy.lumaSteps)}
    <ActionGroup variant="marketing">
      <Button type="button" onClick={() => void controller.checkLuma()} loading={controller.checking}
        loadingLabel={copy.checkingLuma}>{copy.checkLuma}</Button>
      {copyButton}
      {otherButton}
    </ActionGroup>
    <CatchText as="p" role="status" aria-live="polite" variant="bodyS">
      {controller.lumaMissing ? copy.lumaNotFound : copy.lumaWaiting(attempt.proofTarget)}
    </CatchText>
  </CatchGap>;
}

function renderSteps(steps: readonly string[]) {
  return <CatchGap size="inline">
    {steps.map((step, index) => <CatchText as="p" key={step} variant="bodyM">{`${index + 1}. ${step}`}</CatchText>)}
  </CatchGap>;
}
