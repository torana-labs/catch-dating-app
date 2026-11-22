import {useCallback, useEffect, useRef, useState, type FormEvent} from "react";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {interpolateContent as fill} from "@content/interpolate";
import {walkthroughBookingCopy as copy} from "@content/walkthroughBooking";
import type {PlaybookLeadForm} from "../../content/playbook/playbookContract";
import {useWalkthroughDeps} from "./walkthroughClientContext";
import {
  newWalkthroughRequest,
  walkthroughDayOf,
  walkthroughProblemFor,
  type WalkthroughBooking,
  type WalkthroughProblem,
  type WalkthroughSlots,
} from "./walkthroughModel";

/** The details bookWalkthrough takes besides the slot and number, keyed as the page's form names its fields. */
export type WalkthroughField = "name" | "orgName" | "whatYouHost";
const fieldLimits: Readonly<Record<WalkthroughField, number>> = {name: 100, orgName: 140, whatYouHost: 200};
const requiredWords: Readonly<Record<WalkthroughField, string>> = {
  name: copy.details.nameRequired,
  orgName: copy.details.organisationRequired,
  whatYouHost: copy.details.whatYouRunRequired,
};
const walkthroughFields = Object.keys(fieldLimits) as WalkthroughField[];

/** The page form's fields this booking asks, in the form's order, with its labels; the name always comes first. */
export function walkthroughFieldsOf(form: PlaybookLeadForm): {name: WalkthroughField; label: string; placeholder?: string}[] {
  const fallback: Readonly<Record<WalkthroughField, string>> = {
    name: copy.details.name, orgName: copy.details.organisation, whatYouHost: copy.details.whatYouRun,
  };
  const shown = (form.fields ?? []).flatMap((field) => walkthroughFields.includes(field.name as WalkthroughField) ?
    [{name: field.name as WalkthroughField, label: field.label, ...(field.placeholder ? {placeholder: field.placeholder} : {})}] : []);
  return shown.some((field) => field.name === "name") ? shown : [{name: "name", label: fallback.name}, ...shown];
}

/**
 * Where the booking stands. `unavailable` shows the page's request form
 * (no open slot, booking closed, or the slots could not be read); `done`
 * holds the booking and the token its manage link carries.
 */
export type WalkthroughStage =
  | {name: "loading"}
  | {name: "unavailable"; reason: "noSlots" | "bookingClosed" | "loadFailed"}
  | {name: "pick"}
  | {name: "details"}
  | {name: "done"; booking: WalkthroughBooking; manageToken: string; phone: string | null};

