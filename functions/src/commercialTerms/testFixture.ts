import type {CommercialTermsDocument} from
  "../shared/generated/commercialTermsDocument";
import {
  organizerCommercialTermsId,
  type CommercialTerms,
  type CommercialTermsOverride,
} from "./terms";

/** The owner's 30 Oct decision, as test data (production reads Firestore). */
export function testCommercialTerms(atSource: Partial<Record<
  keyof CommercialTerms["purposes"], number>> = {}): CommercialTerms {
  const purpose = (key: keyof CommercialTerms["purposes"]) => ({
    countsTowardCommission: true, atSourceFeeBasisPoints: atSource[key] ?? 0,
  });
  return {
    currency: "INR",
    commission: {rateBasisPoints: 500, capMinor: 1_000_000, cycleDays: 30,
      cycleAnchor: "trialEnd", base: "netOfRefunds",
      taxTreatment: "exclusive"},
    trial: {days: 30, anchor: "firstEvent"},
    toolsOnly: {feeMinor: 500_000},
    gatewayFeeBearer: "host",
    purposes: {eventAdmission: purpose("eventAdmission"),
      formFee: purpose("formFee"), hostMembership: purpose("hostMembership")},
  };
}

export function platformTermsDocument(terms = testCommercialTerms(),
  revision = 1): CommercialTermsDocument {
  return {schemaVersion: 1, scope: "platform", organizerId: null, revision,
    terms, reason: "Owner decision 30 Oct", updatedByUid: "operator",
    updatedAtMillis: 1000, lastMutationHash: "a".repeat(64)};
}

export function organizerTermsDocument(organizerId: string,
  terms: CommercialTermsOverride, revision = 1): CommercialTermsDocument {
  return {schemaVersion: 1, scope: "organizer", organizerId, revision, terms,
    reason: "Negotiated pilot rate", updatedByUid: "operator",
    updatedAtMillis: 1000, lastMutationHash: "b".repeat(64)};
}

/** Firestore paths and documents for seeding an in-memory store. */
export function commercialTermsRecords(input: {
  platform?: CommercialTermsDocument | null;
  organizers?: CommercialTermsDocument[];
} = {}): Record<string, Record<string, unknown>> {
  const records: Record<string, Record<string, unknown>> = {};
  const platform = input.platform === undefined ? platformTermsDocument() :
    input.platform;
  if (platform) {
    records["commercialTerms/platform"] =
      platform as unknown as Record<string, unknown>;
  }
  for (const organizer of input.organizers ?? []) {
    records[`commercialTerms/${organizerCommercialTermsId(
      organizer.organizerId!)}`] =
      organizer as unknown as Record<string, unknown>;
  }
  return records;
}
