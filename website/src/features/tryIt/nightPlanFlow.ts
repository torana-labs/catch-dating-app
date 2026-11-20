import type {NightPlanFormat} from "@content/nightPlanTryIt";
import type {TryItCaller, TryItRehearsalPayload} from "../../firebase";
import {
  createTryItAction,
  tryItProblemFor,
  type TryItAction,
  type TryItCommandClient,
  type TryItInput,
  type TryItProblem,
  type TryItResponse,
} from "../../shared/api/tryItCommands";
import type {TryItDraftEvent, TryItFlowDeps} from "./tryItFlow";
import {
  isNightPlanFormat,
  nightPlanGuestCount,
  nightRehearsalGuestUrl,
  nightRehearsalPayload,
  nightRehearsalSeed,
  type NightPlan,
  type NightPlanInput,
  type NightRehearsalSetup,
} from "./nightPlanModel";

/**
 * The plan-a-night tool's flow, as a plain state machine the hook
 * (./useNightPlanController) renders. The order is the command layer's, as
 * in the link tools (features/tryIt/tryItFlow.ts):
 *
 * 1. The visitor picks a format and a head count.
 * 2. With no phone verified by code, the account step asks for the brand
 *    name and city and the site's sign-in sheet confirms the phone;
 *    workspace.ensure previews their private profile and applies once they
 *    confirm. An existing profile is used as it is.
 * 3. night.plan previews. `needs_input` with no_workspace goes back to step
 *    2. Any answer with a plan (previewed, or refused with its reasons) shows
 *    the plan: groups, the mixing moment, the run of show and the missions.
 * 4. "Try it with a friend" starts a practice session from the plan's
 *    rehearsal setup (createEventRehearsal) and shows its guest link.
 * 5. "Save to my event", offered when this tab's event import left a draft
 *    for this account, applies night.plan with the same key and the
 *    preview's hash. A refusal (event_format_mismatch, no_draft_event…) is
 *    said plainly and the plan stays on screen.
 */

type PlanResponse = TryItResponse<"night.plan">;
export type NightSummary = PlanResponse["summary"];

/** Why a step stopped: a command client problem, or a refusal with no plan to show. */
export type NightStopReason = TryItProblem | "refused";

export type NightSaveState =
  | {readonly name: "idle"}
  | {readonly name: "saved"; readonly summary: NightSummary}
  | {readonly name: "refused"; readonly reasons: readonly string[]; readonly summary: NightSummary}
  | {readonly name: "problem"; readonly problem: TryItProblem};

export type NightRehearsalState =
  | {readonly name: "idle"}
  | {readonly name: "ready"; readonly guestUrl: string}
  | {readonly name: "problem"; readonly problem: TryItProblem};

export interface NightPlanShown {
  readonly plan: NightPlan;
  readonly status: PlanResponse["status"];
  readonly reasons: readonly string[];
  readonly summary: NightSummary;
  readonly organizerId: string | null;
  readonly rehearsalSetup: NightRehearsalSetup | null;
}

export type NightStage =
  | {readonly name: "start"}
  | {readonly name: "account"}
  | {readonly name: "workspace"; readonly summary: NightSummary}
  | {readonly name: "working"}
  | ({readonly name: "plan"} & NightPlanShown)
  | {readonly name: "problem"; readonly reason: NightStopReason; readonly summary: NightSummary | null};

export type NightField = "format" | "guests" | "brand" | "city";
export type NightFieldProblem = "formatRequired" | "guestsInvalid" | "brandRequired" | "cityRequired";

/** What is in flight: one thing at a time, so the view shows the right button as busy. */
export type NightBusy = null | "plan" | "save" | "rehearsal";

export interface NightPlanFlowState {
  readonly stage: NightStage;
  readonly busy: NightBusy;
  readonly format: NightPlanFormat | null;
  readonly guests: string;
  readonly brand: string;
  readonly cityId: string | null;
  readonly fields: Readonly<Partial<Record<NightField, NightFieldProblem>>>;
  readonly caller: TryItCaller | null;
  /** Open the site's sign-in sheet: the account step needs a phone verified by code. */
  readonly signIn: boolean;
  /** This tab's draft event for the signed-in account, which the plan can be saved to. */
  readonly draft: TryItDraftEvent | null;
  readonly save: NightSaveState;
  readonly rehearsal: NightRehearsalState;
}

