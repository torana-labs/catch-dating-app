import {CatchField} from "@catch/web-ui";
import {continuationCopy} from "../../content/salesDemoContinuation";
import {claimAccountLinkingErrorMessage} from "../../shared/auth/claimAccountLinking";
import {useEffect, useRef, useState} from "react";
import {invokeSalesDemoCallable} from "../../firebase";
import {PublicSiteFooter, PublicSiteHeader} from "../../shared/site";
import {
  Button,
  ButtonLink,
  ClaimFlowMain,
  ClaimRequestForm,
  FormStatus,
  EventRuntimeLoading,
  EventRuntimeModule,
  EventRuntimePanel,
} from "../../shared/ui/primitives";
import {claimContactValidationMessage, claimRoleOptions, parseProofUrls,
  type ClaimRole} from "./claimModel";
import {useClaimRequestMutation} from "./useClaimRequestMutation";
import {type SalesDemoAuth, type SalesDemoPhoneChallenge, websiteSalesDemoAuth} from "../../shared/auth/salesDemoAuth";
import type {SalesDemoContinuation, SalesDemoContinuationApi} from "../../shared/domain/salesDemoHandoff";
import {salesDemoFormEditorUrl} from "../../shared/domain/salesDemoHandoff";
import {useDemoContinuationController} from "./useDemoContinuationController";

const continuationApi: SalesDemoContinuationApi = {
  get: (input) => invokeSalesDemoCallable("getSalesDemoContinuation", input),
  prepare: (input) => invokeSalesDemoCallable("prepareSalesDemoContinuationForm", input),
};
export function DemoContinuationWorkspace({continuationId, api = continuationApi, auth = websiteSalesDemoAuth}: {
  continuationId: string; api?: SalesDemoContinuationApi; auth?: SalesDemoAuth;
}) {
  return <ContinuationWorkspace key={continuationId} continuationId={continuationId} api={api} auth={auth} />;
}

