import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {HttpsError} from "firebase-functions/v2/https";
import {effectiveCommercialTerms, readCommercialTerms} from
  "../commercialTerms/resolver";
import {
  commercialTermsCollection,
  commercialTermsRevisionId,
  commercialTermsRevisionsCollection,
  mergeCommercialTerms,
  organizerCommercialTermsId,
  type CommercialTerms,
  type CommercialTermsOverride,
} from "../commercialTerms/terms";
import {organizerHasOwner} from "../foundingHosts/foundingHostOffer";
import {growthFactsCollection} from "../growth/organizerGrowthFacts";
import {
  isOrganizerOwner,
  organizerManagerUserIds,
  organizerOwnerUserId,
} from "../shared/organizerHosts";
import type {CommercialTermsDocument} from
  "../shared/generated/commercialTermsDocument";
import type {CommercialTermsRevisionDocument} from
  "../shared/generated/commercialTermsRevisionDocument";
import type {
  OrganizerBillDocument,
  OrganizerDocument,
  OrganizerGrowthFactsDocument,
  OrganizerReferralDocument,
} from "../shared/generated/firestoreAdminTypes";
import {validateCommercialTermsDocument} from
  "../shared/generated/validators/commercialTermsDocument";
import {validateOrganizerReferralDocument} from
  "../shared/generated/validators/organizerReferralDocument";
import {dayMillis, trialAnchorsFromFacts, trialWindow} from "./hostTrial";
import {ownedOrganizersPage} from "./ownedOrganizers";

/**
 * Host-to-host referrals (owner decision, 19 Nov 2026).
 *
 * A host who refers another host through the website's referral form, signed
 * in, earns one billing cycle of Catch fees free once the referred host has
 * paid its first bill; the referred host gets a 60-day free trial instead of
 * the standard one. No cash is paid.
 *
 * Attribution reuses what Catch already records: a website referral lead
 * (`salesInboundIntents`, `leadKind: referral`) names its signed-in referrer
 * in `lead.referralCredit`, and is linked to the organizer it becomes when
 * staff approve the listing it seeds or link it to an existing organizer
 * (`status: linked`, `organizerId`). Nothing a client sends decides a
 * referral: the referrer is the account the lead intake verified, and the
 * referred organizer is the one staff linked.
 *
 * A referral attaches once the referred organizer has an owner and before
 * its trial starts. The earliest linked lead wins whose referrer owns a live
 * organizer and is not the referred host itself: not an owner or manager of
 * the referred organizer, not managed by the referred owner, and not the
 * referred owner's phone number. One document per referred organizer, keyed
 * by it, so there is one referrer and every write is idempotent.
 */
export const organizerReferralsCollection = "organizerReferrals";
/** Free days a referred host gets at least, as website pricing.ts says. */
export const referralTrialDays = 60;
/** The commercial terms actor for a trial a referral raised. */
export const referralTermsActor = "system:hostReferral";
/** How far back the daily reconcile looks for claims and linked leads. */
export const referralReconcileWindowDays = 3;
/** Most candidates one reconcile source reads. */
export const referralReconcileLimit = 500;

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;
type Bill = OrganizerBillDocument;
export type OrganizerReferral = OrganizerReferralDocument;

export interface ReferralDeps {
  db: Db;
  now: () => number;
  /** The account's verified phone number, or null when it has none. */
  phoneOf: (uid: string) => Promise<string | null>;
}

export const defaultPhoneOf = async (uid: string): Promise<string | null> => {
  try {
    return (await admin.auth().getUser(uid)).phoneNumber ?? null;
  } catch {
    return null;
  }
};

export type ReferralSkipReason =
  "alreadyAttached" | "notOwned" | "synthetic" | "noReferral" |
  "trialStarted" | "selfReferral" | "referrerNotOrganizer" |
  "referrerDeleted" | "changed";

export type ReferralAttachResult =
  {kind: "attached"; referrerOrganizerId: string; sourceIntentId: string;
    trialDaysWritten: number | null} |
  {kind: "skip"; reason: ReferralSkipReason};

