import {
  SUPPRESSION_REASONS,
  isSuppressionCaseId,
  suppressionKeysForIdentity,
  suppressionKeysForIntakeRequest,
} from "./suppression.mjs";
import {dispositionFor} from "./inventory.mjs";

// The takedown closure: every Firestore document and Storage object that
// belongs to the case's organisers, resolved from the case file (and, after a
// preserve run, the organiser ids that run resolved, so a rerun after a
// partial apply still finds dependants of an already-deleted organiser).

const PAGE_SIZE = 300;
const TARGET_FIELDS = ["organizerIds", "names", "handles", "domains", "urls", "slugs", "supplyIntakeRequestIds"];
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}$/u;
const LABEL_ONLY = /^label:/u;

export class TakedownError extends Error {}

/** Validates the case file read from the restricted bucket. */
export function parseCaseFile(raw, caseId) {
  let value;
  try {
    value = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new TakedownError("The case file is not valid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TakedownError("The case file must be an object.");
  if (value.schemaVersion !== 1) throw new TakedownError("The case file must have schemaVersion 1.");
  if (!isSuppressionCaseId(value.caseId) || value.caseId !== caseId) {
    throw new TakedownError("The case file's caseId does not match the requested case.");
  }
  if (!SUPPRESSION_REASONS.includes(value.requestType)) {
    throw new TakedownError(`The case file's requestType must be one of ${SUPPRESSION_REASONS.join(", ")}.`);
  }
  if (typeof value.receivedAt !== "string" || !Number.isFinite(Date.parse(value.receivedAt))) {
    throw new TakedownError("The case file needs receivedAt (an ISO date).");
  }
  if (value.reviewAt != null && (typeof value.reviewAt !== "string" || !Number.isFinite(Date.parse(value.reviewAt)))) {
    throw new TakedownError("The case file's reviewAt must be an ISO date when present.");
  }
  const targets = value.targets;
  if (!targets || typeof targets !== "object" || Array.isArray(targets)) throw new TakedownError("The case file needs targets.");
  for (const key of Object.keys(targets)) {
    if (!TARGET_FIELDS.includes(key)) throw new TakedownError(`Unknown case target field: ${key}.`);
    const list = targets[key];
    if (!Array.isArray(list) || list.length > 100 || list.some((item) => typeof item !== "string" || !item.trim() ||
        item.length > 2000)) {
      throw new TakedownError(`Case target ${key} must be a list of up to 100 non-empty strings.`);
    }
  }
  for (const key of ["organizerIds", "supplyIntakeRequestIds"]) {
    if ((targets[key] ?? []).some((item) => !ID.test(item))) throw new TakedownError(`Case target ${key} holds an invalid id.`);
  }
  if (!TARGET_FIELDS.some((key) => (targets[key] ?? []).length > 0)) throw new TakedownError("The case file names no target.");
  const normalized = Object.fromEntries(TARGET_FIELDS.map((key) => [key, [...new Set((targets[key] ?? []).map((item) => item.trim()))]]));
  return {caseId, requestType: value.requestType, receivedAt: value.receivedAt, reviewAt: value.reviewAt ?? null,
    targets: normalized};
}

/** Identity keys for matching records in clear (the case file is clear; the registry stores only hashes). */
export function caseIdentityKeys(targets) {
  return suppressionKeysForIdentity({names: targets.names, handles: targets.handles,
    urls: [...targets.urls, ...targets.handles.map(instagramUrl)],
    domains: targets.domains, organizerIds: targets.organizerIds, slugs: targets.slugs});
}

/** A case handle is matched as an Instagram profile too (organiser records store Instagram handles). */
function instagramUrl(handle) {
  return `https://www.instagram.com/${encodeURIComponent(String(handle).replace(/^@/u, ""))}/`;
}

function organizerIdentity(id, data) {
  const page = data?.publicPage ?? {};
  const slugs = [page.slug, ...(Array.isArray(page.legacyPaths) ? page.legacyPaths : []),
    page.canonicalPath].filter((value) => typeof value === "string")
    .map((value) => value.replace(/^\/organizers\//u, "").replace(/\/$/u, "")).filter(Boolean);
  const urls = (Array.isArray(data?.publicSources) ? data.publicSources : [])
    .map((source) => source?.href ?? source?.url).filter((value) => typeof value === "string");
  if (typeof data?.instagramHandle === "string" && data.instagramHandle.trim()) urls.push(instagramUrl(data.instagramHandle));
  return {organizerIds: [id], names: typeof data?.name === "string" ? [data.name] : [],
    handles: typeof data?.instagramHandle === "string" ? [data.instagramHandle] : [], urls, slugs};
}

function mergeIdentity(into, from) {
  for (const key of ["organizerIds", "names", "handles", "urls", "slugs"]) {
    into[key] = [...new Set([...(into[key] ?? []), ...(from[key] ?? [])])].sort();
  }
  return into;
}

async function* paged(query) {
  let last = null;
  for (;;) {
    let page = query.orderBy("__name__").limit(PAGE_SIZE);
    if (last) page = page.startAfter(last);
    const snap = await page.get();
    for (const doc of snap.docs) yield doc;
    if (snap.docs.length < PAGE_SIZE) return;
    last = snap.docs.at(-1);
  }
}

/**
 * Builds the plan. `extraOrganizerIds` are organiser ids an earlier preserve
 * run resolved (they may already be deleted). Returns entries keyed by path
 * with a disposition, the Storage objects, and counts-only summary data.
 */
export async function buildTakedownPlan({db, bucket, caseFile, inventory, extraOrganizerIds = []}) {
  const entries = new Map();
  const errors = [];
  const warnings = {possibleNameOnlyOrganizers: 0, unscannedNestedCollections: 0};
  const add = (doc, group, collection = doc.ref.path.split("/")[0]) => {
    if (!doc.exists && doc.exists !== undefined) return;
    if (entries.has(doc.ref.path)) return;
    entries.set(doc.ref.path, {path: doc.ref.path, ref: doc.ref, collection, group,
      disposition: dispositionFor(collection), data: doc.data()});
  };
  const safely = async (label, work) => {
    try {
      await work();
    } catch (error) {
      errors.push({store: label, code: String(error?.code ?? "error")});
    }
  };
  const targets = caseFile.targets;
  const caseKeys = new Set(caseIdentityKeys(targets));

  // 1. Organisers: explicit ids, exact handle and slug lookups, then a scan
  // that adds any organiser sharing a link, id or slug key with the case and
  // counts (never adds) one that shares only a name.
  const organizerIds = new Set([...targets.organizerIds, ...extraOrganizerIds]);
  const organizers = new Map();
  const identity = {organizerIds: [], names: [], handles: [], urls: [], slugs: []};
  const readOrganizer = async (id) => {
    const snap = await db.collection("organizers").doc(id).get();
    if (snap.exists) organizers.set(id, snap);
  };
  await safely("organizers", async () => {
    for (const id of organizerIds) await readOrganizer(id);
    const handleVariants = [...new Set(targets.handles.flatMap((handle) => {
      const bare = handle.replace(/^@/u, "");
      return [bare, bare.toLowerCase(), `@${bare}`];
    }))];
    for (const handle of handleVariants) {
      for await (const doc of paged(db.collection("organizers").where("instagramHandle", "==", handle))) organizers.set(doc.id, doc);
    }
    for (const slug of targets.slugs) {
      for await (const doc of paged(db.collection("organizers").where("publicPage.slug", "==", slug))) organizers.set(doc.id, doc);
    }
    for await (const doc of paged(db.collection("organizers"))) {
      if (organizers.has(doc.id)) continue;
      const keys = suppressionKeysForIdentity(organizerIdentity(doc.id, doc.data()));
      const shared = keys.filter((key) => caseKeys.has(key));
      if (shared.some((key) => !LABEL_ONLY.test(key))) organizers.set(doc.id, doc);
      else if (shared.length > 0) warnings.possibleNameOnlyOrganizers += 1;
    }
  });
  for (const [id, snap] of organizers) {
    organizerIds.add(id);
    mergeIdentity(identity, organizerIdentity(id, snap.data()));
    add(snap, "organizers");
  }
  mergeIdentity(identity, {organizerIds: [...organizerIds]});

  // 2. Supply Intake requests: explicit ids, requests approved as or
  // targeting a case organiser, and requests whose seed names the case.
  const requests = new Map();
  await safely("supplyIntakeRequests", async () => {
    for (const id of targets.supplyIntakeRequestIds) {
      const snap = await db.collection("supplyIntakeRequests").doc(id).get();
      if (snap.exists) requests.set(id, snap);
    }
    for await (const doc of paged(db.collection("supplyIntakeRequests"))) {
      if (requests.has(doc.id)) continue;
      const data = doc.data() ?? {};
      const linked = organizerIds.has(data.approval?.organizerId) || organizerIds.has(data.request?.target?.organizerId);
      const named = suppressionKeysForIntakeRequest(data.request).some((key) => caseKeys.has(key));
      if (linked || named) requests.set(doc.id, doc);
    }
  });
  const storagePrefixes = new Set();
  const runIds = new Set();
  const workItemIds = new Set();
  const intentIds = new Set();
  for (const [id, snap] of requests) {
    add(snap, "intake");
    const data = snap.data() ?? {};
    storagePrefixes.add(`supply-intake/snapshots/${id}/`);
    if (data.result?.runId) runIds.add(data.result.runId);
    for (const workItemId of [data.result?.listingWorkItemId, ...(data.result?.eventWorkItemIds ?? [])]) {
      if (typeof workItemId === "string") workItemIds.add(workItemId);
    }
    if (data.request?.origin?.kind === "sales_inbound_intent" && typeof data.request.origin.id === "string") {
      intentIds.add(data.request.origin.id);
    }
    if (typeof data.approval?.organizerId === "string" && !organizerIds.has(data.approval.organizerId)) {
      organizerIds.add(data.approval.organizerId);
      await safely("organizers", () => readOrganizer(data.approval.organizerId));
      const organizer = organizers.get(data.approval.organizerId);
      if (organizer) {
        mergeIdentity(identity, organizerIdentity(organizer.id, organizer.data()));
        add(organizer, "organizers");
      }
    }
  }

  // 3. Durable operations records of those runs.
  await safely("operations", async () => {
    for (const runId of runIds) {
      add(await db.collection("operationRuns").doc(runId).get(), "operations");
      for (const collection of ["operationWorkItems", "operationActionReceipts"]) {
        for await (const doc of paged(db.collection(collection).where("runId", "==", runId))) {
          add(doc, "operations");
          if (collection === "operationWorkItems") workItemIds.add(doc.id);
        }
      }
    }
    for (const id of [...workItemIds, ...requests.keys()]) {
      for await (const doc of paged(db.collection("operationLeases").where("resourceId", "==", id))) add(doc, "operations");
    }
    for (const workItemId of workItemIds) {
      add(await db.collection("operationWorkItems").doc(workItemId).get(), "operations");
      for await (const doc of paged(db.collection("organizerIntakeCurationDecisions")
        .where("sourceWorkItemId", "==", workItemId))) add(doc, "decisions");
    }
    for (const intentId of intentIds) add(await db.collection("salesInboundIntents").doc(intentId).get(), "sales");
  });

  // 4. Everything keyed by or carrying a case organiser id.
  const eventIds = new Set();
  const catchEventIds = new Set();
  for (const organizerId of organizerIds) {
    await safely("externalEvents", async () => {
      for await (const doc of paged(db.collection("externalEvents").where("canonicalHostId", "==", organizerId))) {
        add(doc, "events");
        eventIds.add(doc.id);
      }
    });
    for (const collection of inventory.byId) {
      await safely(collection, async () => add(await db.collection(collection).doc(organizerId).get(), "keyed"));
    }
    for (const collection of inventory.byField) {
      await safely(collection, async () => {
        for await (const doc of paged(db.collection(collection).where("organizerId", "==", organizerId))) {
          add(doc, "scanned");
          if (collection === "events") catchEventIds.add(doc.id);
          if (collection === "eventPublicPage") eventIds.add(doc.id);
        }
      });
    }
    await safely("publicRouteReservations", async () => {
      for await (const doc of paged(db.collection("publicRouteReservations").where("ownerId", "==", organizerId))) add(doc, "routes");
    });
    await safely("organizerIntakeCurationDecisions", async () => {
      for await (const doc of paged(db.collection("organizerIntakeCurationDecisions").where("entityId", "==", organizerId))) {
        add(doc, "decisions");
      }
    });
    storagePrefixes.add(`organizers/${organizerId}/`);
  }
  for (const eventId of eventIds) {
    await safely("externalEventPublicationReceipts", async () => {
      for await (const doc of paged(db.collection("externalEventPublicationReceipts").where("eventId", "==", eventId))) {
        add(doc, "events");
      }
      add(await db.collection("eventPublicPage").doc(eventId).get(), "derived");
    });
  }
  for (const eventId of catchEventIds) storagePrefixes.add(`events/${eventId}/`);

  // 5. Admin inbox items about any of these sources, and audit logs to redact.
  const sourceIds = [...organizerIds, ...requests.keys(), ...eventIds, ...intentIds,
    ...[...entries.values()].filter((entry) => entry.collection === "organizerClaimRequests").map((entry) => entry.ref.id)];
  await safely("adminInboxItems", async () => {
    for (const id of new Set(sourceIds)) {
      for await (const doc of paged(db.collection("adminInboxItems").where("sourceId", "==", id))) add(doc, "derived");
    }
  });
  const targetPaths = [...[...organizerIds].map((id) => `organizers/${id}`),
    ...[...requests.keys()].map((id) => `supplyIntakeRequests/${id}`), ...[...eventIds].map((id) => `externalEvents/${id}`)];
  await safely("adminAuditLogs", async () => {
    for (const targetPath of targetPaths) {
      for await (const doc of paged(db.collection("adminAuditLogs").where("targetPath", "==", targetPath))) add(doc, "audit");
    }
  });

  // 6. Peers whose recommendation rail still names a case organiser.
  const peerRails = [];
  await safely("organizerPublicPage", async () => {
    for await (const doc of paged(db.collection("organizerPublicPage"))) {
      if (organizerIds.has(doc.id)) continue;
      const rail = doc.data()?.recommendedOrganizers;
      if (Array.isArray(rail) && rail.some((item) => organizerIds.has(item?.organizerId))) {
        peerRails.push({path: doc.ref.path, ref: doc.ref,
          kept: rail.filter((item) => !organizerIds.has(item?.organizerId))});
      }
    }
  });

  // 7. Storage objects under the case prefixes.
  const storageObjects = [];
  for (const prefix of storagePrefixes) {
    await safely("storage", async () => {
      const [files] = await bucket.getFiles({prefix});
      for (const file of files) storageObjects.push(file.name);
    });
  }

  return {
    caseId: caseFile.caseId,
    organizerIds: [...organizerIds].sort(),
    requestIds: [...requests.keys()].sort(),
    externalEventIds: [...eventIds].sort(),
    catchEventIds: [...catchEventIds].sort(),
    identity,
    entries: [...entries.values()],
    peerRails,
    storageObjects: [...new Set(storageObjects)].sort(),
    errors,
    warnings,
  };
}

/** Counts only: by disposition and collection. Never ids, paths or names. */
export function summarizePlan(plan) {
  const byDisposition = {};
  const byCollection = {};
  for (const entry of plan.entries) {
    byDisposition[entry.disposition] = (byDisposition[entry.disposition] ?? 0) + 1;
    byCollection[entry.collection] ??= {};
    byCollection[entry.collection][entry.disposition] = (byCollection[entry.collection][entry.disposition] ?? 0) + 1;
  }
  return {
    organizers: plan.organizerIds.length,
    supplyIntakeRequests: plan.requestIds.length,
    externalEvents: plan.externalEventIds.length,
    documents: plan.entries.length,
    byDisposition,
    byCollection: Object.fromEntries(Object.entries(byCollection).sort(([a], [b]) => a.localeCompare(b))),
    peerRecommendationRails: plan.peerRails.length,
    storageObjects: plan.storageObjects.length,
    scanErrors: plan.errors.length,
    scanErrorStores: [...new Set(plan.errors.map((error) => error.store))].sort(),
    possibleNameOnlyOrganizers: plan.warnings.possibleNameOnlyOrganizers,
  };
}

/** What still has to go: documents to delete or redact, rails to patch and objects to delete. */
export function outstanding(plan) {
  return {
    deletes: plan.entries.filter((entry) => entry.disposition === "delete").length,
    redactions: plan.entries.filter((entry) => entry.disposition === "redact" &&
      entry.data?.after?.redactedForCase !== plan.caseId).length,
    peerRails: plan.peerRails.length,
    storageObjects: plan.storageObjects.length,
  };
}
