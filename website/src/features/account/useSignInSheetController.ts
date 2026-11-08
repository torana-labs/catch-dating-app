import {useMutation} from "@tanstack/react-query";
import {useEffect, useId, useRef, useState, type FormEvent} from "react";
import {signInCopy} from "../../content/account";
import type {FormStatus} from "../../shared/forms/types";
import type {PublicEventPhoneVerification} from "../../firebase";
import {
  emailForSignInKey,
  emailLinkReturnUrl,
  emailPattern,
  normalizePhone,
  phonePattern,
  signedInHintKey,
  withoutEmailLinkParams,
  writeLocal,
} from "./signInModel";

export type SignInStage = "start" | "code" | "linkSent" | "confirmEmail";
const quiet: FormStatus = {message: "", tone: ""};

/**
 * The one sign-in sheet's state: phone code first, then Google and an email
 * link. Each method signs in to, or links to, the same Firebase UID the apps
 * use; there are no passwords. Firebase loads only when a method is used.
 */
export function useSignInSheetController({onSignedIn}: {onSignedIn?: () => void} = {}) {
  const id = useId();
  const recaptchaId = `sign-in-${id.replace(/:/gu, "")}`;
  const [stage, setStage] = useState<SignInStage>("start");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>(quiet);
  const mutation = useMutation({retry: false, gcTime: 0, mutationFn: (work: () => Promise<void>) => work()});
  const pending = mutation.isPending;
  const challenge = useRef<PublicEventPhoneVerification | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false; challenge.current?.clear(); challenge.current = null;};
  }, []);

  async function run(work: () => Promise<void>) {
    if (pending) return;
    setStatus(quiet);
    try {await mutation.mutateAsync(work);} catch (error) {
      if (mounted.current) setStatus({message: signInError(error), tone: "is-error"});
      if (hasCode(error, "auth/code-expired")) changePhone();
    }
  }
  function signedIn() {
    writeLocal(signedInHintKey, "1");
    challenge.current?.clear(); challenge.current = null;
    setStage("start"); setCode(""); setStatus(quiet);
    onSignedIn?.();
  }
  function changePhone() {
    challenge.current?.clear(); challenge.current = null;
    setCode(""); setStage("start");
  }
  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    const number = normalizePhone(phone);
    if (!phonePattern.test(number)) {setStatus({message: signInCopy.invalidPhone, tone: "is-error"}); return;}
    await run(async () => {
      const {beginWebsiteAccountPhoneVerification} = await import("../../firebase");
      challenge.current?.clear();
      const next = await beginWebsiteAccountPhoneVerification(number, recaptchaId);
      if (!mounted.current) {next.clear(); return;}
      challenge.current = next; setStage("code");
      setStatus({message: signInCopy.codeSent, tone: "is-success"});
    });
  }
  async function verify(event?: FormEvent) {
    event?.preventDefault();
    if (!/^[0-9]{6}$/u.test(code)) {setStatus({message: signInCopy.invalidCode, tone: "is-error"}); return;}
    await run(async () => {
      if (!challenge.current) throw new Error(signInCopy.expired);
      await challenge.current.confirm(code);
      if (mounted.current) signedIn();
    });
  }
  async function google() {
    await run(async () => {
      const {signInWebsiteAccountWithGoogle} = await import("../../firebase");
      await signInWebsiteAccountWithGoogle();
      if (mounted.current) signedIn();
    });
  }
  async function sendLink(event?: FormEvent) {
    event?.preventDefault();
    const address = email.trim();
    if (!emailPattern.test(address)) {setStatus({message: signInCopy.invalidEmail, tone: "is-error"}); return;}
    await run(async () => {
      const {sendWebsiteAccountEmailLink} = await import("../../firebase");
      writeLocal(emailForSignInKey, address);
      await sendWebsiteAccountEmailLink(address, emailLinkReturnUrl(window.location.href));
      if (mounted.current) {setStage("linkSent"); setStatus({message: signInCopy.linkSent, tone: "is-success"});}
    });
  }
  /** Completes a returned email link with the address it was sent to. */
  async function finishEmail(event?: FormEvent, address = email.trim()) {
    event?.preventDefault();
    if (!emailPattern.test(address)) {setStatus({message: signInCopy.invalidEmail, tone: "is-error"}); return;}
    await run(async () => {
      const {completeWebsiteAccountEmailLink} = await import("../../firebase");
      await completeWebsiteAccountEmailLink(address, window.location.href);
      writeLocal(emailForSignInKey, null);
      window.history.replaceState(window.history.state, "", withoutEmailLinkParams(window.location.href));
      if (mounted.current) signedIn();
    });
  }
  function confirmEmail() {setStage("confirmEmail"); setStatus({message: signInCopy.confirmEmail, tone: ""});}
  function reset() {changePhone(); setStatus(quiet);}

  return {recaptchaId, stage, phone, setPhone, code, setCode: (value: string) => setCode(value.replace(/\D/gu, "").slice(0, 6)),
    email, setEmail, status, pending, sendCode, verify, changePhone, google, sendLink, finishEmail, confirmEmail, reset};
}
export type SignInSheetController = ReturnType<typeof useSignInSheetController>;

function hasCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function signInError(error: unknown): string {
  if (hasCode(error, "auth/invalid-verification-code")) return signInCopy.incorrectCode;
  if (hasCode(error, "auth/code-expired") || hasCode(error, "auth/session-expired")) return signInCopy.expired;
  if (hasCode(error, "auth/popup-closed-by-user") || hasCode(error, "auth/cancelled-popup-request")) return "";
  // The account-linking boundary explains its own refusals in plain words.
  if (error instanceof Error && !("code" in error) && error.message) return error.message;
  return signInCopy.failed;
}