const typed = (value: string | undefined) => (value ?? "").trim().replace(/\s+/gu, " ");
const sourcePagePattern = /^\/[^\s?#]*$/u;

function sourcePage(): string {
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  return sourcePagePattern.test(path) && path.length <= 512 ? path : "/host/walkthrough/";
}

/**
 * Owns one walkthrough booking: the open slots (getWalkthroughSlots), the
 * chosen day and time, the visitor's details, the code-verified WhatsApp
 * number (the one sign-in sheet) and the booking (bookWalkthrough). A
 * booking attempt keeps its request id and manage token across retries of
 * the same time, so a retry finds the same booking; a new time is a new
 * request. A time taken meanwhile reloads the slots and says so.
 */
export function useWalkthroughBookingController(form: PlaybookLeadForm) {
  const {client, timeZone} = useWalkthroughDeps();
  const [stage, setStage] = useState<WalkthroughStage>({name: "loading"});
  const [slots, setSlots] = useState<WalkthroughSlots | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slotStartAt, setSlotStartAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Partial<Record<WalkthroughField, string>>>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<WalkthroughField, string>>>({});
  const [problem, setProblem] = useState<{problem: WalkthroughProblem; managePath: string | null} | null>(null);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [signIn, setSignIn] = useState(false);
  const request = useRef<{slotStartAt: string; requestId: string; manageToken: string} | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false;};
  }, []);

  /** Reads the open slots; keeps the chosen day when it still has a slot. */
  const load = useCallback(async (keepDay: string | null = null) => {
    setStage({name: "loading"});
    try {
      const next = await client.getSlots();
      if (!mounted.current) return;
      setSlots(next);
      if (!next.bookingOpen) {setStage({name: "unavailable", reason: "bookingClosed"}); return;}
      if (!next.days.length) {setStage({name: "unavailable", reason: "noSlots"}); return;}
      setDay(next.days.some((entry) => entry.date === keepDay) ? keepDay : next.days[0].date);
      setSlotStartAt(null);
      setStage({name: "pick"});
    } catch {
      if (mounted.current) setStage({name: "unavailable", reason: "loadFailed"});
    }
  }, [client]);

  useEffect(() => {void load();}, [load]);

  /** The signed-in account's code-verified number, or null. */
  async function readPhone(): Promise<string | null> {
    try {
      const caller = await client.readCaller();
      const number = caller?.phoneNumber ?? null;
      if (mounted.current) setPhone(number);
      return number;
    } catch {
      return null;
    }
  }

  function pickDay(date: string) {
    setDay(date);
    if (slotStartAt && walkthroughDayOf(slots, slotStartAt)?.date !== date) setSlotStartAt(null);
    setNotice(null);
  }

  function pickSlot(startAt: string) {
    setSlotStartAt(startAt);
    setNotice(null);
  }

  function continueToDetails(event?: FormEvent) {
    event?.preventDefault();
    if (!slotStartAt) {setNotice(copy.pickTime); return;}
    setProblem(null);
    setStage({name: "details"});
    void readPhone();
  }

  function changeTime() {
    setProblem(null);
    setSignIn(false);
    setStage({name: "pick"});
  }

  function problemsOf(): Partial<Record<WalkthroughField, string>> {
    const found: Partial<Record<WalkthroughField, string>> = {};
    for (const field of walkthroughFieldsOf(form)) {
      const value = typed(answers[field.name]);
      if (value.length < (field.name === "name" ? 2 : 1)) found[field.name] = requiredWords[field.name];
      else if (value.length > fieldLimits[field.name]) found[field.name] = fill(copy.details.tooLong, {max: String(fieldLimits[field.name])});
    }
    return found;
  }

  async function book(number: string | null, retried = false): Promise<void> {
    if (!slotStartAt) {setStage({name: "pick"}); return;}
    if (request.current?.slotStartAt !== slotStartAt) request.current = {slotStartAt, ...newWalkthroughRequest()};
    const attempt = request.current;
    const organisation = typed(answers.orgName);
    const whatYouRun = typed(answers.whatYouHost);
    const details = {...(organisation ? {organisation} : {}), ...(whatYouRun ? {whatYouRun} : {})};
    const name = typed(answers.name);
    setBusy(true);
    setProblem(null);
    try {
      const booking = await client.book({
        requestId: attempt.requestId,
        slotStartAt: attempt.slotStartAt,
        manageToken: attempt.manageToken,
        consent: {purpose: "leadFollowUp", version: playbookCopy.leadForm.consentVersion},
        ...(name ? {name} : {}),
        ...(Object.keys(details).length ? {details} : {}),
        sourcePage: sourcePage(),
        entry: form.id,
      });
      if (!mounted.current) return;
      request.current = null;
      setStage({name: "done", booking, manageToken: attempt.manageToken, phone: number});
    } catch (error) {
      if (!mounted.current) return;
      const found = walkthroughProblemFor(error);
      if (found.problem === "request_changed" && !retried) {
        request.current = null;
        await book(number, true);
        return;
      }
      if (found.problem === "slot_taken" || found.problem === "slot_unavailable") {
        request.current = null;
        const keepDay = day;
        await load(keepDay);
        if (mounted.current) setNotice(found.problem === "slot_taken" ? copy.problems.slotTaken : copy.problems.slotUnavailable);
        return;
      }
      if (found.problem === "booking_closed") {
        setStage({name: "unavailable", reason: "bookingClosed"});
        return;
      }
      if (found.problem === "phone" || found.problem === "phone_mismatch") setSignIn(true);
      setProblem(found);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function submitDetails(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    const found = problemsOf();
    setFieldErrors(found);
    if (Object.keys(found).length) return;
    const number = await readPhone();
    if (!number) {setSignIn(true); return;}
    await book(number);
  }

  async function signedIn() {
    setSignIn(false);
    const number = await readPhone();
    if (number) await book(number);
  }

  return {
    stage,
    slots,
    day,
    slotStartAt,
    timeZone,
    notice,
    answers,
    fieldErrors,
    problem,
    busy,
    phone,
    signIn,
    fields: walkthroughFieldsOf(form),
    load: () => void load(day),
    pickDay,
    pickSlot,
    continueToDetails,
    changeTime,
    setAnswer: (field: WalkthroughField) => (value: string) => {
      setAnswers((current) => ({...current, [field]: value}));
      setFieldErrors((current) => {
        if (!(field in current)) return current;
        const next = {...current};
        delete next[field];
        return next;
      });
    },
    submitDetails,
    signedIn,
    closeSignIn: () => setSignIn(false),
    retry: () => void book(phone),
  };
}
export type WalkthroughBookingController = ReturnType<typeof useWalkthroughBookingController>;
