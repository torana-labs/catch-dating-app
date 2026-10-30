import {describe, expect, it} from "vitest";
import type {CommercialTerms} from "../../../generated/contracts/commercialTerms";
import {ownerDecisionCommercialTerms} from "../../../shared/domain/commercialTermsDecision";
import {
  draftFromOverride,
  draftFromTerms,
  formatTermsValue,
  overrideFromDraft,
  overrideTermsDiff,
  parseTermsField,
  platformTermsDiff,
  revisionChanges,
  termsFromDraft,
  termsSummaryRows,
} from "./commercialTermsForm";

const owner = ownerDecisionCommercialTerms as CommercialTerms;

describe("commercial terms form", () => {
  it("encodes the owner's 30 Oct decision exactly", () => {
    expect(owner).toEqual({
      currency: "INR",
      commission: {rateBasisPoints: 500, capMinor: 1_000_000, cycleDays: 30,
        cycleAnchor: "trialEnd", base: "netOfRefunds", taxTreatment: "exclusive"},
      trial: {days: 30, anchor: "firstEvent"},
      toolsOnly: {feeMinor: 500_000},
      gatewayFeeBearer: "host",
      purposes: {
        eventAdmission: {countsTowardCommission: true, atSourceFeeBasisPoints: 0},
        formFee: {countsTowardCommission: true, atSourceFeeBasisPoints: 0},
        hostMembership: {countsTowardCommission: true, atSourceFeeBasisPoints: 0},
      },
    });
  });

  it("round-trips platform terms through operator text", () => {
    const draft = draftFromTerms(owner);
    expect(draft).toMatchObject({rate: "5", cap: "10000", toolsOnlyFee: "5000",
      trialDays: "30", "hostMembership.counts": "yes", "formFee.atSource": "0"});
    expect(termsFromDraft(draft)).toEqual({errors: [], terms: owner});
  });

  it("reads rupees, percentages and an empty cap", () => {
    expect(parseTermsField("rate", "4.5")).toEqual({value: 450});
    expect(parseTermsField("cap", "₹12,500.50")).toEqual({value: 1_250_050});
    expect(parseTermsField("cap", "")).toEqual({value: null});
    expect(parseTermsField("toolsOnlyFee", "")).toHaveProperty("error");
    expect(parseTermsField("rate", "101")).toHaveProperty("error");
    expect(parseTermsField("eventAdmission.atSource", "100")).toHaveProperty("error");
    expect(parseTermsField("cycleDays", "0")).toHaveProperty("error");
    expect(parseTermsField("trialDays", "0")).toEqual({value: 0});
    expect(termsFromDraft({...draftFromTerms(owner), rate: "five"}).errors)
      .toEqual(["Commission rate must be a percentage from 0 to 100."]);
  });

  it("formats values the way an operator reads them", () => {
    expect(formatTermsValue("rate", 450)).toBe("4.5%");
    expect(formatTermsValue("cap", null)).toBe("No cap");
    expect(formatTermsValue("cap", 1_000_000)).toBe("₹10,000");
    expect(formatTermsValue("taxTreatment", "exclusive")).toBe("Before GST");
    expect(formatTermsValue("hostMembership.counts", false)).toBe("Does not count");
  });

  it("previews only what changes against the current revision", () => {
    const next = {...owner, commission: {...owner.commission, rateBasisPoints: 450}};
    const changed = platformTermsDiff(owner, next).filter((row) => row.changed);
    expect(changed).toEqual([{id: "rate", field: "Commission rate",
      before: "5%", after: "4.5%", changed: true}]);
    expect(platformTermsDiff(null, owner).every((row) =>
      row.changed && row.before === "Not set")).toBe(true);
  });

  it("keeps an override sparse and shows inherited terms", () => {
    const draft = {rate: "3", cap: "", "formFee.counts": "no"};
    const result = overrideFromDraft(draft);
    expect(result).toEqual({errors: [], terms: {commission: {rateBasisPoints: 300,
      capMinor: null}, purposes: {formFee: {countsTowardCommission: false}}}});
    expect(draftFromOverride(result.terms)).toEqual(draft);
    expect(overrideFromDraft({})).toEqual({errors: [], terms: {}});
    const rows = termsSummaryRows(owner, result.terms, "organizer");
    expect(rows.find((row) => row.id === "rate")).toMatchObject({value: "3%", inherited: false});
    expect(rows.find((row) => row.id === "cap")).toMatchObject({value: "No cap", inherited: false});
    expect(rows.find((row) => row.id === "trialDays")).toMatchObject({
      value: "Inherited (30 days)", inherited: true});
  });

  it("previews an override against what the organizer inherits", () => {
    const diff = overrideTermsDiff(owner, null, {trial: {days: 60}})
      .filter((row) => row.changed);
    expect(diff).toEqual([{id: "trialDays", field: "Trial",
      before: "Inherited (30 days)", after: "60 days", changed: true}]);
    const removed = overrideTermsDiff(owner, {trial: {days: 60}}, {})
      .filter((row) => row.changed);
    expect(removed[0]).toMatchObject({before: "60 days", after: "Inherited (30 days)"});
  });

  it("names the terms that changed between revisions", () => {
    expect(revisionChanges("platform", owner, {...owner, gatewayFeeBearer: "platform"}))
      .toEqual(["Gateway fees paid by"]);
    expect(revisionChanges("organizer", {trial: {days: 60}}, {trial: {days: 60},
      purposes: {hostMembership: {atSourceFeeBasisPoints: 100}}}))
      .toEqual(["Host memberships: Fee deducted at source"]);
  });
});
