import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {defineString} from "firebase-functions/params";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  ADMIN_ROLE_CLAIMS,
  RETIRED_ADMIN_ROLE_CLAIMS,
} from "../../platform/adminAuth";
import type {AdAudienceRunDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {
  conversionOwner,
  hashedEmail,
  hashedPhone,
  hashedPhoneForMeta,
} from "../adConversions/hostConversions";
import {
  adConversionsMetaTokenVersion,
  readPinnedSecret,
} from "../adConversions/worker";
import {
  activeAdMatchingOptOutIds,
  hostContactDigests,
  inAdMatchingOptOuts,
} from "../adMatching/optOuts";
import {verifiedAuthEmail} from "../adMatching/verifiedEmail";
import {
  MetaAudienceError,
  type MetaAudienceRow,
  createMetaAudience,
  deleteMetaAudience,
  findMetaAudience,
  replaceMetaAudience,
} from "./metaAudience";

/**
 * The host customer list (docs/ads_conversion_spec.md, Customer lists): one
 * Meta customer-file audience of the owners of organizers with a first
 * booked event, rebuilt and replaced whole every day so removals and
 * opt-outs leave Meta within a day. Only hashed phone (Meta's digits-only
 * form) and the account's verified Firebase Auth email are uploaded; the
 * run keeps counts, never identifiers.
 * Google Customer Match is not built: the Ads account is not eligible yet.
 */
export const adAudiencesMode = defineString("AD_AUDIENCES_MODE",
  {default: "off"});

export type AudienceMode = "off" | "live";
export function audienceMode(value: string): AudienceMode {
  return value === "live" ? "live" : "off";
}

export const AD_AUDIENCE_RUNS = "adAudienceRuns";
export const HOST_AUDIENCE_KEY = "meta_active_hosts";
export const HOST_AUDIENCE_NAME = "Catch | Active hosts";
const HOST_AUDIENCE_DESCRIPTION = "Owners of Catch organizers with a first " +
  "booked event. Replaced daily by Catch; opted-out, deleted, staff and " +
  "test accounts are left out.";

type Raw = Record<string, unknown> | undefined;
type Excluded = AdAudienceRunDocument["excluded"];

export interface AuthFacts {
  /** Sign-in is disabled. */
  disabled: boolean;
  /** Holds an Admin role claim, current or retired. */
  staff: boolean;
  /** The Auth email when Auth has verified it, else null
   * (`verifiedAuthEmail`). The only email a row may carry. */
  verifiedEmail: string | null;
}

export interface HostAudienceInput {
  /** Organizers whose growth facts show a first booked event. */
  organizers: Array<{organizerId: string; organizer: Raw}>;
  users: Map<string, Raw>;
  safetyStates: Map<string, Raw>;
  roleAssignments: Map<string, Raw>;
  /** Firebase Auth facts; a missing entry means the account is gone. */
  auth: Map<string, AuthFacts>;
  optedOut: Set<string>;
  nowMillis: number;
}

export interface HostAudienceMembers {
  rows: MetaAudienceRow[];
  candidates: number;
  excluded: Excluded;
}

const restrictedLevels = new Set(["restricted", "suspended", "banned"]);

function millisOf(value: unknown): number | null {
  if (value && typeof value === "object" &&
      typeof (value as {toMillis?: unknown}).toMillis === "function") {
    return (value as {toMillis: () => number}).toMillis();
  }
  return null;
}

function underEighteen(dateOfBirth: unknown, nowMillis: number): boolean {
  const birth = millisOf(dateOfBirth);
  if (birth === null) return false;
  const adult = new Date(birth);
  adult.setUTCFullYear(adult.getUTCFullYear() + 18);
  return adult.getTime() > nowMillis;
}

function testAccount(user: Record<string, unknown>): boolean {
  return user.synthetic === true || user.demoOps === true ||
    typeof user.demoOpsId === "string" || typeof user.seedPrefix === "string" ||
    typeof user.scenario === "string";
}

/**
 * Builds the audience rows. Pure. An owner is dropped whole, never uploaded
 * without the key that disqualified them: not a real owned organizer
 * (mirrors the conversion queue), deleted account, staff, test or demo
 * account, safety restriction, under 18, opted out of ad matching, or no
 * contact key. No gender, age, orientation, matching, dating or attendance
 * data is read into a row.
 * @param {HostAudienceInput} input Organizers, accounts and opt-outs.
 * @return {HostAudienceMembers} Rows and counts.
 */
export function hostAudienceMembers(input: HostAudienceInput):
  HostAudienceMembers {
  const excluded: Excluded = {notOwned: 0, deleted: 0, staff: 0, test: 0,
    restricted: 0, underAge: 0, optedOut: 0, noContact: 0};
  const owners = new Map<string, Raw>();
  for (const {organizer} of input.organizers) {
    const uid = conversionOwner(organizer);
    if (!uid) {
      excluded.notOwned += 1;
      continue;
    }
    if (!owners.has(uid)) owners.set(uid, organizer);
  }
  const rows: MetaAudienceRow[] = [];
  const seen = new Set<string>();
  for (const [uid, organizer] of owners) {
    const user = input.users.get(uid);
    const auth = input.auth.get(uid);
    if (!user || user.deleted === true || user.deletedAt || !auth) {
      excluded.deleted += 1;
      continue;
    }
    const role = input.roleAssignments.get(uid);
    if (auth.staff || role?.status === "active" &&
        Array.isArray(role.roles) && role.roles.length > 0) {
      excluded.staff += 1;
      continue;
    }
    if (testAccount(user)) {
      excluded.test += 1;
      continue;
    }
    const level = input.safetyStates.get(uid)?.level;
    if (auth.disabled || restrictedLevels.has(String(level))) {
      excluded.restricted += 1;
      continue;
    }
    if (underEighteen(user.dateOfBirth, input.nowMillis)) {
      excluded.underAge += 1;
      continue;
    }
    // Only a verified email is uploaded; the typed account and organizer
    // emails still count for opt-outs below.
    const emailSha256 = hashedEmail(auth.verifiedEmail);
    const phoneSha256 = hashedPhone(user.phoneNumber);
    if (inAdMatchingOptOuts(input.optedOut, {phoneSha256, emailSha256}) ||
        hostContactDigests(user, organizer)
          .some((digests) => inAdMatchingOptOuts(input.optedOut, digests))) {
      excluded.optedOut += 1;
      continue;
    }
    const metaPhone = hashedPhoneForMeta(user.phoneNumber);
    if (!emailSha256 && !metaPhone) {
      excluded.noContact += 1;
      continue;
    }
    const row: MetaAudienceRow = [emailSha256 ?? "", metaPhone ?? ""];
    const key = row.join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  return {rows, candidates: input.organizers.length, excluded};
}

const PAGE = 300;

async function readDocs(db: FirebaseFirestore.Firestore, collection: string,
  ids: string[]): Promise<Map<string, Raw>> {
  const found = new Map<string, Raw>();
  for (let index = 0; index < ids.length; index += 50) {
    const chunk = ids.slice(index, index + 50);
    const snaps = await Promise.all(chunk.map((id) =>
      db.collection(collection).doc(id).get()));
    snaps.forEach((snap, offset) => found.set(chunk[offset], snap.data()));
  }
  return found;
}

/**
 * Organizers whose growth facts carry a first booked event.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @return {Promise<string[]>} Organizer IDs.
 */
export async function qualifiedOrganizerIds(db: FirebaseFirestore.Firestore):
  Promise<string[]> {
  const ids: string[] = [];
  let after: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let query = db.collection("organizerGrowthFacts")
      .where("milestones.firstEventAt", ">", Timestamp.fromMillis(0))
      .orderBy("milestones.firstEventAt")
      .limit(PAGE);
    if (after) query = query.startAfter(after);
    const page = await query.get();
    for (const doc of page.docs) ids.push(doc.id);
    if (page.docs.length < PAGE) return ids;
    after = page.docs[page.docs.length - 1];
  }
}

const staffClaims = new Set<string>([...ADMIN_ROLE_CLAIMS,
  ...RETIRED_ADMIN_ROLE_CLAIMS]);

/**
 * Firebase Auth facts for accounts; accounts Auth no longer has are absent.
 * @param {string[]} uids Accounts.
 * @return {Promise<Map<string, AuthFacts>>} Facts by account.
 */
export async function firebaseAuthFacts(uids: string[]):
  Promise<Map<string, AuthFacts>> {
  const facts = new Map<string, AuthFacts>();
  for (let index = 0; index < uids.length; index += 100) {
    const result = await admin.auth().getUsers(uids.slice(index, index + 100)
      .map((uid) => ({uid})));
    for (const user of result.users) {
      const claims = user.customClaims ?? {};
      facts.set(user.uid, {disabled: user.disabled,
        staff: Object.entries(claims).some(([claim, value]) =>
          value === true && staffClaims.has(claim)),
        verifiedEmail: verifiedAuthEmail(user)});
    }
  }
  return facts;
}

export interface HostAudienceDeps {
  db: FirebaseFirestore.Firestore;
  mode: AudienceMode;
  now: () => number;
  token: () => Promise<string>;
  authFacts: (uids: string[]) => Promise<Map<string, AuthFacts>>;
  fetch?: typeof fetch;
}

/**
 * Reads everything the audience needs and builds its rows.
 * @param {HostAudienceDeps} deps Dependencies.
 * @return {Promise<HostAudienceMembers>} Rows and counts.
 */
export async function loadHostAudienceMembers(deps: HostAudienceDeps):
  Promise<HostAudienceMembers> {
  const organizerIds = await qualifiedOrganizerIds(deps.db);
  const organizerDocs = await readDocs(deps.db, "organizers", organizerIds);
  const organizers = organizerIds.map((organizerId) => ({organizerId,
    organizer: organizerDocs.get(organizerId)}));
  const uids = [...new Set(organizers.map(({organizer}) =>
    conversionOwner(organizer)).filter((uid): uid is string => !!uid))];
  const [users, safetyStates, roleAssignments, auth, optedOut] =
    await Promise.all([
      readDocs(deps.db, "users", uids),
      readDocs(deps.db, "accountSafetyStates", uids),
      readDocs(deps.db, "adminRoleAssignments", uids),
      deps.authFacts(uids),
      activeAdMatchingOptOutIds(deps.db),
    ]);
  return hostAudienceMembers({organizers, users, safetyStates,
    roleAssignments, auth, optedOut, nowMillis: deps.now()});
}

const noneExcluded = (): Excluded => ({notOwned: 0, deleted: 0, staff: 0,
  test: 0, restricted: 0, underAge: 0, optedOut: 0, noContact: 0});

/**
 * The off-mode run: when an earlier live run left an audience in Meta, delete
 * it, so a list that is no longer kept current (and would miss later
 * opt-outs) does not linger. Reads only the run receipt and sends nothing
 * when there is no audience, as in dev.
 * @param {HostAudienceDeps} deps Dependencies.
 * @return {Promise<AdAudienceRunDocument|null>} The receipt, or null.
 */
export async function retireHostAudience(deps: HostAudienceDeps):
  Promise<AdAudienceRunDocument | null> {
  const ref = deps.db.collection(AD_AUDIENCE_RUNS).doc(HOST_AUDIENCE_KEY);
  const last = (await ref.get()).data() as AdAudienceRunDocument | undefined;
  const audienceId = last?.platformAudienceId;
  if (!audienceId) return null;
  const startedAt = Timestamp.fromMillis(deps.now());
  let status: AdAudienceRunDocument["status"] = "failed";
  let outcome = "unexpected";
  try {
    let token: string;
    try {
      token = await deps.token();
    } catch {
      throw new MetaAudienceError("meta_credential_unavailable");
    }
    await deleteMetaAudience({token, fetch: deps.fetch}, audienceId);
    status = "emptied";
    outcome = "switched_off";
  } catch (error) {
    outcome = error instanceof MetaAudienceError ? error.code : "unexpected";
  }
  const finishedAt = Timestamp.fromMillis(deps.now());
  const receipt: AdAudienceRunDocument = {
    schemaVersion: 1,
    audienceKey: HOST_AUDIENCE_KEY,
    destination: "meta",
    // A failed delete keeps the ID so the next daily run tries again.
    platformAudienceId: status === "emptied" ? null : audienceId,
    status,
    outcome,
    startedAt,
    finishedAt,
    candidates: 0,
    members: 0,
    uploaded: 0,
    invalid: 0,
    excluded: noneExcluded(),
    updatedAt: finishedAt,
  };
  await ref.set(receipt);
  logger.info("Host ad audience retired", {status, outcome});
  return receipt;
}

/**
 * One daily run: rebuild the members and replace the Meta audience whole,
 * creating it when missing, or delete it when no one qualifies (a replace
 * needs at least one row). When the mode is off, it only deletes an audience
 * an earlier live run left behind.
 * @param {HostAudienceDeps} deps Dependencies.
 * @return {Promise<AdAudienceRunDocument|null>} The run receipt.
 */
export async function runHostAudienceSync(deps: HostAudienceDeps):
  Promise<AdAudienceRunDocument | null> {
  if (deps.mode !== "live") return retireHostAudience(deps);
  const startedAt = Timestamp.fromMillis(deps.now());
  const members = await loadHostAudienceMembers(deps);
  let audienceId: string | null = null;
  let status: AdAudienceRunDocument["status"] = "failed";
  let outcome = "unexpected";
  let uploaded = 0;
  let invalid = 0;
  try {
    let token: string;
    try {
      token = await deps.token();
    } catch {
      throw new MetaAudienceError("meta_credential_unavailable");
    }
    const meta = {token, fetch: deps.fetch};
    audienceId = await findMetaAudience(meta, HOST_AUDIENCE_NAME);
    if (members.rows.length === 0) {
      if (audienceId) await deleteMetaAudience(meta, audienceId);
      audienceId = null;
      status = "emptied";
      outcome = "no_members";
    } else {
      audienceId ??= await createMetaAudience(meta, HOST_AUDIENCE_NAME,
        HOST_AUDIENCE_DESCRIPTION);
      const result = await replaceMetaAudience(meta, audienceId,
        members.rows);
      uploaded = result.received;
      invalid = result.invalid;
      status = "replaced";
      outcome = "replaced";
    }
  } catch (error) {
    outcome = error instanceof MetaAudienceError ? error.code : "unexpected";
  }
  const finishedAt = Timestamp.fromMillis(deps.now());
  const receipt: AdAudienceRunDocument = {
    schemaVersion: 1,
    audienceKey: HOST_AUDIENCE_KEY,
    destination: "meta",
    platformAudienceId: audienceId,
    status,
    outcome,
    startedAt,
    finishedAt,
    candidates: members.candidates,
    members: members.rows.length,
    uploaded,
    invalid,
    excluded: members.excluded,
    updatedAt: finishedAt,
  };
  await deps.db.collection(AD_AUDIENCE_RUNS).doc(HOST_AUDIENCE_KEY)
    .set(receipt);
  logger.info("Host ad audience run", {status, outcome,
    candidates: receipt.candidates, members: receipt.members, uploaded,
    invalid, excluded: receipt.excluded});
  return receipt;
}

/** Daily at 04:20 India time, after the nightly growth-facts reconcile. */
export const syncMetaHostAudience = onSchedule({
  schedule: "20 4 * * *",
  timeZone: "Asia/Kolkata",
  timeoutSeconds: 540,
}, async () => {
  await runHostAudienceSync({
    db: admin.firestore(),
    mode: audienceMode(adAudiencesMode.value().trim()),
    now: Date.now,
    token: () => readPinnedSecret(adConversionsMetaTokenVersion.value().trim()),
    authFacts: firebaseAuthFacts,
  });
});
