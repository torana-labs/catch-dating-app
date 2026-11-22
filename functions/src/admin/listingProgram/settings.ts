/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptionsWithLimits} from "../../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import type {AdminManageListingProgramCallablePayload as Payload} from "../../shared/generated/adminManageListingProgramCallablePayload";
import type {AdminManageListingProgramCallableResponse as Result} from "../../shared/generated/adminManageListingProgramCallableResponse";
import {validateAdminManageListingProgramCallablePayload} from "../../shared/generated/validators/adminManageListingProgramInput";
import {validateAdminManageListingProgramCallableResponse} from "../../shared/generated/validators/adminManageListingProgramOutput";
import {discoveryFormatsForText} from "../../domain/discovery/discoveryFormats";
import {requireAdminRole, type AdminContext} from "../../platform/adminAuth";
import type {ListingProgramSettingsDocument} from "../../shared/generated/firestoreAdminTypes";
import {validateListingProgramSettingsDocument} from "../../shared/generated/validators/listingProgramSettingsDocument";
import {setAdminAuditLogInTransaction} from "../../platform/adminAudit";
import {
  defaultListingCohortId,
  listingProgramSettingsCollection,
  listingProgramSettingsId,
  readListingProgramState,
  type ListingProgramState,
} from "../../domain/supply/listingProgramState";

// Anyone who approves listings may pause; only the owner roles may resume.
const readRoles = ["admin", "adminOwner", "support"] as const;
const resumeRoles = ["admin", "adminOwner"] as const;
/** At most this many live organizers are read for one format report. */
export const formatReportLimit = 5000;

type Db = FirebaseFirestore.Firestore;

interface Deps {
  firestore: () => Db;
  now: () => number;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: Deps = {
  firestore: () => admin.firestore(),
  now: Date.now,
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Staff read or flip the programmatic listings pause switch against the
 * revision they reviewed, or count the live organizers that list no format.
 */
export async function adminManageListingProgramHandler(request: CallableRequest<unknown>,
  deps: Deps = defaultDeps): Promise<Result> {
  const actor = requireAdminRole(request, readRoles);
  const data = validateCallableWithAjv<Payload>(request, validateAdminManageListingProgramCallablePayload,
    normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, actor.uid, "adminManageListingProgram", {maxRequests: 30, windowMs: 60 * 1000});
  if (data.action === "read") return project(await readListingProgramState(db), null);
  if (data.action === "format_report") {
    return project(await readListingProgramState(db), await formatReport(db, deps.now()));
  }
  return setPause(db, actor, request, deps, {paused: data.paused === true, reason: String(data.reason),
    expectedRevision: Number(data.expectedRevision)});
}

export const adminManageListingProgram = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 10}),
  (request) => adminManageListingProgramHandler(request));

async function setPause(db: Db, actor: AdminContext, request: CallableRequest<unknown>, deps: Deps,
  input: {paused: boolean; reason: string; expectedRevision: number}): Promise<Result> {
  if (!input.paused && !actor.roles.some((role) => (resumeRoles as readonly string[]).includes(role))) {
    throw new HttpsError("permission-denied", "Only the owner can resume programmatic listings.");
  }
  const ref = db.collection(listingProgramSettingsCollection).doc(listingProgramSettingsId);
  return db.runTransaction(async (tx) => {
    const state = await readListingProgramState(db, tx);
    if ((state.stored?.revision ?? 0) !== input.expectedRevision) {
      throw new HttpsError("aborted", "The pause switch changed. Review it again.");
    }
    const record: ListingProgramSettingsDocument = {schemaVersion: 1, settingsId: "platform",
      revision: (state.stored?.revision ?? 0) + 1, paused: input.paused, reason: input.reason,
      updatedAtMillis: deps.now(), updatedByUid: actor.uid};
    if (!validateListingProgramSettingsDocument(record)) {
      throw new HttpsError("invalid-argument", "This pause switch is not valid.");
    }
    tx.set(ref, record);
    setAdminAuditLogInTransaction(tx, db, actor, {
      action: "adminManageListingProgram", targetPath: ref.path, request,
      before: {revision: state.stored?.revision ?? 0, paused: state.paused},
      after: {revision: record.revision, paused: record.paused},
      note: input.reason,
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
    });
    return project({paused: record.paused, reason: record.reason, stored: record}, null);
  });
}

/**
 * Counts live (published) organizers by city, and whether each lists a
 * format the city-by-format pages count: its category label (or type) and
 * listed formats (or tags), matched as cityPlans matches them. Counts only.
 * Formats an organizer's events name are not counted here.
 */
async function formatReport(db: Db, now: number): Promise<NonNullable<Result["formatReport"]>> {
  const snap = await db.collection("organizers").where("publicPage.publishStatus", "==", "published")
    .select("publicPage.citySlug", "publicCategoryLabel", "displayCategory", "organizerType", "publicProfile.formats", "tags")
    .limit(formatReportLimit + 1).get();
  const docs = snap.docs.slice(0, formatReportLimit);
  const cities = new Map<string, {live: number; withFormat: number}>();
  for (const doc of docs) {
    const organizer = doc.data();
    const citySlug = typeof organizer.publicPage?.citySlug === "string" && organizer.publicPage.citySlug ?
      organizer.publicPage.citySlug.slice(0, 80) : "unknown";
    const listed = strings(organizer.publicProfile?.formats);
    const text = [organizer.publicCategoryLabel ?? organizer.displayCategory ?? organizer.organizerType,
      ...(listed.length ? listed : strings(organizer.tags))].filter((entry): entry is string => typeof entry === "string");
    const city = cities.get(citySlug) ?? {live: 0, withFormat: 0};
    city.live += 1;
    if (discoveryFormatsForText(text).length > 0) city.withFormat += 1;
    cities.set(citySlug, city);
  }
  const rows = [...cities.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 200)
    .map(([citySlug, city]) => ({citySlug, live: city.live, withFormat: city.withFormat,
      withoutFormat: city.live - city.withFormat}));
  const live = rows.reduce((sum, row) => sum + row.live, 0);
  const withFormat = rows.reduce((sum, row) => sum + row.withFormat, 0);
  return {generatedAtMillis: now, live, withFormat, withoutFormat: live - withFormat,
    truncated: snap.docs.length > formatReportLimit, cities: rows};
}

function project(state: ListingProgramState, formatReport: Result["formatReport"]): Result {
  const result: Result = {revision: state.stored?.revision ?? 0, paused: state.paused, reason: state.reason,
    updatedAtMillis: state.stored?.updatedAtMillis ?? null, updatedByUid: state.stored?.updatedByUid ?? null,
    defaultCohortId: defaultListingCohortId, formatReport};
  if (!validateAdminManageListingProgramCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid listing programme state.");
  }
  return result;
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return typeof data.reason === "string" ? {...data, reason: data.reason.trim()} : data;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}
