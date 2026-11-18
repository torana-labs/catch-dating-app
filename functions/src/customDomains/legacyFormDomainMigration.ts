import type {firestore} from "firebase-admin";
import {
  dnsInstructionsFor, parseCustomDomain, parseServedHostname,
  sameCustomDomainBinding, type CustomDomainRecord, type CustomDomainStatus,
} from "./domainPolicy";
import {firebaseHostingProviderHostnameId} from "./domainRegistry";

/**
 * One-time fold of the retired organizerFormDomains registry into
 * customDomains (#1110). Read-only by default; an empty legacy collection is
 * a no-op. Conversion is deterministic, so re-running it finds every copied
 * record already migrated and never overwrites a customDomains record that
 * differs: that is reported as a conflict for an operator to resolve.
 */
export const LEGACY_FORM_DOMAINS_COLLECTION = "organizerFormDomains";

const STATUS_MAP: Readonly<Record<string, CustomDomainStatus>> = {
  pending: "pendingDns",
  verified: "verified",
  active: "active",
  revoked: "removed",
};

export type LegacyConversion =
  {ok: true; record: CustomDomainRecord} | {ok: false; reason: string};

function isInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

/** Converts one legacy document. `migratedAtMillis` stamps only history. */
export function convertLegacyFormDomain(hostname: string, value: unknown,
  migratedAtMillis: number): LegacyConversion {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {ok: false, reason: "not an object"};
  }
  const legacy = value as Record<string, unknown>;
  const served = parseServedHostname(hostname);
  if (!served || legacy.hostname !== hostname) {
    return {ok: false, reason: "hostname fails the Public Suffix List policy"};
  }
  const status = STATUS_MAP[String(legacy.status)];
  if (!status) return {ok: false, reason: `unknown status ${legacy.status}`};
  const expectedCname = legacy.expectedCname;
  if (typeof expectedCname !== "string" ||
      !expectedCname.endsWith(".web.app")) {
    return {ok: false, reason: "expectedCname is not a Hosting site"};
  }
  const siteId = expectedCname.slice(0, -".web.app".length);
  const verifiedAtMillis = isInteger(legacy.verifiedAtMillis) ?
    legacy.verifiedAtMillis : null;
  const reservedAtMillis = legacy.reservedAtMillis;
  const pendingExpiresAtMillis = legacy.pendingExpiresAtMillis;
  if (!isInteger(reservedAtMillis) || !isInteger(pendingExpiresAtMillis)) {
    return {ok: false, reason: "lease timestamps are missing"};
  }
  if (["verified", "active"].includes(status) && verifiedAtMillis === null) {
    return {ok: false, reason: `${legacy.status} without verifiedAtMillis`};
  }
  const certificateReady = legacy.certificateStatus === "ready";
  if (status === "active" && !certificateReady) {
    return {ok: false, reason: "active without a ready certificate"};
  }
  const ownershipChallenge = String(legacy.ownershipChallenge);
  const providerHostnameId = status === "active" ?
    firebaseHostingProviderHostnameId(siteId, hostname) : null;
  const record = {
    hostname,
    registrableDomain: served.registrableDomain,
    target: {kind: "form" as const, organizerId: legacy.organizerId as string,
      formId: legacy.formId as string,
      publicFormId: legacy.publicFormId as string},
    status,
    generation: legacy.generation as number,
    revision: 1,
    ownershipChallenge,
    expectedCname,
    apexRedirect: null,
    provider: "firebaseHosting" as const,
    providerHostnameId,
    // The legacy registry kept no activation time or provider snapshot; the
    // verification time is the latest fact it recorded for both.
    providerStatus: status === "active" ? {hostname: "active", ssl: "active",
      errors: [], observedAtMillis: verifiedAtMillis as number} : null,
    dnsInstructions: dnsInstructionsFor({hostname, ownershipChallenge,
      expectedCname, apexRedirect: null}),
    reservedAtMillis,
    pendingExpiresAtMillis: status === "pendingDns" ?
      pendingExpiresAtMillis : null,
    verifiedAtMillis: status === "pendingDns" ? null : verifiedAtMillis,
    activatedAtMillis: status === "active" ? verifiedAtMillis : null,
    lastCheckedAtMillis: null,
    lastHealthyAtMillis: null,
    lapsedAtMillis: null,
    consecutiveProbeFailures: 0,
    review: {state: "none" as const, reason: null},
    suspension: null,
    createdByUid: null,
    history: [{atMillis: migratedAtMillis, from: null, to: status,
      actor: "operator" as const, actorUid: null,
      reason: `Migrated from organizerFormDomains (status ${legacy.status})`}],
  };
  const parsed = parseCustomDomain(record);
  return parsed ? {ok: true, record: parsed} :
    {ok: false, reason: "converted record fails the customDomains schema"};
}

