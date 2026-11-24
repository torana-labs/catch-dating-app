import * as admin from "firebase-admin";
import {HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {organizerAdminSearchQueryTokens} from
  "../domain/organizers/organizerAdminSearch";
import {checkRateLimit} from "../shared/rateLimit";
import type {CommercialTermsDocument} from
  "../shared/generated/commercialTermsDocument";
import type {AdminListCommercialTermsCallablePayload as Payload} from
  "../shared/generated/adminListCommercialTermsCallablePayload";
import type {AdminListCommercialTermsCallableResponse as Result} from
  "../shared/generated/adminListCommercialTermsCallableResponse";
import {validateAdminListCommercialTermsCallablePayload} from
  "../shared/generated/validators/adminListCommercialTermsInput";
import {validateAdminListCommercialTermsCallableResponse} from
  "../shared/generated/validators/adminListCommercialTermsOutput";
import {validateCommercialTermsDocument} from
  "../shared/generated/validators/commercialTermsDocument";
import {validateCommercialTermsRevisionDocument} from
  "../shared/generated/validators/commercialTermsRevisionDocument";
import {effectiveCommercialTerms, readCommercialTerms} from "./resolver";
import {
  commercialTermsCollection,
  commercialTermsRevisionId,
  commercialTermsRevisionsCollection,
  organizerCommercialTermsId,
  platformCommercialTermsId,
} from "./terms";
import {
  callableWithLimits,
  type CallableContext,
  type CallableSpec,
  runCallable,
} from "../platform/callables/callable";
import {adminRoles} from "../platform/callables/policies";
import type {AdminContext} from "../platform/adminAuth";

/** Bounds keep one console read cheap; the response says when it is cut. */
export const commercialTermsHistoryLimit = 20;
export const commercialTermsOverrideLimit = 100;
export const commercialTermsOrganizerMatchLimit = 10;

export interface OrganizerMatch {
  organizerId: string; organizerName: string | null; cityName: string | null;
}

interface Dependencies {
  db: () => FirebaseFirestore.Firestore;
  rateLimit: typeof checkRateLimit;
  /** Name search over the organizer admin search tokens. */
  searchOrganizers: (db: FirebaseFirestore.Firestore, query: string) =>
    Promise<OrganizerMatch[]>;
}
const defaults: Dependencies = {db: () => admin.firestore(),
  rateLimit: checkRateLimit, searchOrganizers: searchOrganizersByName};

/**
 * Finance and Admin Owner review commercial terms in the Admin console:
 * the platform defaults, one scope's recent revisions, every organizer
 * override and, to add an override, an organizer name search. Read-only.
 * Policy: ["adminOwner"] (STR-10).
 * @param {Dependencies} deps Dependencies.
 * @return {CallableSpec} The callable.
 */
export function adminListCommercialTermsSpec(deps: Dependencies = defaults):
  CallableSpec<Payload, AdminContext, Result> {
  return {
    name: "adminListCommercialTerms",
    policy: adminRoles(["adminOwner"]),
    input: validateAdminListCommercialTermsCallablePayload,
    handle: (context) => adminListCommercialTermsWork(context, deps),
  };
}

/** The deployed path of adminListCommercialTerms, for tests. */
export function adminListCommercialTermsHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults):
  Promise<Result> {
  return runCallable(adminListCommercialTermsSpec(deps), request);
}

