import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import type {HostMembershipPlanDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {ManageHostMembershipPlansCallablePayload as Payload} from
  "../shared/generated/manageHostMembershipPlansCallablePayload";
import type {ManageHostMembershipPlansCallableResponse as Response} from
  "../shared/generated/manageHostMembershipPlansCallableResponse";
import {validateHostMembershipPlanDocument} from
  "../shared/generated/validators/hostMembershipPlanDocument";
import {validateManageHostMembershipPlansCallablePayload} from
  "../shared/generated/validators/manageHostMembershipPlansInput";
import {validateManageHostMembershipPlansCallableResponse} from
  "../shared/generated/validators/manageHostMembershipPlansOutput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {
  defaultHostMembershipCallableDeps,
  type HostMembershipCallableDeps,
} from "./callableDeps";
import {maxPlansPerOrganizer} from "./entitlementReader";
import {newHostMembershipPlanId} from "./ids";
import {collections, readPlan, readProgram} from "./membershipStore";

type Draft = Extract<Payload, {action: "save"}>["plan"];
type Interval = "monthly" | "annual";
const intervals: readonly Interval[] = ["monthly", "annual"];

function invalid(message: string): never {
  throw new HttpsError("invalid-argument", message);
}

/** Trims text and rejects shapes the schema cannot express. */
export function normalizePlanDraft(draft: Draft): Draft {
  const name = draft.name.trim();
  if (!name) invalid("Give the plan a name.");
  const types = draft.benefits.map((benefit) => benefit.type);
  if (new Set(types).size !== types.length) {
    invalid("Each benefit can be added once.");
  }
  const perks = draft.perks.map((perk) => perk.trim());
  if (perks.some((perk) => !perk)) invalid("Perks cannot be empty.");
  return {...draft, name, description: draft.description.trim(), perks};
}

async function listPlans(db: FirebaseFirestore.Firestore,
  organizerId: string): Promise<Response["plans"]> {
  const snap = await db.collection(collections.plans)
    .where("organizerId", "==", organizerId)
    .limit(maxPlansPerOrganizer + 1).get();
  const plans: Response["plans"] = [];
  for (const doc of snap.docs) {
    const plan = doc.data();
    if (!validateHostMembershipPlanDocument(plan)) {
      throw new HttpsError("internal", "Invalid membership plan.");
    }
    const prices: Response["plans"][number]["prices"] = {};
    for (const interval of intervals) {
      const price = plan.prices[interval];
      if (price) {
        prices[interval] = {amountPaise: price.amountPaise,
          revision: price.revision};
      }
    }
    plans.push({planId: doc.id, organizerId: plan.organizerId,
      name: plan.name, description: plan.description, status: plan.status,
      prices, memberCap: plan.memberCap, trialDays: plan.trialDays,
      benefits: plan.benefits, perks: plan.perks, limits: plan.limits,
      activeMemberCount: plan.activeMemberCount, sortOrder: plan.sortOrder,
      revision: plan.revision, publishedAtMillis: plan.publishedAtMillis});
  }
  return plans.sort((a, b) => a.sortOrder - b.sortOrder ||
    a.name.localeCompare(b.name)).slice(0, maxPlansPerOrganizer);
}

/**
 * Creates any missing provider price for a plan. Provider plans are
 * immutable, so a changed amount gets a new provider price while existing
 * subscriptions keep the one they bought.
 */
export async function ensureProviderPrices(deps: HostMembershipCallableDeps,
  planId: string): Promise<void> {
  const db = deps.db();
  const ref = db.collection(collections.plans).doc(planId);
  const plan = (await ref.get()).data();
  if (!validateHostMembershipPlanDocument(plan)) {
    throw new HttpsError("not-found", "Plan not found.");
  }
  const missing = intervals.filter((interval) => plan.prices[interval] &&
    !plan.prices[interval]!.providerPriceIds.razorpay);
  if (missing.length === 0) return;
  const config = await deps.config();
  const provider = deps.provider(config);
  for (const interval of missing) {
    const price = plan.prices[interval]!;
    const {providerPriceId} = await provider.createPrice({
      catchPlanId: planId, organizerId: plan.organizerId, name: plan.name,
      interval, amountPaise: price.amountPaise, revision: price.revision,
      catchProject: deps.catchProject()});
    await db.runTransaction(async (tx) => {
      const current = await readPlan(db, tx, planId);
      const currentPrice = current?.prices[interval];
      // A concurrent edit changed the price; its own publish creates it.
      if (!currentPrice || currentPrice.revision !== price.revision ||
          currentPrice.providerPriceIds.razorpay) return;
      tx.update(ref, {
        [`prices.${interval}.providerPriceIds.razorpay`]: providerPriceId});
    });
  }
}