/** One linked referral lead, as attribution reads it. */
export interface ReferralLead {
  intentId: string;
  referrerUid: string;
  /** The WhatsApp number the referrer typed on the form. */
  phone: string | null;
  recordedAtMillis: number;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ?
    value as Record<string, unknown> : null;
}

function millisOf(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const toMillis = record(value)?.toMillis;
  return typeof toMillis === "function" ?
    (toMillis as () => number).call(value) : null;
}

/**
 * The referral leads linked to one organizer that credit a signed-in
 * referrer, oldest first. A lead sent signed out credits nobody.
 * @param {Array<object>} intents Linked sales inbound intents, with ids.
 * @param {string} organizerId The referred organizer.
 * @return {ReferralLead[]} Creditable leads, oldest first.
 */
export function creditableReferralLeads(
  intents: Array<{id: string; data: Record<string, unknown>}>,
  organizerId: string): ReferralLead[] {
  const leads: ReferralLead[] = [];
  for (const {id, data} of intents) {
    if (data.leadKind !== "referral" || data.status !== "linked" ||
        data.organizerId !== organizerId) continue;
    const credit = record(record(data.lead)?.referralCredit);
    const uid = credit?.referrerUid;
    const recordedAtMillis = millisOf(data.createdAt);
    if (credit?.status !== "referrer_account" || typeof uid !== "string" ||
        uid.length === 0 || recordedAtMillis === null) continue;
    leads.push({intentId: id, referrerUid: uid, recordedAtMillis,
      phone: typeof data.phone === "string" ? data.phone : null});
  }
  return leads.sort((a, b) => a.recordedAtMillis - b.recordedAtMillis ||
    a.intentId.localeCompare(b.intentId));
}

/**
 * When the organizer's trial starts, or null while nothing dates it. The
 * first event (or first paid booking) dates it whatever the trial's length.
 * @param {OrganizerGrowthFactsDocument|undefined} facts Growth facts.
 * @return {number|null} Trial start.
 */
export function trialStartMillis(
  facts: OrganizerGrowthFactsDocument | undefined): number | null {
  return trialWindow(trialAnchorsFromFacts(facts), 0)?.startsAtMillis ?? null;
}

/**
 * Whether a referral may still attach: before the referred host's trial
 * starts, and only from a lead recorded before then.
 * @param {object} input Trial start, lead time and now.
 * @return {boolean} Whether it is in time.
 */
export function referralInTime(input: {trialStartMillis: number | null;
  recordedAtMillis: number; nowMillis: number}): boolean {
  const start = input.trialStartMillis;
  return start === null ||
    start > input.nowMillis && input.recordedAtMillis < start;
}

/**
 * Whether the referrer is the referred host itself: the same account owns or
 * manages both, or the referred owner's verified phone is the referrer's
 * verified phone or the number they typed on the form.
 * @param {object} input Accounts, managers and phone numbers.
 * @return {boolean} True for a self-referral.
 */
export function isSelfReferral(input: {
  referrerUid: string; referredOwnerUid: string;
  referredManagerUids: string[]; referrerOrganizerManagerUids: string[];
  referrerPhone: string | null; leadPhone: string | null;
  referredOwnerPhone: string | null;
}): boolean {
  if (input.referrerUid === input.referredOwnerUid ||
      input.referredManagerUids.includes(input.referrerUid) ||
      input.referrerOrganizerManagerUids.includes(input.referredOwnerUid)) {
    return true;
  }
  const phone = input.referredOwnerPhone;
  return phone !== null && (phone === input.referrerPhone ||
    phone === input.leadPhone);
}

function isSynthetic(data: OrganizerDocument): boolean {
  return (data as unknown as Record<string, unknown>).synthetic === true;
}

function isLiveOrganizer(data: OrganizerDocument): boolean {
  return data.archived !== true && data.status !== "archived" &&
    !isSynthetic(data);
}

/**
 * The organizer a referrer's reward goes to: their oldest live organizer
 * other than the referred one, or null when they own none.
 * @param {Array<object>} owned The referrer's owned organizers.
 * @param {string} referredOrganizerId The referred organizer.
 * @return {object|null} The referrer organizer.
 */
