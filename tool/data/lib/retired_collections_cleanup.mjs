import fs from "node:fs";
import path from "node:path";

/**
 * Cleanup of leftover documents in retired or superseded Firestore
 * collections (November 2026 consolidation).
 *
 * The cleanup only ever touches the hard-coded allowlist below. Every entry
 * names a collection that no code reads or writes and that firestore.rules
 * does not match (so it is denied by default). The legal hold now covers only
 * data that pertains to the Bhag Run Club notice, so a document is skipped
 * when its path or any field mentions Bhag, or mentions an identifier found
 * on Bhag's organizer, public organizer, page or events. A document is also
 * skipped when its replacement is missing, or when it has subcollections.
 */

export const BHAG_SEED_TERM = "bhag";

/**
 * collection -> why it is retired, and where its replacement lives.
 * `supersededBy(id, data)` lists replacement paths; the document is deleted
 * only when at least one of them exists. Omit it when the collection has no
 * one-to-one replacement (the data was dropped, not moved).
 */
export const RETIRED_COLLECTIONS = Object.freeze({
  clubMemberships: {
    reason: "Pre-rename club edges; host and member edges moved to organizerTeamMemberships and organizerFollows (clubs-to-organizers, wire rename #1296).",
    supersededBy: (id) => [`organizerFollows/${id}`, `organizerTeamMemberships/${id}`],
  },
  clubHostClaims: {
    reason: "Pre-rename host claims; claims live in organizerClaimRequests and seats in organizerTeamMemberships (clubs-to-organizers, #1296).",
  },
  clubSourceEvidence: {
    reason: "Pre-rename intake source evidence; supply intake now keeps its evidence on supplyIntakeRequests (#1296, Supply Intake).",
  },
  clubScheduleLocks: {
    reason: "Pre-rename schedule locks; superseded by scheduleLocks (L4, #1669).",
    supersededBy: (id) => [`scheduleLocks/organizer_${id}`],
  },
  organizerScheduleLocks: {
    reason: "Organizer locks copied into scheduleLocks with an organizer_ id prefix (L4, #1669).",
    supersededBy: (id) => [`scheduleLocks/organizer_${id}`],
  },
  userEventScheduleLocks: {
    reason: "User locks copied into scheduleLocks with a user_ id prefix (L4, #1669).",
    supersededBy: (id) => [`scheduleLocks/user_${id}`],
  },
  eventAttendeeIndex: {
    reason: "Roster pointer replaced by eventParticipations.attendeeId (L5, #1840, rules and contract retired in #1842).",
  },
  eventSupplyReadiness: {
    reason: "Supply readiness workspace and its adminGetEventSupplyReadiness callable were retired.",
  },
  demoOpsRuns: {
    reason: "Runs-era demo operation records; the runs-to-events migration left them with no reader.",
  },
  seedRuns: {
    reason: "Runs-era seed records; no seed tool reads or writes them.",
  },
});

/** Live or retention-bound collections the cleanup must never be pointed at. */
export const FORBIDDEN_COLLECTIONS = Object.freeze([
  "organizers", "publicOrganizers", "organizerPublicPage", "events", "users",
  "deletedUsers", "adminAuditLogs", "launchBoards", "clubs", "payments",
  "guestPayments", "scheduleLocks", "eventParticipations", "eventAttendees",
  "organizerFollows", "organizerTeamMemberships", "profileDecisions",
]);

/** Collections whose ids are organizer ids, scanned to learn Bhag's ids. */
const ORGANIZER_KEYED_COLLECTIONS = Object.freeze([
  "organizers", "publicOrganizers", "clubs", "organizerPublicPage",
  "hostDirectorySummaries", "publicPageBuilds", "organizerGrowthFacts",
]);
const IDENTIFIER_FIELDS = Object.freeze([
  "slug", "publicSlug", "routeSlug", "pageSlug", "pageId", "handle",
  "instagramHandle", "organizerId",
]);
const MIN_TERM_LENGTH = 4;
const PAGE_SIZE = 500;
const DELETE_BATCH = 400;

export function allowlistedCollections() {
  return Object.keys(RETIRED_COLLECTIONS);
}