function ContinuationWorkspace({continuationId, api, auth}: {
  continuationId: string; api: SalesDemoContinuationApi; auth: SalesDemoAuth;
}) {
  const c = useDemoContinuationController(continuationId, api, auth);
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<SalesDemoPhoneChallenge | null>(null);
  useEffect(() => () => challenge?.clear(), [challenge]);
  const verifyPhone = async () => {
    if (signingIn) return;
    setSigningIn(true); setAuthError("");
    try {
      if (challenge) {
        await challenge.confirm(code.trim()); setChallenge(null); setCode(""); setPhone("");
      } else setChallenge(await auth.beginPhone(phone.trim(), "continuation-recaptcha"));
    } catch (error) {setAuthError(claimAccountLinkingErrorMessage(error, continuationCopy.restartContact));}
    finally {setSigningIn(false);}
  };
  const validId = /^[a-f0-9]{64}$/u.test(continuationId);
  const signIn = async () => {
    if (signingIn) return;
    setSigningIn(true); setAuthError("");
    try {await auth.signInGoogle();}
    catch (error) {setAuthError(claimAccountLinkingErrorMessage(error, continuationCopy.signInPrompt));}
    finally {setSigningIn(false);}
  };
  const verification = <>
    <Button disabled={signingIn} onClick={() => void signIn()}>
      {c.viewer ? continuationCopy.verifyGoogle : continuationCopy.continueGoogle}</Button>
    <CatchField
      recipe="input"
      id="continuation-login-phone"
      title={continuationCopy.invitedPhone}
      value={phone}
      inputMode={signingIn || Boolean(challenge) ? "inactive" : "editable"}
      onChanged={(value) => setPhone(value)}
      keyboardType="phone"
    />
    <div id="continuation-recaptcha" />
    {challenge ? <CatchField
      recipe="input"
      id="continuation-login-code"
      title={continuationCopy.verificationCode}
      value={code}
      autoComplete="one-time-code"
      inputMode={signingIn ? "inactive" : "editable"}
      onChanged={(value) => setCode(value)}
      keyboardType="number"
    /> : null}
    <Button disabled={signingIn || (challenge ? !code.trim() : !/^\+[1-9][0-9]{7,14}$/u.test(phone.trim()))}
      onClick={() => void verifyPhone()}>{challenge ? continuationCopy.verifyPhone : continuationCopy.sendCode}</Button>
    {challenge ? <Button disabled={signingIn} onClick={() => {setChallenge(null); setCode("");}}>
      {continuationCopy.restartPhone}</Button> : null}
    {c.viewer && auth.signOut ? <Button disabled={signingIn || c.pending} onClick={async () => {
      setChallenge(null); setCode(""); setAuthError(""); await auth.signOut?.();
    }}>{continuationCopy.signOut}</Button> : null}
  </>;
  return <><PublicSiteHeader /><ClaimFlowMain>
    <EventRuntimePanel kicker={continuationCopy.kicker} title={continuationCopy.title}
      body={continuationCopy.body}>
      {!validId ? <p>{continuationCopy.invalidLink}</p> : !c.authReady ?
        <EventRuntimeLoading label={continuationCopy.checkingAccount} /> : !c.viewer ? <>
          <p>{continuationCopy.signInPrompt}</p>
          {verification}
        </> : c.query.isError ? <>
          <p>{continuationCopy.accessChanged}</p>
          {verification}
          <Button onClick={() => void c.query.refetch()}>{continuationCopy.checkAccess}</Button>
        </> : !c.current ? <EventRuntimeLoading label={continuationCopy.checkingSetup} /> : <>
          <h2>{c.current.organizer.name}</h2>
          <EventRuntimeModule title={continuationCopy.sameAccount}>
            <p>{continuationCopy.linkPhone}</p>
            {verification}
            <ButtonLink href="/download/">{continuationCopy.openCatch}</ButtonLink>
          </EventRuntimeModule>
          <p>{continuationCopy.availableUntil(new Date(c.current.expiresAt).toLocaleString())}</p>
          {c.current.setup.status === "claim_required" && c.current.organizer.claimState === "claimPending" ?
            <p role="status">{continuationCopy.claimPending}</p> : null}
          {c.current.setup.status === "claim_required" && ["claimed", "verified"].includes(c.current.organizer.claimState) ?
            <p>{continuationCopy.hasOwner}</p> : null}
          {c.current.setup.status === "claim_required" && c.current.organizer.claimState === "unclaimed" ?
            <ContinuationClaim key={`${continuationId}:${c.current.organizer.organizerId}:${c.viewer.uid}:${c.authEpoch}`} view={c.current}
              email={c.viewer.email} phone={c.viewer.phoneNumber} /> : null}
          {c.current.setup.status === "manual_setup" ? <p>{continuationCopy.manualReview}</p> : null}
          {c.current.setup.status === "ready" ? <>
            <p>{continuationCopy.prepareGuidance}</p>
            <ul>{c.current.setup.plan.requirements.map((item, index) => <li key={index}>{item}</li>)}</ul>
            <Button disabled={c.pending} onClick={() => void c.prepare()}>{continuationCopy.prepareDraft}</Button>
          </> : null}
          {c.current.setup.status === "prepared" ? <>
            <p>{continuationCopy.prepared}</p>
            {salesDemoFormEditorUrl(c.current.setup.editorPath) ? <ButtonLink
              href={salesDemoFormEditorUrl(c.current.setup.editorPath)!}>{continuationCopy.finishForms}</ButtonLink> :
              <p>{continuationCopy.openForms}</p>}
          </> : null}
          <Button disabled={c.pending} onClick={() => void c.query.refetch()}>{continuationCopy.checkStatus}</Button>
        </>}
      {c.notice || authError ? <FormStatus status={{tone: "is-error", message: c.notice || authError}} /> : null}
    </EventRuntimePanel>
  </ClaimFlowMain><PublicSiteFooter /></>;
}

