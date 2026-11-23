import {createHash} from "node:crypto";
import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {
  Timestamp,
  type DocumentData,
  type Firestore,
} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {
  onDocumentWritten,
  type Change,
  type DocumentSnapshot,
  type FirestoreEvent,
} from "firebase-functions/v2/firestore";
import type {DispatchDeadLetterDocument} from
  "../../shared/generated/firestoreAdminTypes";

/**
 * One Firestore trigger per source collection (issue #2451).
 *
 * Every Firestore trigger is its own Cloud Run service, and the region caps
 * them. So a source collection gets one `onDocumentWritten` trigger, with
 * retry on, and the work that used to be separate triggers registers with it
 * as specs:
 *
 * - `id`: a stable camelCase name, used in logs and dead letters.
 * - `when(change)`: a cheap predicate on the change. Second-generation
 *   triggers cannot filter by field, so this is that filter.
 * - `run(change, ctx)`: does the work.
 * - `kind`: `projection` or `effect`.
 *
 * Only convergent work is dispatched. A projection re-reads its source inside
 * the handler and writes the derived state, so running it twice or out of
 * order ends in the same state. An effect (a message, a counter, an outside
 * call) must name the `commandReceipts` command it dedupes with, keyed by the
 * event id; registration fails without one. Anything else stays its own
 * trigger.
 *
 * Each context exports its specs with `defineProjections`. A generated
 * registry per source (`functions/src/<area>/dispatch/<source>.generated.ts`,
 * written by tool/architecture/generate_dispatch_registries.mjs from
 * functions/dispatch-sources.json) imports them and calls `dispatchTrigger`.
 * That generated file is the one module the Functions context check lets
 * import any context.
 *
 * Failure: matching specs run together with `Promise.allSettled`. Each
 * failure is logged with its spec id and the event id, then the dispatcher
 * throws so Eventarc retries the whole event; the specs that succeeded run
 * again and, being convergent, change nothing. An event older than
 * `DISPATCH_MAX_EVENT_AGE_MS` gets one last run and is then acknowledged:
 * each spec that still fails gets one `dispatchDeadLetters` record (spec id,
 * event id, source path, error; deleted after 30 days) for a reconcile tool
 * to repair. Effects are never re-run from dead letters.
 */

/** Dead letters for events the dispatcher gave up on. Server only. */
export const DISPATCH_DEAD_LETTERS = "dispatchDeadLetters";
/** Events older than this get one last run, then dead letters, no retry. */
export const DISPATCH_MAX_EVENT_AGE_MS = 60 * 60 * 1000;
/** How long a dead letter stays before the TTL policy deletes it. */
export const DISPATCH_DEAD_LETTER_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
/** Longest stored error message, so a dead letter never holds a payload. */
const MAX_ERROR_LENGTH = 1000;

const SPEC_ID = /^[a-z][A-Za-z0-9]{0,63}$/;
const SOURCE_ID = /^[a-z][A-Za-z0-9]{0,63}$/;
const RECEIPT_COMMAND = /^[a-z][A-Za-z0-9]{0,63}$/;
const RAW_ID = /^[A-Za-z0-9:._-]{1,100}$/;
/**
 * Memory sizes a spec may ask for: the firebase-functions MemoryOption
 * values, spelled out because only src/index.ts may import that module
 * (tool/firebase/function_binding_intent.mjs).
 */
export type MemoryOption = "128MiB" | "256MiB" | "512MiB" | "1GiB" | "2GiB" |
  "4GiB" | "8GiB" | "16GiB" | "32GiB";
const MEMORY_ORDER: readonly MemoryOption[] = ["128MiB", "256MiB", "512MiB",
  "1GiB", "2GiB", "4GiB", "8GiB", "16GiB", "32GiB"];

export type DispatchOperation = "create" | "update" | "delete";

/** One write to the source document, as every spec sees it. */
export interface DispatchChange {
  readonly source: string;
  /** The written document's path, e.g. `organizers/org-1`. */
  readonly path: string;
  readonly documentId: string;
  readonly params: Readonly<Record<string, string>>;
  readonly operation: DispatchOperation;
  readonly before: DocumentData | undefined;
  readonly after: DocumentData | undefined;
}