export function assertAllowlistIsSafe() {
  for (const name of allowlistedCollections()) {
    if (FORBIDDEN_COLLECTIONS.includes(name)) {
      throw new Error(`${name} is a live or protected collection.`);
    }
  }
}

export function selectCollections(requested) {
  assertAllowlistIsSafe();
  if (!requested || requested.length === 0) return allowlistedCollections();
  for (const name of requested) {
    if (!(name in RETIRED_COLLECTIONS)) {
      throw new Error(
        `${name} is not on the cleanup allowlist (${allowlistedCollections().join(", ")}).`
      );
    }
  }
  return requested;
}

// --- Firestore value (de)serialisation, so a backup can be restored. ---

export function serializeValue(value) {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      return {__type: "number", value: String(value)};
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(serializeValue);
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return {__type: "bytes", base64: Buffer.from(value).toString("base64")};
  }
  if (typeof value.toDate === "function" && "_seconds" in value) {
    return {__type: "timestamp", seconds: value._seconds, nanoseconds: value._nanoseconds};
  }
  if ("latitude" in value && "longitude" in value && Object.keys(value).length <= 4) {
    return {__type: "geopoint", latitude: value.latitude, longitude: value.longitude};
  }
  if (typeof value.path === "string" && typeof value.collection === "function") {
    return {__type: "reference", path: value.path};
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [key, serializeValue(inner)])
  );
}

export function deserializeValue(value, {admin, db}) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => deserializeValue(item, {admin, db}));
  switch (value.__type) {
    case "timestamp":
      return new admin.firestore.Timestamp(value.seconds, value.nanoseconds);
    case "geopoint":
      return new admin.firestore.GeoPoint(value.latitude, value.longitude);
    case "reference":
      return db.doc(value.path);
    case "bytes":
      return Buffer.from(value.base64, "base64");
    case "number":
      return Number(value.value);
    default:
      return Object.fromEntries(
        Object.entries(value).map(([key, inner]) => [key, deserializeValue(inner, {admin, db})])
      );
  }
}

// --- Bhag exclusion. ---

export function mentionsAny(documentPath, serializedData, terms) {
  const haystack = `${documentPath}\n${serializedData}`.toLowerCase();
  for (const term of terms) {
    if (haystack.includes(term)) return term;
  }
  return null;
}

/**
 * Finds every identifier that ties a document to Bhag: the seed word, the ids
 * of organizer-keyed documents that mention it (organizers, public organizers,
 * pages, projections), their slug and handle fields, and the ids of events
 * those organizers run. Returns lower-case terms, and the ids found per
 * collection for reporting.
 */
export async function discoverBhagTerms(db) {
  const terms = new Set([BHAG_SEED_TERM]);
  const organizerIds = new Set();
  const found = {};
  for (const collection of ORGANIZER_KEYED_COLLECTIONS) {
    for await (const doc of pagedDocs(db.collection(collection))) {
      const data = doc.data();
      const serialized = JSON.stringify(serializeValue(data));
      if (!mentionsAny(doc.ref.path, serialized, [BHAG_SEED_TERM])) continue;
      (found[collection] ??= []).push(doc.id);
      addTerm(terms, doc.id);
      if (collection !== "organizerGrowthFacts") organizerIds.add(doc.id);
      for (const field of IDENTIFIER_FIELDS) {
        if (typeof data[field] === "string") {
          addTerm(terms, data[field]);
          if (field === "organizerId") organizerIds.add(data[field]);
        }
      }
    }
  }
  const ids = [...organizerIds];
  for (let index = 0; index < ids.length; index += 10) {
    const snapshot = await db.collection("events")
      .where("organizerId", "in", ids.slice(index, index + 10)).get();
    for (const doc of snapshot.docs) {
      (found.events ??= []).push(doc.id);
      addTerm(terms, doc.id);
    }
  }
  return {terms: [...terms], found};
}

function addTerm(terms, value) {
  const term = String(value).trim().toLowerCase();
  if (term.length >= MIN_TERM_LENGTH) terms.add(term);
}

// --- Planning, backup, apply. ---

