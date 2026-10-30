import {createHash} from "node:crypto";
import type {CommercialTerms} from "../shared/generated/commercialTerms";
import type {CommercialTermsOverride} from
  "../shared/generated/commercialTermsOverride";
import type {CommercialTermsSnapshot} from
  "../shared/generated/commercialTermsSnapshot";
import {validateCommercialTerms} from
  "../shared/generated/validators/commercialTerms";

export type {CommercialTerms, CommercialTermsOverride, CommercialTermsSnapshot};
export type CommercialTermsPurpose = CommercialTermsSnapshot["purpose"];
export type MoneyFlow = CommercialTermsSnapshot["moneyFlow"];

export const platformCommercialTermsId = "platform";
export const commercialTermsCollection = "commercialTerms";
export const commercialTermsRevisionsCollection = "commercialTermsRevisions";

/** Hashed ids avoid organizer-id path interpretation, like routing policies. */
export function organizerCommercialTermsId(organizerId: string): string {
  return `org_${createHash("sha256").update(organizerId).digest("hex")}`;
}

export function commercialTermsRevisionId(termsId: string, revision: number):
  string {
  return `${termsId}_r${revision}`;
}

/**
 * Money flow is the payment route the routing policy selected; terms never
 * restate it. A route that is not listed here has no implementation yet.
 */
export function moneyFlowForRoute(route: string): MoneyFlow | null {
  switch (route) {
  case "razorpayOAuth":
  case "stripeConnectDirect":
    return "hostCollected";
  case "razorpayRoute":
  case "stripeConnectDestination":
    return "platformSplit";
  default:
    return null;
  }
}

/**
 * Applies a sparse organizer override to complete platform terms. A present
 * key wins, including an explicit null cap; an absent key inherits. Returns
 * null when the merged result is not a valid complete set of terms.
 */
export function mergeCommercialTerms(platform: CommercialTerms,
  override: CommercialTermsOverride | null): CommercialTerms | null {
  const o = override ?? {};
  const purpose = (key: keyof CommercialTerms["purposes"]) => ({
    ...platform.purposes[key], ...(o.purposes?.[key] ?? {}),
  });
  const merged: CommercialTerms = {
    currency: platform.currency,
    commission: {...platform.commission, ...(o.commission ?? {})},
    trial: {...platform.trial, ...(o.trial ?? {})},
    toolsOnly: {...platform.toolsOnly, ...(o.toolsOnly ?? {})},
    gatewayFeeBearer: o.gatewayFeeBearer ?? platform.gatewayFeeBearer,
    purposes: {
      eventAdmission: purpose("eventAdmission"),
      formFee: purpose("formFee"),
      hostMembership: purpose("hostMembership"),
    },
  };
  return validateCommercialTerms(merged) ? merged : null;
}

/** Freezes one purpose's effective terms for a payment or charge record. */
export function snapshotCommercialTerms(input: {
  terms: CommercialTerms; purpose: CommercialTermsPurpose;
  organizerId: string; moneyFlow: MoneyFlow; platformRevision: number;
  organizerRevision: number; nowMillis: number;
}): CommercialTermsSnapshot {
  const {terms} = input;
  return {
    version: 1, purpose: input.purpose, organizerId: input.organizerId,
    platformRevision: input.platformRevision,
    organizerRevision: input.organizerRevision,
    moneyFlow: input.moneyFlow,
    merchantOfRecord: input.moneyFlow === "hostCollected" ? "host" :
      "platform",
    currency: terms.currency,
    commission: {...terms.commission},
    trial: {...terms.trial},
    toolsOnly: {...terms.toolsOnly},
    gatewayFeeBearer: terms.gatewayFeeBearer,
    purposeTerms: {...terms.purposes[input.purpose]},
    resolvedAtMillis: input.nowMillis,
  };
}

/**
 * The amount Catch keeps from one payment at source. Only a platformSplit
 * flow deducts anything; a hostCollected payment is billed through the
 * commission statement instead.
 */
export function atSourceFeeMinor(snapshot: CommercialTermsSnapshot,
  amountMinor: number): number {
  if (snapshot.moneyFlow !== "platformSplit") return 0;
  return Math.floor(amountMinor *
    snapshot.purposeTerms.atSourceFeeBasisPoints / 10000);
}

/** Canonical comparison for snapshot equality checks between ledgers. */
export function commercialTermsSnapshotsEqual(
  left: CommercialTermsSnapshot | undefined,
  right: CommercialTermsSnapshot | undefined): boolean {
  return canonical(left) === canonical(right);
}

function canonical(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return `{${entries.map(([key, entry]) =>
    `${JSON.stringify(key)}:${canonical(entry)}`).join(",")}}`;
}
