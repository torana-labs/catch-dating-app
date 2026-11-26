/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminSearchPeopleCallablePayload} from "../shared/generated/adminSearchPeopleCallablePayload";
import type {AdminSearchPeopleCallableResponse} from "../shared/generated/adminSearchPeopleCallableResponse";
import {validateAdminSearchPeopleCallablePayload} from "../shared/generated/validators/adminSearchPeopleInput";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {writeAdminAuditLog} from "../platform/adminAudit";
import {requireAdminRole} from "../platform/adminAuth";
import {defineProjections} from "../platform/dispatch/runtime";

/**
 * People search for ops: by name, phone or user id. Firestore cannot search
 * text, so a trigger keeps adminPeopleIndex/{uid} with each person's name
 * prefixes and phone digits; the callable matches one token and writes every
 * search, with its query, to the admin audit log.
 */
export const PEOPLE_INDEX_COLLECTION = "adminPeopleIndex";
const searchRoles = ["admin", "adminOwner", "support", "safetyReviewer"] as const;
const searchRateLimit = {maxRequests: 30, windowMs: 60 * 1000};
const maxPrefix = 12;

type Response = AdminSearchPeopleCallableResponse;
type Row = Response["rows"][number];

export interface PeopleIndexDocument {
  schemaVersion: 1;
  uid: string;
  name: string | null;
  phoneMasked: string | null;
  city: string | null;
  deleted: boolean;
  tokens: string[];
  updatedAt: string;
}

/** The index entry for one profile, or null when the profile is gone. */
export function peopleIndexDocument(uid: string, user: Record<string, unknown> | undefined,
  now: Date): PeopleIndexDocument | null {
  if (!user) return null;
  const name = [user.name, user.displayName, [user.firstName, user.lastName].filter(Boolean).join(" ")]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? null;
  const digits = typeof user.phoneNumber === "string" ? user.phoneNumber.replace(/\D/gu, "") : "";
  const tokens = new Set<string>();
  for (const word of nameWords(name ?? "")) {
    for (let length = 1; length <= Math.min(word.length, maxPrefix); length += 1) tokens.add(word.slice(0, length));
  }
  if (digits.length >= 5) {
    const local = digits.slice(-10);
    tokens.add(digits);
    for (let length = 5; length <= local.length; length += 1) tokens.add(local.slice(0, length));
  }
  const city = typeof user.city === "string" ? marketForIdOrAlias(user.city)?.label ?? user.city : null;
  return {
    schemaVersion: 1,
    uid,
    name,
    phoneMasked: digits.length >= 5 ? maskPhone(digits) : null,
    city,
    deleted: user.deleted === true,
    tokens: [...tokens].slice(0, 200),
    updatedAt: now.toISOString(),
  };
}

/** The write that brings an index entry up to date: null when it already is. */
function peopleIndexWrite(uid: string, user: Record<string, unknown> | undefined,
  existing: FirebaseFirestore.DocumentData | undefined, now: Date): PeopleIndexDocument | "delete" | null {
  const entry = peopleIndexDocument(uid, user, now);
  if (!entry) return existing ? "delete" : null;
  if (existing && JSON.stringify({...existing, updatedAt: ""}) === JSON.stringify({...entry, updatedAt: ""})) return null;
  return entry;
}

/** Writes the index entry only when it changed; true when it wrote. */
export async function syncPeopleIndex(db: FirebaseFirestore.Firestore, uid: string,
  user: Record<string, unknown> | undefined, now: Date): Promise<boolean> {
  const ref = db.collection(PEOPLE_INDEX_COLLECTION).doc(uid);
  const write = peopleIndexWrite(uid, user, (await ref.get()).data(), now);
  if (write === null) return false;
  if (write === "delete") await ref.delete();
  else await ref.set(write);
  return true;
}

/**
 * Re-reads users/{uid} and writes its index entry in one transaction, so a
 * late, repeated or out-of-order trigger delivery indexes the current profile,
 * never the older one its payload carried. True when it wrote.
 */
