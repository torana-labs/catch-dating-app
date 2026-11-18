import {createHash} from "node:crypto";
import {Timestamp} from "firebase-admin/firestore";

/**
 * Replay receipts: one collection, one document shape, one TTL policy.
 *
 * A command that must not run twice (a callable the client may retry, a
 * trigger or webhook the platform may redeliver) records a receipt in the
 * same transaction as its write. A retry finds the receipt and returns the
 * original result instead of running again; a different request that reuses
 * the same id is a conflict the command turns into its own error.
 *
 * `commandReceipts/{command}_{id}` holds `command`, an optional `requestHash`
 * (the fingerprint of what the first request asked for), an optional bounded
 * `result` (only what a replay must return that the live state cannot
 * rebuild), `createdAt` and `expiresAt`. The collection's single Firestore TTL
 * policy deletes a receipt after `expiresAt`; a receipt past `expiresAt` that
 * the policy has not yet deleted is treated as absent.
 *
 * Only pure replay lives here. A receipt that proves a decision to someone
 * later (consent, money, safety, a legal or audit record, anything a person
 * or regulator reads) keeps its own collection with its own retention. The
 * classification is in docs/data_contracts.md ("Command receipts").
 */
export const COMMAND_RECEIPTS = "commandReceipts";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long a receipt must outlive its command, by who retries it:
 * - `trigger`: a Firestore/Storage trigger redelivery (retried for up to
 *   seven days when retries are enabled, otherwise within hours);
 * - `request`: a client retry of a callable, including an offline queue that
 *   replays after a long gap;
 * - `webhook`: a provider's redelivery of a signed webhook.
 */
export const COMMAND_RECEIPT_RETENTION_MS = {
  trigger: 7 * DAY_MS,
  request: 30 * DAY_MS,
  webhook: 30 * DAY_MS,
} as const;

export type CommandReceiptRetention = keyof typeof COMMAND_RECEIPT_RETENTION_MS;

/** Largest stored `result`, so a receipt can never become a data store. */
const MAX_RESULT_BYTES = 4096;
/** Document ids longer than this, or with other characters, are hashed. */
const MAX_RAW_ID_LENGTH = 100;
const COMMAND_PATTERN = /^[a-z][A-Za-z0-9]{0,63}$/;
const RAW_ID_PATTERN = /^[A-Za-z0-9:._-]+$/;

/**
 * The receipt's document id, `{command}_{id}`. An id that is not a short
 * run of letters, digits and `:._-` (a client request id, a composite key) is
 * replaced by `h` plus its SHA-256, so the document id is always valid and
 * bounded. The same command and id always give the same document.
 */
export function commandReceiptId(command: string, id: string): string {
  if (!COMMAND_PATTERN.test(command)) {
    throw new Error(`Invalid command receipt command: ${command}`);
  }
  if (id.length === 0) {
    throw new Error("A command receipt needs a non-empty id.");
  }
  const safe = id.length <= MAX_RAW_ID_LENGTH && RAW_ID_PATTERN.test(id);
  const part = safe ? id :
    `h${createHash("sha256").update(id).digest("hex")}`;
  return `${command}_${part}`;
}

export function commandReceiptRef(
  db: FirebaseFirestore.Firestore,
  command: string,
  id: string
): FirebaseFirestore.DocumentReference {
  return db.collection(COMMAND_RECEIPTS).doc(commandReceiptId(command, id));
}

/**
 * A stable SHA-256 of what a request asked for (key order ignored, undefined
 * fields dropped). Include everything that makes two requests different,
 * the acting user and the target among it.
 */
export function commandRequestHash(...parts: unknown[]): string {
  return createHash("sha256").update(canonicalJson(parts)).digest("hex");
}

/** What a transaction found when it looked for this request's receipt. */
export type CommandReceiptLookup<Result> =
  | {kind: "none"}
  | {kind: "replay"; result: Result | undefined}
  | {kind: "conflict"};

