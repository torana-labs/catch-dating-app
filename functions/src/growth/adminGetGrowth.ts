import * as admin from "firebase-admin";
import {HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {organizerBillsCollection} from "../money/organizerBills";
import {nominatorCreditsCollection} from "../money/nominatorCredits";
import {platformCostsCollection} from "../money/platformCosts";
import {moneyRoles} from "../money/moneySettings";
import {checkRateLimit} from "../shared/rateLimit";
import type {
  NominatorCreditDocument,
  OrganizerBillDocument,
  OrganizerGrowthFactsDocument,
  PlatformCostDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminGetGrowthCallablePayload as Payload} from
  "../shared/generated/adminGetGrowthCallablePayload";
import type {AdminGetGrowthCallableResponse as Result} from
  "../shared/generated/adminGetGrowthCallableResponse";
import {validateAdminGetGrowthCallablePayload} from
  "../shared/generated/validators/adminGetGrowthInput";
import {validateAdminGetGrowthCallableResponse} from
  "../shared/generated/validators/adminGetGrowthOutput";
import {growthFactsCollection} from "./organizerGrowthFacts";
import {buildGrowth, setItselfUp, type SignupSource} from
  "./growthReadModel";
import {
  callableWithLimits,
  type CallableContext,
  type CallableSpec,
  runCallable,
} from "../platform/callables/callable";
import {adminRoles} from "../platform/callables/policies";
import type {AdminContext} from "../platform/adminAuth";

// Pre-launch volumes; a bounded read keeps one callable within its budget.
const readLimit = 10_000;

/**
 * Display names for documents in one collection, read in batches.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} collection Collection.
 * @param {string[]} ids Document ids.
 * @param {Function} pick Reads the name from a document.
 * @return {Promise<Map<string, string>>} Names by id.
 */
async function namesOf(db: FirebaseFirestore.Firestore, collection: string,
  ids: string[], pick: (data: Record<string, unknown>) => unknown):
  Promise<Map<string, string>> {
  const names = new Map<string, string>();
  for (let index = 0; index < ids.length; index += 100) {
    const refs = ids.slice(index, index + 100).map((id) =>
      db.collection(collection).doc(id));
    if (!refs.length) continue;
    for (const snap of await db.getAll(...refs)) {
      const value = pick(snap.data() ?? {});
      if (typeof value === "string" && value.trim()) {
        names.set(snap.id, value.trim());
      }
    }
  }
  return names;
}

/**
 * What organizers that set themselves up said in setup about how they heard
 * of Catch, read in batches with only that field.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string[]} ids Organizer ids.
 * @return {Promise<Map<string, SignupSource>>} Answers by organizer id.
 */
async function signupSourcesOf(db: FirebaseFirestore.Firestore,
  ids: string[]): Promise<Map<string, SignupSource>> {
  const answers = new Map<string, SignupSource>();
  for (let index = 0; index < ids.length; index += 100) {
    const refs = ids.slice(index, index + 100).map((id) =>
      db.collection("organizers").doc(id));
    if (!refs.length) continue;
    for (const snap of await db.getAll(...refs,
      {fieldMask: ["signupSource"]})) {
      const source = (snap.data()?.signupSource as
        {source?: unknown} | null | undefined)?.source;
      if (typeof source === "string") {
        answers.set(snap.id, source as SignupSource);
      }
    }
  }
  return answers;
}

/**
 * The owner reads Growth for a range.
 * Policy: moneyRoles (STR-10).
 * @return {CallableSpec} The callable.
 */
export function adminGetGrowthSpec():
  CallableSpec<Payload, AdminContext, Result> {
  return {
    name: "adminGetGrowth",
    policy: adminRoles(moneyRoles),
    input: validateAdminGetGrowthCallablePayload,
    handle: (context) => adminGetGrowthWork(context),
  };
}

/** The deployed path of adminGetGrowth, for tests. */
export function adminGetGrowthHandler(
  request: CallableRequest<unknown>):
  Promise<Result> {
  return runCallable(adminGetGrowthSpec(), request);
}

async function adminGetGrowthWork(
  {data, actor}: CallableContext<Payload, AdminContext>):
  Promise<Result> {
  const db = admin.firestore();
  await checkRateLimit(db, actor.uid, "adminGetGrowth",
    {maxRequests: 30, windowMs: 60 * 1000});
  const [factsSnap, billsSnap, creditsSnap, costsSnap, nominatorsSnap] =
    await Promise.all([
      db.collection(growthFactsCollection).limit(readLimit).get(),
      db.collection(organizerBillsCollection).limit(readLimit).get(),
      db.collection(nominatorCreditsCollection).limit(readLimit).get(),
      db.collection(platformCostsCollection)
        .where("category", "in", ["ads_meta", "ads_google"]).limit(500).get(),
      db.collection("supplyNominators").limit(1000).get(),
    ]);
  const facts = factsSnap.docs.map((doc) =>
    doc.data() as OrganizerGrowthFactsDocument);
  const bills = billsSnap.docs.map((doc) =>
    doc.data() as OrganizerBillDocument);
  const personNames = new Map<string, string>();
  for (const doc of nominatorsSnap.docs) {
    const {uid, displayName} = doc.data();
    if (typeof uid === "string" && typeof displayName === "string") {
      personNames.set(uid, displayName);
    }
  }
  const unnamedPeople = [...new Set(facts.flatMap((entry) =>
    entry.nominator ? [entry.nominator.uid] : []))]
    .filter((uid) => !personNames.has(uid));
  const billed = new Set(bills.map((bill) => bill.organizerId));
  const nominated = facts.filter((entry) => entry.nominator &&
    !billed.has(entry.organizerId)).map((entry) => entry.organizerId);
  const [users, organizerNames, signupSources] = await Promise.all([
    namesOf(db, "users", unnamedPeople, (user) =>
      user.displayName ?? user.name ?? user.firstName),
    namesOf(db, "organizers", nominated, (organizer) => organizer.name),
    signupSourcesOf(db, facts.filter(setItselfUp)
      .map((entry) => entry.organizerId)),
  ]);
  for (const [uid, name] of users) personNames.set(uid, name);
  const result = buildGrowth({range: data.range, nowMillis: Date.now(), facts,
    bills, credits: creditsSnap.docs.map((doc) =>
      doc.data() as NominatorCreditDocument),
    costs: costsSnap.docs.map((doc) => doc.data() as PlatformCostDocument),
    organizerNames, personNames, signupSources});
  if (!validateAdminGetGrowthCallableResponse(result)) {
    throw new HttpsError("internal", "Growth could not be read.");
  }
  return result;
}

export const adminGetGrowth = callableWithLimits(
  {timeoutSeconds: 120, maxInstances: 5, memory: "1GiB"},
  adminGetGrowthSpec());
