import {
  CatchBanner,
  CatchButton,
  CatchField,
  CatchFormStepList,
  CatchGroundCard,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchSection,
  CatchStack,
  CatchText,
  type CatchFormStepListStatus,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {claimAccountLinkingErrorMessage} from "../../shared/auth/claimAccountLinking";
import {salesDemoCopy, salesDemoFlowCopy} from "../../content/salesDemo";
import {useEffect, useLayoutEffect, useState} from "react";
import {useParams} from "react-router";
import {EventBookingFrame} from "../../shared/site/EventBookingFrame";
import {websiteSalesDemoAuth, type SalesDemoAuth,
  type SalesDemoPhoneChallenge} from "./salesDemoAuth";
import {grantFromSalesDemoFragment, salesDemoActionTitle,
  salesDemoFormEditorUrl,
  type SalesDemoAction, type SalesDemoApi, type SalesDemoSession} from
  "./salesDemoModel";
import {useSalesDemoController} from "./useSalesDemoController";

export function SalesDemoPage({api, auth = websiteSalesDemoAuth}: {
  api: SalesDemoApi; auth?: SalesDemoAuth;
}) {
  const {invitationId = ""} = useParams<{invitationId: string}>();
  return <SalesDemoInvitation key={invitationId} invitationId={invitationId}
    api={api} auth={auth} />;
}

function SalesDemoInvitation({invitationId, api, auth}: {
  invitationId: string; api: SalesDemoApi; auth: SalesDemoAuth;
}) {
  const [grantToken] = useState(() => grantFromSalesDemoFragment(
    window.location.hash));
  useLayoutEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const unsafeQuery = ["grant", "grantToken", "token"].some((key) =>
      search.has(key));
    search.delete("grant"); search.delete("grantToken"); search.delete("token");
    if (window.location.hash || unsafeQuery) window.history.replaceState(null, "",
      `${window.location.pathname}${search.size ? `?${search.toString()}` : ""}`);
  }, []);
  const controller = useSalesDemoController({invitationId, grantToken, api, auth});
  const preview = !controller.privateAccessDenied && controller.preview.isSuccess && !controller.preview.isFetching ? controller.preview.data : undefined;
  const invalidId = !/^[A-Za-z0-9_-]{3,128}$/u.test(invitationId);

  if (invalidId || controller.privateAccessDenied || controller.preview.isError) {
    return <EventBookingFrame body={salesDemoCopy.theInvitationMayHaveExpiredOr} card={false}
      kicker={salesDemoCopy.privateExample} title={salesDemoCopy.thisPreviewIsUnavailable}>
      <Block>
        <CatchStack gap={12}>
          <CatchStack align="start" direction="row" gap={8} wrap>
            <CatchButton label={salesDemoCopy.tryAgain} onPressed={() => void controller.retryPreview()} size="md" />
            {controller.continuationId ? <CatchButton href={`/claim/?continuation=${encodeURIComponent(controller.continuationId)}`}
              label={salesDemoCopy.continuePreservedSetup} size="md" variant="secondary" /> : controller.canRecoverPreservation ?
              <CatchButton label={salesDemoCopy.recoverSetup} onPressed={controller.pending ? null : () => void controller.preserveSetup()}
                size="md" variant="secondary" /> : null}
          </CatchStack>
          {controller.setupNotice || controller.notice ? <Problem message={controller.setupNotice || controller.notice} /> : null}
        </CatchStack>
      </Block>
      {!invalidId && grantToken ? <DemoAccessView controller={controller} auth={auth}
        hasGrant cta={salesDemoCopy.verifyInvitedContact}
        interactiveAvailable={false} /> : null}
    </EventBookingFrame>;
  }
  if (controller.preview.isPending || !preview) {
    return <EventBookingFrame card={false} kicker={salesDemoCopy.privateWorkflowPreview} title={salesDemoCopy.loadingPrivatePreview}>
      <Block><CatchLoadingIndicator label={salesDemoCopy.loadingPrivatePreview} /></Block>
    </EventBookingFrame>;
  }
  return <EventBookingFrame banner={<CatchBanner message={preview.notice} tone="warning" />} body={preview.preview.scenario}
    card={false} kicker={salesDemoCopy.privateWorkflowPreview} title={preview.preview.headline}>
    {controller.session ? <SampleSteps session={controller.session} /> : null}
    <Block>
      <CatchSection title={salesDemoCopy.whatYouCanExplore} dividers="between">
        {preview.preview.steps.map((step, index) =>
          <CatchIndexRow density="compact" key={`${index}-${step}`} marker={{kind: "number", value: index + 1}} title={step} wrap />)}
      </CatchSection>
    </Block>
    {preview.preview.retainedTools.length ? <Block>
      <CatchSection title={salesDemoCopy.whatStaysWithYourCurrentTools} dividers="between">
        {preview.preview.retainedTools.map((tool) => <CatchIndexRow density="compact" key={tool} title={tool} wrap />)}
      </CatchSection>
    </Block> : null}
    {preview.preview.limitations.length ? <Block>
      <CatchSection title={salesDemoCopy.knownLimitsOfThisExample} dividers="between">
        {preview.preview.limitations.map((limit) => <CatchIndexRow density="compact" key={limit} title={limit} wrap />)}
      </CatchSection>
    </Block> : null}
    <CatchStack gap={4}>
      {preview.expiresAt ? <CatchText as="p" tone="secondary" variant="body-small">
        {salesDemoCopy.availableUntil}{" "}{new Date(preview.expiresAt).toLocaleString()}.
      </CatchText> : null}
      <CatchText as="p" tone="secondary" variant="body-small">{salesDemoCopy.noRealMessagesChargesGuestAdmission}</CatchText>
    </CatchStack>
    {controller.notice ? <Problem message={controller.notice} /> : null}
    {controller.session ? <DemoSessionView controller={controller} /> :
      <DemoAccessView controller={controller} auth={auth}
        hasGrant={Boolean(grantToken)} cta={preview.preview.cta}
        interactiveAvailable={preview.interactiveAvailable} />}
  </EventBookingFrame>;
}