function pricesFor(draft: Draft, existing: HostMembershipPlanDocument | null):
  HostMembershipPlanDocument["prices"] {
  const prices: HostMembershipPlanDocument["prices"] = {};
  for (const interval of intervals) {
    const amount = draft.prices[interval]?.amountPaise;
    if (amount === undefined) continue;
    const prior = existing?.prices[interval];
    prices[interval] = prior && prior.amountPaise === amount ? prior :
      {amountPaise: amount, providerPriceIds: {},
        revision: (prior?.revision ?? 0) + 1};
  }
  return prices;
}

/** Organizer managers list, save, publish and archive membership plans. */
export async function manageHostMembershipPlansHandler(
  request: CallableRequest<unknown>,
  deps: HostMembershipCallableDeps = defaultHostMembershipCallableDeps,
): Promise<Response> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<Payload>(request,
    validateManageHostMembershipPlansCallablePayload);
  const db = deps.db();
  await deps.checkRateLimit(db, uid, "manageHostMembershipPlans", {
    maxRequests: 30, windowMs: 60 * 1000});
  await deps.requireManager({db, organizerId: data.organizerId,
    actorUid: uid});
  const nowMillis = deps.nowMillis();
  let publishPlanId: string | null = null;

  if (data.action === "save") {
    const draft = normalizePlanDraft(data.plan);
    publishPlanId = await db.runTransaction(async (tx) => {
      const planId = data.planId ?? newHostMembershipPlanId();
      const ref = db.collection(collections.plans).doc(planId);
      const existing = data.planId ? await readPlan(db, tx, planId) : null;
      if (data.planId === null) {
        const count = await tx.get(db.collection(collections.plans)
          .where("organizerId", "==", data.organizerId)
          .limit(maxPlansPerOrganizer));
        if (count.size >= maxPlansPerOrganizer) {
          throw new HttpsError("resource-exhausted",
            `An organizer can have up to ${maxPlansPerOrganizer} plans.`);
        }
      } else if (!existing || existing.organizerId !== data.organizerId) {
        throw new HttpsError("not-found", "Plan not found.");
      } else if (existing.revision !== data.expectedRevision) {
        throw new HttpsError("aborted",
          "This plan changed. Reload it before saving.");
      } else if (existing.status === "archived") {
        throw new HttpsError("failed-precondition",
          "Archived plans cannot be edited.");
      }
      const plan: HostMembershipPlanDocument = {
        schemaVersion: 1, organizerId: data.organizerId, name: draft.name,
        description: draft.description, status: existing?.status ?? "draft",
        prices: pricesFor(draft, existing), memberCap: draft.memberCap,
        trialDays: draft.trialDays, benefits: draft.benefits,
        perks: draft.perks, limits: draft.limits,
        activeMemberCount: existing?.activeMemberCount ?? 0,
        sortOrder: draft.sortOrder, revision: (existing?.revision ?? 0) + 1,
        createdAtMillis: existing?.createdAtMillis ?? nowMillis,
        updatedAtMillis: nowMillis,
        publishedAtMillis: existing?.publishedAtMillis ?? null,
      };
      if (!validateHostMembershipPlanDocument(plan)) {
        invalid("This plan is not valid.");
      }
      tx.set(ref, plan);
      return plan.status === "published" ? planId : null;
    });
  } else if (data.action === "publish" || data.action === "archive") {
    const action = data.action;
    publishPlanId = await db.runTransaction(async (tx) => {
      const ref = db.collection(collections.plans).doc(data.planId);
      const [plan, program] = await Promise.all([
        readPlan(db, tx, data.planId),
        readProgram(db, tx, data.organizerId),
      ]);
      if (!plan || plan.organizerId !== data.organizerId) {
        throw new HttpsError("not-found", "Plan not found.");
      }
      if (action === "archive") {
        if (plan.status !== "archived") {
          tx.update(ref, {status: "archived", revision: plan.revision + 1,
            updatedAtMillis: nowMillis});
        }
        return null;
      }
      if (!program || program.state !== "enabled") {
        throw new HttpsError("failed-precondition",
          "Enable memberships before publishing a plan.");
      }
      if (plan.status === "archived") {
        throw new HttpsError("failed-precondition",
          "Archived plans cannot be published.");
      }
      if (plan.status === "draft") {
        tx.update(ref, {status: "published", revision: plan.revision + 1,
          updatedAtMillis: nowMillis, publishedAtMillis: nowMillis});
      }
      return data.planId;
    });
  }
  if (publishPlanId) await ensureProviderPrices(deps, publishPlanId);

  const response: Response = {organizerId: data.organizerId,
    plans: await listPlans(db, data.organizerId)};
  if (!validateManageHostMembershipPlansCallableResponse(response)) {
    throw new HttpsError("internal", "Invalid membership plans.");
  }
  return response;
}

export const manageHostMembershipPlans = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60,
    maxInstances: 20}),
  (request) => manageHostMembershipPlansHandler(request));
