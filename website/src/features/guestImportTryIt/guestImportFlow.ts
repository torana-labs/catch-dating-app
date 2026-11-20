import {
  createTryItAction,
  type TryItAction,
  type TryItCall,
  type TryItCommandClient,
  type TryItCommandId,
  type TryItInput,
  type TryItProblem,
  type TryItResponse,
} from "../../shared/api/tryItCommands";
import type {TryItCaller} from "../../firebase";
import {
  emptyGuestMapping,
  guestFileProblem,
  guestMappingProblem,
  guestStartingMapping,
  isGuestFileRefusal,
  isGuestMappingRefusal,
  type GuestColumnShape,
  type GuestFileProblem,
  type GuestFileRefusal,
  type GuestImportInput,
  type GuestImportResult,
  type GuestMappedField,
  type GuestMapping,
  type GuestMappingProblem,
} from "./guestImportModel";

/**
 * The guest-list try-it tool's flow (guests.import-list, website surface),
 * as a plain state machine the hook (./useGuestImportController) renders.
 * It follows the try-it protocol of features/tryIt/tryItFlow.ts:
 *
 * 1. The visitor chooses a CSV or Excel file. It is checked in the browser
 *    (type, empty, 5 MB) and sent nowhere yet.
 * 2. With no phone verified by code, the account step asks for the brand
 *    name and city, and the site's one sign-in sheet confirms the phone;
 *    workspace.ensure previews their private profile and applies once they
 *    confirm. The file is read and sent only after this step.
 * 3. guests.import-list previews with no event named, so the guests go on
 *    the workspace's private draft event. `needs_input` (needsMapping) asks
 *    which column is which and previews again with the visitor's mapping;
 *    `previewed` shows the review: counts, columns, rows that need a look
 *    (which the visitor can leave out and preview again), and the merge
 *    and tag suggestions. A no_workspace refusal goes back to step 2.
 * 4. Saving applies with the same idempotency key and the preview's hash
 *    (`confirm.previewHash`), sending exactly the input that was previewed.
 *    A changed preview or a needs_review refusal previews again; a retry
 *    after an unknown outcome sends the same key, so the server replays.
 */

export type GuestImportSummary = TryItResponse<"workspace.ensure">["summary"];

/** A chosen file: its name and size for the checks, and its bytes as base64 on demand. */
export interface GuestImportFile {
  readonly name: string;
  readonly size: number;
  read(): Promise<string>;
}

/** Why a step stopped: a command client problem, a refused file by its reason, or another refusal the command names. */
export type GuestImportStopReason = TryItProblem | GuestFileRefusal | "city_unavailable" | "intake_refused" | "unreadable";

export type GuestImportStage =
  | {readonly name: "start"}
  | {readonly name: "account"}
  | {readonly name: "workspace"; readonly summary: GuestImportSummary}
  | {readonly name: "working"}
  | {readonly name: "mapping"; readonly summary: GuestImportSummary; readonly headers: readonly string[]; readonly shapes: readonly GuestColumnShape[]}
  | {readonly name: "review"; readonly summary: GuestImportSummary; readonly result: GuestImportResult}
  | {readonly name: "done"; readonly summary: GuestImportSummary; readonly result: GuestImportResult}
  | {readonly name: "problem"; readonly reason: GuestImportStopReason};

export type GuestImportField = "file" | "brand" | "city" | "mapping";
export type GuestImportFieldProblem = "fileRequired" | GuestFileProblem | "fileUnreadable" | "brandRequired" | "cityRequired" |
  GuestMappingProblem | "invalidMapping";

export interface GuestImportFlowState {
  readonly stage: GuestImportStage;
  readonly busy: boolean;
  /** The chosen file's name and size; its bytes stay in the flow. */
  readonly file: {readonly name: string; readonly size: number} | null;
  readonly brand: string;
  readonly cityId: string | null;
  readonly fields: Readonly<Partial<Record<GuestImportField, GuestImportFieldProblem>>>;
  readonly caller: TryItCaller | null;
  /** Open the site's sign-in sheet: the account step needs a phone verified by code. */
  readonly signIn: boolean;
  /** The visitor's column choice, sent once they make one. */
  readonly mapping: GuestMapping;
  /** Rows the visitor leaves out of this import, by rowId. */
  readonly excluded: ReadonlySet<string>;
}

export interface GuestImportFlowDeps {
  readonly client: TryItCommandClient;
  readonly newKey?: () => string;
}

