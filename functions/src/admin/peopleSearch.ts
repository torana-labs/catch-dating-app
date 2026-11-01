/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminSearchPeopleCallablePayload} from "../shared/generated/adminSearchPeopleCallablePayload";
import type {AdminSearchPeopleCallableResponse} from "../shared/generated/adminSearchPeopleCallableResponse";
import {validateAdminSearchPeopleCallablePayload} from "../shared/generated/validators/adminSearchPeopleInput";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {writeAdminAuditLog} from "./adminAudit";
import {requireAdminRole} from "./adminAuth";

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

/** Writes the index entry only when it changed; true when it wrote. */
export async function syncPeopleIndex(db: FirebaseFirestore.Firestore, uid: string,
  user: Record<string, unknown> | undefined, now: Date): Promise<boolean> {
  const ref = db.collection(PEOPLE_INDEX_COLLECTION).doc(uid);
  const entry = peopleIndexDocument(uid, user, now);
  const existing = (await ref.get()).data();
  if (!entry) {
    if (!existing) return false;
    await ref.delete();
    return true;
  }
  if (existing && JSON.stringify({...existing, updatedAt: ""}) === JSON.stringify({...entry, updatedAt: ""})) return false;
  await ref.set(entry);
  return true;
}

/** Not retried (a retrying trigger needs a forced deploy); reconcileAdminInboxNightly catches up. */
export const onUserWrittenIndexPeople = onDocumentWritten({document: "users/{uid}"},
  async (event) => {
    await syncPeopleIndex(admin.firestore(), event.params.uid, event.data?.after.data(), new Date());
  });

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
