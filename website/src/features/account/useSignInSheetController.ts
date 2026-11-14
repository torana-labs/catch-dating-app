import {useMutation} from "@tanstack/react-query";
import {useEffect, useId, useRef, useState, type FormEvent} from "react";
import {signInCopy} from "../../content/account";
import type {FormStatus} from "../../shared/forms/types";
import type {PublicEventPhoneVerification} from "../../firebase";
import {interpolateContent as fill} from "@content/interpolate";
import {normalizePhone, phonePattern, signedInHintKey, writeLocal} from "./signInModel";

export type SignInStage = "start" | "code";
/** Seconds before another code may be sent: the apps' CatchMotion.authOtpResendCooldown. */
export const signInResendCooldownSeconds = 60;
const quiet: FormStatus = {message: "", tone: ""};

/**
 * The one sign-in sheet's state, as in the apps: a phone number, then a
 * six-digit code. It signs in to, or links the phone to, the same Firebase
 * UID the apps use; there are no passwords. Firebase loads only when a code
 * is sent. The number stays until sign-in finishes, so closing and
 * reopening keeps the draft.
 */
export function useSignInSheetController({onSignedIn}: {onSignedIn?: () => void} = {}) {
  const id = useId();
  const recaptchaId = `sign-in-${id.replace(/:/gu, "")}`;
  const [stage, setStage] = useState<SignInStage>("start");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<FormStatus>(quiet);
  const [resendIn, setResendIn] = useState(0);
  const mutation = useMutation({retry: false, gcTime: 0, mutationFn: (work: () => Promise<void>) => work()});
  const pending = mutation.isPending;
  const challenge = useRef<PublicEventPhoneVerification | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false; challenge.current?.clear(); challenge.current = null;};
  }, []);

  useEffect(() => {
    if (stage !== "code" || resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [stage, resendIn]);

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
    setCode(""); setStage("start"); setResendIn(0);
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
      challenge.current = next; setStage("code"); setResendIn(signInResendCooldownSeconds);
      setStatus({message: fill(signInCopy.codeSent, {phone: number}), tone: "is-success"});
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
  function reset() {changePhone(); setStatus(quiet);}

  return {recaptchaId, stage, phone, setPhone, code, setCode: (value: string) => setCode(value.replace(/\D/gu, "").slice(0, 6)),
    status, pending, sendCode, verify, changePhone, reset,
    /** Seconds until "Resend code" is offered on the code step; 0 once it is. */
    resendIn,
    resend: () => resendIn > 0 ? Promise.resolve() : sendCode()};
}
export type SignInSheetController = ReturnType<typeof useSignInSheetController>;

function hasCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function signInError(error: unknown): string {
  if (hasCode(error, "auth/invalid-verification-code")) return signInCopy.incorrectCode;
  if (hasCode(error, "auth/code-expired") || hasCode(error, "auth/session-expired")) return signInCopy.expired;
  // The account-linking boundary explains its own refusals in plain words.
  if (error instanceof Error && !("code" in error) && error.message) return error.message;
  return signInCopy.failed;
}