/** What `run` gets besides the change. */
export interface DispatchContext {
  readonly db: Firestore;
  readonly eventId: string;
  readonly eventTime: Date;
  /**
   * Effects only: the `commandReceipts` entry the effect writes in the same
   * transaction as its side effect (`commandReceiptRef(db, command, id)`).
   */
  readonly receipt?: {readonly command: string; readonly id: string};
}

interface SpecBase {
  readonly id: string;
  readonly when: (change: DispatchChange) => boolean;
  readonly run: (change: DispatchChange, ctx: DispatchContext) =>
    unknown | Promise<unknown>;
  /** The dispatcher's timeout is the largest its specs ask for. */
  readonly timeoutSeconds?: number;
  /** The dispatcher's memory is the largest its specs ask for. */
  readonly memory?: MemoryOption;
}

/** Convergent: re-reads its source and writes derived state. */
export interface ProjectionSpec extends SpecBase {
  readonly kind: "projection";
}

/** Not convergent on its own: dedupes by a receipt keyed by the event id. */
export interface EffectSpec extends SpecBase {
  readonly kind: "effect";
  readonly receipt: {readonly command: string};
}

export type DispatchSpec = ProjectionSpec | EffectSpec;

/** One context's specs for one source, as `defineProjections` checked them. */
export interface ProjectionSet {
  readonly source: string;
  readonly specs: readonly DispatchSpec[];
}

export class DispatchRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispatchRegistrationError";
  }
}

/** Thrown after a partial failure so Eventarc retries the event. */
export class DispatchFailure extends Error {
  constructor(readonly source: string, readonly eventId: string,
    readonly failedSpecIds: readonly string[]) {
    super(`${source} dispatch ${eventId} failed: ${failedSpecIds.join(", ")}`);
    this.name = "DispatchFailure";
  }
}

/**
 * Registers one context's specs for one source. Fails when a spec is
 * malformed, an id repeats, or an effect names no receipt command.
 */
export function defineProjections(source: string,
  specs: readonly DispatchSpec[]): ProjectionSet {
  if (!SOURCE_ID.test(source)) {
    throw new DispatchRegistrationError(
      `Dispatch source "${source}" must be a camelCase name.`);
  }
  const ids = new Set<string>();
  for (const spec of specs) {
    validateSpec(source, spec);
    if (ids.has(spec.id)) {
      throw new DispatchRegistrationError(
        `${source} registers dispatch spec ${spec.id} twice.`);
    }
    ids.add(spec.id);
  }
  return Object.freeze({source, specs: Object.freeze([...specs])});
}

function validateSpec(source: string, spec: DispatchSpec): void {
  const id = (spec as {id?: unknown}).id;
  if (typeof id !== "string" || !SPEC_ID.test(id)) {
    throw new DispatchRegistrationError(
      `${source} has a dispatch spec whose id is not a camelCase name.`);
  }
  if (typeof spec.when !== "function" || typeof spec.run !== "function") {
    throw new DispatchRegistrationError(
      `${source} dispatch spec ${id} needs when and run functions.`);
  }
  const kind = (spec as {kind?: unknown}).kind;
  if (kind === "effect") {
    const command = (spec as {receipt?: {command?: unknown}}).receipt?.command;
    if (typeof command !== "string" || !RECEIPT_COMMAND.test(command)) {
      throw new DispatchRegistrationError(`${source} effect ${id} must ` +
        "name the commandReceipts command it dedupes with, keyed by the " +
        "event id (receipt: {command}); an effect without one stays its " +
        "own trigger.");
    }
  } else if (kind === "projection") {
    if ((spec as {receipt?: unknown}).receipt !== undefined) {
      throw new DispatchRegistrationError(`${source} projection ${id} ` +
        "declares a receipt; a projection is convergent, so make it an " +
        "effect or drop the receipt.");
    }
  } else {
    throw new DispatchRegistrationError(
      `${source} dispatch spec ${id} must be a projection or an effect.`);
  }
  if (spec.timeoutSeconds !== undefined &&
      (!Number.isInteger(spec.timeoutSeconds) || spec.timeoutSeconds < 1 ||
        spec.timeoutSeconds > 540)) {
    throw new DispatchRegistrationError(
      `${source} dispatch spec ${id} asks for an invalid timeout.`);
  }
  if (spec.memory !== undefined && !MEMORY_ORDER.includes(spec.memory)) {
    throw new DispatchRegistrationError(
      `${source} dispatch spec ${id} asks for an invalid memory size.`);
  }
}