export function referrerOrganizerOf(
  owned: Array<{id: string; data: OrganizerDocument}>,
  referredOrganizerId: string): {id: string; data: OrganizerDocument} | null {
  const live = owned.filter((item) => item.id !== referredOrganizerId &&
    isLiveOrganizer(item.data));
  live.sort((a, b) => (millisOf(a.data.createdAt) ?? Infinity) -
    (millisOf(b.data.createdAt) ?? Infinity) || a.id.localeCompare(b.id));
  return live[0] ?? null;
}

interface ReferralChoice {
  lead: ReferralLead;
  referrerOrganizerId: string;
}

/**
 * Picks the first valid referral among the linked leads, oldest first, or
 * the reason the first one failed.
 * @param {ReferralDeps} deps Firestore, clock and phone lookup.
 * @param {object} input Referred organizer, its owner and leads.
 * @return {Promise<ReferralChoice|ReferralSkipReason>} Choice or reason.
 */
async function chooseReferral(deps: ReferralDeps, input: {
  organizerId: string; organizer: OrganizerDocument; ownerUid: string;
  leads: ReferralLead[];
}): Promise<ReferralChoice | ReferralSkipReason> {
  const {db} = deps;
  let firstFailure: ReferralSkipReason | null = null;
  const fail = (reason: ReferralSkipReason) => {
    firstFailure ??= reason;
  };
  const referredOwnerPhone = await deps.phoneOf(input.ownerUid);
  const referredManagers = organizerManagerUserIds(input.organizer);
  for (const lead of input.leads) {
    if ((await db.collection("deletedUsers").doc(lead.referrerUid).get())
      .exists) {
      fail("referrerDeleted");
      continue;
    }
    const owned = await ownedOrganizersPage(db, lead.referrerUid, null, 20);
    const referrerOrganizer = referrerOrganizerOf(owned.organizers,
      input.organizerId);
    if (isSelfReferral({referrerUid: lead.referrerUid,
      referredOwnerUid: input.ownerUid, referredManagerUids: referredManagers,
      referrerOrganizerManagerUids: referrerOrganizer ?
        organizerManagerUserIds(referrerOrganizer.data) : [],
      referrerPhone: await deps.phoneOf(lead.referrerUid),
      leadPhone: lead.phone, referredOwnerPhone})) {
      fail("selfReferral");
      continue;
    }
    // Only an organizer can refer a host.
    if (!referrerOrganizer) {
      fail("referrerNotOrganizer");
      continue;
    }
    return {lead, referrerOrganizerId: referrerOrganizer.id};
  }
  return firstFailure ?? "noReferral";
}

/**
 * Attaches the host referral of one organizer, if it has a valid one, and
 * raises its trial to at least the referral days in the same transaction,
 * through the same per-organizer commercial terms override a founding place
 * uses (a new revision with its immutable revision record), so bills,
 * billing status and the cycle anchor read it like any override. A trial
 * already at least as long is left alone.
 * @param {ReferralDeps} deps Firestore, clock and phone lookup.
 * @param {object} input Referred organizer and what found it.
 * @return {Promise<ReferralAttachResult>} The referral, or why not.
 */