type Controller = ReturnType<typeof useSalesDemoController>;

/** One block of the flow's column, as the board's flat cards. */
function Block({children}: {children: ReactNode}) {
  return <CatchGroundCard ground="white" outlined>{children}</CatchGroundCard>;
}

/** A titled block: the step's heading, then its parts 12px apart. */
function Module({title, children}: {title: string; children: ReactNode}) {
  return <Block>
    <CatchStack gap={12}>
      <CatchText as="h2" variant="title-row">{title}</CatchText>
      {children}
    </CatchStack>
  </Block>;
}

function Line({children, status = false}: {children: ReactNode; status?: boolean}) {
  return <CatchText as="p" role={status ? "status" : undefined} variant="body">{children}</CatchText>;
}

function Problem({message}: {message: string}) {
  return <CatchText as="p" role="status" tone="danger" variant="body-small">{message}</CatchText>;
}

function Actions({children}: {children: ReactNode}) {
  return <CatchStack align="start" direction="row" gap={8} wrap>{children}</CatchStack>;
}

const sampleStepIndex: Record<SalesDemoSession["step"], number> = {application: 1, reply: 2, admission: 3, complete: 4};

/** The sample's progress on the board's rail: verify, review, reply, admit, then next steps. */
function SampleSteps({session}: {session: SalesDemoSession}) {
  const current = session.status === "completed" ? 4 : sampleStepIndex[session.step];
  const status = (value: CatchFormStepListStatus) => salesDemoFlowCopy.stepStatus[value];
  return <CatchFormStepList current={current} direction="row" label={salesDemoFlowCopy.stepsLabel} statusLabelBuilder={status}
    items={salesDemoFlowCopy.steps.map((title, index) => ({index, title, status: index < current ? "complete" : "needsInformation"}))} />;
}

