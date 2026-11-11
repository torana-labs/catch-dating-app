import {useState} from "react";
import {trackMarketingEvent} from "../../analytics";
import {
  clearStepOne,
  initialStepOneDraft,
  initialStepTwoDraft,
  readStepOne,
  saveStepOne,
  stepOneErrors,
  stepOneIsComplete,
  stepTwoErrors,
  toggleOption,
  type WeddingsErrors,
  type WeddingsStepOneDraft,
  type WeddingsStepTwoDraft,
  type WeddingsSubmit,
} from "./weddingsModel";

/**
 * Step 1's fields. Errors show once Continue has been tried, and each clears
 * as its field is answered.
 */
export function useWeddingsStepOne(initial: WeddingsStepOneDraft = initialStepOneDraft) {
  const [draft, setDraft] = useState<WeddingsStepOneDraft>(initial);
  const [tried, setTried] = useState(false);
  const errors: WeddingsErrors<WeddingsStepOneDraft> = tried ? stepOneErrors(draft) : {};
  return {
    draft,
    errors,
    complete: stepOneIsComplete(draft),
    update: <K extends keyof WeddingsStepOneDraft>(key: K, value: WeddingsStepOneDraft[K]) =>
      setDraft((current) => ({...current, [key]: value})),
    toggleTool: (tool: string) => setDraft((current) => ({...current, tools: toggleOption(current.tools, tool)})),
    /** Shows what is missing; true when step 1 is complete. */
    attempt: () => {
      setTried(true);
      return stepOneIsComplete(draft);
    },
  };
}

export type WeddingsStepOne = ReturnType<typeof useWeddingsStepOne>;

/**
 * The landing's state: the step-1 card, whose Continue hands its answers to
 * the application page in this tab once they are complete.
 */
export function useWeddingsLandingController() {
  const stepOne = useWeddingsStepOne();
  return {
    stepOne,
    /** Continue: shows what is missing, or hands the answers over as the link opens the application page. */
    continueToApply: () => {
      if (!stepOne.attempt()) return;
      saveStepOne(stepOne.draft);
      trackMarketingEvent("weddings_apply_step", {step: 1, surface: "landing"});
    },
  };
}

export type WeddingsLandingController = ReturnType<typeof useWeddingsLandingController>;

export type WeddingsApplicationStage = "stepOne" | "stepTwo" | "sent";

/**
 * The application page: step 1 again when the landing did not hand it over,
 * then step 2 (every answer starts empty and all but the note are required),
 * then the sent state, which can reopen the answers. `submit` is the intake
 * front door (the page passes the waitlist route's); without one the
 * application cannot be sent.
 */
export function useWeddingsApplicationController({submit, initialStepOne}: {
  submit?: WeddingsSubmit;
  initialStepOne?: WeddingsStepOneDraft | null;
} = {}) {
  const [handedOver] = useState(() => initialStepOne === undefined ? readStepOne() : initialStepOne);
  const stepOne = useWeddingsStepOne(handedOver ?? initialStepOneDraft);
  const [stage, setStage] = useState<WeddingsApplicationStage>(
    handedOver && stepOneIsComplete(handedOver) ? "stepTwo" : "stepOne");
  const [stepTwo, setStepTwo] = useState<WeddingsStepTwoDraft>(initialStepTwoDraft);
  const [triedSend, setTriedSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stepTwoErrorsShown: WeddingsErrors<WeddingsStepTwoDraft> = triedSend ? stepTwoErrors(stepTwo) : {};

  function updateStepTwo<K extends keyof WeddingsStepTwoDraft>(key: K, value: WeddingsStepTwoDraft[K]) {
    if (sending) return;
    setStepTwo((current) => ({...current, [key]: value}));
  }

  function continueToStepTwo() {
    if (!stepOne.attempt()) return;
    saveStepOne(stepOne.draft);
    trackMarketingEvent("weddings_apply_step", {step: 1, surface: "application"});
    setStage("stepTwo");
  }

  async function send() {
    setTriedSend(true);
    if (!submit || sending || !stepOne.complete || Object.keys(stepTwoErrors(stepTwo)).length) return;
    setSending(true);
    setError(null);
    try {
      await submit({...stepOne.draft, ...stepTwo});
      clearStepOne();
      trackMarketingEvent("weddings_apply_step", {step: 2, surface: "application"});
      setStage("sent");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setSending(false);
    }
  }

  return {
    stage,
    stepOne,
    stepTwo,
    stepTwoErrors: stepTwoErrorsShown,
    sending,
    error,
    canSend: Boolean(submit) && !sending,
    continueToStepTwo,
    /** Back to step 1 from step 2, keeping both steps' answers. */
    changeStepOne: () => setStage("stepOne"),
    /** Back to step 2 from the sent state, to edit the answers. */
    reopen: () => setStage("stepTwo"),
    updateStepTwo,
    toggleWant: (want: string) => updateStepTwo("wants", toggleOption(stepTwo.wants, want)),
    send,
  };
}

export type WeddingsApplicationController = ReturnType<typeof useWeddingsApplicationController>;
