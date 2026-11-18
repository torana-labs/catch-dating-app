import crypto from "node:crypto";
import {
  SUPPRESSION_HASH_SCHEME,
  suppressionHashes,
  suppressionKeysForIdentity,
  usableSuppressionSecret,
} from "./suppression.mjs";
import {BIGQUERY_CHANGELOGS} from "./inventory.mjs";
import {TakedownError, outstanding} from "./plan.mjs";

// preserve, apply, suppress and verify. Everything a run writes about the
// case (snapshots, manifests) goes to the restricted preservation bucket under
// cases/<caseId>/; nothing identifying is printed or returned to the caller,
// only counts.

const WRITE_BATCH = 400;
const REVIEW_YEARS = 3;
export const BACKUP_WINDOWS = Object.freeze({pointInTimeRecoveryDays: 7, dailyBackupDays: 14});

export function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function stamp(now) {
  return now.toISOString().replace(/[-:]/gu, "").replace(/\.\d+Z$/u, "Z");
}

/** Firestore values as JSON: timestamps, references, geo points and bytes are tagged. */
export function encodeFirestoreValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(encodeFirestoreValue);
  if (typeof value.toDate === "function" && typeof value.toMillis === "function") {
    return {__firestore: "timestamp", iso: value.toDate().toISOString()};
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return {__firestore: "bytes", base64: Buffer.from(value).toString("base64")};
  if (typeof value.latitude === "number" && typeof value.longitude === "number" && Object.keys(value).length <= 2) {
    return {__firestore: "geopoint", latitude: value.latitude, longitude: value.longitude};
  }
  if (typeof value.path === "string" && value.firestore) return {__firestore: "reference", path: value.path};
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, encodeFirestoreValue(value[key])]));
}

/** Every document under a reference's subcollections, deepest first. */
async function descendants(ref) {
  const found = [];
  for (const collection of await ref.listCollections()) {
    const snap = await collection.get();
    for (const doc of snap.docs) {
      found.push(...await descendants(doc.ref));
      found.push(doc);
    }
  }
  return found;
}

async function latestObject(store, prefix, suffix) {
  const [files] = await store.getFiles({prefix});
  const names = files.map((file) => file.name).filter((name) => name.endsWith(suffix)).sort();
  if (names.length === 0) return null;
  const [bytes] = await store.file(names.at(-1)).download();
  return {name: names.at(-1), bytes, value: JSON.parse(bytes.toString("utf8"))};
}

export function caseRoot(caseId) {
  return `cases/${caseId}/`;
}

export async function readLatestPreserveManifest(store, caseId) {
  return latestObject(store, `${caseRoot(caseId)}preserve/`, "/manifest.json");
}

export async function readLatestApplyManifest(store, caseId) {
  return latestObject(store, `${caseRoot(caseId)}apply/`, ".json");
}

/**
 * Copies every planned document (with its subcollections) and Storage object
 * to the preservation bucket, then writes a manifest with a SHA-256 for each
 * file and each record. Objects are never overwritten: each run has its own
 * timestamped folder, which the bucket's retention policy then holds.
 */
