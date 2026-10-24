import {CatchText, CatchField} from "@catch/web-ui";
import {AlertCircle} from "lucide-react";
import {lazy, Suspense, useEffect, useRef, useState} from "react";
import {confirmPhoneSignInCode, requestPhoneSignInCode, resetPhoneSignIn,
  signInWithGoogleAdmin, signOutAdmin} from "../shared/api/firebase";
import {useAdminSession} from "./useAdminSession";
import {AdminQueryProvider} from "../shared/query/queryClient";
import {AdminPendingOperationProvider} from "../shared/pendingOperation";
import {
  AdminButton,
  AdminFeatureLoadingState,
  AdminForm,
  AdminSignInActions,
  AdminSignInMeta,
  AdminSignInPanel,
  AdminSignInScreen,
  StatusBanner,
} from "../shared/ui/AdminPrimitives";
const PartnerWorkspaceScreen = lazy(() => import("../features/partners/ui/PartnerWorkspaceScreen")
  .then((m) => ({default: m.PartnerWorkspaceScreen})));

export function PartnerRouteApp() {
  const session = useAdminSession("live");
  if (!session.user) return <PartnerSignIn error={session.error} />;
  if (!session.resolved) return <AdminFeatureLoadingState label="Checking partner sign-in" />;
  return <AdminQueryProvider sessionKey={`partner:${session.user.uid}:${session.epoch}`} isCurrentSession={session.isCurrent}>
    <AdminPendingOperationProvider><Suspense fallback={<AdminFeatureLoadingState label="Loading partner workspace" />}>
      <PartnerWorkspaceScreen actorUid={session.user.uid} isCurrentSession={session.isCurrent} onSignOut={() => {void signOutAdmin();}} />
    </Suspense></AdminPendingOperationProvider>
  </AdminQueryProvider>;
}

function PartnerSignIn({error: sessionError}: {error: string | null}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const mounted = useRef(false);
  const busy = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false; resetPhoneSignIn();};
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(null);
    try {await action();}
    catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Unable to sign in. Try again.");
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };
  const submit = () => {
    if (codeSent) {
      const value = code.replace(/\s+/gu, "");
      if (!/^\d{6}$/u.test(value)) {
        setError("Enter the six-digit phone verification code."); return;
      }
      void run(async () => {await confirmPhoneSignInCode(value);});
    } else {
      const value = phone.replace(/[\s()-]+/gu, "");
      if (!/^\+[1-9]\d{7,14}$/u.test(value)) {
        setError("Enter a valid phone number with country code, such as +91 90000 00000."); return;
      }
      void run(async () => {
        await requestPhoneSignInCode(value);
        if (mounted.current) {setPhone(value); setCode(""); setCodeSent(true);}
      });
    }
  };
  return <AdminSignInScreen><AdminSignInPanel>
    <CatchText as="h1" variant="headline">Catch referral partners</CatchText>
    <CatchText as="p" variant="supporting">Sign in to nominate organizers and review assigned leads.</CatchText>
    {(error || sessionError) && <StatusBanner tone="error" icon={<AlertCircle />}>{error ?? sessionError}</StatusBanner>}
    <AdminForm onSubmit={(event) => {event.preventDefault(); submit();}}>
      {codeSent ? <>
        <AdminSignInMeta>Verification code sent to {phone}.</AdminSignInMeta>
        <CatchField
          recipe="input"
          title="Verification code"
          name="verification-code"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChanged={setCode}
          inputMode={pending ? "inactive" : "editable"}
          keyboardType="number"
        />
      </> : <CatchField
        recipe="input"
        title="Phone number"
        name="phone"
        autoComplete="tel"
        inputHint="+91 90000 00000"
        value={phone}
        onChanged={setPhone}
        inputMode={pending ? "inactive" : "editable"}
        keyboardType="phone"
      />}
      <AdminSignInActions>
        <AdminButton type="submit" variant="primary" disabled={pending}>
          {codeSent ? (pending ? "Verifying" : "Verify and sign in") :
            (pending ? "Sending code" : "Send verification code")}
        </AdminButton>
        {codeSent && <AdminButton disabled={pending} onClick={() => {
          resetPhoneSignIn(); setCode(""); setCodeSent(false); setError(null);
        }}>Use another phone</AdminButton>}
      </AdminSignInActions>
    </AdminForm>
    <AdminButton disabled={pending} onClick={() => {
      setCode(""); setCodeSent(false); void run(signInWithGoogleAdmin);
    }}>Sign in with Google</AdminButton>
    <div id="admin-phone-recaptcha" />
  </AdminSignInPanel></AdminSignInScreen>;
}
