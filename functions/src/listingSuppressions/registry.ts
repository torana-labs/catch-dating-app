/* eslint-disable max-len */
import path from "node:path";
import {pathToFileURL} from "node:url";
import {defineSecret} from "firebase-functions/params";

// The do-not-list registry (listingSuppressions/{caseId}). The organizer
// takedown tool writes one case per removed organizer with keyed hashes of its
// names, handles, links, domains, ids and slugs; these checks hash what a front
// door was given under the same key and look for any shared hash. Keys are
// derived by the shared Operations module, which the takedown tool imports
// from the repository and Functions loads from its packaged copy, so both
// sides compute identical keys.
//
// Failure policy (docs/data_contracts.md, "Listing suppressions"): while at
// least one active case exists, a missing or short key fails Supply Intake
// and listing approval closed; organizer creation only flags, so it proceeds
// and logs. With no active case nothing can match and no key is needed.

/** Server-held HMAC key; every Function that reaches a suppression check binds it. */
export const listingSuppressionHmacKey = defineSecret("LISTING_SUPPRESSION_HMAC_KEY");

export const LISTING_SUPPRESSIONS = "listingSuppressions";
const HASHES_PER_QUERY = 30;
const CASES_PER_QUERY = 10;

export interface SuppressionModule {
  suppressionKeysForIntakeRequest: (request: unknown) => string[];
  suppressionKeysForIdentity: (identity: {
    names?: unknown; handles?: unknown; urls?: unknown; domains?: unknown;
    organizerIds?: unknown; slugs?: unknown; notes?: unknown;
  }, options?: {seedLinks?: boolean}) => string[];
  suppressionHashes: (secret: string, keys: Iterable<string>) => string[];
  usableSuppressionSecret: (secret: unknown) => boolean;
}

let loaded: Promise<SuppressionModule> | null = null;

/** The shared key module, from the Operations runtime copied into functions/lib. */
export function suppressionModule(): Promise<SuppressionModule> {
  loaded ??= import(pathToFileURL(path.resolve(__dirname, "..", "operations", "src",
    "workflows/supply-intake/organizer-matching/suppression.mjs")).href).catch((error: unknown) => {
    loaded = null;
    throw error;
  });
  return loaded;
}

/** Reads the key from the bound secret; empty when the Function does not bind it. */
export function listingSuppressionSecret(): string {
  try {
    return listingSuppressionHmacKey.value();
  } catch {
    return "";
  }
}

/** Anything that reads a query: a transaction, or a plain reader outside one. */
export interface SuppressionReader {
  get(query: FirebaseFirestore.Query): Promise<FirebaseFirestore.QuerySnapshot>;
}

export const plainReader: SuppressionReader = {get: (query) => query.get()};

export interface SuppressionMatch {
  caseId: string;
  reason: string;
  ref: FirebaseFirestore.DocumentReference;
  data: FirebaseFirestore.DocumentData;
}

export type SuppressionCheck =
  | {state: "clear"}
  | {state: "unavailable"}
  | {state: "suppressed"; match: SuppressionMatch};

/**
 * Whether any active case shares a hash with these identity keys. Reads only
 * (so it can run first inside a caller's transaction): one probe for an
 * active case, then array-contains-any lookups of 30 hashes each.
 */
export async function checkListingSuppression(reader: SuppressionReader, db: FirebaseFirestore.Firestore,
  keys: readonly string[], secret: () => string = listingSuppressionSecret): Promise<SuppressionCheck> {
  const collection = db.collection(LISTING_SUPPRESSIONS);
  const probe = await reader.get(collection.where("active", "==", true).limit(1));
  if (probe.empty || keys.length === 0) return {state: "clear"};
  const module = await suppressionModule();
  const key = secret();
  if (!module.usableSuppressionSecret(key)) return {state: "unavailable"};
  const hashes = module.suppressionHashes(key, keys);
  const matches: SuppressionMatch[] = [];
  for (let index = 0; index < hashes.length; index += HASHES_PER_QUERY) {
    const snapshot = await reader.get(collection
      .where("identityHashes", "array-contains-any", hashes.slice(index, index + HASHES_PER_QUERY))
      .limit(CASES_PER_QUERY));
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.active === true) matches.push({caseId: doc.id, reason: String(data.reason ?? ""), ref: doc.ref, data});
    }
  }
  if (matches.length === 0) return {state: "clear"};
  matches.sort((left, right) => left.caseId.localeCompare(right.caseId));
  return {state: "suppressed", match: matches[0]};
}

/** The registry patch for one refused intake request; written in the caller's transaction. */
export function blockedIntakePatch(match: SuppressionMatch, now: Date): Record<string, unknown> {
  const count = Number.isInteger(match.data.blockedIntakeCount) ? Number(match.data.blockedIntakeCount) : 0;
  return {blockedIntakeCount: count + 1, lastBlockedAtMillis: now.getTime(), updatedAtMillis: now.getTime()};
}

const MAX_REVIEW_FLAGS = 50;

/** The registry patch that flags a self-created organizer for review, keeping the newest 50 flags. */
export function reviewFlagPatch(match: SuppressionMatch, organizerId: string, now: Date): Record<string, unknown> {
  const flags = Array.isArray(match.data.reviewFlags) ? match.data.reviewFlags as unknown[] : [];
  const next = [...flags.filter((flag) => (flag as {organizerId?: unknown})?.organizerId !== organizerId),
    {organizerId, source: "createOrganizer", flaggedAtMillis: now.getTime()}].slice(-MAX_REVIEW_FLAGS);
  return {reviewFlags: next, updatedAtMillis: now.getTime()};
}