function DemoAccessView({controller, auth, hasGrant, cta, interactiveAvailable}: {
  controller: Controller; auth: SalesDemoAuth; hasGrant: boolean;
  cta: string; interactiveAvailable: boolean;
}) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<SalesDemoPhoneChallenge | null>(null);
  const [authError, setAuthError] = useState("");
  const [authPending, setAuthPending] = useState(false);
  useEffect(() => () => challenge?.clear(), [challenge]);
  const google = async () => {
    if (authPending) return;
    setAuthPending(true); setAuthError("");
    try {await auth.signInGoogle();} catch (error) {
      setAuthError(claimAccountLinkingErrorMessage(error, salesDemoCopy.googleSigninDidNotCompleteYou));
    } finally {setAuthPending(false);}
  };
  const sendCode = async () => {
    if (authPending || !/^\+[1-9][0-9]{7,14}$/u.test(phone.trim())) return;
    setAuthPending(true); setAuthError("");
    try {setChallenge(await auth.beginPhone(phone.trim(), "sales-demo-recaptcha"));}
    catch (error) {setAuthError(claimAccountLinkingErrorMessage(error, salesDemoCopy.phoneVerificationCouldNotStartCheck));}
    finally {setAuthPending(false);}
  };
  const verifyCode = async () => {
    if (authPending || !challenge || !code.trim()) return;
    setAuthPending(true); setAuthError("");
    try {await challenge.confirm(code.trim()); setCode(""); setPhone("");
      setChallenge(null);} catch (error) {
      setAuthError(claimAccountLinkingErrorMessage(error, salesDemoCopy.thatVerificationCodeCouldNotBe));
    } finally {setAuthPending(false);}
  };
  if (!interactiveAvailable && !hasGrant) return <Module title={salesDemoCopy.previewOnly}>
    <Line>{salesDemoCopy.interactiveAccessHasNotBeenEnabled}</Line>
  </Module>;
  if (!hasGrant) return <Module title={salesDemoCopy.interactiveLinkNeeded}>
    <Line>{salesDemoCopy.thisPreviewIsSafeToView}</Line>
  </Module>;
  const busy = authPending || controller.pending;
  const phoneValid = /^\+[1-9][0-9]{7,14}$/u.test(phone.trim());
  return <Module title={salesDemoCopy.tryTheSampleWorkflow}>
    <Line>{cta}</Line>
    {!controller.authReady ? <CatchLoadingIndicator label={salesDemoCopy.checkingSignin} /> :
      <>
      {controller.canTry ? <>
        <Line>{salesDemoCopy.signedInAs}{" "}{controller.viewer?.email ||
          controller.viewer?.phoneNumber || salesDemoFlowCopy.verifiedAccount}{salesDemoCopy.theServerWillCheckThisIdentity}</Line>
        <Actions>
          <CatchButton label={salesDemoCopy.openInteractiveExample} onPressed={busy ? null : () => void controller.start()}
            size="md" status={controller.pending ? "loading" : "idle"} />
          {controller.canRestartSample ? <CatchButton label={salesDemoCopy.restartSample}
            onPressed={busy ? null : () => void controller.restartSample()} size="md" variant="secondary" /> : null}
        </Actions>
      </> : null}
        <CatchText as="p" tone="secondary" variant="body-small">{salesDemoCopy.useTheInvitedEmailOrVerify}</CatchText>
        <Actions>
          <CatchButton label={controller.viewer ? salesDemoCopy.verifyGoogle : salesDemoCopy.continueGoogle}
            onPressed={busy ? null : () => void google()} size="md" status={authPending ? "loading" : "idle"} variant="secondary" />
          {controller.viewer && auth.signOut ? <CatchButton label={salesDemoCopy.signOut}
            onPressed={busy ? null : async () => {
              setChallenge(null); setCode(""); setAuthError(""); await auth.signOut?.();
            }} size="md" variant="quiet" /> : null}
        </Actions>
        <CatchField
          recipe="input"
          id="sales-demo-phone"
          title={salesDemoCopy.orVerifyPhoneInternationalFormat}
          autoComplete="tel"
          value={phone}
          inputMode={busy || Boolean(challenge) ? "inactive" : "editable"}
          onChanged={(value) => setPhone(value)}
          inputHint={salesDemoCopy.phonePlaceholder}
          keyboardType="phone"
        />
        <div id="sales-demo-recaptcha" />
        {!challenge ? <Actions><CatchButton label={salesDemoCopy.sendVerificationCode}
          onPressed={busy || !phoneValid ? null : () => void sendCode()} size="md" variant="secondary" /></Actions> : <>
          <CatchField
            recipe="input"
            id="sales-demo-code"
            title={salesDemoCopy.verificationCode}
            value={code}
            onChanged={(value) => setCode(value)}
            autoComplete="one-time-code"
            keyboardType="number"
          />
          <Actions>
            <CatchButton label={salesDemoCopy.verifyPhone} onPressed={busy || !code.trim() ? null : () => void verifyCode()}
              size="md" variant="secondary" />
            <CatchButton label={salesDemoCopy.changeNumberOrResendCode}
              onPressed={busy ? null : () => {setChallenge(null); setCode(""); setAuthError("");}} size="md" variant="quiet" />
          </Actions>
        </>}
      </>}
    {authError ? <Problem message={authError} /> : null}
  </Module>;
}

