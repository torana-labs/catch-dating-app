import type {TryItCaller, TryItCommandCallables} from "../../firebase";

/**
 * The website's command client for the try-it tools
 * (contracts/commands/catalog.json). Every surface sends the same envelope
 * (contracts/shared/command_envelope.schema.json) to the same callable; the
 * website's surface is "website". A tool previews, shows the plain-language
 * summary, then applies with the same idempotency key and the preview's hash
 * (`confirm.previewHash`). Keys come from createTryItAction: one per thing
 * the visitor asked for, kept across polls, re-previews and retries, so a
 * retried apply replays instead of running twice. Like the other website
 * clients it owns no copy: a failure names its problem and the caller words it.
 */

/** The commands the website runs, by catalog id, with the callable each one names. */
export const tryItCommandCallables = {
  "workspace.ensure": "ensureTryItWorkspace",
  "organizer.import-from-link": "importOrganizerFromLink",
  "event.import-from-link": "importEventFromLink",
  "promotion.create-kit": "createPromotionKit",
  "guests.import-list": "importGuestList",
} as const satisfies Record<string, keyof TryItCommandCallables>;

export type TryItCommandId = keyof typeof tryItCommandCallables;
type CallableOf<C extends TryItCommandId> = (typeof tryItCommandCallables)[C];
export type TryItPayload<C extends TryItCommandId> = TryItCommandCallables[CallableOf<C>]["payload"];
export type TryItInput<C extends TryItCommandId> = TryItPayload<C>["input"];
export type TryItResponse<C extends TryItCommandId> = TryItCommandCallables[CallableOf<C>]["response"];
export type TryItMode = TryItPayload<TryItCommandId>["mode"];

/**
 * Why a call did not answer. Most come from the callable's HttpsError code
 * and its `details.reason`:
 * - sign_in: no phone verified by code (unauthenticated, phone_not_verified);
 * - rate_limited: too many tries (resource-exhausted);
 * - invalid: the input was refused, such as a link that is not a public web address (invalid-argument);
 * - changed: the result changed since the preview (aborted, workspace_changed): preview again;
 * - key_reused: this key already went with another request (already-exists): start a new action;
 * - not_ready: apply came before the read finished: preview again;
 * - no_workspace, existing_listing, market_not_open, multiple_organizers, link_unreadable, choose_event: the command's own reasons;
 * - not_allowed: the caller does not manage the event (permission-denied, not-found);
 * - app_check: the browser could not prove it is the site in time;
 * - not_configured: this build has no Firebase;
 * - offline: the call never reached the server;
 * - failed: anything else.
 */
export const tryItProblems = [
  "sign_in", "rate_limited", "invalid", "changed", "key_reused", "not_ready", "no_workspace", "existing_listing",
  "market_not_open", "multiple_organizers", "link_unreadable", "choose_event", "not_allowed", "app_check",
  "not_configured", "offline", "failed",
] as const;
export type TryItProblem = (typeof tryItProblems)[number];

export type TryItCall<C extends TryItCommandId> =
  | {readonly ok: true; readonly response: TryItResponse<C>}
  | {readonly ok: false; readonly problem: TryItProblem; readonly reason: string | null};

const reasonProblems: Readonly<Record<string, TryItProblem>> = {
  phone_not_verified: "sign_in",
  changed_since_preview: "changed",
  workspace_changed: "changed",
  idempotency_key_reused: "key_reused",
  not_ready: "not_ready",
  no_workspace: "no_workspace",
  existing_listing: "existing_listing",
  market_not_open: "market_not_open",
  multiple_organizers: "multiple_organizers",
  link_unreadable: "link_unreadable",
  choose_event: "choose_event",
  event_not_found: "choose_event",
};

const codeProblems: Readonly<Record<string, TryItProblem>> = {
  unauthenticated: "sign_in",
  "resource-exhausted": "rate_limited",
  "invalid-argument": "invalid",
  aborted: "changed",
  "already-exists": "key_reused",
  "permission-denied": "not_allowed",
  "not-found": "not_allowed",
  unavailable: "offline",
  "deadline-exceeded": "offline",
};