export async function preserve({plan, appBucket, store, now}) {
  const root = `${caseRoot(plan.caseId)}preserve/${stamp(now)}/`;
  const documents = [];
  const lines = [];
  for (const entry of plan.entries) {
    for (const doc of [...await descendants(entry.ref), {ref: entry.ref, data: () => entry.data}]) {
      const record = {path: doc.ref.path, data: encodeFirestoreValue(doc.data() ?? null)};
      const line = JSON.stringify(record);
      lines.push(line);
      documents.push({path: record.path, sha256: sha256(line), disposition: entry.disposition});
    }
  }
  for (const rail of plan.peerRails) {
    const snap = await rail.ref.get();
    const line = JSON.stringify({path: rail.path, data: encodeFirestoreValue(snap.data() ?? null)});
    lines.push(line);
    documents.push({path: rail.path, sha256: sha256(line), disposition: "patch_peer_rail"});
  }
  const firestoreBytes = Buffer.from(lines.length ? `${lines.join("\n")}\n` : "");
  const files = [];
  const save = async (name, bytes, contentType) => {
    await store.file(`${root}${name}`).save(bytes, {resumable: false, contentType,
      metadata: {cacheControl: "private, no-store", metadata: {sha256: sha256(bytes)}}});
    files.push({name, bytes: bytes.length, sha256: sha256(bytes)});
  };
  await save("firestore.ndjson", firestoreBytes, "application/x-ndjson");
  const storage = [];
  for (const [index, name] of plan.storageObjects.entries()) {
    const [bytes] = await appBucket.file(name).download();
    const copy = `storage/${String(index).padStart(5, "0")}`;
    await save(copy, bytes, "application/octet-stream");
    storage.push({source: name, copy, sha256: sha256(bytes), bytes: bytes.length});
  }
  const manifest = {schemaVersion: 1, caseId: plan.caseId, createdAt: now.toISOString(), kind: "preserve",
    organizerIds: plan.organizerIds, requestIds: plan.requestIds, externalEventIds: plan.externalEventIds,
    catchEventIds: plan.catchEventIds, identity: plan.identity, documents, storage, files};
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  await store.file(`${root}manifest.json`).save(manifestBytes, {resumable: false, contentType: "application/json",
    metadata: {cacheControl: "private, no-store", metadata: {sha256: sha256(manifestBytes)}}});
  return {documents: documents.length, storageObjects: storage.length, files: files.length + 1,
    manifestSha256: sha256(manifestBytes)};
}

/** Refuses an apply that would remove anything the latest preserve run did not copy. */
export function assertPreserved(plan, manifest) {
  if (!manifest) throw new TakedownError("No preserve run exists for this case. Run preserve before apply.");
  const documents = new Set(manifest.documents.map((document) => document.path));
  const objects = new Set(manifest.storage.map((object) => object.source));
  const missing = plan.entries.filter((entry) => entry.disposition === "delete" || entry.disposition === "redact")
    .filter((entry) => !documents.has(entry.path)).length +
    plan.peerRails.filter((rail) => !documents.has(rail.path)).length +
    plan.storageObjects.filter((name) => !objects.has(name)).length;
  if (missing > 0) {
    throw new TakedownError(`${missing} record(s) in the plan were not preserved. Run preserve again, then apply.`);
  }
}

const GROUP_ORDER = ["derived", "audit", "operations", "decisions", "scanned", "keyed", "sales", "events", "routes",
  "intake", "organizers"];

/**
 * Deletes the plan's documents (subcollections first, organisers last),
 * redacts audit logs, patches peers' recommendation rails, deletes Storage
 * objects and writes the apply manifest the BigQuery mode reads.
 */
