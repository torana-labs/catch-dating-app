import {
  createTryItAction,
  type TryItAction,
  type TryItCommandClient,
  type TryItInput,
  type TryItProblem,
} from "../../shared/api/tryItCommands";
import type {TryItCaller} from "../../firebase";
import type {TryItSummary} from "../tryIt/tryItFlow";
import {
  emptyPastSalesDetails,
  emptyPastSalesMapping,
  guessPastSalesMapping,
  pastSalesBase64,
  pastSalesDetailsInput,
  pastSalesFileProblem,
  pastSalesMappingProblems,
  pastSalesToday,
  type PastSalesDetailField,
  type PastSalesDetailProblem,
  type PastSalesDetails,
  type PastSalesFile,
  type PastSalesFileProblem,
  type PastSalesImport,
  type PastSalesInput,
  type PastSalesMapping,
  type PastSalesMappingField,
  type PastSalesMappingProblem,
  type PastSalesReport,
  type PastSalesReviewRow,
} from "./pastSalesModel";

/**
 * Reports' export upload as a plain state machine the hook
 * (./usePastSalesToolController) renders. It follows the try-it tools'
 * order (features/tryIt/tryItFlow.ts):
 *
 * 1. The visitor chooses their export and, if they like, names the night,
 *    its date, a ticket price for rows with no amount and what their
 *    current tool charges. The file stays in the page until step 3.
 * 2. With no phone verified by code, the account step asks for the brand
 *    name and city and the sign-in sheet confirms the phone; workspace.ensure
 *    previews their private profile and applies once they confirm.
 * 3. sales.import-past previews: the file goes to the command, which stores
 *    nothing. `needs_input` asks for a profile (no_workspace) or the file's
 *    columns (needsMapping, with its headers and their shapes); `previewed`
 *    shows the report, and any rows that need a look, which the visitor can
 *    leave out (excludedRowIds) before saving.
 * 4. Saving applies with the same key and the preview's hash. A changed
 *    preview previews again; a retry after an unknown outcome sends the same
 *    key, so the server replays instead of saving the night twice.
 */

/** Why a step stopped: a command client problem (with the command's reason, when it gave one) or its refusal. */
export type PastSalesStopReason = TryItProblem | "refused";

export type PastSalesStage =
  | {readonly name: "start"}
  | {readonly name: "account"}
  | {readonly name: "workspace"; readonly summary: TryItSummary}
  | {readonly name: "mapping"; readonly headers: readonly string[]; readonly shapes: readonly string[]}
  | {readonly name: "review"; readonly report: PastSalesReport; readonly rows: readonly PastSalesReviewRow[]}
  | {readonly name: "done"; readonly report: PastSalesReport; readonly eventId: string; readonly imported: PastSalesImport | null}
  | {readonly name: "problem"; readonly reason: PastSalesStopReason; readonly detail: string | null; readonly summary: TryItSummary | null};

export interface PastSalesFlowState {
  readonly stage: PastSalesStage;
  readonly busy: boolean;
  /** The chosen file's name and size; the file itself stays inside the flow. */
  readonly file: {readonly name: string; readonly size: number} | null;
  readonly details: PastSalesDetails;
  readonly mapping: PastSalesMapping;
  readonly brand: string;
  readonly cityId: string | null;
  readonly fields: {readonly file?: PastSalesFileProblem; readonly brand?: "brandRequired"; readonly city?: "cityRequired"};
  readonly detailProblems: Readonly<Partial<Record<PastSalesDetailField, PastSalesDetailProblem>>>;
  readonly mappingProblems: Readonly<Partial<Record<PastSalesMappingField, PastSalesMappingProblem>>>;
  readonly caller: TryItCaller | null;
  /** Open the site's sign-in sheet: the account step needs a phone verified by code. */
  readonly signIn: boolean;
}

export interface PastSalesFlowDeps {
  readonly client: TryItCommandClient;
  readonly newKey?: () => string;
  /** The file's bytes; the browser's own reader unless a test gives one. */
  readonly readFile?: (file: File) => Promise<Uint8Array>;
  /** Today as YYYY-MM-DD in the market's timezone, the latest date the command takes. */
  readonly today?: () => string;
}

export interface PastSalesFlow {
  getState(): PastSalesFlowState;
  subscribe(listener: () => void): () => void;
  chooseFile(file: File | null): void;
  setDetail(field: PastSalesDetailField, value: string): void;
  setBrand(value: string): void;
  setCity(cityId: string | null): void;
  setMapping(field: PastSalesMappingField, column: number | null): void;
  /** Step 1: the file and the night's details are in. */
  submit(): Promise<void>;
  /** Step 2: brand and city in; opens the sign-in sheet when no phone is verified yet. */
  continueAccount(): Promise<void>;
  /** The sign-in sheet confirmed the phone. */
  signedIn(): Promise<void>;
  closeSignIn(): void;
  confirmWorkspace(): Promise<void>;
  /** The columns are chosen: preview again with them. */
  submitMapping(): Promise<void>;
  /** Leaves the rows that need a look out of the report, and previews again. */
  leaveOutRows(): Promise<void>;
  /** Saves the previewed night. */
  confirm(): Promise<void>;
  /** Runs the step that stopped again, with the same key. */
  retry(): Promise<void>;
  /** Back to the file, keeping what was typed; the next try is a new request. */
  startOver(): void;
  /** Takes updates again after dispose, when the same component mounts again. */
  resume(): void;
  /** Stops updates and drops any call in flight. */
  dispose(): void;
}

