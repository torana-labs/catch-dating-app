/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminListActivityLogCallablePayload} from "../shared/generated/adminListActivityLogCallablePayload";
import type {AdminListActivityLogCallableResponse} from "../shared/generated/adminListActivityLogCallableResponse";
import {validateAdminListActivityLogCallablePayload} from "../shared/generated/validators/adminListActivityLogInput";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {requireAdminRole} from "./adminAuth";

/**
 * One activity log, newest first: people's decisions (adminAuditLogs, one per
 * audited admin write or search) and agent receipts (adminActionExecutions,
 * one per Admin CLI action an agent ran). "problems" keeps the receipts that
 * failed or never finished. Each source keeps its own place in the cursor, so
 * merging them never skips or repeats an entry.
 */
const activityRoles = ["admin", "adminOwner"] as const;
const problemStatuses = ["failed", "indeterminate"];

type Response = AdminListActivityLogCallableResponse;
type Entry = Response["entries"][number];
type Stamp = {s: number; n: number};
interface SourceCursor {at: string; stamp: Stamp | null; id: string}
type Place = SourceCursor | "start" | "end";
interface Cursor {decisions: Place; agents: Place}

interface ActivityLogDeps {
  firestore: () => FirebaseFirestore.Firestore;
  timestamp: (seconds: number, nanoseconds: number) => unknown;
  now: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: ActivityLogDeps = {
  firestore: () => admin.firestore(),
  timestamp: (seconds, nanoseconds) => new admin.firestore.Timestamp(seconds, nanoseconds),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

interface Fetched {entry: Entry; place: SourceCursor}

export async function adminListActivityLogHandler(request: CallableRequest<unknown>,
  deps: ActivityLogDeps = defaultDeps): Promise<Response> {
  const adminContext = requireAdminRole(request, activityRoles);
  const data = validateCallableWithAjv<AdminListActivityLogCallablePayload>(request,
    validateAdminListActivityLogCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminListActivityLog", {maxRequests: 60, windowMs: 60 * 1000});
  const cursor = data.cursor ? decodeCursor(data.cursor) : {decisions: "start", agents: "start"} as Cursor;
  if (data.filter === "agents" || data.filter === "problems") cursor.decisions = "end";
  if (data.filter === "decisions") cursor.agents = "end";

  const [decisions, agents] = await Promise.all([
    cursor.decisions === "end" ? [] : loadDecisions(db, deps, cursor.decisions, data.limit),
    cursor.agents === "end" ? [] : loadAgents(db, cursor.agents, data.limit, data.filter === "problems"),
  ]);
  const merged = [...decisions, ...agents].sort((left, right) =>
    left.entry.at === right.entry.at ? right.entry.entryId.localeCompare(left.entry.entryId) :
      right.entry.at.localeCompare(left.entry.at));
  const page = merged.slice(0, data.limit);
  const next: Cursor = {
    decisions: advance(cursor.decisions, decisions, page, data.limit),
    agents: advance(cursor.agents, agents, page, data.limit),
  };
  return {
    generatedAt: deps.now().toISOString(),
    filter: data.filter,
    entries: page.map((item) => item.entry),
    nextCursor: next.decisions === "end" && next.agents === "end" ? null : encodeCursor(next),
  };
}

/** Where a source resumes: after the last of its entries this page showed. */
function advance(place: Place, fetched: Fetched[], page: Fetched[], limit: number): Place {
  if (place === "end") return "end";
  const shown = fetched.filter((item) => page.includes(item));
  if (shown.length === fetched.length && fetched.length < limit) return "end";
  return shown.at(-1)?.place ?? place;
}

async function loadDecisions(db: FirebaseFirestore.Firestore, deps: ActivityLogDeps, place: Place,
  limit: number): Promise<Fetched[]> {
  let query = db.collection("adminAuditLogs")
    .orderBy("createdAt", "desc").orderBy(admin.firestore.FieldPath.documentId(), "desc").limit(limit);
  if (place !== "start" && place !== "end" && place.stamp) {
    query = query.startAfter(deps.timestamp(place.stamp.s, place.stamp.n), place.id);
  }
  const snapshot = await query.get();
  return snapshot.docs.flatMap((doc) => {
    const value = doc.data();
    const stamp = stampOf(value.createdAt);
    if (!stamp) return [];
    const at = new Date(stamp.s * 1000 + Math.floor(stamp.n / 1e6)).toISOString();
    const entry: Entry = {
      entryId: `decision-${doc.id}`,
      kind: "decision",
      at,
      actorUid: text(value.actorUid, 128),
      actorRoles: strings(value.roles),
      action: text(value.action, 120) ?? "unknown",
      target: text(value.targetPath, 500),
      outcome: "done",
      detail: text(value.note, 500),
      problem: false,
    };
    return [{entry, place: {at, stamp, id: doc.id}}];
  });
}

async function loadAgents(db: FirebaseFirestore.Firestore, place: Place, limit: number,
  problemsOnly: boolean): Promise<Fetched[]> {
  let query: FirebaseFirestore.Query = db.collection("adminActionExecutions");
  if (problemsOnly) query = query.where("status", "in", problemStatuses);
  query = query.orderBy("startedAt", "desc").orderBy(admin.firestore.FieldPath.documentId(), "desc").limit(limit);
  if (place !== "start" && place !== "end") query = query.startAfter(place.at, place.id);
  const snapshot = await query.get();
  return snapshot.docs.flatMap((doc) => {
    const value = doc.data();
    const at = typeof value.startedAt === "string" ? value.startedAt : null;
    if (!at) return [];
    const status = ["started", "succeeded", "failed", "indeterminate"].includes(value.status) ?
      value.status as "started" | "succeeded" | "failed" | "indeterminate" : "indeterminate";
    const entry: Entry = {
      entryId: `agent-${doc.id}`,
      kind: "agent",
      at,
      actorUid: text(value.actorUid, 128),
      actorRoles: strings(value.actorRoles),
      action: text(value.actionId, 120) ?? text(value.callable, 120) ?? "unknown",
      target: text(value.target, 500),
      outcome: status === "succeeded" ? "done" : status,
      detail: [text(value.errorCode, 80), text(value.errorMessage, 400)].filter(Boolean).join(": ") || null,
      problem: problemStatuses.includes(status),
    };
    return [{entry, place: {at, stamp: null, id: doc.id}}];
  });
}

function stampOf(value: unknown): Stamp | null {
  if (!value || typeof value !== "object") return null;
  const stamp = value as {seconds?: unknown; nanoseconds?: unknown; _seconds?: unknown; _nanoseconds?: unknown};
  const s = stamp.seconds ?? stamp._seconds;
  const n = stamp.nanoseconds ?? stamp._nanoseconds;
  return Number.isSafeInteger(s) && Number.isSafeInteger(n) ? {s: s as number, n: n as number} : null;
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string): Cursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    const place = (entry: unknown): Place | null => {
      if (entry === "start" || entry === "end") return entry;
      const item = entry as Record<string, unknown> | null;
      if (!item || typeof item.at !== "string" || typeof item.id !== "string") return null;
      const stamp = item.stamp === null ? null : stampOf({seconds: (item.stamp as Stamp)?.s, nanoseconds: (item.stamp as Stamp)?.n});
      return {at: item.at, id: item.id, stamp};
    };
    const decisions = place(parsed.decisions);
    const agents = place(parsed.agents);
    if (decisions && agents) return {decisions, agents};
  } catch {
    // Falls through to the refusal below.
  }
  throw new HttpsError("invalid-argument", "This page cursor is invalid; reload the activity log.");
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string").slice(0, 10) : [];
}

export const adminListActivityLog = onCall(appCheckCallableOptions,
  (request) => adminListActivityLogHandler(request));