/** The problem a thrown call error names: its reason first, then its code. */
export function tryItProblemFor(error: unknown): {problem: TryItProblem; reason: string | null} {
  if (error && typeof error === "object") {
    const {code, details, name, message} = error as {code?: unknown; details?: unknown; name?: unknown; message?: unknown};
    const reason = details && typeof details === "object" && typeof (details as {reason?: unknown}).reason === "string" ?
      (details as {reason: string}).reason : null;
    if (reason && Object.hasOwn(reasonProblems, reason)) return {problem: reasonProblems[reason], reason};
    const bare = typeof code === "string" ? code.replace(/^functions\//u, "") : "";
    if (Object.hasOwn(codeProblems, bare)) return {problem: codeProblems[bare], reason};
    if (name === "AppCheckDeadlineError") return {problem: "app_check", reason};
    if (typeof message === "string" && /not configured for this build/u.test(message)) return {problem: "not_configured", reason};
    if (bare === "internal" && typeof message === "string" && /^internal$/iu.test(message)) return {problem: "offline", reason};
    return {problem: "failed", reason};
  }
  return {problem: "failed", reason: null};
}

const keyPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{15,79}$/u;

/** 32 random hex characters. getRandomValues works outside secure contexts and in browsers without randomUUID. */
function randomHex(): string {
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A new idempotency key: `web_` and 32 hex characters, inside the envelope's pattern. */
export function tryItIdempotencyKey(random: () => string = randomHex): string {
  const key = `web_${random().replace(/-/gu, "")}`;
  if (!keyPattern.test(key)) throw new Error("A try-it key must match the command envelope's pattern.");
  return key;
}

export type TryItInvoke = <Name extends keyof TryItCommandCallables>(callable: Name,
  payload: TryItCommandCallables[Name]["payload"]) => Promise<TryItCommandCallables[Name]["response"]>;

async function siteInvoke<Name extends keyof TryItCommandCallables>(callable: Name,
  payload: TryItCommandCallables[Name]["payload"]): Promise<TryItCommandCallables[Name]["response"]> {
  return (await import("../../firebase")).invokeTryItCommand(callable, payload);
}

async function siteCaller(): Promise<TryItCaller | null> {
  return (await import("../../firebase")).readTryItCaller();
}

export interface TryItCommandClient {
  /** One call; it never throws. */
  call<C extends TryItCommandId>(commandId: C, request: {mode: TryItMode; idempotencyKey: string; input: TryItInput<C>;
    previewHash?: string}): Promise<TryItCall<C>>;
  /** The signed-in account and its verified phone, or null. */
  caller(): Promise<TryItCaller | null>;
}

/** The site's client: the callable through the site's Firebase and App Check, as the signed-in account. */
export function createTryItCommandClient(options: {invoke?: TryItInvoke; caller?: () => Promise<TryItCaller | null>} = {}): TryItCommandClient {
  const invoke: TryItInvoke = options.invoke ?? siteInvoke;
  const caller = options.caller ?? siteCaller;
  return {
    caller: () => caller().catch(() => null),
    async call(commandId, {mode, idempotencyKey, input, previewHash}) {
      const callable = tryItCommandCallables[commandId];
      const payload = {mode, idempotencyKey, surface: "website", input,
        ...(previewHash ? {confirm: {commandId, previewHash}} : {})} as TryItCommandCallables[typeof callable]["payload"];
      try {
        const response = await invoke(callable, payload);
        if (!response || typeof response !== "object" || response.commandId !== commandId || typeof response.status !== "string") {
          return {ok: false, problem: "failed", reason: null};
        }
        return {ok: true, response: response as TryItResponse<typeof commandId>};
      } catch (error) {
        return {ok: false, ...tryItProblemFor(error)};
      }
    },
  };
}

/**
 * One thing the visitor asked for, as one command: its idempotency key,
 * made on the first call and kept for every preview, poll and apply after
 * it, so a retry is the same request. `restart` takes a new key, when the
 * server says this one went with another request.
 */
export interface TryItAction<C extends TryItCommandId> {
  readonly commandId: C;
  readonly key: string;
  preview(input: TryItInput<C>): Promise<TryItCall<C>>;
  apply(input: TryItInput<C>, previewHash: string): Promise<TryItCall<C>>;
  restart(): void;
}

export function createTryItAction<C extends TryItCommandId>(client: TryItCommandClient, commandId: C,
  newKey: () => string = () => tryItIdempotencyKey()): TryItAction<C> {
  let key = newKey();
  return {
    commandId,
    get key() {
      return key;
    },
    preview: (input) => client.call(commandId, {mode: "preview", idempotencyKey: key, input}),
    apply: (input, previewHash) => client.call(commandId, {mode: "apply", idempotencyKey: key, input, previewHash}),
    restart() {
      key = newKey();
    },
  };
}