export async function syncPeopleIndexFromSource(db: FirebaseFirestore.Firestore, uid: string,
  now: Date): Promise<boolean> {
  const ref = db.collection(PEOPLE_INDEX_COLLECTION).doc(uid);
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async (tx) => {
    const [user, existing] = await Promise.all([tx.get(userRef), tx.get(ref)]);
    const write = peopleIndexWrite(uid, user.data(), existing.data(), now);
    if (write === null) return false;
    if (write === "delete") tx.delete(ref);
    else tx.set(ref, write);
    return true;
  });
}

interface PeopleSearchDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: PeopleSearchDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

export async function adminSearchPeopleHandler(request: CallableRequest<unknown>,
  deps: PeopleSearchDeps = defaultDeps): Promise<Response> {
  const adminContext = requireAdminRole(request, searchRoles);
  const data = validateCallableWithAjv<AdminSearchPeopleCallablePayload>(request,
    validateAdminSearchPeopleCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminSearchPeople", searchRateLimit);
  const query = data.query;
  const digits = query.replace(/[\s()+-]/gu, "");
  let kind: Response["kind"];
  let rows: Row[];
  if (/^\d{5,15}$/u.test(digits)) {
    kind = "phone";
    rows = await byToken(db, digits.length > 10 ? digits : digits.slice(0, 10), data.limit, () => true);
  } else {
    const exact = /^[A-Za-z0-9_-]{6,128}$/u.test(query) ?
      await db.collection(PEOPLE_INDEX_COLLECTION).doc(query).get() : null;
    if (exact?.exists) {
      kind = "uid";
      rows = [row(exact.data() as PeopleIndexDocument)];
    } else {
      kind = "name";
      const words = nameWords(query);
      const [first, ...rest] = words;
      rows = first ? await byToken(db, first.slice(0, maxPrefix), data.limit, (entry) =>
        rest.every((word) => nameWords(entry.name ?? "").some((part) => part.startsWith(word)))) : [];
    }
  }
  await writeAdminAuditLog(db, adminContext, {
    action: "adminSearchPeople",
    targetPath: "users",
    request,
    after: {query, kind, resultCount: rows.length},
    serverTimestamp: deps.serverTimestamp,
  });
  return {kind, rows};
}

async function byToken(db: FirebaseFirestore.Firestore, token: string, limit: number,
  keep: (entry: PeopleIndexDocument) => boolean): Promise<Row[]> {
  const snapshot = await db.collection(PEOPLE_INDEX_COLLECTION)
    .where("tokens", "array-contains", token).limit(limit * 4).get();
  return snapshot.docs.map((doc) => doc.data() as PeopleIndexDocument)
    .filter(keep).slice(0, limit).map(row);
}

function row(entry: PeopleIndexDocument): Row {
  return {uid: entry.uid, name: entry.name, phone: entry.phoneMasked, city: entry.city, deleted: entry.deleted};
}

function nameWords(value: string): string[] {
  return value.normalize("NFKD").replace(/[̀-ͯ]/gu, "").toLowerCase()
    .split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 8);
}

function maskPhone(digits: string): string {
  const country = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : "";
  return `${country}••••• ${digits.slice(-5)}`;
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return {...data, query: typeof data.query === "string" ? data.query.trim() : data.query};
}

export const adminSearchPeople = onCall(appCheckCallableOptions,
  (request) => adminSearchPeopleHandler(request));

/**
 * Dispatcher specs (issue #2451). Each body re-reads its sources, so a
 * retry or a replay converges.
 */
export const usersProjections = defineProjections("users", [
  {
    id: "userWrittenIndexPeople", kind: "projection",
    when: () => true,
    run: async (change) => {
      const {documentId} = change;
      await syncPeopleIndexFromSource(admin.firestore(), documentId,
        new Date());
    },
  },
]);
