import {describe, expect, it} from "vitest";
import {validatePlaybookPage, type PlaybookPageDocument, type PlaybookSectionOf} from "./playbook/playbookContract";
import {
  hostFeeCycleExample,
  hostFeeExample,
  hostPricingFacts,
  hostPricingLines,
  pricingPageCycleExamples,
  pricingPageFeeExamples,
} from "./pricing";
import pricingPage from "./pricingPage.json";
import {brand} from "./brand";

// The /pricing/ page's content, written to the playbook content contract. It
// belongs at content/playbook/pages/product/pricing.json with a `pricing`
// entry in that section's index; until the renderer moves it there, this test
// keeps it valid and holds every figure in it to the shared fee model.

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

  it("has one pricing band, for the shared fee calculator's slot", () => {
    expect(page.sections.filter((item) => item.type === "pricing").map((item) => item.id)).toEqual(["fee"]);
  });

  it("shows only figures the fee model works out", () => {
    const fee = section("pricing", "fee");
    expect(fee.price).toBe(hostPricingFacts.rate);
    expect(fee.title).toContain(`${hostPricingFacts.cap} per billing cycle`);
    expect(fee.cap).toContain(hostPricingFacts.capReachedAt);
    expect(fee.trial).toContain(`${hostPricingFacts.trialDays} days from your first event, ${hostPricingFacts.foundingTrialDays} for founding hosts`);
    expect(fee.examples).toEqual(pricingPageCycleExamples.map(hostFeeCycleExample));
    const examples = section("tiles", "examples").items.map((item) => ({title: item.title, value: item.figure, body: item.body}));
    expect(examples).toEqual(pricingPageFeeExamples.map(hostFeeExample));
    expect(section("hero", "top").lead).toBe(hostPricingLines.body.replace(brand.name, "{{brand.name}}"));
    expect(section("cta", "trial").title).toBe(`${hostPricingFacts.trialDays} days free. ${hostPricingFacts.foundingTrialDays} if you’re early.`);
    expect(section("cta", "organisations").lead).toContain(hostPricingLines.organisations);
  });

  it("says per billing cycle, never a month, and names no place count", () => {
    for (const text of strings(pricingPage)) {
      expect(text, text).not.toMatch(/\b(a|per|this|in a|each) month\b|\bmonthly\b|of 50|places left/iu);
    }
  });

  it("links only the host landing, its start (aliased to the start band until /host/start/ ships), weddings and WhatsApp", () => {
    const routes = new Set(JSON.stringify(pricingPage).match(/"route":\s*"[a-z_]+"/gu)?.map((match) => match.split("\"")[3]));
    expect([...routes].sort()).toEqual(["host", "host_start", "pricing", "weddings"]);
  });
});