export type LegacyPlanRow =
  {hostname: string; action: "create"; record: CustomDomainRecord} |
  {hostname: string; action: "alreadyMigrated"} |
  {hostname: string; action: "blocked"; reason: string};

export interface LegacyMigrationPlan {
  legacyCount: number;
  rows: LegacyPlanRow[];
  summary: {create: number; alreadyMigrated: number; blocked: number};
}

function planRow(hostname: string, legacy: unknown,
  current: unknown | undefined, migratedAtMillis: number): LegacyPlanRow {
  const converted = convertLegacyFormDomain(hostname, legacy,
    migratedAtMillis);
  if (!converted.ok) {
    return {hostname, action: "blocked", reason: converted.reason};
  }
  if (current === undefined) {
    return {hostname, action: "create", record: converted.record};
  }
  const existing = parseCustomDomain(current);
  if (existing && sameCustomDomainBinding(existing, converted.record)) {
    return {hostname, action: "alreadyMigrated"};
  }
  return {hostname, action: "blocked",
    reason: "customDomains already holds a different record for this host"};
}

/** Reads both collections; never writes. */
export async function planLegacyFormDomainMigration(db: firestore.Firestore,
  migratedAtMillis: number): Promise<LegacyMigrationPlan> {
  const legacy = await db.collection(LEGACY_FORM_DOMAINS_COLLECTION).get();
  const rows: LegacyPlanRow[] = [];
  for (const doc of legacy.docs) {
    const current = await db.collection("customDomains").doc(doc.id).get();
    rows.push(planRow(doc.id, doc.data(), current.exists ?
      current.data() : undefined, migratedAtMillis));
  }
  const count = (action: LegacyPlanRow["action"]) =>
    rows.filter((row) => row.action === action).length;
  return {legacyCount: legacy.size, rows,
    summary: {create: count("create"),
      alreadyMigrated: count("alreadyMigrated"), blocked: count("blocked")}};
}

/**
 * Copies each planned record in its own transaction, re-reading both
 * documents so a concurrent write turns into a skipped row, not an
 * overwrite. With `retireLegacy`, a legacy document is deleted only after its
 * exact migrated copy is confirmed in the same transaction.
 */
export async function applyLegacyFormDomainMigration(db: firestore.Firestore,
  migratedAtMillis: number, options: {retireLegacy: boolean}
): Promise<{created: string[]; retired: string[]; skipped: string[]}> {
  const legacy = await db.collection(LEGACY_FORM_DOMAINS_COLLECTION).get();
  const created: string[] = [];
  const retired: string[] = [];
  const skipped: string[] = [];
  for (const doc of legacy.docs) {
    const legacyRef = doc.ref;
    const targetRef = db.collection("customDomains").doc(doc.id);
    const outcome = await db.runTransaction(async (tx) => {
      const [source, target] = await Promise.all([tx.get(legacyRef),
        tx.get(targetRef)]);
      if (!source.exists) return "skipped";
      const row = planRow(doc.id, source.data(), target.exists ?
        target.data() : undefined, migratedAtMillis);
      if (row.action === "blocked") return "skipped";
      if (row.action === "create") tx.create(targetRef, row.record);
      if (options.retireLegacy) tx.delete(legacyRef);
      return row.action === "create" ?
        (options.retireLegacy ? "createdAndRetired" : "created") :
        (options.retireLegacy ? "retired" : "skipped");
    });
    if (outcome === "created" || outcome === "createdAndRetired") {
      created.push(doc.id);
    }
    if (outcome === "retired" || outcome === "createdAndRetired") {
      retired.push(doc.id);
    }
    if (outcome === "skipped") skipped.push(doc.id);
  }
  return {created, retired, skipped};
}