export async function attachOrganizerReferral(deps: ReferralDeps, input: {
  organizerId: string; source: OrganizerReferral["source"];
}): Promise<ReferralAttachResult> {
  const {db} = deps;
  const {organizerId} = input;
  const skip = (reason: ReferralSkipReason): ReferralAttachResult =>
    ({kind: "skip", reason});
  const referralRef = db.collection(organizerReferralsCollection)
    .doc(organizerId);
  const organizerRef = db.collection("organizers").doc(organizerId);
  const factsRef = db.collection(growthFactsCollection).doc(organizerId);
  if ((await referralRef.get()).exists) return skip("alreadyAttached");
  const organizer = (await organizerRef.get()).data() as
    OrganizerDocument | undefined;
  const ownerUid = organizer ? organizerOwnerUserId(organizer) : null;
  if (!organizer || !ownerUid ||
      !organizerHasOwner(organizer as unknown as Record<string, unknown>)) {
    return skip("notOwned");
  }
  if (isSynthetic(organizer)) return skip("synthetic");
  const intents = await db.collection("salesInboundIntents")
    .where("organizerId", "==", organizerId).limit(50).get();
  const leads = creditableReferralLeads(intents.docs.map((doc) =>
    ({id: doc.id, data: doc.data()})), organizerId);
  if (leads.length === 0) return skip("noReferral");
  const facts = (await factsRef.get()).data() as
    OrganizerGrowthFactsDocument | undefined;
  const nowMillis = deps.now();
  const inTime = leads.filter((lead) => referralInTime({
    trialStartMillis: trialStartMillis(facts),
    recordedAtMillis: lead.recordedAtMillis, nowMillis}));
  if (inTime.length === 0) return skip("trialStarted");
  const choice = await chooseReferral(deps, {organizerId, organizer,
    ownerUid, leads: inTime});
  if (typeof choice === "string") return skip(choice);

  const termsId = organizerCommercialTermsId(organizerId);
  const termsRef = db.collection(commercialTermsCollection).doc(termsId);
  const referrerRef = db.collection("organizers")
    .doc(choice.referrerOrganizerId);
  return db.runTransaction(async (tx) => {
    const [referralSnap, organizerSnap, referrerSnap, factsSnap] =
      await Promise.all([tx.get(referralRef), tx.get(organizerRef),
        tx.get(referrerRef), tx.get(factsRef)]);
    if (referralSnap.exists) return skip("alreadyAttached");
    const current = organizerSnap.data() as OrganizerDocument | undefined;
    const referrer = referrerSnap.data() as OrganizerDocument | undefined;
    const now = deps.now();
    // Whatever changed since the reads above is decided again next time.
    if (!current || organizerOwnerUserId(current) !== ownerUid || !referrer ||
        !isOrganizerOwner(referrer, choice.lead.referrerUid) ||
        !isLiveOrganizer(referrer)) {
      return skip("changed");
    }
    if (!referralInTime({trialStartMillis: trialStartMillis(factsSnap.data() as
      OrganizerGrowthFactsDocument | undefined),
    recordedAtMillis: choice.lead.recordedAtMillis, nowMillis: now})) {
      return skip("trialStarted");
    }
    // Every read happens before the first write.
    const stored = await readCommercialTerms({db, tx, organizerId});
    const effective = effectiveCommercialTerms(stored);
    const override = (stored.organizer?.terms ?? {}) as
      CommercialTermsOverride;
    const effectiveDays = effective?.trial.days ?? override.trial?.days ?? null;
    let termsChange: OrganizerReferral["commercialTerms"] = null;
    if (effectiveDays === null || effectiveDays < referralTrialDays) {
      const terms: CommercialTermsOverride = {...override,
        trial: {...(override.trial ?? {}), days: referralTrialDays}};
      if (stored.platform && !mergeCommercialTerms(
        stored.platform.terms as CommercialTerms, terms)) {
        throw new Error(`Referral trial does not merge for ${organizerId}.`);
      }
      const revision = (stored.organizer?.revision ?? 0) + 1;
      const reason = "Host referral from organizer " +
        `${choice.referrerOrganizerId}: ${referralTrialDays} free days.`;
      const next: CommercialTermsDocument = {
        schemaVersion: 1, scope: "organizer", organizerId, revision, terms,
        reason, updatedByUid: referralTermsActor, updatedAtMillis: now,
        lastMutationHash: createHash("sha256").update(JSON.stringify([
          "hostReferral", organizerId, choice.lead.intentId])).digest("hex"),
      };
      if (!validateCommercialTermsDocument(next)) {
        throw new Error(`Invalid referral trial terms for ${organizerId}.`);
      }
      const history: CommercialTermsRevisionDocument = {
        schemaVersion: 1, termsId, scope: "organizer", organizerId, revision,
        terms, reason, actorUid: referralTermsActor, createdAtMillis: now,
      };
      tx.set(termsRef, next);
      tx.create(db.collection(commercialTermsRevisionsCollection)
        .doc(commercialTermsRevisionId(termsId, revision)), history);
      termsChange = {termsId, revision,
        previousTrialDays: override.trial?.days ?? null};
    }
    const referral: OrganizerReferral = {
      schemaVersion: 1, referredOrganizerId: organizerId,
      referredOrganizerName: String(current.name ?? organizerId).slice(0, 160),
      referrerOrganizerId: choice.referrerOrganizerId,
      referrerUid: choice.lead.referrerUid,
      sourceIntentId: choice.lead.intentId,
      recordedAtMillis: choice.lead.recordedAtMillis, attachedAtMillis: now,
      source: input.source, trialDays: referralTrialDays,
      commercialTerms: termsChange,
      reward: {status: "pending", earnedAtMillis: null, earnedByBillId: null,
        appliedAtMillis: null, appliedBillId: null},
      updatedAtMillis: now,
    };
    if (!validateOrganizerReferralDocument(referral)) {
      throw new Error(`Invalid host referral for ${organizerId}.`);
    }
    tx.create(referralRef, referral);
    return {kind: "attached" as const,
      referrerOrganizerId: choice.referrerOrganizerId,
      sourceIntentId: choice.lead.intentId,
      trialDaysWritten: termsChange ? referralTrialDays : null};
  });
}