export interface GuestImportFlow {
  getState(): GuestImportFlowState;
  subscribe(listener: () => void): () => void;
  /** Step 1: a file was chosen (or the choice cleared). */
  setFile(file: GuestImportFile | null): void;
  setBrand(value: string): void;
  setCity(cityId: string | null): void;
  /** Step 1 done: read the list (after the phone step, when it is still to do). */
  submit(): Promise<void>;
  /** Step 2: brand and city in; opens the sign-in sheet when no phone is verified yet. */
  continueAccount(): Promise<void>;
  /** The sign-in sheet confirmed the phone. */
  signedIn(): Promise<void>;
  closeSignIn(): void;
  confirmWorkspace(): Promise<void>;
  setColumn(field: GuestMappedField, column: number | null): void;
  /** The visitor chose the columns: preview again with them. */
  submitMapping(): Promise<void>;
  /** Leaves a row out of this import, or puts it back. */
  toggleExcluded(rowId: string): void;
  /** Previews again with the rows the visitor left out. */
  previewAgain(): Promise<void>;
  /** Saves the reviewed preview. */
  confirm(): Promise<void>;
  /** Runs the step that stopped again, with the same key. */
  retry(): Promise<void>;
  /** Back to the file, keeping it; the next try is a new request. */
  startOver(): void;
  /** Takes updates again after dispose, when the same component mounts again. */
  resume(): void;
  /** Stops updates and drops any call in flight. */
  dispose(): void;
}

type Step = "workspace" | "import";
type Failure = Extract<TryItCall<TryItCommandId>, {ok: false}>;