/** createEventRehearsal as the tool calls it: one call that never throws. */
export type NightRehearsalStart = (payload: TryItRehearsalPayload) => Promise<{ok: true; guestUrl: string} | {ok: false; problem: TryItProblem}>;

export interface NightPlanFlowDeps {
  readonly client: TryItCommandClient;
  readonly rehearse: NightRehearsalStart;
  readonly newKey?: () => string;
  readonly seed?: () => number;
  /** This tab's draft event, as the link tools remember it (features/tryIt). */
  readonly remembered?: TryItFlowDeps["remembered"];
}

export interface NightPlanFlow {
  getState(): NightPlanFlowState;
  subscribe(listener: () => void): () => void;
  setFormat(value: string | null): void;
  setGuests(value: string): void;
  setBrand(value: string): void;
  setCity(cityId: string | null): void;
  /** Step 1: format and head count are in. */
  submit(): Promise<void>;
  /** Step 2: brand and city in; opens the sign-in sheet when no phone is verified yet. */
  continueAccount(): Promise<void>;
  /** The sign-in sheet confirmed the phone. */
  signedIn(): Promise<void>;
  closeSignIn(): void;
  confirmWorkspace(): Promise<void>;
  /** Starts a practice session from the plan. */
  tryWithFriend(): Promise<void>;
  /** Saves the plan on this tab's draft event. */
  save(): Promise<void>;
  /** Runs the step that stopped again, with the same key. */
  retry(): Promise<void>;
  /** Back to the fields, keeping what was typed; the next plan is a new request. */
  startOver(): void;
  resume(): void;
  dispose(): void;
}

type Step = "workspace" | "plan";

/** The site's practice session starter: createEventRehearsal through the site's Firebase, its failures named like a command's. */
export const siteNightRehearsal: NightRehearsalStart = async (payload) => {
  try {
    const response = await (await import("../../firebase")).createTryItRehearsal(payload);
    const guestUrl = nightRehearsalGuestUrl(response?.guestUrl);
    return guestUrl ? {ok: true, guestUrl} : {ok: false, problem: "failed"};
  } catch (error) {
    return {ok: false, problem: tryItProblemFor(error).problem};
  }
};

