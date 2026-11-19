import {
  createTryItAction,
  type TryItAction,
  type TryItCommandClient,
  type TryItInput,
  type TryItProblem,
  type TryItResponse,
} from "../../shared/api/tryItCommands";
import type {TryItCaller} from "../../firebase";
import {
  tryItKitLinks,
  tryItKitLinksProblem,
  tryItLink,
  type TryItKitLinksProblem,
  type TryItToolKind,
} from "./tryItModel";

/**
 * One try-it tool's flow, as a plain state machine the hook
 * (./useTryItToolController) renders. The order is the command layer's:
 *
 * 1. The visitor pastes a link (and, for the kit, where they promote it).
 * 2. With no phone verified by code, the account step asks for the brand
 *    name and city, and the site's one sign-in sheet confirms the phone.
 *    workspace.ensure previews their private profile and applies once they
 *    confirm; an existing profile is used as it is.
 * 3. The tool's command previews. `running` is polled with the same key;
 *    `needs_input` asks (choose_event lists the events; existing_listing
 *    sends them to claim; no_workspace goes back to step 2); `previewed`
 *    shows the plain-language summary; `refused` shows why.
 * 4. Confirming applies with the same key and the preview's hash. `aborted`
 *    (the result changed) previews again. A retry after an unknown outcome
 *    sends the same key, so the server replays instead of doing it twice.
 *
 * The kit (promotion.create-kit) needs an event the visitor manages, so it
 * follows an event import in the same workspace: the draft this tab made,
 * or one imported as its first step.
 */

export type TryItSummary = TryItResponse<"workspace.ensure">["summary"];
type OrganizerResponse = TryItResponse<"organizer.import-from-link">;
type EventResponse = TryItResponse<"event.import-from-link">;
type KitResponse = TryItResponse<"promotion.create-kit">;
export type TryItOrganizerProposal = NonNullable<OrganizerResponse["result"]["proposal"]>;
export type TryItOrganizerMatch = NonNullable<OrganizerResponse["result"]["match"]>;
export type TryItFoundEvent = EventResponse["result"]["events"][number];
export type TryItEventProposal = NonNullable<EventResponse["result"]["proposal"]>;
export type TryItKitResultLink = KitResponse["result"]["links"][number];

/** The private draft event an event import made, which the kit can use. */
export interface TryItDraftEvent {
  readonly uid: string;
  readonly eventId: string;
  readonly name: string;
  readonly localDate: string;
  readonly localStartTime: string;
}

/** Why a step stopped: a command client problem, a command's refusal (its own words), or a read that took too long. */
export type TryItStopReason = TryItProblem | "refused" | "slow";

export type TryItStage =
  | {readonly name: "start"}
  | {readonly name: "account"}
  | {readonly name: "workspace"; readonly summary: TryItSummary}
  | {readonly name: "working"; readonly summary: TryItSummary | null}
  | {readonly name: "choose"; readonly summary: TryItSummary; readonly events: readonly TryItFoundEvent[]}
  | {readonly name: "review"; readonly step: "organizer"; readonly summary: TryItSummary; readonly proposal: TryItOrganizerProposal;
    readonly match: TryItOrganizerMatch | null}
  | {readonly name: "review"; readonly step: "event"; readonly summary: TryItSummary; readonly proposal: TryItEventProposal}
  | {readonly name: "review"; readonly step: "kit"; readonly summary: TryItSummary; readonly links: readonly TryItKitResultLink[]}
  | {readonly name: "channels"; readonly draft: TryItDraftEvent}
  | {readonly name: "done"; readonly step: "organizer"; readonly summary: TryItSummary; readonly proposal: TryItOrganizerProposal | null}
  | {readonly name: "done"; readonly step: "event"; readonly summary: TryItSummary; readonly draft: TryItDraftEvent; readonly proposal: TryItEventProposal}
  | {readonly name: "done"; readonly step: "kit"; readonly summary: TryItSummary; readonly draft: TryItDraftEvent; readonly links: readonly TryItKitResultLink[]}
  | {readonly name: "listed"; readonly summary: TryItSummary; readonly match: TryItOrganizerMatch}
  | {readonly name: "problem"; readonly reason: TryItStopReason; readonly summary: TryItSummary | null};

export type TryItField = "link" | "brand" | "city" | "channels";
export type TryItFieldProblem = "linkRequired" | "linkInvalid" | "brandRequired" | "cityRequired" | TryItKitLinksProblem;