export function createGuestImportFlow(deps: GuestImportFlowDeps): GuestImportFlow {
  const {client} = deps;
  const listeners = new Set<() => void>();
  let disposed = false;
  let state: GuestImportFlowState = {
    stage: {name: "start"}, busy: false, file: null, brand: "", cityId: null, fields: {}, caller: null, signIn: false,
    mapping: emptyGuestMapping, excluded: new Set(),
  };
  let chosen: GuestImportFile | null = null;
  let workspace: {action: TryItAction<"workspace.ensure">; input: TryItInput<"workspace.ensure">; hash: string | null} | null = null;
  // One action per file: kept across the column choice, re-previews, the save and its retries.
  let importing: {action: TryItAction<"guests.import-list">; content: string | null; input: GuestImportInput | null; hash: string | null} | null = null;
  // The visitor's columns go with every call once they chose them.
  let mapped = false;
  // The last column choice asked for, so a refused choice goes back to it.
  let mappingStage: Extract<GuestImportStage, {name: "mapping"}> | null = null;
  let lastStep: {step: Step; apply: boolean} = {step: "import", apply: false};
  // Bumped by startOver and a new file, so a call still in flight cannot move the new flow.
  let run = 0;

  const set = (patch: Partial<GuestImportFlowState>) => {
    if (disposed) return;
    state = {...state, ...patch};
    for (const listener of listeners) listener();
  };
  const stop = (reason: GuestImportStopReason) => set({busy: false, stage: {name: "problem", reason}});

  function resetImport() {
    run += 1;
    importing = null;
    mapped = false;
    mappingStage = null;
  }

  async function refreshCaller(): Promise<TryItCaller | null> {
    const caller = await client.caller();
    set({caller});
    return caller;
  }

  /** What a failure means for its step: carry on by itself where it can, otherwise stop with words for it. */
  async function handleFailure(failure: Failure, step: Step, attempt: number): Promise<void> {
    const {problem, reason} = failure;
    if (problem === "sign_in") {
      set({busy: false, caller: null, stage: {name: "account"}});
      return;
    }
    if (problem === "no_workspace") {
      workspace = null;
      set({busy: false, stage: {name: "account"}});
      return;
    }
    const again = step === "workspace" ? () => previewWorkspace(attempt + 1) : () => previewImport(attempt + 1);
    if (attempt <= 2 && problem === "key_reused") {
      // This key already went with another request: this one starts again with a new key.
      (step === "workspace" ? workspace?.action : importing?.action)?.restart();
      return again();
    }
    // The preview changed, or apply found rows that need a look: preview again with the same key.
    if (attempt <= 2 && (problem === "changed" || problem === "not_ready" || reason === "needs_review")) return again();
    if (step === "import" && problem === "invalid") {
      if (isGuestMappingRefusal(reason) && mappingStage) {
        set({busy: false, stage: mappingStage, fields: {mapping: "invalidMapping"}});
        return;
      }
      return stop(isGuestFileRefusal(reason) ? reason : "unreadable");
    }
    if (reason === "city_unavailable" || reason === "intake_refused") return stop(reason);
    stop(problem);
  }

  // --- workspace.ensure -------------------------------------------------------------------

  async function previewWorkspace(attempt = 1): Promise<void> {
    if (!workspace) return;
    const mine = run;
    lastStep = {step: "workspace", apply: false};
    set({busy: true});
    const call = await workspace.action.preview(workspace.input);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call, "workspace", attempt);
    const {response} = call;
    // An existing profile is used as it is: the guests go on its draft event.
    if (response.result.exists) return previewImport();
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
    if (!call.ok) return handleFailure(call, "workspace", attempt);
    return previewImport();
  }

  // --- guests.import-list -------------------------------------------------------------------

  /** The file's bytes, read once per file; null (and the file step) when the browser cannot read them. */
  async function fileContent(): Promise<string | null> {
    if (!chosen) return null;
    importing ??= {action: createTryItAction(client, "guests.import-list", deps.newKey), content: null, input: null, hash: null};
    if (importing.content === null) {
      try {
        importing.content = await chosen.read();
      } catch {
        importing.content = null;
      }
      if (!importing.content) {
        set({busy: false, stage: {name: "start"}, fields: {file: "fileUnreadable"}});
        return null;
      }
    }
    return importing.content;
  }

  function importInput(fileName: string, contentBase64: string): GuestImportInput {
    const excludedRowIds = [...state.excluded].sort();
    return {
      file: {fileName, contentBase64},
      ...(mapped ? {mapping: {...state.mapping}} : {}),
      ...(excludedRowIds.length ? {excludedRowIds} : {}),
    };
  }

  async function previewImport(attempt = 1): Promise<void> {
    const mine = run;
    lastStep = {step: "import", apply: false};
    set({busy: true, stage: {name: "working"}});
    const file = chosen;
    const content = await fileContent();
    if (mine !== run || !content || !file || !importing) return;
    const current = importing;
    current.input = importInput(file.name, content);
    current.hash = null;
    const call = await current.action.preview(current.input);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call, "import", attempt);
    const {response} = call;
    const {result} = response;
    if (response.status === "needs_input" || result.needsMapping) {
      mappingStage = {name: "mapping", summary: response.summary, headers: result.headers, shapes: result.columnShapes};
      set({busy: false, mapping: mapped ? state.mapping : guestStartingMapping(result), stage: mappingStage});
      return;
    }
    if (response.status === "applied" || response.status === "replayed") {
      set({busy: false, stage: {name: "done", summary: response.summary, result}});
      return;
    }
    current.hash = response.previewHash;
    set({busy: false, stage: {name: "review", summary: response.summary, result}});
  }

  async function applyImport(attempt = 1): Promise<void> {
    const current = importing;
    if (!current?.hash || !current.input) return previewImport();
    const mine = run;
    lastStep = {step: "import", apply: true};
    set({busy: true});
    const call = await current.action.apply(current.input, current.hash);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call, "import", attempt);
    const {response} = call;
    set({busy: false, stage: {name: "done", summary: response.summary, result: response.result}});
  }

  // --- the account step -------------------------------------------------------------------

  async function continueAccount(): Promise<void> {
    const problems: Partial<Record<GuestImportField, GuestImportFieldProblem>> = {};
    if (!state.brand.trim()) problems.brand = "brandRequired";
    if (!state.cityId) problems.city = "cityRequired";
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
      workspace = {action: createTryItAction(client, "workspace.ensure", deps.newKey), input, hash: null};
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
    // A verified visitor goes straight to the import: it answers no_workspace when they have no profile yet.
    await previewImport();
  }

  /** A step that throws (a bug, or a browser without crypto) stops with a plain failure instead of staying busy. */
  const guarded = <A extends unknown[]>(work: (...args: A) => Promise<void>) => async (...args: A): Promise<void> => {
    try {
      await work(...args);
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
    setFile(file) {
      resetImport();
      chosen = null;
      const problem = file ? guestFileProblem(file) : null;
      if (file && !problem) chosen = file;
      set({busy: false, file: chosen ? {name: chosen.name, size: chosen.size} : null, stage: {name: "start"},
        fields: problem ? {file: problem} : {}, mapping: emptyGuestMapping, excluded: new Set()});
    },
    setBrand(value) {
      set({brand: value, fields: {...state.fields, brand: undefined}});
    },
    setCity(cityId) {
      set({cityId, fields: {...state.fields, city: undefined}});
    },
    submit: guarded(async () => {
      if (state.busy) return;
      if (!chosen) {
        set({fields: {file: state.fields.file ?? "fileRequired"}});
        return;
      }
      await begin();
    }),
    continueAccount: guarded(continueAccount),
    signedIn: guarded(async () => {
      set({signIn: false});
      await continueAccount();
    }),
    closeSignIn() {
      set({signIn: false});
    },
    confirmWorkspace: guarded(() => applyWorkspace()),
    setColumn(field, column) {
      set({mapping: {...state.mapping, [field]: column}, fields: {...state.fields, mapping: undefined}});
    },
    submitMapping: guarded(async () => {
      if (state.busy || state.stage.name !== "mapping") return;
      const problem = guestMappingProblem(state.mapping);
      if (problem) {
        set({fields: {mapping: problem}});
        return;
      }
      mapped = true;
      await previewImport();
    }),
    toggleExcluded(rowId) {
      if (state.busy) return;
      const excluded = new Set(state.excluded);
      if (excluded.has(rowId)) excluded.delete(rowId); else excluded.add(rowId);
      set({excluded});
    },
    previewAgain: guarded(async () => {
      if (state.busy || state.stage.name !== "review") return;
      await previewImport();
    }),
    confirm: guarded(async () => {
      if (state.busy || state.stage.name !== "review" || !state.stage.result.eligibleForApply) return;
      await applyImport();
    }),
    retry: guarded(async () => {
      if (state.busy) return;
      const {step, apply} = lastStep;
      if (step === "workspace") await (apply ? applyWorkspace() : previewWorkspace());
      else await (apply ? applyImport() : previewImport());
    }),
    startOver() {
      resetImport();
      set({busy: false, signIn: false, fields: {}, stage: {name: "start"}, mapping: emptyGuestMapping, excluded: new Set()});
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
