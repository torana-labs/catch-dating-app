import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useMutation } from "@tanstack/react-query";
import {
  beginPublicEventPhoneVerification,
  managePublicEventCheckout,
  signOutGuestUser,
  watchPublicFormAuthState,
  type User,
} from "../../firebase";
import { openRazorpayCheckout } from "../../shared/payments/razorpayCheckout";
import { eventOfferCopy } from "../../content/eventOffer";
import { publicCheckoutCopy } from "../../content/events";
import type { FormStatus } from "../../shared/forms/types";
import type { ManagePublicEventCheckoutCallablePayload as Command } from "../../shared/contracts/generated/managePublicEventCheckoutCallablePayload";
import {
  assertPublicCheckoutResponse,
  type PublicQuote,
  type PublicPayment,
  type PublicAdmission,
} from "./publicCheckoutModel";

type Attempt = Extract<Command, { action: "prepare" }>;
type Phase = "loading" | "phone" | "otp" | "ready" | "unavailable";
export function usePublicCheckoutController(
  eventId: string,
  inviteToken: string | null,
  allowNewBookings = true,
  initialPaymentId: string | null = null,
  initialDisplayName = "",
) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState(initialDisplayName);
  const [nameLocked, setNameLocked] = useState(false);
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [payment, setPayment] = useState<PublicPayment | null>(null);
  const [previousPayment, setPreviousPayment] = useState<PublicPayment | null>(
    null,
  );
  const [admission, setAdmission] = useState<PublicAdmission | null>(null);
  const [cancellationReview, setCancellationReview] = useState<{
    paymentId: string;
    refundAmountPaise: number;
  } | null>(null);
  const [status, setStatus] = useState<FormStatus>({ message: "", tone: "" });
  const recaptchaId = `public-checkout-${useId().replace(/[^a-zA-Z0-9_-]/gu, "")}`;
  const challenge = useRef<Awaited<
    ReturnType<typeof beginPublicEventPhoneVerification>
  > | null>(null);
  const checkout = useRef<AbortController | null>(null);
  const scope = useRef({
    epoch: 0,
    uid: "",
    initialized: false,
    mounted: false,
  });
  const busy = useRef(false);
  const attempt = useRef<Attempt | null>(null);
  const lastTime = useRef(0);
  const current = (epoch: number) =>
    scope.current.mounted && epoch === scope.current.epoch;
  const {
    mutateAsync,
    isPending: pending,
    reset,
  } = useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: (action: () => Promise<void>) => action(),
  });
  const run = useCallback(
    async (action: (epoch: number) => Promise<void>, errorMessage: string) => {
      if (busy.current) return;
      const epoch = scope.current.epoch;
      busy.current = true;
      try {
        await mutateAsync(() => action(epoch));
      } catch (error) {
        // The organizer cannot take payments (not connected, or Catch's
        // Razorpay access was revoked): say so honestly; nothing was charged.
        if (current(epoch))
          setStatus({
            message: organizerPaymentsNotReady(error)
              ? publicCheckoutCopy.organizerPaymentsNotReady
              : errorMessage,
            tone: "is-error",
          });
      } finally {
        if (current(epoch)) busy.current = false;
      }
    },
    [mutateAsync],
  );
  const apply = useCallback(
    (raw: unknown, epoch: number, expectedId?: string) => {
      const value = assertPublicCheckoutResponse(raw, eventId, expectedId);
      if (!current(epoch) || value.serverTimeMillis < lastTime.current)
        return null;
      lastTime.current = value.serverTimeMillis;
      setQuote(value.quote);
      setPayment(value.payment);
      setAdmission(value.admission);
      setStatus({ message: "", tone: "" });
      return value;
    },
    [eventId],
  );
  useEffect(() => {
    scope.current.mounted = true;
    scope.current.initialized = false;
    const stop = watchPublicFormAuthState((next) => {
      const uid = next?.phoneNumber ? next.uid : "";
      if (scope.current.initialized && scope.current.uid === uid) return;
      scope.current.epoch++;
      scope.current.uid = uid;
      scope.current.initialized = true;
      busy.current = false;
      attempt.current = null;
      lastTime.current = 0;
      challenge.current?.clear();
      challenge.current = null;
      checkout.current?.abort();
      reset();
      setQuote(null);
      setPayment(null);
      setAdmission(null);
      setCancellationReview(null);
      setPreviousPayment(null);
      setName(initialDisplayName);
      setNameLocked(false);
      setCode("");
      setStatus({ message: "", tone: "" });
      setUser(uid ? next : null);
      setPhase(uid ? "loading" : "phone");
    });
    return () => {
      stop();
      scope.current.mounted = false;
      scope.current.epoch++;
      busy.current = false;
      challenge.current?.clear();
      checkout.current?.abort();
    };
  }, [eventId, initialPaymentId, reset]);
  const load = useCallback(
    (reviewCurrentTerms = false) =>
      run(async (epoch) => {
        if (!user) return;
        const found = apply(
          await managePublicEventCheckout(
            initialPaymentId
              ? {
                  action: "status",
                  paymentId: initialPaymentId,
                  callback: null,
                }
              : { action: "find", eventId },
          ),
          epoch,
          initialPaymentId ?? undefined,
        );
        if (!found || !current(epoch)) return;
        if (!found.payment && !found.admission && allowNewBookings) {
          const result = apply(
            await managePublicEventCheckout({ action: "quote", eventId }),
            epoch,
          );
          if (!result || !current(epoch)) return;
          if (!result.quote) throw new Error("Missing registration quote");
          const key = `catch-public-checkout:${JSON.stringify([user.uid, eventId])}`;
          if (reviewCurrentTerms) {
            clearJournal(key);
            attempt.current = null;
            setNameLocked(false);
          }
          const saved = readJournal(key);
          if (saved) {
            const parsed = JSON.parse(saved) as Attempt;
            if (typeof parsed.displayName === "string")
              setName(parsed.displayName);
            setNameLocked(true);
          }
        }
        setPhase("ready");
      }, publicCheckoutCopy.unavailable),
    [user, eventId, initialPaymentId, apply, run, allowNewBookings],
  );
  useEffect(() => {
    if (user) void load();
  }, [user, load]);
  const check = useCallback(
    () =>
      run(async (epoch) => {
        if (!user || !payment) return;
        apply(
          await managePublicEventCheckout({
            action: "status",
            paymentId: payment.paymentId,
            callback: null,
          }),
          epoch,
          payment.paymentId,
        );
      }, eventOfferCopy.statusError),
    [user, payment, apply, run],
  );
  useEffect(() => {
    if (
      !payment ||
      [
        "admitted",
        "cancelled",
        "refunded",
        "reviewRequired",
        "expired",
      ].includes(payment.status)
    )
      return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [payment, check]);
  const pay = () =>
    run(async (epoch) => {
      if (!user || admission || (!quote && !payment?.checkout)) return;
      let result;
      if (payment)
        result = apply(
          await managePublicEventCheckout({
            action: "status",
            paymentId: payment.paymentId,
            callback: null,
          }),
          epoch,
          payment.paymentId,
        );
      else {
        if (!name.trim()) {
          setStatus({
            message: publicCheckoutCopy.nameError,
            tone: "is-error",
          });
          return;
        }
        // Keep the exact attempt in this tab until the server acknowledges it.
        // A reload first finds the UID-owned ledger; the journal closes the
        // small window where a previous prepare is still reaching the server.
        const key = `catch-public-checkout:${JSON.stringify([user.uid, eventId])}`;
        if (!attempt.current) {
          const saved = readJournal(key);
          if (saved) {
            const parsed = JSON.parse(saved) as Attempt;
            assertPublicCheckoutResponse(
              {
                quote: parsed.reviewedQuote,
                payment: null,
                admission: null,
                serverTimeMillis: 1,
              },
              eventId,
            );
            if (
              parsed.action !== "prepare" ||
              parsed.eventId !== eventId ||
              typeof parsed.requestId !== "string" ||
              !/^[A-Za-z0-9_-]{8,120}$/u.test(parsed.requestId) ||
              typeof parsed.displayName !== "string" ||
              !parsed.displayName.trim() ||
              parsed.displayName.length > 120 ||
              (parsed.inviteToken !== null &&
                typeof parsed.inviteToken !== "string")
            )
              throw new Error("Invalid attempt journal");
            if (
              JSON.stringify(parsed.reviewedQuote) !== JSON.stringify(quote) ||
              parsed.displayName !== name.trim()
            ) {
              throw new Error("Review the original attempt before retrying");
            }
            attempt.current = parsed;
          } else
            attempt.current = {
              action: "prepare",
              eventId,
              requestId: crypto.randomUUID(),
              displayName: name.trim(),
              reviewedQuote: quote!,
              inviteToken,
            };
          writeJournal(key, JSON.stringify(attempt.current));
        }
        setNameLocked(true);
        result = apply(await managePublicEventCheckout(attempt.current), epoch);
        if (current(epoch) && (result?.payment || result?.admission))
          clearJournal(key);
      }
      if (!current(epoch) || !result?.payment?.checkout) return;
      const ready = result.payment;
      checkout.current = new AbortController();
      const callback = await openRazorpayCheckout(
        ready.checkout!,
        "Catch",
        checkout.current.signal,
      );
      if (!current(epoch)) return;
      apply(
        await managePublicEventCheckout({
          action: "status",
          paymentId: ready.paymentId,
          callback,
        }),
        epoch,
        ready.paymentId,
      );
    }, eventOfferCopy.checkoutError);
  const startAgain = () =>
    run(async (epoch) => {
      if (
        !user ||
        !payment ||
        !allowNewBookings ||
        !["expired", "refunded", "cancelled"].includes(payment.status)
      )
        return;
      const prior = apply(
        await managePublicEventCheckout({
          action: "status",
          paymentId: payment.paymentId,
          callback: null,
        }),
        epoch,
        payment.paymentId,
      )?.payment;
      if (
        !current(epoch) ||
        !prior ||
        !["expired", "refunded", "cancelled"].includes(prior.status)
      )
        return;
      const fresh = apply(
        await managePublicEventCheckout({ action: "quote", eventId }),
        epoch,
      );
      if (!current(epoch) || !fresh?.quote) return;
      setPreviousPayment(prior);
      attempt.current = null;
      setNameLocked(false);
      clearJournal(
        `catch-public-checkout:${JSON.stringify([user.uid, eventId])}`,
      );
    }, publicCheckoutCopy.quoteChanged);
  const reviewCancellation = () =>
    run(async (epoch) => {
      if (!user || !payment || !admission) return;
      const result = apply(
        await managePublicEventCheckout({
          action: "status",
          paymentId: payment.paymentId,
          callback: null,
        }),
        epoch,
        payment.paymentId,
      );
      if (!current(epoch)) return;
      setCancellationReview(
        result?.payment?.cancellationQuote
          ? {
              paymentId: payment.paymentId,
              refundAmountPaise:
                result.payment.cancellationQuote.refundAmountPaise,
            }
          : null,
      );
    }, eventOfferCopy.cancelUnavailable);
  const cancelAdmission = () =>
    run(async (epoch) => {
      if (
        !user ||
        !cancellationReview ||
        cancellationReview.paymentId !== payment?.paymentId
      )
        return;
      try {
        apply(
          await managePublicEventCheckout({
            action: "cancelAdmission",
            paymentId: cancellationReview.paymentId,
            expectedRefundAmountPaise: cancellationReview.refundAmountPaise,
          }),
          epoch,
          payment.paymentId,
        );
      } finally {
        if (current(epoch)) setCancellationReview(null);
      }
    }, eventOfferCopy.cancelError);
  const sendCode = (event: FormEvent) => {
    event.preventDefault();
    return run(async (epoch) => {
      if (!/^\+[1-9][0-9]{7,14}$/u.test(phone.trim())) {
        setStatus({ message: eventOfferCopy.phoneError, tone: "is-error" });
        return;
      }
      challenge.current?.clear();
      const next = await beginPublicEventPhoneVerification(
        phone.trim(),
        recaptchaId,
      );
      if (!current(epoch)) {
        next.clear();
        return;
      }
      challenge.current = next;
      setPhase("otp");
      setStatus({ message: "", tone: "" });
    }, eventOfferCopy.sendError);
  };
  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    let verifiedSameSession = false;
    await run(async (epoch) => {
      if (!challenge.current || !/^\d{6}$/u.test(code)) return;
      const verified = await challenge.current.confirm(code);
      verifiedSameSession = current(epoch) && user?.uid === verified.uid;
    }, eventOfferCopy.codeError);
    if (verifiedSameSession) await load();
  };
  const changePhone = () => {
    if (busy.current) return;
    if (user) {
      void signOutGuestUser().catch(() => setStatus({message: eventOfferCopy.codeError, tone: "is-error"}));
    }
    challenge.current?.clear();
    challenge.current = null;
    setCode("");
    setPhase("phone");
    setStatus({ message: "", tone: "" });
  };
  return {
    allowNewBookings,
    phase,
    phone,
    setPhone,
    code,
    setCode,
    name,
    nameLocked,
    setName,
    quote,
    payment,
    previousPayment,
    admission,
    user,
    pending,
    status,
    recaptchaId,
    sendCode,
    verifyCode,
    changePhone,
    pay,
    check,
    load,
    startAgain,
    cancellationReview,
    reviewCancellation,
    cancelAdmission,
    dismissCancellation: () => {
      if (!busy.current) setCancellationReview(null);
    },
  };
}

// Storage improves reload recovery; the server's UID-owned ledger and seat
// authority remain authoritative when a browser disables session storage.
function readJournal(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeJournal(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* In-memory retry remains stable. */
  }
}
function clearJournal(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* No persisted journal. */
  }
}

/** The callable refused because the organizer's payment account is not ready. */
export function organizerPaymentsNotReady(error: unknown): boolean {
  const details = (error as {details?: unknown} | null)?.details;
  return typeof details === "object" && details !== null &&
    (details as {reason?: unknown}).reason === "organizerPaymentsNotReady";
}