async function browserReadFile(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") return new Uint8Array(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error("The file could not be read."));
    reader.readAsArrayBuffer(file);
  });
}

type Step = "workspace" | "sales";
/** Reasons the command gives for an apply whose preview no longer holds: preview again and show what is true now. */
const previewAgainReasons = new Set(["needs_review", "needs_mapping"]);

export function createPastSalesFlow(deps: PastSalesFlowDeps): PastSalesFlow {
  const {client} = deps;
  const readFile = deps.readFile ?? browserReadFile;
  const today = deps.today ?? (() => pastSalesToday());
  const listeners = new Set<() => void>();
  let disposed = false;
  let state: PastSalesFlowState = {
    stage: {name: "start"}, busy: false, file: null, details: emptyPastSalesDetails, mapping: emptyPastSalesMapping, brand: "",
    cityId: null, fields: {}, detailProblems: {}, mappingProblems: {}, caller: null, signIn: false,
  };
  // The file stays here, never in the rendered state, and goes only to the command.
  let chosen: File | null = null;
  let workspace: {action: TryItAction<"workspace.ensure">; input: TryItInput<"workspace.ensure">; hash: string | null} | null = null;
  // One action per file: kept across re-previews (columns, rows left out) and the apply.
  let sales: {file: File; action: TryItAction<"sales.import-past">; encoded: PastSalesFile | null; details: Omit<PastSalesInput, "file">;
    mapping: PastSalesMapping | null; excludedRowIds: readonly string[]; input: PastSalesInput | null; hash: string | null} | null = null;
  let lastStep: {step: Step; apply: boolean} = {step: "sales", apply: false};
  // Bumped by startOver and dispose, so a call still in flight cannot move the new flow.
  let run = 0;

  const set = (patch: Partial<PastSalesFlowState>) => {
    if (disposed) return;
    state = {...state, ...patch};
    for (const listener of listeners) listener();
  };
  const stop = (reason: PastSalesStopReason, detail: string | null = null, summary: TryItSummary | null = null) =>
    set({busy: false, stage: {name: "problem", reason, detail, summary}});

  async function refreshCaller(): Promise<TryItCaller | null> {
    const caller = await client.caller();
    set({caller});
    return caller;
  }

  /** What a problem means for the step it stopped, when the flow can carry on by itself. */
  async function recover(problem: TryItProblem, reason: string | null, step: Step, attempt: number): Promise<boolean> {
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
      (step === "workspace" ? workspace?.action : sales?.action)?.restart();
    } else if (!(problem === "changed" || problem === "not_ready" || (step === "sales" && reason !== null && previewAgainReasons.has(reason)))) {
      return false;
    }
    if (step === "workspace") await previewWorkspace(attempt + 1);
    else await previewSales(attempt + 1);
    return true;
  }

  async function handleFailure(problem: TryItProblem, reason: string | null, step: Step, attempt: number) {
    if (!(await recover(problem, reason, step, attempt))) stop(problem, reason);
  }

  // --- workspace.ensure, as the link tools run it ---------------------------------------------

  async function previewWorkspace(attempt = 1): Promise<void> {
    if (!workspace) return;
    const mine = run;
    lastStep = {step: "workspace", apply: false};
    set({busy: true});
    const call = await workspace.action.preview(workspace.input);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call.problem, call.reason, "workspace", attempt);
    const {response} = call;
    // An existing profile is used as it is.
    if (response.result.exists) return previewSales();
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
    if (!call.ok) return handleFailure(call.problem, call.reason, "workspace", attempt);
    return previewSales();
  }

  // --- sales.import-past ----------------------------------------------------------------------

  async function previewSales(attempt = 1): Promise<void> {
    const current = sales;
    if (!current) return;
    const mine = run;
    lastStep = {step: "sales", apply: false};
    set({busy: true});
    if (!current.encoded) {
      const bytes = await readFile(current.file);
      if (mine !== run) return;
      current.encoded = {fileName: current.file.name, contentBase64: pastSalesBase64(bytes)};
    }
    const input: PastSalesInput = {
      file: current.encoded,
      ...current.details,
      ...(current.mapping ? {mapping: current.mapping} : {}),
      ...(current.excludedRowIds.length ? {excludedRowIds: [...current.excludedRowIds]} : {}),
    };
    current.input = input;
    current.hash = null;
    const call = await current.action.preview(input);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call.problem, call.reason, "sales", attempt);
    const {response} = call;
    const {result} = response;
    if (response.status === "needs_input" && result.reasons.includes("no_workspace")) {
      return void (await recover("no_workspace", null, "sales", 1));
    }
    if (response.status === "needs_input" && result.needsMapping) {
      const mapping = current.mapping ?? guessPastSalesMapping(result.headers, result.columnShapes);
      set({busy: false, mapping, mappingProblems: {}, stage: {name: "mapping", headers: result.headers, shapes: result.columnShapes}});
      return;
    }
    if (response.status === "previewed" && result.report) {
      current.hash = response.previewHash;
      set({busy: false, stage: {name: "review", report: result.report, rows: result.rowsNeedingReview}});
      return;
    }
    stop("refused", result.reasons[0] ?? null, response.summary);
  }

  async function applySales(attempt = 1): Promise<void> {
    const current = sales;
    if (!current?.hash || !current.input) return previewSales();
    const mine = run;
    lastStep = {step: "sales", apply: true};
    set({busy: true});
    const call = await current.action.apply(current.input, current.hash);
    if (mine !== run) return;
    if (!call.ok) return handleFailure(call.problem, call.reason, "sales", attempt);
    const {response} = call;
    const {eventId, report} = response.result;
    if ((response.status !== "applied" && response.status !== "replayed") || !eventId || !report) {
      return stop("refused", response.result.reasons[0] ?? null, response.summary);
    }
    set({busy: false, stage: {name: "done", report, eventId, imported: response.result.import}});
  }

  // --- the account step -------------------------------------------------------------------

  async function continueAccount(): Promise<void> {
    const fields = {
      ...(state.brand.trim() ? {} : {brand: "brandRequired" as const}),
      ...(state.cityId ? {} : {city: "cityRequired" as const}),
    };
    set({fields});
    if (Object.keys(fields).length > 0 || state.busy) return;
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

  async function submit(): Promise<void> {
    if (state.busy) return;
    const fileProblem = pastSalesFileProblem(chosen);
    const {problems, input} = pastSalesDetailsInput(state.details, today());
    set({fields: fileProblem ? {file: fileProblem} : {}, detailProblems: problems});
    if (fileProblem || !chosen || Object.keys(problems).length > 0) return;
    if (!sales || sales.file !== chosen) {
      sales = {file: chosen, action: createTryItAction(client, "sales.import-past", deps.newKey), encoded: null, details: input,
        mapping: null, excludedRowIds: [], input: null, hash: null};
    }
    sales.details = input;
    set({busy: true});
    const caller = await refreshCaller();
    if (!caller?.phoneNumber) {
      set({busy: false, stage: {name: "account"}});
      return;
    }
    // A verified visitor goes straight to the command: it answers no_workspace when they have no profile yet.
    await previewSales();
  }

  async function submitMapping(): Promise<void> {
    if (state.busy || !sales) return;
    const problems = pastSalesMappingProblems(state.mapping);
    set({mappingProblems: problems});
    if (Object.keys(problems).length > 0) return;
    sales.mapping = state.mapping;
    await previewSales();
  }

  async function leaveOutRows(): Promise<void> {
    if (state.busy || !sales || state.stage.name !== "review") return;
    const ids = new Set([...sales.excludedRowIds, ...state.stage.rows.map((row) => row.rowId)]);
    sales.excludedRowIds = [...ids].slice(0, 250);
    await previewSales();
  }

  /** A step that throws (a bug, an unreadable file, a browser without crypto) stops with a plain failure instead of staying busy. */
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
    chooseFile(file) {
      chosen = file;
      set({file: file ? {name: file.name, size: file.size} : null, fields: {...state.fields, file: file ? pastSalesFileProblem(file) ?? undefined : undefined}});
    },
    setDetail(field, value) {
      set({details: {...state.details, [field]: value}, detailProblems: {...state.detailProblems, [field]: undefined}});
    },
    setBrand(value) {
      set({brand: value, fields: {...state.fields, brand: undefined}});
    },
    setCity(cityId) {
      set({cityId, fields: {...state.fields, city: undefined}});
    },
    setMapping(field, column) {
      set({mapping: {...state.mapping, [field]: column}, mappingProblems: {}});
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
    submitMapping: guarded(submitMapping),
    leaveOutRows: guarded(leaveOutRows),
    confirm: guarded(async () => {
      if (state.busy || state.stage.name !== "review" || state.stage.rows.length > 0) return;
      await applySales();
    }),
    retry: guarded(async () => {
      if (state.busy) return;
      const {step, apply} = lastStep;
      if (step === "workspace") await (apply ? applyWorkspace() : previewWorkspace());
      else await (apply ? applySales() : previewSales());
    }),
    startOver() {
      run += 1;
      sales = null;
      set({busy: false, signIn: false, fields: {}, detailProblems: {}, mappingProblems: {}, mapping: emptyPastSalesMapping, stage: {name: "start"}});
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