/**
 * Attaches a referral and logs the outcome. Most organizers have none, so
 * only attachments and refusals worth a look log.
 * @param {ReferralDeps} deps Firestore, clock and phone lookup.
 * @param {object} input Referred organizer and what found it.
 * @return {Promise<ReferralAttachResult>} The referral, or why not.
 */
export async function attachOrganizerReferralLogged(deps: ReferralDeps,
  input: Parameters<typeof attachOrganizerReferral>[1]):
  Promise<ReferralAttachResult> {
  const result = await attachOrganizerReferral(deps, input);
  if (result.kind === "attached") {
    logger.info("Host referral attached", {organizerId: input.organizerId,
      referrerOrganizerId: result.referrerOrganizerId,
      trialDaysWritten: result.trialDaysWritten, source: input.source});
  } else if (["trialStarted", "selfReferral", "referrerNotOrganizer",
    "referrerDeleted"].includes(result.reason)) {
    logger.info("Host referral not attached", {
      organizerId: input.organizerId, reason: result.reason,
      source: input.source});
  }
  return result;
}

/**
 * Attaches the referrals the ownership trigger missed or could not see yet:
 * organizers claimed in the last few days, and organizers a referral lead
 * was linked to in the last few days (staff can link a lead to an organizer
 * that already had an owner). Each attachment is its own idempotent
 * transaction.
 * @param {ReferralDeps} deps Firestore, clock and phone lookup.
 * @return {Promise<object>} Organizers checked and referrals attached.
 */
export async function reconcileOrganizerReferrals(deps: ReferralDeps):
  Promise<{checked: number; attached: number}> {
  const {db} = deps;
  const since = Timestamp.fromMillis(deps.now() -
    referralReconcileWindowDays * dayMillis);
  const [claimed, linked] = await Promise.all([
    db.collection(growthFactsCollection)
      .where("milestones.claimedAt", ">=", since)
      .orderBy("milestones.claimedAt")
      .limit(referralReconcileLimit).get(),
    db.collection("salesInboundIntents")
      .where("linkedAt", ">=", since).orderBy("linkedAt")
      .limit(referralReconcileLimit).get(),
  ]);
  const ids = new Set<string>(claimed.docs.map((doc) => doc.id));
  for (const doc of linked.docs) {
    const data = doc.data();
    if (data.leadKind === "referral" && typeof data.organizerId === "string" &&
        data.organizerId.length > 0) ids.add(data.organizerId);
  }
  if (ids.size === 0) return {checked: 0, attached: 0};
  const candidates = [...ids].sort();
  const existing = await Promise.all(candidates.map((id) =>
    db.collection(organizerReferralsCollection).doc(id).get()));
  let attached = 0;
  for (const [index, organizerId] of candidates.entries()) {
    if (existing[index].exists) continue;
    const result = await attachOrganizerReferralLogged(deps,
      {organizerId, source: "dailyReconcile"});
    if (result.kind === "attached") attached++;
  }
  return {checked: candidates.length, attached};
}

