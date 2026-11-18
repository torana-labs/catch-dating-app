import {describe, expect, it} from "vitest";
import {validatePlaybookPage, type PlaybookPageDocument, type PlaybookSectionOf} from "./playbook/playbookContract";
import {hostFeeExample, hostPricingFacts, hostPricingLines, pricingPageFeeExamples} from "./pricing";
import pricingPage from "./playbook/pages/product/pricing.json";

// The /pricing/ page's content (content/playbook/pages/product/pricing.json),
// written to the playbook content contract. The fee band, the cap and what the
// plan includes are custom sections whose figures the shared fee model works
// out in code; this test holds every figure the page's own words state to the
// same model, so /pricing/ agrees with /host/ and the calculator.

const page = pricingPage as unknown as PlaybookPageDocument;
const section = <T extends PlaybookPageDocument["sections"][number]["type"]>(type: T, id: string) =>
  page.sections.find((item) => item.type === type && item.id === id) as PlaybookSectionOf<T>;

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("the /pricing/ page content", () => {
  it("meets the playbook content contract, as the pricing route's page", () => {
    expect(validatePlaybookPage(pricingPage)).toEqual([]);
    expect([page.id, page.route, page.header.variant, page.footer.variant]).toEqual(["pricing", "pricing", "host", "host"]);
    expect(page.meta.noindex).toBe(true);
  });

  it("opens on the fee band with the calculator, then the cap and what is included, from the custom registry", () => {
    expect(page.sections.filter((item) => item.type === "custom").map((item) => [item.id, item.component, item.ground]))
      .toEqual([["fee", "pricingCalculator", "ink"], ["examples", "pricingExamples", "white"], ["cap", "pricingCap", "paper"],
        ["included", "pricingIncluded", "white"], ["organisations", "pricingOrganisations", "white"]]);
    expect(page.sections[0].id).toBe("fee");
  });

  it("shows only figures the fee model works out", () => {
    const cap = section("custom", "cap");
    expect(cap.lead).toContain(`${hostPricingFacts.cap} in a billing cycle, which happens at ${hostPricingFacts.capReachedAt} of ticket sales`);
    expect(cap.lead).toContain(`${hostPricingFacts.cycleDays}-day cycle`);
    // The worked examples are the fee model's own (pricingPageFeeExamples); the page carries only their header and foot.
    expect(JSON.stringify(section("custom", "examples"))).not.toMatch(/₹/u);
    expect(pricingPageFeeExamples.map(hostFeeExample).map((example) => example.value)).toEqual(
      ["₹0", "₹300 a session", "₹2,160 a dinner", "₹1,497 a night", "₹640 a session", "₹1,500 a class"]);
    expect(section("cta", "trial").title).toBe(`${hostPricingFacts.trialDays} days free. ${hostPricingFacts.foundingTrialDays} if you’re early.`);
    expect(section("custom", "organisations").lead).toContain(hostPricingLines.organisations);
  });

  it("says per billing cycle, never a month, and names no place count", () => {
    for (const text of strings(pricingPage)) {
      expect(text, text).not.toMatch(/\b(a|per|this|in a|each) month\b|\bmonthly\b|of 50|places left/iu);
    }
  });

  it("links only the host landing and its start (aliased to the start band until /host/start/ ships); the custom bands add WhatsApp and weddings", () => {
    const routes = new Set(JSON.stringify(pricingPage).match(/"route":\s*"[a-z_]+"/gu)?.map((match) => match.split("\"")[3]));
    expect([...routes].sort()).toEqual(["host", "host_start", "pricing"]);
  });
});
