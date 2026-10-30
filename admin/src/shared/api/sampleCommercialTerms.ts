import type {AdminListCommercialTermsCallablePayload} from
  "../../generated/contracts/adminListCommercialTermsCallablePayload";
import type {AdminListCommercialTermsCallableResponse} from
  "../../generated/contracts/adminListCommercialTermsCallableResponse";
import type {CommercialTerms} from "../../generated/contracts/commercialTerms";
import type {CommercialTermsOverride} from
  "../../generated/contracts/commercialTermsOverride";
import type {ManageCommercialTermsCallablePayload} from
  "../../generated/contracts/manageCommercialTermsCallablePayload";
import type {ManageCommercialTermsCallableResponse} from
  "../../generated/contracts/manageCommercialTermsCallableResponse";
import type {ManagePaymentRoutingPolicyCallablePayload} from
  "../../generated/contracts/managePaymentRoutingPolicyCallablePayload";
import type {ManagePaymentRoutingPolicyCallableResponse} from
  "../../generated/contracts/managePaymentRoutingPolicyCallableResponse";

/**
 * Sample-mode stand-ins for the commercial terms and payment routing
 * callables. They keep the same revision and replay rules as the server so
 * sample walkthroughs and Storybook show real conflicts, never real data.
 */
interface SampleTermsRecord {
  revision: number;
  terms: CommercialTerms | CommercialTermsOverride;
  reason: string;
  updatedAtMillis: number;
}
interface SampleRevision extends SampleTermsRecord {actorUid: string}

const sampleOrganizers = [
  {organizerId: "sample-run-club", organizerName: "Bandra Sunrise Runners",
    cityName: "Mumbai"},
  {organizerId: "sample-supper-club", organizerName: "Indiranagar Supper Club",
    cityName: "Bengaluru"},
  {organizerId: "sample-quiz-night", organizerName: "Quiz Night Collective",
    cityName: "Mumbai"},
];
const terms = new Map<string, SampleTermsRecord>();
const history = new Map<string, SampleRevision[]>();
let routing: ManagePaymentRoutingPolicyCallableResponse = {
  policyId: "app", organizerId: null, revision: 1,
  formFee: {route: "razorpayOAuth", mode: "test", currency: "INR",
    merchantCountry: "IN"},
  eventAdmission: {route: "razorpayOAuth", mode: "test", currency: "INR",
    merchantCountry: "IN"},
  hostMembership: null, updatedAtMillis: Date.UTC(2026, 9, 20, 9),
};

const scopeKey = (organizerId: string | null) => organizerId ?? "platform";
const sampleTermsId = (organizerId: string | null) => organizerId === null ?
  "platform" : `org_${Array.from(organizerId).map((character) =>
    character.charCodeAt(0).toString(16)).join("").padEnd(64, "0")
    .slice(0, 64)}`;
const nameOf = (organizerId: string) => sampleOrganizers.find((entry) =>
  entry.organizerId === organizerId)?.organizerName ?? null;

function merge(platform: CommercialTerms,
  override: CommercialTermsOverride | null): CommercialTerms {
  const o = override ?? {};
  const purpose = (key: keyof CommercialTerms["purposes"]) => ({
    ...platform.purposes[key], ...(o.purposes?.[key] ?? {})});
  return {currency: platform.currency,
    commission: {...platform.commission, ...(o.commission ?? {})},
    trial: {...platform.trial, ...(o.trial ?? {})},
    toolsOnly: {...platform.toolsOnly, ...(o.toolsOnly ?? {})},
    gatewayFeeBearer: o.gatewayFeeBearer ?? platform.gatewayFeeBearer,
    purposes: {eventAdmission: purpose("eventAdmission"),
      formFee: purpose("formFee"), hostMembership: purpose("hostMembership")}};
}

