import {useState} from "react";
import {trackMarketingEvent} from "../../analytics";
import {weddingsCopy} from "@content/weddings";
import {
  clearStepOne,
  initialStepOneDraft,
  initialStepTwoDraft,
  readStepOne,
  saveStepOne,
  stepOneIsComplete,
  toggleOption,
  type WeddingsStepOneDraft,
  type WeddingsStepTwoDraft,
  type WeddingsSubmit,
} from "./weddingsModel";

/** Step 1's fields and whether they are ready to continue. */
export function useWeddingsStepOne(initial: WeddingsStepOneDraft = initialStepOneDraft) {
  const [draft, setDraft] = useState<WeddingsStepOneDraft>(initial);
  return {
    draft,
    complete: stepOneIsComplete(draft),
    update: <K extends keyof WeddingsStepOneDraft>(key: K, value: WeddingsStepOneDraft[K]) =>
      setDraft((current) => ({...current, [key]: value})),
    toggleTool: (tool: string) => setDraft((current) => ({...current, tools: toggleOption(current.tools, tool)})),
  };
}

export type WeddingsStepOne = ReturnType<typeof useWeddingsStepOne>;

/**
 * The landing's state: the illustrative guest reply (its ticks change nothing
 * outside the page) and the step-1 card, whose Continue hands its answers to
 * the application page in this tab.
 */
export function useWeddingsLandingController() {
  const people = weddingsCopy.follow.invite.phone.people;
  const [coming, setComing] = useState<readonly string[]>(people);
  const stepOne = useWeddingsStepOne();
  return {
    coming,
    toggleComing: (person: string) => setComing((current) => toggleOption(current, person)),
    stepOne,
    /** Called as the Continue link opens the application page. */
    continueToApply: () => {
      saveStepOne(stepOne.draft);
      trackMarketingEvent("weddings_apply_step", {step: 1, surface: "landing"});
    },
  };
}

export type WeddingsLandingController = ReturnType<typeof useWeddingsLandingController>;

export type WeddingsApplicationStage = "stepOne" | "stepTwo" | "sent";

/**
 * The application page: step 1 again when the landing did not hand it over,
 * then step 2, then the sent state. `submit` is the intake front door (the
 * page passes the waitlist route's); without one the application cannot be
 * sent.
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
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateStepTwo<K extends keyof WeddingsStepTwoDraft>(key: K, value: WeddingsStepTwoDraft[K]) {
    if (sending) return;
    setStepTwo((current) => ({...current, [key]: value}));
  }

  function continueToStepTwo() {
    if (!stepOne.complete) return;
    saveStepOne(stepOne.draft);
    trackMarketingEvent("weddings_apply_step", {step: 1, surface: "application"});
    setStage("stepTwo");
  }

  async function send() {
    if (!submit || sending || !stepOne.complete) return;
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
    sending,
    error,
    canSend: Boolean(submit) && stepOne.complete && !sending,
    continueToStepTwo,
    updateStepTwo,
    toggleWant: (want: string) => updateStepTwo("wants", toggleOption(stepTwo.wants, want)),
    send,
  };
}

export type WeddingsApplicationController = ReturnType<typeof useWeddingsApplicationController>;