/**
 * Reads, inside the transaction that marks a bill paid, whether the bill's
 * organizer was referred by a host whose reward is still waiting for this
 * first payment, and returns the write that earns it. Called after every
 * other read of that transaction and applied after its writes are queued, as
 * the nominator credit is. Exactly once per referred organizer: only a
 * pending reward moves to earned.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction marking the bill paid.
 * @param {Bill} bill The bill as it will be stored, paid.
 * @param {number} nowMillis Now.
 * @return {Promise<Function>} Applies the reward write, if any.
 */
export async function prepareReferralReward(db: Db, tx: Tx, bill: Bill,
  nowMillis: number): Promise<() => OrganizerReferral | null> {
  const ref = db.collection(organizerReferralsCollection)
    .doc(bill.organizerId);
  const referral = (await tx.get(ref)).data() as OrganizerReferral | undefined;
  return () => {
    if (!referral || referral.reward.status !== "pending" ||
        bill.status !== "paid" || !(bill.paidMinor ?? bill.totalMinor)) {
      return null;
    }
    const next: OrganizerReferral = {...referral, reward: {...referral.reward,
      status: "earned", earnedAtMillis: nowMillis, earnedByBillId: bill.billId},
    updatedAtMillis: nowMillis};
    if (!validateOrganizerReferralDocument(next)) {
      throw new HttpsError("internal", "Invalid host referral reward.");
    }
    tx.set(ref, next);
    return next;
  };
}

/**
 * The query, read in a cycle bill's transaction, for the referrals a
 * referrer organizer made.
 * @param {Db} db Firestore.
 * @param {string} referrerOrganizerId Referrer organizer.
 * @return {FirebaseFirestore.Query} Its referrals.
 */
export function referralsByReferrerQuery(db: Db,
  referrerOrganizerId: string): FirebaseFirestore.Query {
  return db.collection(organizerReferralsCollection)
    .where("referrerOrganizerId", "==", referrerOrganizerId).limit(200);
}

/**
 * The reward a referrer's next bill uses: the oldest earned and not yet
 * applied, or null. Rewards stack, one per referred host; there is no cap.
 * @param {OrganizerReferral[]} referrals The referrer's referrals.
 * @return {OrganizerReferral|null} The reward to apply.
 */
export function nextEarnedReward(referrals: OrganizerReferral[]):
  OrganizerReferral | null {
  return referrals.filter((item) => item.reward.status === "earned")
    .sort((a, b) => (a.reward.earnedAtMillis ?? 0) -
      (b.reward.earnedAtMillis ?? 0) ||
      a.referredOrganizerId.localeCompare(b.referredOrganizerId))[0] ?? null;
}

/**
 * A referral with its reward applied to, or given back from, a bill.
 * @param {OrganizerReferral} referral The referral.
 * @param {string|null} billId The free bill, or null to give it back.
 * @param {number} nowMillis Now.
 * @return {OrganizerReferral} The referral to store.
 */
export function referralWithReward(referral: OrganizerReferral,
  billId: string | null, nowMillis: number): OrganizerReferral {
  const next: OrganizerReferral = {...referral, reward: {...referral.reward,
    status: billId ? "applied" : "earned",
    appliedAtMillis: billId ? nowMillis : null, appliedBillId: billId},
  updatedAtMillis: nowMillis};
  if (!validateOrganizerReferralDocument(next)) {
    throw new HttpsError("internal", "Invalid host referral reward.");
  }
  return next;
}

/**
 * The note a referrer's free bill carries, which Admin shows on the bill.
 * @param {OrganizerReferral} referral The referral whose reward it uses.
 * @return {string} History note.
 */
export function referralRewardNote(referral: Pick<OrganizerReferral,
  "referredOrganizerName" | "referredOrganizerId">): string {
  return `Free month: host referral reward for ${
    referral.referredOrganizerName || referral.referredOrganizerId}`
    .slice(0, 500);
}