export function sampleListCommercialTerms(
  payload: AdminListCommercialTermsCallablePayload
): AdminListCommercialTermsCallableResponse {
  const platform = terms.get("platform") ?? null;
  const organizer = payload.organizerId === null ? null :
    terms.get(payload.organizerId) ?? null;
  const query = payload.organizerQuery?.trim().toLowerCase() ?? "";
  const record = (value: SampleTermsRecord | null) => value && {
    revision: value.revision, terms: structuredClone(value.terms),
    reason: value.reason, updatedByUid: "sample-operator",
    updatedAtMillis: value.updatedAtMillis};
  const revisions = history.get(scopeKey(payload.organizerId)) ?? [];
  return structuredClone({
    termsId: sampleTermsId(payload.organizerId),
    organizerId: payload.organizerId,
    organizerName: payload.organizerId === null ? null :
      nameOf(payload.organizerId),
    platform: record(platform) as AdminListCommercialTermsCallableResponse["platform"],
    organizer: record(organizer) as AdminListCommercialTermsCallableResponse["organizer"],
    effectiveTerms: platform ? merge(platform.terms as CommercialTerms,
      (organizer?.terms ?? null) as CommercialTermsOverride | null) : null,
    history: [...revisions].reverse().slice(0, 20).map((entry) => ({
      revision: entry.revision, terms: entry.terms, reason: entry.reason,
      actorUid: entry.actorUid, createdAtMillis: entry.updatedAtMillis})),
    historyComplete: revisions.length <= 20,
    overrides: [...terms.entries()].filter(([key]) => key !== "platform")
      .map(([organizerId, value]) => ({organizerId,
        organizerName: nameOf(organizerId), revision: value.revision,
        terms: value.terms as CommercialTermsOverride, reason: value.reason,
        updatedAtMillis: value.updatedAtMillis}))
      .sort((left, right) => right.updatedAtMillis - left.updatedAtMillis),
    overridesComplete: true,
    organizerMatches: query ? sampleOrganizers.filter((entry) =>
      `${entry.organizerName} ${entry.cityName}`.toLowerCase()
        .includes(query)) : [],
  });
}

export function sampleManageCommercialTerms(
  payload: ManageCommercialTermsCallablePayload
): ManageCommercialTermsCallableResponse {
  const key = scopeKey(payload.organizerId);
  const before = terms.get(key) ?? null;
  if (payload.action === "replace") {
    if ((before?.revision ?? 0) !== payload.expectedRevision) {
      throw new Error("Commercial terms changed. Review them again.");
    }
    if (payload.organizerId !== null && !terms.has("platform")) {
      throw new Error("Save the platform terms before an organizer override.");
    }
    const next: SampleTermsRecord = {revision: (before?.revision ?? 0) + 1,
      terms: structuredClone(payload.terms!), reason: payload.reason!.trim(),
      updatedAtMillis: Date.now()};
    terms.set(key, next);
    history.set(key, [...(history.get(key) ?? []),
      {...next, actorUid: "sample-operator"}]);
  }
  const record = terms.get(key) ?? null;
  const platform = terms.get("platform") ?? null;
  return structuredClone({termsId: sampleTermsId(payload.organizerId),
    organizerId: payload.organizerId, revision: record?.revision ?? 0,
    terms: record?.terms ?? null, reason: record?.reason ?? null,
    updatedAtMillis: record?.updatedAtMillis ?? null,
    effectiveTerms: platform ? merge(platform.terms as CommercialTerms,
      payload.organizerId === null ? null :
        (record?.terms ?? null) as CommercialTermsOverride | null) : null,
    platformRevision: platform?.revision ?? 0});
}

export function sampleManagePaymentRoutingPolicy(
  payload: ManagePaymentRoutingPolicyCallablePayload
): ManagePaymentRoutingPolicyCallableResponse {
  if (payload.organizerId !== null) {
    throw new Error("Sample data has no organizer payment overrides.");
  }
  if (payload.action === "replace") {
    if (payload.expectedRevision !== routing.revision) {
      throw new Error("Payment settings changed. Review them again.");
    }
    routing = {...routing, revision: routing.revision + 1,
      formFee: payload.formFee, eventAdmission: payload.eventAdmission,
      hostMembership: payload.hostMembership === undefined ?
        routing.hostMembership : payload.hostMembership,
      updatedAtMillis: Date.now()};
  }
  return structuredClone(routing);
}