function ContinuationClaim({view, email, phone}: {
  view: SalesDemoContinuation; email: string | null; phone: string | null;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<ClaimRole>("owner");
  const [businessEmail, setEmail] = useState(email ?? "");
  const [businessPhone, setPhone] = useState(phone ?? "");
  const [proof, setProof] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const locked = useRef(false);
  const claim = useClaimRequestMutation(view.organizer.organizerId);
  return <EventRuntimeModule title={continuationCopy.requestControl}>
    <p>{continuationCopy.ownershipGuidance}</p>
    {requestId ? <p role="status">{continuationCopy.awaitingReview(requestId)}</p> :
      <ClaimRequestForm onSubmit={async (event) => {
        event.preventDefault(); if (locked.current) return;
        const proofUrls = parseProofUrls(proof);
        const validation = claimContactValidationMessage({requesterName: name, requesterRole: role,
          businessEmail: businessEmail.trim() || null, businessPhone: businessPhone.trim() || null, parsedProofUrls: proofUrls});
        if (validation) {setNotice(validation); return;}
        locked.current = true; setNotice("");
        try {
          const result = await claim.mutateAsync({organizerId: view.organizer.organizerId,
            requesterName: name.trim(), requesterRole: role, businessEmail: businessEmail.trim() || null,
            businessPhone: businessPhone.trim() || null, proofUrls, message: message.trim() || null});
          setRequestId(result.requestId);
        } catch (error) {setNotice(error instanceof Error ? error.message : continuationCopy.retryRequest);}
        finally {locked.current = false;}
      }}>
        <CatchField
          recipe="input"
          id="continuation-name"
          title={continuationCopy.yourName}
          value={name}
          maxLength={120}
          inputMode={claim.isPending ? "inactive" : "editable"}
          onChanged={(value) => setName(value)}
        />
        <CatchField
          recipe="select"
          id="continuation-role"
          title={continuationCopy.yourRole}
          values={claimRoleOptions.filter((item) => ["owner", "founder"].includes(item.value))}
          itemLabelBuilder={(item) => item.label}
          itemValueBuilder={(item) => item.value}
          value={claimRoleOptions.find((item) => item.value === role) ?? null}
          inputMode={claim.isPending ? "inactive" : "editable"}
          onChanged={(item) => {
            if (item) setRole(item.value as ClaimRole);
          }}
        />
        <CatchField
          recipe="input"
          id="continuation-email"
          title={continuationCopy.businessEmail}
          value={businessEmail}
          maxLength={320}
          inputMode={claim.isPending ? "inactive" : "editable"}
          onChanged={(value) => setEmail(value)}
          keyboardType="emailAddress"
        />
        <CatchField
          recipe="input"
          id="continuation-phone"
          title={continuationCopy.businessPhone}
          value={businessPhone}
          maxLength={32}
          inputMode={claim.isPending ? "inactive" : "editable"}
          onChanged={(value) => setPhone(value)}
          keyboardType="phone"
        />
        <CatchField
          recipe="input"
          id="continuation-proof"
          title={continuationCopy.proofLinks}
          value={proof}
          inputMode={claim.isPending ? "inactive" : "editable"}
          onChanged={(value) => setProof(value)}
          maxLines={null}
        />
        <CatchField
          recipe="input"
          id="continuation-context"
          title={continuationCopy.ownershipContext}
          value={message}
          maxLength={1000}
          inputMode={claim.isPending ? "inactive" : "editable"}
          onChanged={(value) => setMessage(value)}
          maxLines={null}
        />
        <Button type="submit" disabled={claim.isPending}>{continuationCopy.submitClaim}</Button>
      </ClaimRequestForm>}
    {notice ? <FormStatus status={{tone: "is-error", message: notice}} /> : null}
  </EventRuntimeModule>;
}
