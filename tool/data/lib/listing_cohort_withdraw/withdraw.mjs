import crypto from "node:crypto";

/**
 * Listing cohort withdraw: the selection, manifest and writes behind
 * tool/data/listing_cohort_withdraw.mjs (docs/release_operations.md,
 * "Listing cohort withdraw"). Pure functions take plain organiser data; the
 * Firestore functions take an injected db so the tests run against a fake.
 *
 * Nothing here returns a name. Organiser ids stay inside the plan object and
 * the optional local manifest file: older ids are slug-style and carry the
 * organiser's name, so they never reach a log, summary or artifact.
 */

export class WithdrawError extends Error {}

/** The same pattern as contracts/shared/listing_program_common.schema.json#/definitions/cohortId. */
export const COHORT_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/u;
/** The same pattern as contracts/shared/profile_common.schema.json#/definitions/strictCitySlug. */
export const CITY_SLUG_PATTERN = /^[a-z0-9-]{1,80}$/u;
export const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

export const AUDIT_ACTION = "listingCohortWithdraw";
export const AUDIT_ACTOR = "workflow:listing-cohort-withdraw";
/** The owner approves every apply run through the prod-takedown environment. */
export const AUDIT_ROLES = Object.freeze(["adminOwner"]);
export const WITHDRAW_REASON = "cohortWithdrawal";
export const MANIFEST_VERSION = 1;
/** Two writes per organiser (page and audit row) stay well under the 500-write transaction limit. */
export const CHUNK_SIZE = 100;

/**
 * What a withdrawal writes: off the site, out of search and every format page
 * count. The same values as the single-organiser suspend from a takedown
 * request (organizerSuspensionPatch in functions/src/takedownRequests/admin.ts).
 */
export const WITHDRAW_PATCH = Object.freeze({
  "publicPage.publishStatus": "suppressed",
  "publicPage.indexStatus": "noindex",
  "publicPage.robots": "noindex, follow",
});

/** The only organiser fields the tool reads. No name, handle, source or contact field. */
export const ORGANIZER_FIELDS = Object.freeze([
  "listingProgram.cohortId",
  "publicPage.publishStatus",
  "publicPage.indexStatus",
  "publicPage.robots",
  "publicPage.citySlug",
  "claim.state",
  "ownership.state",
  "ownership.ownerUserId",
  "ownerUserId",
  "hostUserId",
]);

const OFF_SITE = new Set(["suppressed", "removed"]);

/** The plan's buckets, in the order they print. */
export const OUTCOMES = Object.freeze(["withdraw", "alreadyWithdrawn", "alreadyOff", "claimed", "notPublished"]);

/**
 * Claimed by its owner: the same signals as assertCanBeClaimed in
 * functions/src/organizers/organizerClaimApproval.ts, plus the forward owner
 * model. A pending claim is not a claim yet.
 */
export function isClaimed(organizer) {
  const ownership = organizer?.ownership ?? {};
  const claimState = organizer?.claim?.state;
  return Boolean(organizer?.ownerUserId || organizer?.hostUserId || ownership.ownerUserId) ||
    ownership.state === "claimed" || ownership.state === "transferred" ||
    claimState === "claimed" || claimState === "verified";
}

/**
 * Where one cohort organiser lands. `withdrawnIds` holds the organisers an
 * earlier apply of this cohort withdrew (from the audit log), so a re-run
 * keeps them in the manifest and the approved hash stays valid.
 */
export function classify(id, organizer, withdrawnIds) {
  const status = organizer?.publicPage?.publishStatus;
  if (OFF_SITE.has(status)) return withdrawnIds.has(id) ? "alreadyWithdrawn" : "alreadyOff";
  if (status !== "published") return "notPublished";
  if (isClaimed(organizer)) return "claimed";
  return "withdraw";
}

export function inScope(organizer, {cohortId, city}) {
  if (organizer?.listingProgram?.cohortId !== cohortId) return false;
  return city === null || organizer?.publicPage?.citySlug === city;
}

/** The manifest an apply must match: the cohort, the city filter and the sorted organiser ids. */
export function buildManifest({cohortId, city, organizerIds}) {
  return {version: MANIFEST_VERSION, cohortId, city, organizerIds: [...organizerIds].sort()};
}