/**
 * Every spec registered for one source, in registry order. Fails when a set
 * belongs to another source or two sets share a spec id.
 */
export function registeredSpecs(source: string,
  sets: readonly ProjectionSet[]): readonly DispatchSpec[] {
  const specs: DispatchSpec[] = [];
  const ids = new Set<string>();
  for (const set of sets) {
    if (set.source !== source) {
      throw new DispatchRegistrationError(`A ${set.source} projection set ` +
        `is registered with the ${source} dispatcher.`);
    }
    for (const spec of set.specs) {
      if (ids.has(spec.id)) {
        throw new DispatchRegistrationError(
          `${source} registers dispatch spec ${spec.id} twice.`);
      }
      ids.add(spec.id);
      specs.push(spec);
    }
  }
  return specs;
}

/**
 * Defaults when no spec asks for more. They match the global options in
 * src/index.ts; the dispatcher states them because an explicit undefined
 * option would override the global one.
 */
export const DISPATCH_DEFAULT_TIMEOUT_SECONDS = 60;
export const DISPATCH_DEFAULT_MEMORY: MemoryOption = "512MiB";

/** The longest timeout a source's specs ask for, at least the default. */
export function dispatcherTimeoutSeconds(
  sets: readonly ProjectionSet[]): number {
  return Math.max(DISPATCH_DEFAULT_TIMEOUT_SECONDS,
    ...sets.flatMap((set) => set.specs)
      .map((spec) => spec.timeoutSeconds ?? 0));
}

/** The most memory a source's specs ask for, at least the default. */
export function dispatcherMemory(
  sets: readonly ProjectionSet[]): MemoryOption {
  let largest = MEMORY_ORDER.indexOf(DISPATCH_DEFAULT_MEMORY);
  for (const spec of sets.flatMap((set) => set.specs)) {
    if (spec.memory === undefined) continue;
    largest = Math.max(largest, MEMORY_ORDER.indexOf(spec.memory));
  }
  return MEMORY_ORDER[largest];
}

/** True when any of `fields` differs between before and after. */
export function fieldsChanged(change: DispatchChange,
  fields: readonly string[]): boolean {
  return fields.some((field) =>
    !isDeepStrictEqual(change.before?.[field], change.after?.[field]));
}

/** The dead letter's document id: `{specId}_{eventId}`, bounded. */
export function deadLetterId(specId: string, eventId: string): string {
  const part = RAW_ID.test(eventId) ? eventId :
    `h${createHash("sha256").update(eventId).digest("hex")}`;
  return `${specId}_${part}`;
}

/** The event fields the dispatcher reads; tests build these directly. */
export interface DispatchEventInput {
  readonly id: string;
  /** RFC 3339 time the write happened. */
  readonly time: string;
  /** The written document's path. */
  readonly document: string;
  readonly params: Readonly<Record<string, string>>;
  readonly before: DocumentData | undefined;
  readonly after: DocumentData | undefined;
}

export interface DispatchDependencies {
  readonly db: Firestore;
  readonly nowMillis: () => number;
  readonly log: Pick<typeof logger, "error" | "warn">;
  readonly maxEventAgeMs?: number;
}

export interface DispatchOutcome {
  readonly matched: readonly string[];
  readonly failed: readonly string[];
  readonly deadLettered: boolean;
}

/**
 * Runs every matching spec for one event. Throws `DispatchFailure` when a
 * spec fails on an event younger than the max age; past it, writes one dead
 * letter per failing spec and returns.
 */