/**
 * Reads the receipt inside [tx] (call before any write) and says whether the
 * command is new, an exact retry (return `result`), or another request
 * reusing the id (reject it). Pass a `requestHash` for every request-shaped
 * command; trigger and webhook dedupe, which have no request to compare, omit
 * it and any live receipt is a replay.
 */
export async function readCommandReceipt<Result = Record<string, unknown>>(
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  options: {command: string; requestHash?: string; nowMillis: number}
): Promise<CommandReceiptLookup<Result>> {
  return classifyCommandReceipt<Result>(await tx.get(ref), options);
}

/** The classification half of [readCommandReceipt], for a snapshot in hand. */
export function classifyCommandReceipt<Result = Record<string, unknown>>(
  snap: FirebaseFirestore.DocumentSnapshot,
  options: {command: string; requestHash?: string; nowMillis: number}
): CommandReceiptLookup<Result> {
  return classifyCommandReceiptData<Result>(snap.data(), options);
}

/** The classification half again, for a receipt's data (or its absence). */
export function classifyCommandReceiptData<Result = Record<string, unknown>>(
  stored: unknown,
  options: {command: string; requestHash?: string; nowMillis: number}
): CommandReceiptLookup<Result> {
  if (stored === undefined || stored === null) return {kind: "none"};
  const data = stored as Record<string, unknown>;
  const expiresAt = data.expiresAt;
  if (expiresAt instanceof Timestamp &&
      expiresAt.toMillis() <= options.nowMillis) {
    return {kind: "none"};
  }
  if (data.command !== options.command ||
      data.requestHash !== options.requestHash) {
    return {kind: "conflict"};
  }
  return {kind: "replay", result: data.result as Result | undefined};
}

/** The receipt document for one applied command. */
export function buildCommandReceipt(params: {
  command: string;
  retention: CommandReceiptRetention;
  nowMillis: number;
  requestHash?: string;
  result?: Record<string, unknown>;
}): Record<string, unknown> {
  if (params.requestHash !== undefined &&
      !/^[a-f0-9]{64}$/.test(params.requestHash)) {
    throw new Error("A command receipt requestHash is a SHA-256 hex string.");
  }
  if (params.result !== undefined &&
      Buffer.byteLength(JSON.stringify(params.result)) > MAX_RESULT_BYTES) {
    throw new Error(
      `A command receipt result is limited to ${MAX_RESULT_BYTES} bytes.`);
  }
  return {
    command: params.command,
    ...(params.requestHash === undefined ? {} :
      {requestHash: params.requestHash}),
    ...(params.result === undefined ? {} : {result: params.result}),
    createdAt: Timestamp.fromMillis(params.nowMillis),
    expiresAt: Timestamp.fromMillis(
      params.nowMillis + COMMAND_RECEIPT_RETENTION_MS[params.retention]),
  };
}

/**
 * Writes the receipt in the transaction that applies the command, after
 * [readCommandReceipt] returned `none`. It replaces a receipt that is past
 * `expiresAt` but not yet deleted by the TTL policy.
 */
export function writeCommandReceipt(
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  params: Parameters<typeof buildCommandReceipt>[0]
): void {
  tx.set(ref, buildCommandReceipt(params));
}

/**
 * Claims the right to run a side effect once, for dedupe with no
 * transaction of its own (a trigger or webhook about to send a push).
 * Resolves true for the delivery that claimed it, false for any other.
 */
export async function claimCommandReceipt(
  db: FirebaseFirestore.Firestore,
  params: {
    command: string;
    id: string;
    retention: CommandReceiptRetention;
    nowMillis: number;
  }
): Promise<boolean> {
  const ref = commandReceiptRef(db, params.command, params.id);
  return db.runTransaction(async (tx) => {
    const lookup = await readCommandReceipt(tx, ref, params);
    if (lookup.kind !== "none") return false;
    writeCommandReceipt(tx, ref, params);
    return true;
  });
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