async function* pagedDocs(query) {
  let last = null;
  for (;;) {
    let page = query.orderBy("__name__").limit(PAGE_SIZE);
    if (last) page = page.startAfter(last);
    const snapshot = await page.get();
    for (const doc of snapshot.docs) yield doc;
    if (snapshot.size < PAGE_SIZE) return;
    last = snapshot.docs[snapshot.docs.length - 1];
  }
}

export async function planCleanup(db, {collections, terms}) {
  const selected = selectCollections(collections);
  const plans = [];
  for (const name of selected) {
    const definition = RETIRED_COLLECTIONS[name];
    const plan = {
      collection: name,
      reason: definition.reason,
      scanned: 0,
      toDelete: [],
      excluded: {bhag: [], replacementMissing: [], hasSubcollections: []},
    };
    for await (const doc of pagedDocs(db.collection(name))) {
      plan.scanned += 1;
      const serialized = serializeValue(doc.data());
      const hit = mentionsAny(doc.ref.path, JSON.stringify(serialized), terms);
      if (hit) {
        plan.excluded.bhag.push(doc.id);
        continue;
      }
      if (definition.supersededBy) {
        const present = await anyExists(db, definition.supersededBy(doc.id, doc.data()));
        if (!present) {
          plan.excluded.replacementMissing.push(doc.id);
          continue;
        }
      }
      if ((await doc.ref.listCollections()).length > 0) {
        plan.excluded.hasSubcollections.push(doc.id);
        continue;
      }
      plan.toDelete.push({
        path: doc.ref.path,
        data: serialized,
        updateTime: doc.updateTime,
      });
    }
    plans.push(plan);
  }
  return plans;
}

async function anyExists(db, paths) {
  for (const target of paths) {
    if ((await db.doc(target).get()).exists) return true;
  }
  return false;
}

export function summarizePlans(plans) {
  return plans.map((plan) => ({
    collection: plan.collection,
    scanned: plan.scanned,
    toDelete: plan.toDelete.length,
    excludedBhag: plan.excluded.bhag,
    excludedReplacementMissing: plan.excluded.replacementMissing,
    excludedHasSubcollections: plan.excluded.hasSubcollections,
  }));
}

/** Writes <dir>/<collection>.json and rereads it; throws on any mismatch. */
export function writeAndVerifyBackups(backupDir, plans) {
  fs.mkdirSync(backupDir, {recursive: true, mode: 0o700});
  const written = [];
  for (const plan of plans) {
    if (plan.toDelete.length === 0) continue;
    const file = path.join(backupDir, `${plan.collection}.json`);
    const documents = plan.toDelete.map(({path: docPath, data}) => ({path: docPath, data}));
    fs.writeFileSync(file, JSON.stringify(documents, null, 2), {mode: 0o600});
    const reread = JSON.parse(fs.readFileSync(file, "utf8"));
    const paths = new Set(reread.map((entry) => entry.path));
    const expected = plan.toDelete.map((entry) => entry.path);
    if (reread.length !== expected.length || !expected.every((p) => paths.has(p))) {
      throw new Error(`Backup ${file} does not match the plan; nothing was deleted.`);
    }
    written.push({collection: plan.collection, file, count: reread.length});
  }
  return written;
}

export async function applyCleanup(db, plans) {
  const results = [];
  for (const plan of plans) {
    let deleted = 0;
    let changedSinceScan = 0;
    for (let index = 0; index < plan.toDelete.length; index += DELETE_BATCH) {
      const slice = plan.toDelete.slice(index, index + DELETE_BATCH);
      const batch = db.batch();
      for (const entry of slice) {
        batch.delete(db.doc(entry.path), {lastUpdateTime: entry.updateTime});
      }
      try {
        await batch.commit();
        deleted += slice.length;
      } catch (error) {
        // FAILED_PRECONDITION (9) or NOT_FOUND (5): a document changed or went
        // after the scan. Retry one by one so unchanged documents still go.
        if (error?.code !== 9 && error?.code !== 5) throw error;
        for (const entry of slice) {
          try {
            await db.doc(entry.path).delete({lastUpdateTime: entry.updateTime});
            deleted += 1;
          } catch (inner) {
            if (inner?.code !== 9 && inner?.code !== 5) throw inner;
            changedSinceScan += 1;
          }
        }
      }
    }
    results.push({collection: plan.collection, deleted, changedSinceScan});
  }
  return results;
}