async function adminListCommercialTermsWork(
  {data, actor}: CallableContext<Payload, AdminContext>, deps: Dependencies):
  Promise<Result> {
  const query = data.organizerQuery?.trim() ?? "";
  if (data.organizerQuery !== null && query.length < 2) {
    throw new HttpsError("invalid-argument", "Search needs two characters.");
  }
  const db = deps.db();
  await deps.rateLimit(db, actor.uid, "adminListCommercialTerms", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const termsId = data.organizerId === null ? platformCommercialTermsId :
    organizerCommercialTermsId(data.organizerId);
  const stored = await readCommercialTerms({db,
    organizerId: data.organizerId});
  const record = data.organizerId === null ? stored.platform :
    stored.organizer;
  let effectiveTerms: Result["effectiveTerms"] = null;
  try {
    effectiveTerms = effectiveCommercialTerms({platform: stored.platform,
      organizer: data.organizerId === null ? null : stored.organizer});
  } catch {
    // An override that no longer merges is shown as stored, with no
    // effective terms, so an operator can repair it.
    effectiveTerms = null;
  }
  const [history, overrides, organizerName, organizerMatches] =
    await Promise.all([
      readHistory(db, termsId, record?.revision ?? 0),
      readOverrides(db),
      data.organizerId === null ? Promise.resolve(null) :
        readOrganizerNames(db, [data.organizerId])
          .then((names) => names.get(data.organizerId!) ?? null),
      query ? deps.searchOrganizers(db, query) : Promise.resolve([]),
    ]);
  const result: Result = {
    termsId, organizerId: data.organizerId, organizerName,
    platform: stored.platform ? recordView(stored.platform) as
      Result["platform"] : null,
    organizer: data.organizerId !== null && stored.organizer ?
      recordView(stored.organizer) as Result["organizer"] : null,
    effectiveTerms,
    history: history.entries,
    historyComplete: history.complete,
    overrides: overrides.entries,
    overridesComplete: overrides.complete,
    organizerMatches: organizerMatches.slice(0,
      commercialTermsOrganizerMatchLimit),
  };
  if (!validateAdminListCommercialTermsCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid commercial terms listing.");
  }
  return result;
}

function recordView(record: CommercialTermsDocument) {
  return {revision: record.revision, terms: record.terms,
    reason: record.reason, updatedByUid: record.updatedByUid,
    updatedAtMillis: record.updatedAtMillis};
}

/**
 * Revisions are keyed by number, so the newest ones are direct reads and
 * need no query or index. A missing or malformed record fails closed.
 */
async function readHistory(db: FirebaseFirestore.Firestore, termsId: string,
  revision: number): Promise<{entries: Result["history"]; complete: boolean}> {
  const oldest = Math.max(1, revision - commercialTermsHistoryLimit + 1);
  const revisions: number[] = [];
  for (let next = revision; next >= oldest; next -= 1) revisions.push(next);
  const snaps = await Promise.all(revisions.map((next) => db
    .collection(commercialTermsRevisionsCollection)
    .doc(commercialTermsRevisionId(termsId, next)).get()));
  const entries = snaps.map((snap) => {
    const value = snap.data();
    if (!snap.exists || !validateCommercialTermsRevisionDocument(value) ||
        value.termsId !== termsId) {
      throw new HttpsError("data-loss",
        "Commercial terms history is incomplete.");
    }
    return {revision: value.revision, terms: value.terms,
      reason: value.reason, actorUid: value.actorUid,
      createdAtMillis: value.createdAtMillis};
  });
  return {entries, complete: oldest === 1};
}

async function readOverrides(db: FirebaseFirestore.Firestore): Promise<{
  entries: Result["overrides"]; complete: boolean;
}> {
  const snap = await db.collection(commercialTermsCollection)
    .where("scope", "==", "organizer")
    .limit(commercialTermsOverrideLimit + 1).get();
  const records = snap.docs.map((doc) => doc.data())
    .filter((value): value is CommercialTermsDocument =>
      validateCommercialTermsDocument(value) && value.scope === "organizer" &&
      typeof value.organizerId === "string");
  const kept = records.slice(0, commercialTermsOverrideLimit);
  const names = await readOrganizerNames(db,
    kept.map((record) => record.organizerId!));
  const entries = kept.map((record) => ({
    organizerId: record.organizerId!,
    organizerName: names.get(record.organizerId!) ?? null,
    revision: record.revision,
    terms: record.terms as Result["overrides"][number]["terms"],
    reason: record.reason, updatedAtMillis: record.updatedAtMillis,
  })).sort((left, right) => right.updatedAtMillis - left.updatedAtMillis);
  return {entries, complete: snap.docs.length <= commercialTermsOverrideLimit};
}

async function readOrganizerNames(db: FirebaseFirestore.Firestore,
  organizerIds: string[]): Promise<Map<string, string>> {
  const snaps = await Promise.all(organizerIds.map((organizerId) =>
    db.collection("organizers").doc(organizerId).get()));
  const names = new Map<string, string>();
  snaps.forEach((snap, index) => {
    const name = snap.exists ? snap.data()?.name : undefined;
    if (typeof name === "string" && name.trim()) {
      names.set(organizerIds[index], name.trim().slice(0, 200));
    }
  });
  return names;
}

async function searchOrganizersByName(db: FirebaseFirestore.Firestore,
  query: string): Promise<OrganizerMatch[]> {
  const tokens = organizerAdminSearchQueryTokens(query.toLowerCase());
  if (tokens.length === 0) return [];
  const snap = await db.collection("organizers")
    .where("adminSearch.tokens", "array-contains-any", tokens)
    .limit(50).get();
  const words = query.toLowerCase().split(/\s+/u).filter(Boolean);
  return snap.docs.map((doc) => {
    const value = doc.data();
    return {organizerId: doc.id,
      organizerName: typeof value.name === "string" ?
        value.name.slice(0, 200) : null,
      cityName: typeof value.cityName === "string" ?
        value.cityName.slice(0, 200) : null};
  }).filter((match) => {
    const haystack = `${match.organizerName ?? ""} ${match.cityName ?? ""} ` +
      match.organizerId;
    return words.every((word) => haystack.toLowerCase().includes(word));
  }).sort((left, right) => (left.organizerName ?? "")
    .localeCompare(right.organizerName ?? ""))
    .slice(0, commercialTermsOrganizerMatchLimit);
}

export const adminListCommercialTerms = callableWithLimits(
  {timeoutSeconds: 30, maxInstances: 10},
  adminListCommercialTermsSpec());
