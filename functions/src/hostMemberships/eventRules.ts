import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import type {
  EventDocument,
  EventMembershipRulesDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ManageEventMembershipRulesCallablePayload as Payload} from
  "../shared/generated/manageEventMembershipRulesCallablePayload";
import type {ManageEventMembershipRulesCallableResponse as Response} from
  "../shared/generated/manageEventMembershipRulesCallableResponse";
import {validateEventMembershipRulesDocument} from
  "../shared/generated/validators/eventMembershipRulesDocument";
import {validateHostMembershipPlanDocument} from
  "../shared/generated/validators/hostMembershipPlanDocument";
import {validateManageEventMembershipRulesCallablePayload} from
  "../shared/generated/validators/manageEventMembershipRulesInput";
import {validateManageEventMembershipRulesCallableResponse} from
  "../shared/generated/validators/manageEventMembershipRulesOutput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  defaultHostMembershipCallableDeps,
  type HostMembershipCallableDeps,
} from "./callableDeps";
import {planHasBenefit, type PlanBenefit} from "./entitlement";
import {maxPlansPerOrganizer, planFacts} from "./entitlementReader";
import {collections, readValid} from "./membershipStore";

const hourMillis = 60 * 60 * 1000;
type Save = Extract<Payload, {action: "save"}>;

function invalid(message: string): never {
  throw new HttpsError("invalid-argument", message);
}

/**
 * Early access is anchored when first enabled (events have no sale-start
 * field); changing the hours recomputes from the same anchor.
 */
export function earlyAccessWindow(params: {
  hours: number | null;
  existing: EventMembershipRulesDocument["earlyAccess"] | null;
  nowMillis: number;
  eventStartMillis: number;
}): EventMembershipRulesDocument["earlyAccess"] {
  if (params.hours === null) return null;
  const anchorMillis = params.existing?.anchorMillis ?? params.nowMillis;
  const generalSaleOpensAtMillis = anchorMillis + params.hours * hourMillis;
  if (generalSaleOpensAtMillis >= params.eventStartMillis) {
    invalid("General sale must open before the event starts.");
  }
  return {hours: params.hours, anchorMillis, generalSaleOpensAtMillis};
}

export function validateRulesAgainstPlans(save: Pick<Save,
  "memberPriceOverrides" | "membersOnly" | "earlyAccessHours">,
plans: Array<{planId: string; status: string; benefits: PlanBenefit[]}>):
  void {
  const usable = plans.filter((plan) => plan.status !== "archived");
  const ids = save.memberPriceOverrides.map((entry) => entry.planId);
  if (new Set(ids).size !== ids.length) {
    invalid("Set one member price per plan.");
  }
  if (ids.some((id) => !usable.some((plan) => plan.planId === id))) {
    invalid("Member prices must use this organizer's plans.");
  }
  for (const entry of save.memberPriceOverrides) {
    if ("priceInPaise" in entry && entry.priceInPaise > 0 &&
        entry.priceInPaise < 100) {
      invalid("A member price must be free or at least ₹1.");
    }
  }
  if (save.membersOnly &&
      !usable.some((plan) => planHasBenefit(plan, "membersOnlyAccess"))) {
    invalid("Add members-only access to a plan before limiting the event.");
  }
  if (save.earlyAccessHours !== null &&
      !usable.some((plan) => planHasBenefit(plan, "earlyAccess"))) {
    invalid("Add early access to a plan before enabling it here.");
  }
}

/** Organizer managers read and edit one event's paid-membership rules. */
export async function manageEventMembershipRulesHandler(
  request: CallableRequest<unknown>,
  deps: HostMembershipCallableDeps = defaultHostMembershipCallableDeps,
): Promise<Response> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<Payload>(request,
    validateManageEventMembershipRulesCallablePayload);
  const db = deps.db();
  await deps.checkRateLimit(db, uid, "manageEventMembershipRules", {
    maxRequests: 30, windowMs: 60 * 1000});
  const eventRef = db.collection("events").doc(data.eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) throw new HttpsError("not-found", "Event not found.");
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const organizerId = event.organizerId ?? event.clubId;
  await deps.requireManager({db, organizerId, actorUid: uid});
  const nowMillis = deps.nowMillis();
  const rulesRef = db.collection(collections.eventRules).doc(data.eventId);

  const result = await db.runTransaction(async (tx) => {
    const [existing, planSnap] = await Promise.all([
      readValid(tx, rulesRef, validateEventMembershipRulesDocument),
      tx.get(db.collection(collections.plans)
        .where("organizerId", "==", organizerId)
        .limit(maxPlansPerOrganizer)),
    ]);
    const plans = planSnap.docs.flatMap((doc) => {
      const plan = doc.data();
      return validateHostMembershipPlanDocument(plan) ?
        [planFacts(doc.id, plan)] : [];
    });
    let rules = existing;
    if (data.action === "clear") {
      if (existing) tx.delete(rulesRef);
      rules = null;
    } else if (data.action === "save") {
      if (existing && existing.revision !== data.expectedRevision ||
          !existing && data.expectedRevision !== null) {
        throw new HttpsError("aborted",
          "These rules changed. Reload them before saving.");
      }
      validateRulesAgainstPlans(data, plans);
      rules = {schemaVersion: 1, organizerId, eventId: data.eventId,
        memberPriceOverrides: data.memberPriceOverrides,
        earlyAccess: earlyAccessWindow({hours: data.earlyAccessHours,
          existing: existing?.earlyAccess ?? null, nowMillis,
          eventStartMillis: event.startTime.toMillis()}),
        membersOnly: data.membersOnly,
        revision: (existing?.revision ?? 0) + 1, updatedAtMillis: nowMillis,
        updatedBy: uid};
      if (!validateEventMembershipRulesDocument(rules)) {
        invalid("These membership rules are not valid.");
      }
      tx.set(rulesRef, rules);
    }
    return {rules, plans};
  });
  const response: Response = {eventId: data.eventId, organizerId,
    rules: result.rules ? {
      memberPriceOverrides: result.rules.memberPriceOverrides,
      earlyAccessHours: result.rules.earlyAccess?.hours ?? null,
      generalSaleOpensAtMillis:
        result.rules.earlyAccess?.generalSaleOpensAtMillis ?? null,
      membersOnly: result.rules.membersOnly,
      revision: result.rules.revision} : null,
    plans: result.plans.filter((plan) => plan.status !== "archived")
      .map((plan) => ({planId: plan.planId, name: plan.name,
        status: plan.status, benefits: plan.benefits}))};
  if (!validateManageEventMembershipRulesCallableResponse(response)) {
    throw new HttpsError("internal", "Invalid membership rules.");
  }
  return response;
}

export const manageEventMembershipRules = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60,
    maxInstances: 20}),
  (request) => manageEventMembershipRulesHandler(request));
