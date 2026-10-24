import {CatchText, CatchField} from "@catch/web-ui";
import {useEffect, useRef, useState} from "react";
import {auth} from "../../../shared/api/firebase";
import {AdminButton, AdminSignInPanel, AdminSignInScreen} from "../../../shared/ui/AdminPrimitives";
import {transferSession} from "../api/operatorSessionHandoff";
import {createSessionTransport, takeSessionLaunch, sessionRequest, sessionFailureCode, type SessionRequest} from "../api/operatorSessionTransport";

type Bootstrap = {csrf: string; profile: unknown; runtime: {sourceSha: string; executionSha256: string}; home: string};
// No workspace roles, Admin data, sign-in or authority-changing APIs.
export function OperatorSessionScreen() {
  const [launch] = useState(() => takeSessionLaunch());
  const [transport] = useState(() => launch ? createSessionTransport(launch) : null);
  const [initial, setInitial] = useState<Bootstrap | null>(null);
  const [configuration, setConfiguration] = useState("");
  const [request, setRequest] = useState<Readonly<SessionRequest> | null>(null);
  const [status, setStatus] = useState("Open the owner-only launch file to start this protected view.");
  const [pending, setPending] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [consumed, setConsumed] = useState(false);
  const alive = useRef(true);
  const spent = useRef(false);
  const initialRef = useRef<Bootstrap | null>(null);
  const bootstrap = useRef<Promise<unknown> | null>(null);
  useEffect(() => {
    alive.current = true;
    if (!launch || !transport) return;
    // One request even under StrictMode effect replay; no automatic retry.
    bootstrap.current ??= transport.bootstrap();
    let active = true;
    void bootstrap.current.then(value => {
      if (!active || !alive.current) return;
      const result = value as Bootstrap;
      if (!result || typeof result.csrf !== "string" || !/^[a-f0-9]{64}$/u.test(result.csrf) ||
          typeof result.home !== "string" || result.runtime?.sourceSha !== launch.sourceSha ||
          !/^[a-f0-9]{64}$/u.test(result.runtime.executionSha256)) throw new Error("unavailable");
      initialRef.current = result;
      setInitial(result); setConfiguration(result.profile ? JSON.stringify(result.profile) : "");
      setStatus("Review the selected configuration. Never enter credentials here.");
    }).catch(() => {if (active && alive.current) setStatus("Local connection unavailable. Check the helper and browser local-network permission, then restart through the private launch file.");});
    const unload = () => {
      const pending = alive.current;
      alive.current = false;
      if (pending && initialRef.current) transport.cancelOnUnload(initialRef.current.csrf);
    };
    window.addEventListener("beforeunload", unload);
    return () => {active = false; unload(); window.removeEventListener("beforeunload", unload);};
  }, [launch, transport]);
  const configure = async () => {
    if (!alive.current || !transport || !initial || pending || request) return;
    setPending(true);
    try {
      const value = await transport.post("/configure", JSON.parse(configuration), initial.csrf) as {request: unknown};
      if (!alive.current) return;
      const selected = sessionRequest(value.request);
      if (selected.serverEncryptionKey !== launch!.serverEncryptionKey || selected.serverSigningKey !== launch!.serverSigningKey ||
          selected.challenge !== launch!.challenge || selected.sourceSha !== launch!.sourceSha ||
          selected.expiresAtMillis !== launch!.expiresAtMillis || selected.projectId !== auth.app.options.projectId) throw new Error("unavailable");
      setRequest(selected); setStatus("Review this exact Google account before saving its current session.");
    } catch {if (alive.current) setStatus("Configuration unavailable. No session was requested. Restart through the private launch file.");}
    finally {if (alive.current) setPending(false);}
  };
  const transfer = async () => {
    if (!alive.current || spent.current || !transport || !initial || !request) return;
    spent.current = true;
    setConsumed(true); setPending(true);
    let submitted = false;
    try {
      const sealed = await transferSession(auth, request, () => alive.current);
      if (!alive.current) return;
      submitted = true;
      const receipt = await transport.post("/session", sealed, initial.csrf) as {state: unknown; expiresAtMillis: unknown};
      if (!alive.current) return;
      if (receipt.state !== "saved" || typeof receipt.expiresAtMillis !== "number" || !Number.isSafeInteger(receipt.expiresAtMillis)) throw new Error("unavailable");
      alive.current = false;
      setStatus("Session saved. It expires at " + new Date(receipt.expiresAtMillis).toLocaleString() + ".");
    } catch (error) {
      if (alive.current) {
        const code = sessionFailureCode(error);
        const message = !submitted ? (code === "client_sign_in_required" ?
          "Session was not sent. Use Catch’s normal Google sign-in before restarting; refreshing does not replace a fresh sign-in." :
          "Session was not sent. Review the selected account and local setup before restarting.") :
          code === "helper_admission_failed" || code === "helper_verification_failed" ?
            "The helper rejected the save before commit. Check its local diagnostic record before restarting." :
            "Session or save status unconfirmed. Check the helper/session file before restarting. Do not retry this view.";
        setStatus(message + " Diagnostic code: " + code + ".");
      }
    }
    finally {setPending(false);}
  };
  const cancel = async () => {
    if (!alive.current || !transport || !initial) return;
    alive.current = false; setCancelled(true); setPending(false);
    setStatus("Cancellation requested. Checking the local helper’s save status.");
    try {
      const receipt = await transport.post("/cancel", {}, initial.csrf) as {state: unknown};
      setStatus(receipt.state === "saved" ? "The session was already saved. Check its receipt." : receipt.state === "cancelled" ? "Cancelled. The helper confirmed no session save after cancellation." : "Cancellation unconfirmed. Check the helper/session file before restarting.");
    } catch {setStatus("Cancellation unconfirmed. Check the helper/session file before restarting.");}
  };
  return <AdminSignInScreen><AdminSignInPanel>
    <CatchText as="h1" variant="headline">Catch operator session</CatchText><CatchText as="p" variant="supporting">{status}</CatchText>
    {initial ? <><CatchText as="p" variant="supporting">Selected local directory: {initial.home}. Source: {initial.runtime.sourceSha}.</CatchText>
      <CatchText as="p" variant="supporting">Runtime fingerprint: {initial.runtime.executionSha256}.</CatchText>
      <CatchField recipe="input" title="Selected profile configuration — never enter tokens, passwords or secret payloads" maxLines={12} value={configuration} onChanged={setConfiguration}
        inputMode={pending || cancelled || consumed ? "inactive" : initial.profile || request ? "readOnly" : "editable"} />
      <AdminButton disabled={pending || cancelled || Boolean(request)} onClick={() => void configure()}>Validate configuration</AdminButton></> : null}
    {request ? <CatchText as="p" variant="supporting">Project: {request.projectId}. Google account: {request.actorUid}. Endpoint scope: {request.scopeSha256}.</CatchText> : null}
    <AdminButton disabled={!request || pending || consumed || cancelled || !alive.current} onClick={() => void transfer()}>Save my current Google session</AdminButton>
    <AdminButton disabled={!initial || cancelled || !alive.current} onClick={() => void cancel()}>Cancel</AdminButton>
    <CatchText as="p" variant="supporting">This creates no plan, approval or Admin grant. Sign in only through Catch’s normal Google UI.</CatchText>
  </AdminSignInPanel></AdminSignInScreen>;
}