function DemoSessionView({controller}: {controller: Controller}) {
  const session = controller.session!;
  const retry = controller.retryAction;
  const available = (action: SalesDemoAction) => session.allowedActions.includes(action);
  const act = (action: SalesDemoAction, choice?: "approve" | "needs_info" |
    "welcome" | "clarify") => void controller.advance({action, choice});
  const blocked = controller.pending || !controller.fresh;
  return <>
    <Module title={salesDemoCopy.yourIsolatedSample}>
      <CatchStack gap={4}>
        <Line>{salesDemoCopy.step}{" "}{session.step.replaceAll("_", " ")} ·
          {session.status === "completed" ? salesDemoFlowCopy.completed : salesDemoFlowCopy.inProgress}</Line>
        <Line>{salesDemoCopy.sampleApplicant}{" "}{session.application.applicantName} ·
          {session.application.request}</Line>
        <Line>{salesDemoCopy.review}{" "}{session.application.review.replaceAll("_", " ")}{salesDemoCopy.reply}{" "}{session.reply.template.replaceAll("_", " ")}{salesDemoCopy.guest}{" "}{session.guest.status.replaceAll("_", " ")}</Line>
      </CatchStack>
      <CatchText as="p" tone="secondary" variant="body-small">{salesDemoCopy.onlySyntheticRecordsAreChanged}</CatchText>
    </Module>
    <Module title={salesDemoCopy.nextSampleStep}>
      {!controller.fresh ? <Line>{salesDemoCopy.checkTheLatestSessionBeforeContinuing}</Line> : null}
      <Actions>
        {retry ? <CatchButton label={`${salesDemoCopy.retry} ${salesDemoActionTitle(retry.action, retry.choice)}`}
          onPressed={blocked ? null : () => act(retry.action, retry.choice)} size="md" /> :
          <DemoStepActions session={session} disabled={blocked} onAction={act} />}
        {available("requestAssistance") && !session.assistanceRequested && !retry ?
          <CatchButton label={salesDemoCopy.requestHelpWithThisDemo} onPressed={blocked ? null : () => act("requestAssistance")}
            size="md" variant="secondary" /> : null}
        <CatchButton label={salesDemoCopy.refreshSampleStatus} onPressed={controller.pending ? null : () => void controller.refresh()}
          size="md" variant="quiet" />
      </Actions>
      {session.assistanceRequested ? <Line status>{salesDemoCopy.assistanceRequestedThisRecordsAnInproduct}</Line> : null}
      {session.status === "completed" ? <Line status>{salesDemoCopy.youCompletedThisSyntheticWorkflowA}</Line> : null}
    </Module>
    {session.status === "completed" ? <DemoSetupView controller={controller} /> : null}
  </>;
}