export function manifestSha256(manifest) {
  // Fixed key order, so the same selection always hashes the same.
  const canonical = JSON.stringify({version: manifest.version, cohortId: manifest.cohortId, city: manifest.city,
    organizerIds: manifest.organizerIds});
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/** Pure: the plan from already-read organisers ([{id, data}]). */
export function planFromOrganizers({organizers, withdrawnIds, cohortId, city}) {
  const counts = Object.fromEntries(OUTCOMES.map((outcome) => [outcome, 0]));
  const byCity = new Map();
  const toWithdraw = [];
  const covered = [];
  let matched = 0;
  let claimPending = 0;
  for (const {id, data} of organizers) {
    if (!inScope(data, {cohortId, city})) continue;
    matched += 1;
    const outcome = classify(id, data, withdrawnIds);
    counts[outcome] += 1;
    const citySlug = typeof data?.publicPage?.citySlug === "string" ? data.publicPage.citySlug : "(no city)";
    const cityCounts = byCity.get(citySlug) ?? {matched: 0, withdraw: 0};
    cityCounts.matched += 1;
    if (outcome === "withdraw") {
      cityCounts.withdraw += 1;
      toWithdraw.push(id);
      if (data?.claim?.state === "claimPending") claimPending += 1;
    }
    byCity.set(citySlug, cityCounts);
    if (outcome === "withdraw" || outcome === "alreadyWithdrawn") covered.push(id);
  }
  const manifest = buildManifest({cohortId, city, organizerIds: covered});
  return {
    cohortId,
    city,
    matched,
    counts,
    claimPending,
    byCity: Object.fromEntries([...byCity.entries()].sort(([a], [b]) => a.localeCompare(b))),
    toWithdraw: toWithdraw.sort(),
    manifest,
    sha256: manifestSha256(manifest),
  };
}

/** Counts only: what the CLI prints and returns. No id or name. */
export function summarizePlan(plan) {
  return {
    cohortId: plan.cohortId,
    city: plan.city,
    matched: plan.matched,
    ...plan.counts,
    claimPending: plan.claimPending,
    byCity: plan.byCity,
    manifestOrganizers: plan.manifest.organizerIds.length,
    sha256: plan.sha256,
  };
}

async function* paged(query, pageSize = 300) {
  let after = null;
  for (;;) {
    let page = query.orderBy("__name__").limit(pageSize);
    if (after) page = page.startAfter(after);
    const snap = await page.get();
    for (const doc of snap.docs) yield doc;
    if (snap.docs.length < pageSize) return;
    after = snap.docs.at(-1);
  }
}

/** The organisers an earlier apply of this cohort withdrew, from their audit rows. */
export async function readWithdrawnIds(db, cohortId) {
  const ids = new Set();
  const query = db.collection("adminAuditLogs").where("action", "==", AUDIT_ACTION).select("targetPath", "after.cohortId");
  for await (const doc of paged(query)) {
    const data = doc.data();
    if (data?.after?.cohortId !== cohortId) continue;
    const match = /^organizers\/([^/]+)$/u.exec(String(data?.targetPath ?? ""));
    if (match) ids.add(match[1]);
  }
  return ids;
}

/** Reads the cohort (field projection only) and builds the plan. */
export async function buildPlan({db, cohortId, city}) {
  const query = db.collection("organizers").where("listingProgram.cohortId", "==", cohortId).select(...ORGANIZER_FIELDS);
  const organizers = [];
  for await (const doc of paged(query)) organizers.push({id: doc.id, data: doc.data()});
  const withdrawnIds = await readWithdrawnIds(db, cohortId);
  return planFromOrganizers({organizers, withdrawnIds, cohortId, city});
}

export function assertApprovedHash(plan, expected) {
  if (!SHA256_PATTERN.test(expected ?? "")) {
    throw new WithdrawError("apply needs --manifest-sha256: the 64-character SHA-256 the approved plan printed.");
  }
  if (plan.sha256 !== expected) {
    throw new WithdrawError("The cohort no longer matches the approved plan (manifest SHA-256 differs). " +
      "Nothing was written. Run plan again, review the new counts and approve that hash.");
  }
}

/**
 * Writes the plan's withdrawals in transactions of CHUNK_SIZE organisers.
 * Each organiser is re-read inside its transaction and written only if it is
 * still in the cohort (and city), still published and still unclaimed;
 * anything else is skipped and counted. One audit row per organiser written.
 */
export async function applyPlan({db, plan, serverTimestamp, requestId = null}) {
  const result = {withdrawn: 0, changedSincePlan: 0, transactions: 0};
  for (let start = 0; start < plan.toWithdraw.length; start += CHUNK_SIZE) {
    const ids = plan.toWithdraw.slice(start, start + CHUNK_SIZE);
    const refs = ids.map((id) => db.collection("organizers").doc(id));
    const chunk = await db.runTransaction(async (tx) => {
      // Counted per attempt: Firestore may retry the callback.
      const counts = {withdrawn: 0, changedSincePlan: 0};
      const snaps = await tx.getAll(...refs, {fieldMask: [...ORGANIZER_FIELDS]});
      for (const snap of snaps) {
        const data = snap.exists ? snap.data() : null;
        if (!data || !inScope(data, plan) || classify(snap.id, data, new Set()) !== "withdraw") {
          counts.changedSincePlan += 1;
          continue;
        }
        tx.update(snap.ref, WITHDRAW_PATCH);
        tx.set(db.collection("adminAuditLogs").doc(), auditRow({id: snap.id, data, plan, serverTimestamp, requestId}));
        counts.withdrawn += 1;
      }
      return counts;
    });
    result.withdrawn += chunk.withdrawn;
    result.changedSincePlan += chunk.changedSincePlan;
    result.transactions += 1;
  }
  return result;
}

/** One adminAuditLogs row (contracts/firestore/admin_audit_logs.schema.json). */
export function auditRow({id, data, plan, serverTimestamp, requestId}) {
  const page = data.publicPage ?? {};
  return {
    actorUid: AUDIT_ACTOR,
    roles: [...AUDIT_ROLES],
    action: AUDIT_ACTION,
    targetPath: `organizers/${id}`,
    createdAt: serverTimestamp(),
    ...(requestId ? {requestId} : {}),
    before: {publishStatus: page.publishStatus ?? null, indexStatus: page.indexStatus ?? null, robots: page.robots ?? null},
    after: {publishStatus: "suppressed", indexStatus: "noindex", robots: "noindex, follow", cohortId: plan.cohortId,
      reason: WITHDRAW_REASON, manifestSha256: plan.sha256},
    note: `Listing cohort ${plan.cohortId} withdrawn by owner-approved run.`,
  };
}
