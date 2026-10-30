/* eslint-disable max-len */
import * as admin from "firebase-admin";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {adminRolesFromToken, requireAdminRole} from "../../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../../admin/adminAudit";
import {catchEndpointHash} from "../../catchMessaging/whatsappReply";
import {hasCurrentPartnerMembership} from "../../partners/service";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import type {AdminListSupplyNominatorsCallableResponse} from "../../shared/generated/adminListSupplyNominatorsCallableResponse";
import type {AdminSetSupplyNominatorCallablePayload} from "../../shared/generated/adminSetSupplyNominatorCallablePayload";
import type {AdminSetSupplyNominatorCallableResponse} from "../../shared/generated/adminSetSupplyNominatorCallableResponse";
import type {SupplyNominatorDocument} from "../../shared/generated/supplyNominatorDocument";
import {validateAdminListSupplyNominatorsCallablePayload} from "../../shared/generated/validators/adminListSupplyNominatorsInput";
import {validateAdminSetSupplyNominatorCallablePayload} from "../../shared/generated/validators/adminSetSupplyNominatorInput";
import {validateSupplyNominatorDocument} from "../../shared/generated/validators/supplyNominatorDocument";
import {checkRateLimit as defaultCheckRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {intakeMarket} from "./requests";

// Who may nominate organizers by messaging Catch. Staff register a person's
// WhatsApp number or Instagram username against their Catch account. The
// number is kept only as the same endpoint hash the WhatsApp receipts carry;
// the username is public, and the Instagram webhook reads it for each sender. A nominator's authority is the
// account's, checked when staff register them and again on every message, so
// removing someone's sales role or partner membership stops their messages
// without touching this registry.

export const SUPPLY_NOMINATORS = "supplyNominators";
export const MAX_SUPPLY_NOMINATORS = 200;
const associateRoles = ["admin", "adminOwner", "salesStaff"] as const;
const instagramHandlePattern = /^[a-z0-9._]{1,30}$/u;

export interface NominatorAuthority {
  nominatorId: string;
  role: "associate" | "partner";
  uid: string;
  partnerId: string | null;
  defaultMarket: string | null;
}

export interface NominatorDeps {
  firestore: () => Firestore;
  now: () => Date;
  getUser: (uid: string) => Promise<{disabled: boolean; customClaims?: Record<string, unknown>}>;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: NominatorDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  getUser: (uid) => admin.auth().getUser(uid),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

export function whatsappNominatorId(endpointHash: string): string {
  return `whatsapp-${endpointHash}`;
}

export function instagramNominatorId(handle: string): string {
  return `instagram-${handle}`;
}

/**
 * Whether uid may act in role right now: an enabled account with a sales
 * role (associate), or a current accepted partner membership (partner).
 */
export async function nominatorRoleIsCurrent(tx: Transaction, db: Firestore, deps: Pick<NominatorDeps, "getUser">,
  role: "associate" | "partner", uid: string, now: Date): Promise<boolean> {
  let user;
  try {
    user = await deps.getUser(uid);
  } catch (error) {
    if ((error as {code?: unknown})?.code === "auth/user-not-found") return false;
    throw error;
  }
  if (user.disabled) return false;
  if (role === "partner") return hasCurrentPartnerMembership(db, tx, uid, now);
  return adminRolesFromToken(user.customClaims).some((claim) =>
    (associateRoles as readonly string[]).includes(claim));
}

/**
 * The active nominator a WhatsApp sender's endpoint hash belongs to, or null
 * when the sender is not registered, was switched off, or no longer holds the
 * role they were registered with.
 */
export async function resolveWhatsappNominator(tx: Transaction, db: Firestore, deps: Pick<NominatorDeps, "getUser">,
  endpointHash: string, now: Date): Promise<NominatorAuthority | null> {
  return resolveNominator(tx, db, deps, whatsappNominatorId(endpointHash),
    (row) => row.channel === "whatsapp" && row.endpointHash === endpointHash, now);
}

/** The same, for an Instagram sender's username as the Graph API returns it. */
export async function resolveInstagramNominator(tx: Transaction, db: Firestore, deps: Pick<NominatorDeps, "getUser">,
  handle: string, now: Date): Promise<NominatorAuthority | null> {
  if (!instagramHandlePattern.test(handle)) return null;
  return resolveNominator(tx, db, deps, instagramNominatorId(handle),
    (row) => row.channel === "instagram" && row.instagramHandle === handle, now);
}

/**
 * A nominator by registry id, for checks after the message: auto-publish
 * asks whether the person who sent a nomination still holds their role.
 */
export async function resolveNominatorById(tx: Transaction, db: Firestore, deps: Pick<NominatorDeps, "getUser">,
  nominatorId: string, now: Date): Promise<NominatorAuthority | null> {
  return resolveNominator(tx, db, deps, nominatorId, () => true, now);
}

async function resolveNominator(tx: Transaction, db: Firestore, deps: Pick<NominatorDeps, "getUser">,
  nominatorId: string, matches: (row: SupplyNominatorDocument) => boolean, now: Date): Promise<NominatorAuthority | null> {
  const snapshot = await tx.get(db.collection(SUPPLY_NOMINATORS).doc(nominatorId));
  if (!snapshot.exists) return null;
  const row = snapshot.data();
  if (!validateSupplyNominatorDocument(row) || !matches(row) || !row.active) return null;
  if (!await nominatorRoleIsCurrent(tx, db, deps, row.role, row.uid, now)) return null;
  return {nominatorId: row.nominatorId, role: row.role, uid: row.uid,
    partnerId: row.role === "partner" ? row.uid : null, defaultMarket: row.defaultMarket};
}

export async function adminSetSupplyNominatorHandler(request: CallableRequest<unknown>,
  deps: NominatorDeps = defaultDeps): Promise<AdminSetSupplyNominatorCallableResponse> {
  const context = requireAdminRole(request, ["admin", "adminOwner"]);
  const data = validateCallableWithAjv<AdminSetSupplyNominatorCallablePayload>(request,
    validateAdminSetSupplyNominatorCallablePayload, normalizeSetPayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid, "adminSetSupplyNominator", {maxRequests: 30, windowMs: 60 * 1000});
  if ((data.phoneE164 === undefined) === (data.instagramHandle === undefined)) {
    throw new HttpsError("invalid-argument", "Give either a WhatsApp number or an Instagram username.");
  }
  const endpoint = data.phoneE164 !== undefined ?
    {channel: "whatsapp" as const, endpointHash: catchEndpointHash(data.phoneE164), phoneLast4: data.phoneE164.slice(-4),
      instagramHandle: null} :
    {channel: "instagram" as const, endpointHash: null, phoneLast4: null, instagramHandle: data.instagramHandle as string};
  const nominatorId = endpoint.endpointHash !== null ? whatsappNominatorId(endpoint.endpointHash) :
    instagramNominatorId(endpoint.instagramHandle as string);
  const market = data.defaultMarket === null ? null : intakeMarket(data.defaultMarket);
  const defaultMarket = market === "unassigned" ? null : market;
  if (data.defaultMarket !== null && defaultMarket === null) {
    throw new HttpsError("invalid-argument", "The default city is not a market Catch knows.");
  }
  const now = deps.now();
  return db.runTransaction(async (tx) => {
    const ref = db.collection(SUPPLY_NOMINATORS).doc(nominatorId);
    const existing = await tx.get(ref);
    const previous = existing.exists ? existing.data() : null;
    if (previous && !validateSupplyNominatorDocument(previous)) {
      throw new HttpsError("failed-precondition", "The stored nominator is malformed; fix it before changing it.");
    }
    if (data.active && !await nominatorRoleIsCurrent(tx, db, deps, data.role, data.uid, now)) {
      throw new HttpsError("failed-precondition", data.role === "partner" ?
        "That account has no current partner membership." :
        "That account has no sales role (admin, adminOwner or salesStaff).");
    }
    const at = now.toISOString();
    const row: SupplyNominatorDocument = {schemaVersion: 1, nominatorId, ...endpoint, role: data.role, uid: data.uid, displayName: data.displayName,
      defaultMarket, active: data.active, createdAt: previous?.createdAt ?? at, updatedAt: at,
      updatedByUid: context.uid};
    if (!validateSupplyNominatorDocument(row)) {
      throw new HttpsError("internal", "The nominator does not satisfy its contract.");
    }
    tx.set(ref, row);
    setAdminAuditLogInTransaction(tx, db, context, {
      action: "adminSetSupplyNominator",
      targetPath: `${SUPPLY_NOMINATORS}/${nominatorId}`,
      request,
      before: previous ? auditView(previous) : {},
      after: auditView(row),
      note: null,
      serverTimestamp: deps.serverTimestamp,
    });
    return {nominatorId, created: !previous, phoneLast4: row.phoneLast4, instagramHandle: row.instagramHandle,
      defaultMarket, active: row.active};
  });
}

export async function adminListSupplyNominatorsHandler(request: CallableRequest<unknown>,
  deps: Pick<NominatorDeps, "firestore"> = defaultDeps): Promise<AdminListSupplyNominatorsCallableResponse> {
  requireAdminRole(request, ["admin", "adminOwner", "salesStaff"]);
  validateCallableWithAjv(request, validateAdminListSupplyNominatorsCallablePayload);
  const snapshot = await deps.firestore().collection(SUPPLY_NOMINATORS)
    .orderBy("updatedAt", "desc").limit(MAX_SUPPLY_NOMINATORS).get();
  const nominators = snapshot.docs.map((doc) => doc.data())
    .filter((row): row is SupplyNominatorDocument => validateSupplyNominatorDocument(row))
    .map((row) => ({nominatorId: row.nominatorId, channel: row.channel, phoneLast4: row.phoneLast4,
      instagramHandle: row.instagramHandle, role: row.role,
      uid: row.uid, displayName: row.displayName, defaultMarket: row.defaultMarket, active: row.active,
      updatedAt: row.updatedAt}));
  return {nominators};
}

function auditView(row: SupplyNominatorDocument): Record<string, unknown> {
  return {phoneLast4: row.phoneLast4, instagramHandle: row.instagramHandle, role: row.role, uid: row.uid, defaultMarket: row.defaultMarket,
    active: row.active};
}

function normalizeSetPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  const trimmed = (entry: unknown) => typeof entry === "string" ? entry.trim() || null : entry;
  return {
    ...data,
    phoneE164: typeof data.phoneE164 === "string" ? data.phoneE164.replace(/[\s()-]/gu, "") : data.phoneE164,
    // Staff paste "@Name.Here" or a profile link; usernames are lowercase.
    instagramHandle: typeof data.instagramHandle === "string" ? data.instagramHandle.trim()
      .replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//iu, "").replace(/^@/u, "").replace(/\/+$/u, "")
      .toLowerCase() : data.instagramHandle,
    displayName: trimmed(data.displayName),
    defaultMarket: trimmed(data.defaultMarket),
  };
}

export const adminSetSupplyNominator = onCall(appCheckCallableOptions, (request) =>
  adminSetSupplyNominatorHandler(request));

export const adminListSupplyNominators = onCall(appCheckCallableOptions, (request) =>
  adminListSupplyNominatorsHandler(request));
