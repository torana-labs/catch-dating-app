import {eventOfferCopy} from "../../content/eventOffer";
import {useCallback, useEffect, useId, useRef, useState, type FormEvent} from "react";
import {useMutation} from "@tanstack/react-query";
import {beginPublicEventPhoneVerification, manageEventOfferCheckout,
  signOutGuestUser,
  watchPublicFormAuthState, type EventOfferCheckoutResponse, type User} from "../../firebase";
import {openRazorpayCheckout} from "../../shared/payments/razorpayCheckout";
import type {FormStatus} from "../../shared/forms/types";
import {rememberOfferPayment, rememberOfferGrant, type OfferCredential} from "./offerCredential";
import {assertOfferResponse, type OfferGrant, type OfferPayment} from "./offerCheckoutModel";
import {catchPhoneE164} from "@catch/web-ui/phone";
import {activePhoneCountry} from "@content/markets";

type Phase = "loading" | "phone" | "otp" | "ready" | "unavailable";
type Challenge = Awaited<ReturnType<typeof beginPublicEventPhoneVerification>>;
export function useOfferCheckoutController(credential: OfferCredential | null) {
  const [phase, setPhase] = useState<Phase>(credential ? "loading" : "unavailable");
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [grant, setGrant] = useState<OfferGrant | null>(null);
  const [payment, setPayment] = useState<OfferPayment | null>(null);
  const [admission, setAdmission] = useState<EventOfferCheckoutResponse["admission"]>();
  const [cancellationReview, setCancellationReview] = useState<{paymentId: string; refundAmountPaise: number} | null>(null);
  const [status, setStatus] = useState<FormStatus>({message: "", tone: ""});
  const recaptchaId = `offer-otp-${useId().replace(/[^a-zA-Z0-9_-]/gu, "")}`;
  const challenge = useRef<Challenge | null>(null);
  const abortCheckout = useRef<AbortController | null>(null);
  const scope = useRef({epoch: 0, uid: "", mounted: true, initialized: false});
  const busy = useRef(false);
  const requestId = useRef<string | null>(null);
  const lastTime = useRef(0);
  const current = (epoch: number) => scope.current.mounted && scope.current.epoch === epoch;
  // Mutation variables contain only a local action; credentials stay in memory.
  const {mutateAsync, isPending: pending, reset} = useMutation({retry: false, gcTime: 0,
    mutationFn: (action: () => Promise<void>) => action()});
  const run = useCallback(async (action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    const epoch = scope.current.epoch;
    try {
      await mutateAsync(async () => {if (current(epoch)) await action();});
    } finally {
      if (current(epoch)) busy.current = false;
    }
  }, [mutateAsync]);
  const claim = useCallback(async () => {
    if (!credential) throw new Error("Missing invitation");
    return assertOfferResponse(await manageEventOfferCheckout(credential.token ?
      {action: "claim", token: credential.token} :
      credential.paymentId ? {action: "status", paymentId: credential.paymentId, callback: null} :
        {action: "find", grantId: credential.grantId!}));
  }, [credential]);
  const command = manageEventOfferCheckout;

  useEffect(() => {
    scope.current.mounted = true;
    if (!credential) return;
    const stop = watchPublicFormAuthState((next) => {
      const uid = next?.phoneNumber ? next.uid : "";
      if (scope.current.uid === uid && scope.current.initialized) return;
      scope.current.epoch++;
      scope.current.initialized = true;
      scope.current.uid = uid;
      busy.current = false;
      requestId.current = null;
      lastTime.current = 0;
      abortCheckout.current?.abort();
      reset(); setGrant(null); setPayment(null); setAdmission(undefined); setCancellationReview(null);
      setStatus({message: "", tone: ""});
      setUser(uid ? next : null);
      setPhase(uid ? "loading" : "phone");
    });
    return () => {
      stop(); scope.current.mounted = false; scope.current.epoch++;
      busy.current = false;
      challenge.current?.clear(); abortCheckout.current?.abort();
    };
    // The page remounts when the opaque invitation instance changes.
  }, [credential, reset]);

  const load = useCallback(async () => {
    if (!user || !credential) return;
    return run(async () => {
    const epoch = scope.current.epoch;
    try {
      const result = await claim();
      if (!current(epoch)) return;
      lastTime.current = result.serverTimeMillis;
      if (result.grant) rememberOfferGrant(result.grant.grantId);
      if (result.payment) rememberOfferPayment(result.payment.paymentId);
      setGrant(result.grant); setPayment(result.payment); setAdmission(result.admission);
      setPhase(result.grant || result.payment || result.admission ? "ready" : "unavailable");
      setStatus({message: "", tone: ""});
    } catch {
      if (current(epoch)) {
        setPhase("unavailable");
        setStatus({message: eventOfferCopy.claimError, tone: "is-error"});
      }
    }
    });
  }, [user, credential, claim, run]);
  useEffect(() => {void load();}, [load]);

  const apply = useCallback((raw: unknown, epoch: number, expectedId?: string) => {
    const result = assertOfferResponse(raw);
    if (!result.payment) throw new Error("Missing payment result");
    if (expectedId && result.payment.paymentId !== expectedId) throw new Error("Payment mismatch");
    if (!current(epoch) || result.serverTimeMillis < lastTime.current) return null;
    lastTime.current = result.serverTimeMillis;
    rememberOfferPayment(result.payment.paymentId);
    setPayment(result.payment);
    setStatus({message: "", tone: ""});
    return result.payment;
  }, []);
  const check = useCallback(() => run(async () => {
    if (!user || !payment) return;
    const epoch = scope.current.epoch;
    try {
      apply(await command({action: "status", paymentId: payment.paymentId, callback: null}), epoch, payment.paymentId);
    } catch {
      if (current(epoch)) setStatus({message: eventOfferCopy.statusError, tone: "is-error"});
    }
  }), [user, payment, command, apply, run]);
  useEffect(() => {
    if (!payment || ["admitted", "cancelled", "refunded", "reviewRequired"].includes(payment.status)) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [payment?.status, check]);

  const reviewCancellation = () => run(async () => {
    if (!user || !payment || payment.status !== "admitted") return;
    const epoch = scope.current.epoch;
    try {
      const latest = apply(await command({action: "status", paymentId: payment.paymentId,
        callback: null}), epoch, payment.paymentId);
      if (!current(epoch)) return;
      setCancellationReview(latest?.cancellationQuote ? {paymentId: latest.paymentId,
        refundAmountPaise: latest.cancellationQuote.refundAmountPaise} : null);
      if (!latest?.cancellationQuote) setStatus({message: eventOfferCopy.cancelUnavailable, tone: "is-error"});
    } catch {
      if (current(epoch)) setStatus({message: eventOfferCopy.statusError, tone: "is-error"});
    }
  });
  const cancelAdmission = () => run(async () => {
    if (!user || !cancellationReview || payment?.paymentId !== cancellationReview.paymentId) return;
    const epoch = scope.current.epoch;
    try {
      const latest = apply(await command({action: "cancelAdmission", paymentId: cancellationReview.paymentId,
        expectedRefundAmountPaise: cancellationReview.refundAmountPaise}), epoch, cancellationReview.paymentId);
      if (current(epoch) && latest) setCancellationReview(null);
    } catch {
      if (current(epoch)) {
        setCancellationReview(null);
        setStatus({message: eventOfferCopy.cancelError, tone: "is-error"});
      }
    }
  });
  const dismissCancellation = () => {if (!busy.current) setCancellationReview(null);};
  const pay = () => run(async () => {
    if (!user || !grant && !payment?.checkout) return;
    const epoch = scope.current.epoch;
    try {
      if (grant?.freeAdmission) {
        requestId.current ??= crypto.randomUUID();
        const result = assertOfferResponse(await command({action: "acceptFree",
          grantId: grant.grantId, requestId: requestId.current,
          ...grant.freeAdmission}));
        if (!result.admission || result.admission.eventId !== grant.eventId) {
          throw new Error("Missing admission result");
        }
        if (current(epoch)) setAdmission(result.admission);
        return;
      }
      let ready = payment;
      if (!ready) {
        requestId.current ??= crypto.randomUUID();
        ready = apply(await command({action: "prepare", grantId: grant!.grantId,
          requestId: requestId.current, cancellationPolicy: grant!.cancellationPolicy}), epoch);
      } else {
        ready = apply(await command({action: "status", paymentId: ready.paymentId, callback: null}), epoch, ready.paymentId);
      }
      if (!current(epoch) || !ready?.checkout) return;
      const controller = new AbortController();
      abortCheckout.current = controller;
      const callback = await openRazorpayCheckout(ready.checkout, "Catch", controller.signal);
      if (!current(epoch)) return;
      apply(await command({action: "status", paymentId: ready.paymentId, callback}), epoch, ready.paymentId);
    } catch {
      if (current(epoch)) setStatus({message: eventOfferCopy.checkoutError, tone: "is-error"});
    }
  });
  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    return run(async () => {
    const e164 = catchPhoneE164(phone, activePhoneCountry);
    if (!e164) {
      setStatus({message: eventOfferCopy.phoneError, tone: "is-error"}); return;
    }
    const epoch = scope.current.epoch;
    try {
      challenge.current?.clear();
      const next = await beginPublicEventPhoneVerification(e164, recaptchaId);
      if (!current(epoch)) {next.clear(); return;}
      challenge.current = next; setPhase("otp"); setStatus({message: "", tone: ""});
    } catch {
      if (current(epoch)) setStatus({message: eventOfferCopy.sendError, tone: "is-error"});
    }
    });
  };
  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    return run(async () => {
    if (!challenge.current || !/^\d{6}$/u.test(code)) return;
    const epoch = scope.current.epoch;
    try {await challenge.current.confirm(code);}
    catch {
      if (current(epoch)) setStatus({message: eventOfferCopy.codeError, tone: "is-error"});
    }
    });
  };
  const changePhone = () => {
    if (busy.current) return;
    if (user) {
      void signOutGuestUser().catch(() => setStatus({message: eventOfferCopy.codeError, tone: "is-error"}));
    }
    challenge.current?.clear(); challenge.current = null;
    setCode(""); setPhase("phone"); setStatus({message: "", tone: ""});
  };
  return {hasInvitation: credential !== null, phase, phone, setPhone, code, setCode, grant, payment, admission, pending, status,
    cancellationReview, reviewCancellation, cancelAdmission, dismissCancellation,
    recaptchaId, sendCode, verifyCode, changePhone, pay, check, load};
}