export interface TryItFlowState {
  readonly tool: TryItToolKind;
  readonly stage: TryItStage;
  readonly busy: boolean;
  readonly link: string;
  readonly channels: string;
  /** Entries of `channels` the visitor marked as a person (lowercased labels). */
  readonly people: ReadonlySet<string>;
  readonly brand: string;
  readonly cityId: string | null;
  readonly fields: Readonly<Partial<Record<TryItField, TryItFieldProblem>>>;
  readonly caller: TryItCaller | null;
  /** Open the site's sign-in sheet: the account step needs a phone verified by code. */
  readonly signIn: boolean;
  /** A draft event from this tab the kit can use without importing one. */
  readonly remembered: TryItDraftEvent | null;
}

export interface TryItFlowDeps {
  readonly client: TryItCommandClient;
  readonly newKey?: () => string;
  /** Waits between polls of a running read. */
  readonly wait?: (ms: number) => Promise<void>;
  readonly remembered?: {read(): TryItDraftEvent | null; write(draft: TryItDraftEvent): void};
  /** How long a running read is polled before the visitor is asked to try again. */
  readonly pollBudgetMs?: number;
}

export interface TryItFlow {
  getState(): TryItFlowState;
  subscribe(listener: () => void): () => void;
  setLink(value: string): void;
  setChannels(value: string): void;
  togglePerson(label: string): void;
  setBrand(value: string): void;
  setCity(cityId: string | null): void;
  /** Step 1: the link (and channels) are in. */
  submit(): Promise<void>;
  /** Step 2: brand and city in; opens the sign-in sheet when no phone is verified yet. */
  continueAccount(): Promise<void>;
  /** The sign-in sheet confirmed the phone. */
  signedIn(): Promise<void>;
  closeSignIn(): void;
  confirmWorkspace(): Promise<void>;
  chooseEvent(eventKey: string): Promise<void>;
  /** Applies the reviewed preview. */
  confirm(): Promise<void>;
  /** The kit: make links for the draft event. */
  makeLinks(): Promise<void>;
  /** The kit: use this tab's draft event instead of importing one. */
  useRemembered(): Promise<void>;
  /** Runs the step that stopped again, with the same key. */
  retry(): Promise<void>;
  /** Back to the link, keeping what was typed; the next try is a new request. */
  startOver(): void;
  /** Takes updates again after dispose, when the same component mounts again. */
  resume(): void;
  /** Stops updates and drops any call in flight. */
  dispose(): void;
}

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const POLL_MIN_MS = 1_000;
const POLL_MAX_MS = 5_000;
const POLL_BUDGET_MS = 180_000;

type Step = "workspace" | "import" | "kit";