function DemoSetupView({controller}: {controller: Controller}) {
  const [confirm, setConfirm] = useState(false);
  const setup = controller.setup;
  const editorUrl = salesDemoFormEditorUrl(setup?.editorPath ?? null);
  return <Module title={salesDemoCopy.realSetupHandoff}>
    <Line>{salesDemoCopy.realSetupIsSeparate}</Line>
    {!setup || !controller.setupFresh ? <Actions><CatchButton label={salesDemoCopy.reviewSetupOptions}
      onPressed={controller.pending || !controller.fresh ? null : () => {setConfirm(false); void controller.readSetup();}}
      size="md" /></Actions> : null}
    {controller.setupNotice ? <Problem message={controller.setupNotice} /> : null}
    {setup && controller.setupFresh ? <>
      <CatchSection dividers="between" title={setup.plan.mode === "template" ?
        `${salesDemoCopy.reviewedTemplate}: ${setup.plan.title}` : salesDemoCopy.manualHandoff}>
        {setup.plan.requirements.map((step, index) =>
          <CatchIndexRow density="compact" key={`${index}-${step}`} title={step} wrap />)}
      </CatchSection>
      {setup.status === "manual_setup" ? <Line>{salesDemoCopy.manualSetupNeeded}</Line> : null}
      {setup.status === "claim_required" ? <>
        <Line>{salesDemoCopy.claimRequiredForDraft}</Line>
        <Actions>
          {controller.continuationId ? <CatchButton
            href={`/claim/?continuation=${encodeURIComponent(controller.continuationId)}`}
            label={salesDemoCopy.openClaimSetup} size="md" /> : controller.canPreserve ?
            <CatchButton label={salesDemoCopy.preserveSetup}
              onPressed={controller.pending || !controller.fresh ? null : () => void controller.preserveSetup()} size="md" /> : null}
        </Actions>
        <CatchText as="p" tone="secondary" variant="body-small">{salesDemoCopy.preservedSetupGuidance}</CatchText>
      </> : null}
      {setup.status === "ready" ? <>
        <Line>{salesDemoCopy.templateDraftNotPublished}</Line>
        <Actions>
          {!confirm ? <CatchButton label={salesDemoCopy.prepareTemplateDraft}
            onPressed={controller.pending ? null : () => setConfirm(true)} size="md" /> : <>
            <CatchButton label={salesDemoCopy.confirmPrepareTemplateDraft}
              onPressed={controller.pending || !controller.fresh || !controller.setupFresh ? null :
                () => {setConfirm(false); void controller.prepareSetup();}} size="md" />
            <CatchButton label={salesDemoCopy.cancel} onPressed={controller.pending ? null : () => setConfirm(false)}
              size="md" variant="quiet" />
          </>}
        </Actions>
      </> : null}
      {setup.status === "prepared" ? <>
        <Line status>{salesDemoCopy.draftPrepared}</Line>
        {editorUrl ? <Actions><CatchButton href={editorUrl} label={salesDemoCopy.finishInForms} size="md" /></Actions> :
          <Line>{salesDemoCopy.hostAppLinkUnavailable}</Line>}
      </> : null}
      <Actions>
        <CatchButton label={salesDemoCopy.refreshSetup}
          onPressed={controller.pending ? null : () => {setConfirm(false); void controller.readSetup();}} size="md" variant="quiet" />
      </Actions>
    </> : null}
  </Module>;
}

function DemoStepActions({session, disabled, onAction}: {
  session: SalesDemoSession; disabled: boolean;
  onAction: (action: SalesDemoAction, choice?: "approve" | "needs_info" |
    "welcome" | "clarify") => void;
}) {
  const press = (action: SalesDemoAction, choice?: "approve" | "needs_info" | "welcome" | "clarify") =>
    disabled ? null : () => onAction(action, choice);
  if (session.step === "application" &&
      session.allowedActions.includes("reviewApplication")) return <>
    <CatchButton label={salesDemoCopy.approveSampleApplication} onPressed={press("reviewApplication", "approve")} size="md" />
    <CatchButton label={salesDemoCopy.askSampleApplicantForMoreInformation} onPressed={press("reviewApplication", "needs_info")}
      size="md" variant="secondary" />
  </>;
  if (session.step === "reply" && session.allowedActions.includes("prepareReply")) {
    return session.application.review === "needs_info" ?
      <CatchButton label={salesDemoCopy.prepareClarificationExample} onPressed={press("prepareReply", "clarify")} size="md" /> : <>
      <CatchButton label={salesDemoCopy.prepareWelcomeExample} onPressed={press("prepareReply", "welcome")} size="md" />
      <CatchButton label={salesDemoCopy.prepareClarificationExample} onPressed={press("prepareReply", "clarify")}
        size="md" variant="secondary" />
    </>;
  }
  if (session.step === "admission" && session.allowedActions.includes("admitGuest")) {
    return <CatchButton label={salesDemoCopy.admitSampleGuest} onPressed={press("admitGuest")} size="md" />;
  }
  return <Line>{salesDemoCopy.noFurtherSampleStepIsAvailable}</Line>;
}