export async function dispatchEvent(source: string,
  specs: readonly DispatchSpec[], input: DispatchEventInput,
  deps: DispatchDependencies): Promise<DispatchOutcome> {
  if (input.before === undefined && input.after === undefined) {
    return {matched: [], failed: [], deadLettered: false};
  }
  const operation: DispatchOperation = input.before === undefined ? "create" :
    input.after === undefined ? "delete" : "update";
  const change: DispatchChange = Object.freeze({
    source,
    path: input.document,
    documentId: input.document.split("/").at(-1) ?? "",
    params: Object.freeze({...input.params}),
    operation,
    before: input.before,
    after: input.after,
  });
  const eventTime = new Date(input.time);
  const failures: {spec: DispatchSpec; error: unknown}[] = [];
  const matching: DispatchSpec[] = [];
  const matched: string[] = [];
  for (const spec of specs) {
    try {
      if (!spec.when(change)) continue;
      matching.push(spec);
    } catch (error) {
      // A predicate that throws counts as a failed run of its spec.
      failures.push({spec, error});
    }
    matched.push(spec.id);
  }
  const settled = await Promise.allSettled(matching.map((spec) =>
    Promise.resolve().then(() => spec.run(change, Object.freeze({
      db: deps.db,
      eventId: input.id,
      eventTime,
      ...(spec.kind === "effect" ?
        {receipt: Object.freeze({command: spec.receipt.command,
          id: input.id})} : {}),
    })))));
  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      failures.push({spec: matching[index], error: result.reason});
    }
  });
  const failed = failures.map((failure) => failure.spec.id);
  if (!failures.length) return {matched, failed, deadLettered: false};
  for (const {spec, error} of failures) {
    deps.log.error("Dispatched projection failed.", {source,
      projectionId: spec.id, kind: spec.kind, eventId: input.id,
      sourcePath: input.document, error: errorMessage(error)});
  }
  const ageMs = deps.nowMillis() - eventTime.getTime();
  const maxAgeMs = deps.maxEventAgeMs ?? DISPATCH_MAX_EVENT_AGE_MS;
  if (!(ageMs > maxAgeMs)) {
    throw new DispatchFailure(source, input.id, failed);
  }
  await writeDeadLetters(source, input, eventTime, failures, deps);
  deps.log.warn("Dispatch event past its max age; dead letters written.", {
    source, eventId: input.id, sourcePath: input.document, failed, ageMs});
  return {matched, failed, deadLettered: true};
}

async function writeDeadLetters(source: string, input: DispatchEventInput,
  eventTime: Date, failures: readonly {spec: DispatchSpec; error: unknown}[],
  deps: DispatchDependencies): Promise<void> {
  const now = deps.nowMillis();
  const batch = deps.db.batch();
  for (const {spec, error} of failures) {
    const record: DispatchDeadLetterDocument = {
      projectionId: spec.id,
      kind: spec.kind,
      eventId: input.id,
      source,
      sourcePath: input.document,
      error: errorMessage(error),
      eventTime: Number.isNaN(eventTime.getTime()) ?
        Timestamp.fromMillis(now) : Timestamp.fromDate(eventTime),
      createdAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + DISPATCH_DEAD_LETTER_RETENTION_MS),
    };
    batch.set(deps.db.collection(DISPATCH_DEAD_LETTERS)
      .doc(deadLetterId(spec.id, input.id)), record);
  }
  await batch.commit();
}

function errorMessage(error: unknown): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` :
    String(error);
  return text.length > MAX_ERROR_LENGTH ?
    `${text.slice(0, MAX_ERROR_LENGTH - 1)}…` : text;
}

type WrittenEvent = FirestoreEvent<Change<DocumentSnapshot> | undefined,
  Record<string, string>>;

/**
 * The trigger handler for one source. Checks the registry when the module
 * loads, so a bad registration fails the deploy, not the first event.
 */
export function dispatchHandler(source: string,
  sets: readonly ProjectionSet[]): (event: WrittenEvent) => Promise<void> {
  const specs = registeredSpecs(source, sets);
  return async (event) => {
    await dispatchEvent(source, specs, {
      id: event.id,
      time: event.time,
      document: event.document,
      params: event.params,
      before: event.data?.before.exists ? event.data.before.data() : undefined,
      after: event.data?.after.exists ? event.data.after.data() : undefined,
    }, {
      db: admin.firestore(),
      nowMillis: () => Date.now(),
      log: logger,
    });
  };
}

/**
 * The one trigger for a source collection. Only generated registries call
 * this; tool/firebase/function_binding_intent.mjs reads it as a reviewed
 * trigger wrapper.
 */
export function dispatchTrigger(source: string, document: string,
  sets: readonly ProjectionSet[]) {
  return onDocumentWritten({
    document,
    retry: true,
    timeoutSeconds: dispatcherTimeoutSeconds(sets),
    memory: dispatcherMemory(sets),
  }, dispatchHandler(source, sets));
}