export function createNightPlanFlow(deps: NightPlanFlowDeps): NightPlanFlow {
  const {client} = deps;
  const listeners = new Set<() => void>();
  let disposed = false;
  let state: NightPlanFlowState = {
    stage: {name: "start"}, busy: null, format: null, guests: "", brand: "", cityId: null, fields: {}, caller: null,
    signIn: false, draft: null, save: {name: "idle"}, rehearsal: {name: "idle"},
  };
  let workspace: {action: TryItAction<"workspace.ensure">; input: TryItInput<"workspace.ensure">; hash: string | null} | null = null;
  // One action per plan asked for: the same format, head count and draft keep the key.
  let planning: {action: TryItAction<"night.plan">; input: NightPlanInput; hash: string | null} | null = null;
  let lastStep: Step = "plan";
  // Bumped by startOver and dispose, so a call still in flight cannot move the new flow.
  let run = 0;

  const set = (patch: Partial<NightPlanFlowState>) => {
    if (disposed) return;
    state = {...state, ...patch};
    for (const listener of listeners) listener();
  };
  const stop = (reason: NightStopReason, summary: NightSummary | null = null) =>
    set({busy: null, stage: {name: "problem", reason, summary}});

  async function refreshCaller(): Promise<TryItCaller | null> {
    const caller = await client.caller();
    // The draft the link tools remembered counts only for the account that made it.
    const remembered = deps.remembered?.read() ?? null;
    set({caller, draft: caller?.phoneNumber && remembered && remembered.uid === caller.uid ? remembered : null});
    return caller;
  }

  function fieldProblems(): Partial<Record<NightField, NightFieldProblem>> {
    const problems: Partial<Record<NightField, NightFieldProblem>> = {};
    if (!state.format) problems.format = "formatRequired";
    if (nightPlanGuestCount(state.guests) === null) problems.guests = "guestsInvalid";
    return problems;
  }

  function planInput(): NightPlanInput | null {
    const guestCount = nightPlanGuestCount(state.guests);
    if (!state.format || guestCount === null) return null;
    return {format: state.format, guestCount, ...(state.draft ? {eventId: state.draft.eventId} : {})};
  }

  /** What a problem means for the step it stopped, when the flow can carry on by itself. */
  async function recover(problem: TryItProblem, step: Step, attempt: number): Promise<boolean> {
    if (attempt > 2) return false;
    if (problem === "sign_in") {
      set({busy: null, caller: null, stage: {name: "account"}});
      return true;
    }
    if (problem === "no_workspace") {
      workspace = null;
      set({busy: null, stage: {name: "account"}});
      return true;
    }
    if (problem === "key_reused") (step === "workspace" ? workspace?.action : planning?.action)?.restart();
    else if (problem !== "changed" && problem !== "not_ready") return false;
    // Preview again with the same key: the plan shows what is true now.
    if (step === "workspace") await previewWorkspace(attempt + 1);
    else await previewPlan(attempt + 1);
    return true;
  }

  async function handleFailure(problem: TryItProblem, step: Step, attempt: number) {
    if (!(await recover(problem, step, attempt))) stop(problem);
  }

  // --- workspace.ensure ---------------------------------------------------------------------

  async function previewWorkspace(attempt = 1): Promise<void> {
    if (!workspace) return;
    const mine = run;
    lastStep = "workspace";
    set({busy: "plan"});
    const call = await workspace.action.preview(workspace.input);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call.problem, "workspace", attempt);
    if (call.response.result.exists) return previewPlan();
    workspace.hash = call.response.previewHash;
    set({busy: null, stage: {name: "workspace", summary: call.response.summary}});
  }

  async function applyWorkspace(attempt = 1): Promise<void> {
    if (!workspace?.hash) return previewWorkspace();
    const mine = run;
    lastStep = "workspace";
    set({busy: "plan"});
    const call = await workspace.action.apply(workspace.input, workspace.hash);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call.problem, "workspace", attempt);
    return previewPlan();
  }

  // --- night.plan -----------------------------------------------------------------------------

  function planFor(input: NightPlanInput) {
    if (!planning || JSON.stringify(planning.input) !== JSON.stringify(input)) {
      planning = {action: createTryItAction(client, "night.plan", deps.newKey), input, hash: null};
    }
    return planning;
  }

  function show(response: PlanResponse): boolean {
    const {plan, rehearsalSetup, organizerId, reasons} = response.result;
    if (!plan) return false;
    set({busy: null, save: {name: "idle"}, rehearsal: {name: "idle"},
      stage: {name: "plan", plan, status: response.status, reasons, summary: response.summary, organizerId, rehearsalSetup}});
    return true;
  }

  async function previewPlan(attempt = 1): Promise<void> {
    const input = planInput();
    if (!input) {
      set({busy: null, stage: {name: "start"}, fields: fieldProblems()});
      return;
    }
    const current = planFor(input);
    const mine = run;
    lastStep = "plan";
    set({busy: "plan", stage: {name: "working"}});
    const call = await current.action.preview(input);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call.problem, "plan", attempt);
    const {response} = call;
    if (response.status === "needs_input" && response.result.reasons.includes("no_workspace")) {
      return void (await recover("no_workspace", "plan", 1));
    }
    // A refused answer still carries the plan when there is one: it is drawn, with the reason.
    current.hash = response.result.plan ? response.previewHash : null;
    if (!show(response)) stop("refused", response.summary);
  }

  async function applyPlan(): Promise<void> {
    const current = planning;
    if (!current?.hash || state.stage.name !== "plan") return;
    const mine = run;
    set({busy: "save", save: {name: "idle"}});
    const call = await current.action.apply(current.input, current.hash);
    if (mine !== run) return;
    if (!call.ok) {
      if (call.problem === "no_workspace" || call.problem === "sign_in") return void (await recover(call.problem, "plan", 1));
      if (call.problem === "changed") return previewPlan();
      set({busy: null, save: {name: "problem", problem: call.problem}});
      return;
    }
    const {response} = call;
    if (response.status === "needs_input" && response.result.reasons.includes("no_workspace")) {
      return void (await recover("no_workspace", "plan", 1));
    }
    if (response.status === "applied" || response.status === "replayed") {
      set({busy: null, save: {name: "saved", summary: response.summary}});
      return;
    }
    set({busy: null, save: {name: "refused", reasons: response.result.reasons, summary: response.summary}});
  }

  // --- createEventRehearsal -------------------------------------------------------------------

  async function startRehearsal(): Promise<void> {
    const {stage} = state;
    if (stage.name !== "plan" || !stage.organizerId || !stage.rehearsalSetup) return;
    const mine = run;
    set({busy: "rehearsal", rehearsal: {name: "idle"}});
    const result = await deps.rehearse(nightRehearsalPayload({organizerId: stage.organizerId, plan: stage.plan,
      setup: stage.rehearsalSetup, seed: (deps.seed ?? nightRehearsalSeed)()}));
    if (mine !== run) return;
    set({busy: null, rehearsal: result.ok ? {name: "ready", guestUrl: result.guestUrl} : {name: "problem", problem: result.problem}});
  }

  // --- the account step -----------------------------------------------------------------------

  async function continueAccount(): Promise<void> {
    const problems: Partial<Record<NightField, NightFieldProblem>> = {};
    if (!state.brand.trim()) problems.brand = "brandRequired";
    if (!state.cityId) problems.city = "cityRequired";
    set({fields: problems});
    if (Object.keys(problems).length > 0 || state.busy) return;
    set({busy: "plan"});
    const caller = await refreshCaller();
    if (!caller?.phoneNumber) {
      set({busy: null, signIn: true});
      return;
    }
    const input = {organizerName: state.brand.trim().replace(/\s+/gu, " ").slice(0, 120), marketId: state.cityId ?? ""};
    if (!workspace || workspace.input.organizerName !== input.organizerName || workspace.input.marketId !== input.marketId) {
      workspace = {action: createTryItAction(client, "workspace.ensure", deps.newKey), input, hash: null};
    }
    await previewWorkspace();
  }

  async function submit(): Promise<void> {
    if (state.busy) return;
    const problems = fieldProblems();
    set({fields: problems});
    if (Object.keys(problems).length > 0) return;
    set({busy: "plan"});
    const caller = await refreshCaller();
    if (!caller?.phoneNumber) {
      set({busy: null, stage: {name: "account"}});
      return;
    }
    // A verified visitor goes straight to the plan: it answers no_workspace when they have no profile yet.
    await previewPlan();
  }

  /** A step that throws (a bug, or a browser without crypto) stops with a plain failure instead of staying busy. */
  const guarded = (work: () => Promise<void>) => async (): Promise<void> => {
    try {
      await work();
    } catch {
      stop("failed");
    }
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setFormat(value) {
      set({format: isNightPlanFormat(value) ? value : null, fields: {...state.fields, format: undefined}});
    },
    setGuests(value) {
      set({guests: value, fields: {...state.fields, guests: undefined}});
    },
    setBrand(value) {
      set({brand: value, fields: {...state.fields, brand: undefined}});
    },
    setCity(cityId) {
      set({cityId, fields: {...state.fields, city: undefined}});
    },
    submit: guarded(submit),
    continueAccount: guarded(continueAccount),
    signedIn: guarded(async () => {
      set({signIn: false});
      await continueAccount();
    }),
    closeSignIn() {
      set({signIn: false});
    },
    confirmWorkspace: guarded(() => applyWorkspace()),
    tryWithFriend: guarded(async () => {
      if (!state.busy) await startRehearsal();
    }),
    save: guarded(async () => {
      if (!state.busy && state.draft) await applyPlan();
    }),
    retry: guarded(async () => {
      if (state.busy) return;
      if (lastStep === "workspace") await (workspace?.hash ? applyWorkspace() : previewWorkspace());
      else await previewPlan();
    }),
    startOver() {
      run += 1;
      planning = null;
      set({busy: null, signIn: false, fields: {}, stage: {name: "start"}, save: {name: "idle"}, rehearsal: {name: "idle"}});
    },
    resume() {
      disposed = false;
    },
    dispose() {
      // React may unmount and mount the same component again (StrictMode); a call in flight is dropped either way.
      disposed = true;
      run += 1;
    },
  };
}