export async function apply({plan, db, appBucket, store, now, fieldValues}) {
  const counts = {deleted: 0, redacted: 0, peerRailsPatched: 0, storageObjectsDeleted: 0, retained: 0, batches: 0};
  const exported = Object.fromEntries(Object.keys(BIGQUERY_CHANGELOGS).map((collection) => [collection, new Set()]));
  let batch = db.batch();
  let pending = 0;
  const flush = async () => {
    if (pending === 0) return;
    await batch.commit();
    counts.batches += 1;
    batch = db.batch();
    pending = 0;
  };
  const queue = async (write) => {
    write(batch);
    pending += 1;
    if (pending >= WRITE_BATCH) await flush();
  };
  for (const rail of plan.peerRails) {
    await queue((b) => b.update(rail.ref, {recommendedOrganizers: rail.kept}));
    counts.peerRailsPatched += 1;
  }
  const ordered = [...plan.entries].sort((left, right) =>
    GROUP_ORDER.indexOf(left.group) - GROUP_ORDER.indexOf(right.group));
  for (const entry of ordered) {
    if (entry.disposition === "redact") {
      await queue((b) => b.update(entry.ref, {targetPath: `takedownCases/${plan.caseId}`, before: {},
        after: {redactedForCase: plan.caseId}, note: `Redacted for takedown case ${plan.caseId}.`,
        requestId: fieldValues.delete()}));
      counts.redacted += 1;
      continue;
    }
    if (entry.disposition !== "delete") {
      counts.retained += 1;
      continue;
    }
    for (const child of await descendants(entry.ref)) {
      await queue((b) => b.delete(child.ref));
      counts.deleted += 1;
    }
    await queue((b) => b.delete(entry.ref));
    counts.deleted += 1;
    if (exported[entry.collection]) exported[entry.collection].add(entry.ref.id);
  }
  await flush();
  for (const name of plan.storageObjects) {
    await appBucket.file(name).delete({ignoreNotFound: true});
    counts.storageObjectsDeleted += 1;
  }
  const manifest = {schemaVersion: 1, caseId: plan.caseId, kind: "apply", completedAt: now().toISOString(),
    organizerIds: plan.organizerIds,
    bigquery: Object.fromEntries(Object.entries(exported).map(([collection, ids]) => [collection, [...ids].sort()])),
    counts};
  await store.file(`${caseRoot(plan.caseId)}apply/${stamp(now())}.json`).save(
    Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`), {resumable: false, contentType: "application/json",
      metadata: {cacheControl: "private, no-store"}});
  return counts;
}

/** The keys a suppression entry hashes: the case targets plus what preserve resolved from the organisers. */
export function suppressionKeys(caseFile, preserveManifest) {
  const resolved = preserveManifest?.identity ?? {};
  return suppressionKeysForIdentity({
    names: [...caseFile.targets.names, ...(resolved.names ?? [])],
    handles: [...caseFile.targets.handles, ...(resolved.handles ?? [])],
    urls: [...caseFile.targets.urls, ...(resolved.urls ?? [])],
    domains: caseFile.targets.domains,
    organizerIds: [...caseFile.targets.organizerIds, ...(resolved.organizerIds ?? [])],
    slugs: [...caseFile.targets.slugs, ...(resolved.slugs ?? [])],
  });
}

function keyCounts(keys) {
  const counts = {labels: 0, links: 0, organizers: 0, slugs: 0};
  for (const key of keys) {
    if (key.startsWith("label:")) counts.labels += 1;
    else if (key.startsWith("organizer:")) counts.organizers += 1;
    else if (key.startsWith("slug:")) counts.slugs += 1;
    else counts.links += 1;
  }
  return counts;
}

/** Writes (or extends) listingSuppressions/{caseId}. Rerunning adds only new hashes. */
export async function suppress({db, caseFile, preserveManifest, secret, now, createdBy}) {
  if (!usableSuppressionSecret(secret)) throw new TakedownError("LISTING_SUPPRESSION_HMAC_KEY is unavailable.");
  const keys = suppressionKeys(caseFile, preserveManifest);
  if (keys.length > 500) throw new TakedownError("The case has more than 500 identity keys; split it.");
  const ref = db.collection("listingSuppressions").doc(caseFile.caseId);
  const existing = (await ref.get()).data();
  const hashes = suppressionHashes(secret, keys);
  const merged = [...new Set([...(existing?.identityHashes ?? []), ...hashes])].sort();
  if (merged.length > 500) throw new TakedownError("The suppression entry would hold more than 500 hashes.");
  const at = now().getTime();
  const reviewAt = caseFile.reviewAt ? Date.parse(caseFile.reviewAt) :
    new Date(at).setUTCFullYear(new Date(at).getUTCFullYear() + REVIEW_YEARS);
  const record = {schemaVersion: 1, caseId: caseFile.caseId, reason: caseFile.requestType, active: true,
    hashScheme: SUPPRESSION_HASH_SCHEME, identityHashes: merged, identityKeyCounts: keyCounts(keys),
    createdAtMillis: existing?.createdAtMillis ?? at, updatedAtMillis: at,
    reviewAtMillis: existing?.reviewAtMillis ?? reviewAt, createdBy: existing?.createdBy ?? createdBy,
    blockedIntakeCount: existing?.blockedIntakeCount ?? 0, lastBlockedAtMillis: existing?.lastBlockedAtMillis ?? null,
    reviewFlags: existing?.reviewFlags ?? []};
  const batch = db.batch();
  batch.set(ref, record);
  await batch.commit();
  return {created: !existing, hashes: merged.length, newHashes: merged.length - (existing?.identityHashes?.length ?? 0),
    keyCounts: record.identityKeyCounts};
}

/** The public paths the organisers' pages answered on, from the preserved records. */
export function publicPaths(preserveManifest, preservedDocuments) {
  const paths = new Set();
  for (const slug of preserveManifest?.identity?.slugs ?? []) paths.add(`/organizers/${slug}/`);
  for (const document of preservedDocuments) {
    const page = document.data?.path;
    if (typeof page === "string" && page.startsWith("/") &&
      /^(organizerPublicPage|eventPublicPage)\//u.test(document.path)) paths.add(page);
  }
  return [...paths].sort();
}

/**
 * Checks that nothing is left: the plan finds nothing to delete, redact or
 * patch, no Storage object remains, no city plan names a case organiser, the
 * suppression entry covers every key, and the public paths are gone and out
 * of the sitemap. Returns counts and a pass flag.
 */
export async function verify({plan, db, caseFile, preserveManifest, applyManifest, secret, fetchImpl, siteOrigin,
  paths}) {
  const left = outstanding(plan);
  let cityPlansNaming = 0;
  for (const doc of (await db.collection("cityPlans").get()).docs) {
    const text = JSON.stringify(doc.data() ?? {});
    if (plan.organizerIds.some((id) => text.includes(`"${id}"`))) cityPlansNaming += 1;
  }
  const suppression = {present: false, active: false, missingKeys: null};
  const entry = (await db.collection("listingSuppressions").doc(caseFile.caseId).get()).data();
  if (entry) {
    suppression.present = true;
    suppression.active = entry.active === true;
    if (usableSuppressionSecret(secret)) {
      const stored = new Set(entry.identityHashes ?? []);
      suppression.missingKeys = suppressionHashes(secret, suppressionKeys(caseFile, preserveManifest))
        .filter((hash) => !stored.has(hash)).length;
    }
  }
  const web = {checked: 0, gone410: 0, gone404: 0, stillServed: 0, inSitemap: 0, sitemapRead: false};
  if (siteOrigin && fetchImpl) {
    for (const path of paths) {
      const response = await fetchImpl(new URL(path, siteOrigin), {redirect: "manual"});
      web.checked += 1;
      if (response.status === 410) web.gone410 += 1;
      else if (response.status === 404) web.gone404 += 1;
      else web.stillServed += 1;
    }
    const sitemap = await fetchImpl(new URL("/sitemap.xml", siteOrigin), {redirect: "follow"});
    if (sitemap.ok) {
      web.sitemapRead = true;
      const text = await sitemap.text();
      web.inSitemap = paths.filter((path) => text.includes(`${new URL(path, siteOrigin).href}<`)).length;
    }
  }
  const completedAt = applyManifest?.completedAt ? Date.parse(applyManifest.completedAt) : null;
  const day = 24 * 60 * 60 * 1000;
  const backups = completedAt ? {
    pointInTimeRecoveryUntil: new Date(completedAt + BACKUP_WINDOWS.pointInTimeRecoveryDays * day).toISOString(),
    dailyBackupsUntil: new Date(completedAt + BACKUP_WINDOWS.dailyBackupDays * day).toISOString(),
  } : null;
  const passed = left.deletes === 0 && left.redactions === 0 && left.peerRails === 0 && left.storageObjects === 0 &&
    plan.errors.length === 0 && cityPlansNaming === 0 && suppression.present && suppression.active &&
    suppression.missingKeys === 0 && web.stillServed === 0 && web.inSitemap === 0;
  return {passed, outstanding: left, scanErrors: plan.errors.length, cityPlansNaming, suppression, web, backups};
}