export function createTryItFlow(tool: TryItToolKind, deps: TryItFlowDeps): TryItFlow {
  const {client} = deps;
  const wait = deps.wait ?? defaultWait;
  const pollBudgetMs = deps.pollBudgetMs ?? POLL_BUDGET_MS;
  const listeners = new Set<() => void>();
  let disposed = false;
  let state: TryItFlowState = {
    tool, stage: {name: "start"}, busy: false, link: "", channels: "", people: new Set(), brand: "", cityId: null,
    fields: {}, caller: null, signIn: false, remembered: tool === "kit" ? deps.remembered?.read() ?? null : null,
  };
  // One action per thing asked for: the workspace, the import of one link, the kit for one event.
  let workspace: {action: TryItAction<"workspace.ensure">; input: TryItInput<"workspace.ensure">; hash: string | null} | null = null;
  let importing: {link: string; eventKey: string | null; organizer: TryItAction<"organizer.import-from-link"> | null;
    event: TryItAction<"event.import-from-link"> | null; hash: string | null; proposal: TryItOrganizerProposal | null} | null = null;
  let kit: {action: TryItAction<"promotion.create-kit">; input: TryItInput<"promotion.create-kit">; hash: string | null} | null = null;
  let draft: TryItDraftEvent | null = null;
  let lastStep: {step: Step; apply: boolean} = {step: "import", apply: false};
  // Bumped by startOver, so a call still in flight cannot move the new flow.
  let run = 0;

  const set = (patch: Partial<TryItFlowState>) => {
    if (disposed) return;
    state = {...state, ...patch};
    for (const listener of listeners) listener();
  };
  const action = <C extends Parameters<typeof createTryItAction>[1]>(commandId: C) =>
    createTryItAction(client, commandId, deps.newKey);
  const stop = (reason: TryItStopReason, summary: TryItSummary | null = null) =>
    set({busy: false, stage: {name: "problem", reason, summary}});

  async function refreshCaller(): Promise<TryItCaller | null> {
    const caller = await client.caller();
    set({caller});
    return caller;
  }

  function linkProblem(): TryItFieldProblem | null {
    if (!state.link.trim()) return "linkRequired";
    return tryItLink(state.link, tool) ? null : "linkInvalid";
  }

  /** What a problem means for the step it stopped, when the flow can carry on by itself. */
  async function recover(problem: TryItProblem, step: Step, attempt: number): Promise<boolean> {
    if (attempt > 2) return false;
    if (problem === "sign_in") {
      set({busy: false, caller: null, stage: {name: "account"}});
      return true;
    }
    if (problem === "no_workspace") {
      workspace = null;
      set({busy: false, stage: {name: "account"}});
      return true;
    }
    if (problem === "key_reused") {
      // This key already went with another request: this one starts again with a new key.
      (step === "workspace" ? workspace?.action : step === "kit" ? kit?.action : importing?.organizer ?? importing?.event)?.restart();
    } else if (!["changed", "not_ready", "existing_listing", "choose_event"].includes(problem)) {
      return false;
    }
    // Preview again with the same key: the summary shows what is true now.
    if (step === "workspace") await previewWorkspace(attempt + 1);
    else if (step === "kit") await previewKit(attempt + 1);
    else await previewImport(attempt + 1);
    return true;
  }

  async function handleFailure(problem: TryItProblem, step: Step, attempt: number) {
    if (!(await recover(problem, step, attempt))) stop(problem);
  }

  // --- workspace.ensure -------------------------------------------------------------------

  async function previewWorkspace(attempt = 1): Promise<void> {
    if (!workspace) return;
    const mine = run;
    lastStep = {step: "workspace", apply: false};
    set({busy: true});
    const call = await workspace.action.preview(workspace.input);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call.problem, "workspace", attempt);
    const {response} = call;
    if (response.result.exists) {
      // An existing profile is used as it is: every tool writes into it.
      return previewImportOrChannels();
    }
    workspace.hash = response.previewHash;
    set({busy: false, stage: {name: "workspace", summary: response.summary}});
  }

  async function applyWorkspace(attempt = 1): Promise<void> {
    if (!workspace?.hash) return previewWorkspace();
    const mine = run;
    lastStep = {step: "workspace", apply: true};
    set({busy: true});
    const call = await workspace.action.apply(workspace.input, workspace.hash);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call.problem, "workspace", attempt);
    return previewImportOrChannels();
  }

  // --- the tool's import ----------------------------------------------------------------------

  function importFor(link: string) {
    if (!importing || importing.link !== link) {
      importing = {link, eventKey: null, hash: null, proposal: null,
        organizer: tool === "organizer" ? action("organizer.import-from-link") : null,
        event: tool === "organizer" ? null : action("event.import-from-link")};
    }
    return importing;
  }

  async function previewImportOrChannels(): Promise<void> {
    if (tool === "kit" && draft) {
      set({busy: false, stage: {name: "channels", draft}});
      return;
    }
    return previewImport();
  }

  async function previewImport(attempt = 1): Promise<void> {
    const link = tryItLink(state.link, tool);
    if (!link) {
      set({busy: false, stage: {name: "start"}, fields: {link: "linkInvalid"}});
      return;
    }
    const current = importFor(link);
    const mine = run;
    lastStep = {step: "import", apply: false};
    set({busy: true});
    const started = Date.now();
    for (;;) {
      if (current.organizer) {
        const call = await current.organizer.preview({link});
        if (mine !== run) return;
        if (!call.ok) return handleFailure(call.problem, "import", attempt);
        const {response} = call;
        const {result} = response;
        if (response.status === "running") {
          if (Date.now() - started > pollBudgetMs) return stop("slow", response.summary);
          set({stage: {name: "working", summary: response.summary}});
          await wait(Math.min(POLL_MAX_MS, Math.max(POLL_MIN_MS, result.pollAfterMs ?? POLL_MIN_MS)));
          if (mine !== run) return;
          continue;
        }
        if (response.status === "needs_input" && result.reasons.includes("no_workspace")) {
          return void (await recover("no_workspace", "import", 1));
        }
        if (response.status === "needs_input" && result.match) {
          set({busy: false, stage: {name: "listed", summary: response.summary, match: result.match}});
          return;
        }
        if (response.status === "previewed" && result.proposal) {
          current.hash = response.previewHash;
          current.proposal = result.proposal;
          set({busy: false, stage: {name: "review", step: "organizer", summary: response.summary, proposal: result.proposal, match: result.match}});
          return;
        }
        return stop("refused", response.summary);
      }
      if (!current.event) return;
      const input = {link, ...(current.eventKey ? {eventKey: current.eventKey} : {})};
      const call = await current.event.preview(input);
      if (mine !== run) return;
      if (!call.ok) return handleFailure(call.problem, "import", attempt);
      const {response} = call;
      const {result} = response;
      if (response.status === "running") {
        if (Date.now() - started > pollBudgetMs) return stop("slow", response.summary);
        set({stage: {name: "working", summary: response.summary}});
        await wait(Math.min(POLL_MAX_MS, Math.max(POLL_MIN_MS, result.pollAfterMs ?? POLL_MIN_MS)));
        if (mine !== run) return;
        continue;
      }
      if (response.status === "needs_input" && result.reasons.includes("no_workspace")) {
        return void (await recover("no_workspace", "import", 1));
      }
      if (response.status === "needs_input" && result.events.length > 0) {
        set({busy: false, stage: {name: "choose", summary: response.summary, events: result.events}});
        return;
      }
      if (response.status === "previewed" && result.proposal) {
        current.hash = response.previewHash;
        set({busy: false, stage: {name: "review", step: "event", summary: response.summary, proposal: result.proposal}});
        return;
      }
      return stop("refused", response.summary);
    }
  }

  async function applyImport(attempt = 1): Promise<void> {
    const current = importing;
    if (!current?.hash) return previewImport();
    const mine = run;
    lastStep = {step: "import", apply: true};
    set({busy: true});
    if (current.organizer) {
      const call = await current.organizer.apply({link: current.link}, current.hash);
      if (mine !== run) return;
      if (!call.ok) return handleFailure(call.problem, "import", attempt);
      const {response} = call;
      // A long proposal is stored without its events: keep the reviewed one's.
      const proposal = response.result.proposal ?
        {...response.result.proposal, events: response.result.proposal.events.length ? response.result.proposal.events : current.proposal?.events ?? []} :
        current.proposal;
      set({busy: false, stage: {name: "done", step: "organizer", summary: response.summary, proposal}});
      return;
    }
    if (!current.event) return;
    const input = {link: current.link, ...(current.eventKey ? {eventKey: current.eventKey} : {})};
    const call = await current.event.apply(input, current.hash);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call.problem, "import", attempt);
    const {response} = call;
    const {eventId, proposal} = response.result;
    if (!eventId || !proposal) return stop("failed", response.summary);
    draft = {uid: state.caller?.uid ?? "", eventId, name: proposal.name, localDate: proposal.localDate, localStartTime: proposal.localStartTime};
    deps.remembered?.write(draft);
    if (tool === "kit") {
      set({busy: false, remembered: draft, stage: {name: "channels", draft}});
      return;
    }
    set({busy: false, stage: {name: "done", step: "event", summary: response.summary, draft, proposal}});
  }

  // --- promotion.create-kit -----------------------------------------------------------------

  function kitLinks() {
    return tryItKitLinks(state.channels, state.people);
  }

  async function previewKit(attempt = 1): Promise<void> {
    if (!draft) return;
    const links = kitLinks();
    const problem = tryItKitLinksProblem(links);
    if (problem) {
      set({busy: false, fields: {channels: problem}, stage: {name: "channels", draft}});
      return;
    }
    const input = {eventId: draft.eventId, links};
    if (!kit || kit.input.eventId !== draft.eventId) kit = {action: action("promotion.create-kit"), input, hash: null};
    kit.input = input;
    const mine = run;
    lastStep = {step: "kit", apply: false};
    set({busy: true});
    const call = await kit.action.preview(input);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call.problem, "kit", attempt);
    const {response} = call;
    if (response.status === "previewed") {
      kit.hash = response.previewHash;
      set({busy: false, stage: {name: "review", step: "kit", summary: response.summary, links: response.result.links}});
      return;
    }
    if (response.result.reasons.includes("duplicate_label")) {
      set({busy: false, fields: {channels: "channelsDuplicate"}, stage: {name: "channels", draft}});
      return;
    }
    stop("refused", response.summary);
  }

  async function applyKit(attempt = 1): Promise<void> {
    if (!kit?.hash || !draft) return previewKit();
    const mine = run;
    lastStep = {step: "kit", apply: true};
    set({busy: true});
    const call = await kit.action.apply(kit.input, kit.hash);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call.problem, "kit", attempt);
    const {response} = call;
    if (response.status === "refused") return stop("refused", response.summary);
    set({busy: false, stage: {name: "done", step: "kit", summary: response.summary, draft, links: response.result.links}});
  }

  // --- the account step -------------------------------------------------------------------

  function accountProblems(): Partial<Record<TryItField, TryItFieldProblem>> {
    const problems: Partial<Record<TryItField, TryItFieldProblem>> = {};
    if (!state.brand.trim()) problems.brand = "brandRequired";
    if (!state.cityId) problems.city = "cityRequired";
    return problems;
  }

  async function continueAccount(): Promise<void> {
    const problems = accountProblems();
    set({fields: problems});
    if (Object.keys(problems).length > 0 || state.busy) return;
    set({busy: true});
    const caller = await refreshCaller();
    if (!caller?.phoneNumber) {
      set({busy: false, signIn: true});
      return;
    }
    const input = {organizerName: state.brand.trim().replace(/\s+/gu, " ").slice(0, 120), marketId: state.cityId ?? ""};
    if (!workspace || workspace.input.organizerName !== input.organizerName || workspace.input.marketId !== input.marketId) {
      workspace = {action: action("workspace.ensure"), input, hash: null};
    }
    await previewWorkspace();
  }

  async function begin(): Promise<void> {
    set({busy: true});
    const caller = await refreshCaller();
    if (!caller?.phoneNumber) {
      set({busy: false, stage: {name: "account"}});
      return;
    }
    // A verified visitor goes straight to the tool: it answers no_workspace when they have no profile yet.
    await previewImportOrChannels();
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setLink(value) {
      set({link: value, fields: {...state.fields, link: undefined}});
    },
    setChannels(value) {
      set({channels: value, fields: {...state.fields, channels: undefined}});
    },
    togglePerson(label) {
      const key = label.toLowerCase();
      const people = new Set(state.people);
      if (people.has(key)) people.delete(key); else people.add(key);
      set({people, fields: {...state.fields, channels: undefined}});
    },
    setBrand(value) {
      set({brand: value, fields: {...state.fields, brand: undefined}});
    },
    setCity(cityId) {
      set({cityId, fields: {...state.fields, city: undefined}});
    },
    async submit() {
      if (state.busy) return;
      const problem = linkProblem();
      if (problem) {
        set({fields: {link: problem}});
        return;
      }
      draft = null;
      await begin();
    },
    continueAccount,
    async signedIn() {
      set({signIn: false});
      await continueAccount();
    },
    closeSignIn() {
      set({signIn: false});
    },
    confirmWorkspace: () => applyWorkspace(),
    async chooseEvent(eventKey) {
      if (!importing || state.busy) return;
      importing.eventKey = eventKey;
      importing.hash = null;
      await previewImport();
    },
    async confirm() {
      if (state.busy || state.stage.name !== "review") return;
      if (state.stage.step === "kit") await applyKit();
      else await applyImport();
    },
    async makeLinks() {
      if (state.busy) return;
      await previewKit();
    },
    async useRemembered() {
      const remembered = state.remembered;
      if (!remembered || state.busy) return;
      set({busy: true});
      const caller = await refreshCaller();
      if (!caller?.phoneNumber || caller.uid !== remembered.uid) {
        set({busy: false, remembered: null});
        return;
      }
      draft = remembered;
      set({busy: false, stage: {name: "channels", draft}});
    },
    async retry() {
      if (state.busy) return;
      const {step, apply} = lastStep;
      if (step === "workspace") await (apply ? applyWorkspace() : previewWorkspace());
      else if (step === "kit") await (apply ? applyKit() : previewKit());
      else await (apply ? applyImport() : previewImport());
    },
    startOver() {
      run += 1;
      importing = null;
      kit = null;
      draft = null;
      set({busy: false, signIn: false, fields: {}, stage: {name: "start"}});
    },
    resume() {
      disposed = false;
    },
    dispose() {
      // React may unmount and mount the same component again (StrictMode), so
      // a disposed flow can resume; a call still in flight is dropped either way.
      disposed = true;
      run += 1;
    },
  };
}
