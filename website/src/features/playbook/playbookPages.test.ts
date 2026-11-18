import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {citiesPageCopy} from "@content/citiesPage";
import {websiteCities} from "@content/markets";
import {hostPricingFacts} from "@content/pricing";
import {validatePlaybookPage, type PlaybookDestination, type PlaybookPageDocument} from "@content/playbook/playbookContract";
import {pendingPlaybookBindings} from "./playbookBindings";
import {playbookRouteAliases} from "./playbookHrefs";
import {
  alwaysNoindexPlaybookRoutes,
  approvedPlaybookPaths,
  loadPlaybookPage,
  playbookPageIndexes,
  registeredPlaybookPages,
  resolvePlaybookPage,
} from "./playbookPages";
import {matchPlaybookRoute, playbookFamilyRoutes, playbookFixedRoutes, playbookTopSegment, siteRouteHrefs} from "./playbookRoutes";

const websiteRoot = path.resolve(__dirname, "../../..");
const captureSlots = new Set<string>(
  (JSON.parse(fs.readFileSync(path.join(websiteRoot, "public/assets/app-screenshots/manifest.json"), "utf8")) as {captures: {id: string}[]})
    .captures.map((capture) => capture.id),
);
const refs = registeredPlaybookPages();
const loaded = await Promise.all(refs.map(async (ref) => ({ref, raw: (await ref.entry.load()).default as PlaybookPageDocument})));
const fixedWithContent = new Set(refs.filter((ref) => "path" in ref.match.route).map((ref) => ref.match.route.id));
const routeAnchors = new Map(loaded.filter(({ref}) => "path" in ref.match.route)
  .map(({ref, raw}) => [ref.match.route.id, new Set(raw.sections.map((section) => section.id))]));
const pageAnchors = new Map(loaded.filter(({ref}) => !("path" in ref.match.route))
  .map(({ref, raw}) => [ref.match.contentKey, new Set(raw.sections.map((section) => section.id))]));
const context = {
  routeIds: new Set<string>([...Object.keys(siteRouteHrefs), ...playbookFixedRoutes.map((route) => route.id)]),
  captureSlots,
  alwaysNoindexRoutes: alwaysNoindexPlaybookRoutes,
  routeAnchors,
  pageAnchors,
};

function destinations(page: PlaybookPageDocument): PlaybookDestination[] {
  const found: PlaybookDestination[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (record.to && typeof record.to === "object") found.push(record.to as PlaybookDestination);
      Object.values(record).forEach(visit);
    }
  };
  visit(page);
  return found;
}

describe("playbook page indexes", () => {
  it("registers every index entry under its own section, as a route and file that exist", () => {
    const keys = Object.values(playbookPageIndexes).flatMap((index) => Object.keys(index));
    expect(refs.map((ref) => ref.match.contentKey).sort()).toEqual([...keys].sort());
    for (const [group, index] of Object.entries(playbookPageIndexes)) {
      for (const [key, entry] of Object.entries(index)) {
        const ref = refs.find((candidate) => candidate.match.contentKey === key)!;
        expect(ref.match.route.group, `${key} belongs in the ${ref.match.route.group} index`).toBe(group);
        expect(fs.existsSync(path.join(websiteRoot, "src/content/playbook/pages", group, entry.file)), `${group}/${entry.file}`).toBe(true);
      }
    }
  });

  it.each(loaded.map(({ref, raw}) => [ref.match.contentKey, ref, raw] as const))("%s passes the contract with the site's registries", (_key, ref, raw) => {
    expect(validatePlaybookPage(raw, context)).toEqual([]);
    expect(raw.id).toBe(ref.match.contentKey);
    expect(raw.route).toBe(ref.match.route.id);
  });

  it("links only to pages that exist: site routes, shipped playbook pages and aliased stand-ins", () => {
    for (const {ref, raw} of loaded) {
      for (const to of destinations(raw)) {
        if (!("route" in to)) continue;
        const ok = to.route in siteRouteHrefs || to.route in playbookRouteAliases || fixedWithContent.has(to.route);
        expect(ok, `${ref.match.contentKey} links ${to.route}, which has no page yet and no alias`).toBe(true);
      }
    }
  });

  it("keeps an alias only while its page has no content", () => {
    for (const routeId of Object.keys(playbookRouteAliases)) {
      expect(fixedWithContent.has(routeId), `${routeId} shipped; remove its alias`).toBe(false);
      expect(playbookFixedRoutes.some((route) => route.id === routeId)).toBe(true);
    }
  });

  it("gives every city family page a market city", () => {
    const slugs = new Set(websiteCities.map((city) => city.slug));
    for (const ref of refs) {
      const cityParam = (ref.match.route as {cityParam?: string}).cityParam;
      if (cityParam) expect(slugs.has(ref.match.params[cityParam]), ref.match.contentKey).toBe(true);
    }
  });

  it("binds the pricing calculator from the custom registry", async () => {
    const page = (await loadPlaybookPage(resolvePlaybookPage("/host/run-clubs/")!))!;
    const withCalculator = {...page, sections: page.sections.map((section) =>
      section.type === "pricing" ? {...section, calculator: "pricingCalculator" as const} : section)};
    expect(pendingPlaybookBindings(withCalculator)).toEqual([]);
  });

  it("holds back a page whose custom section has no component yet", async () => {
    const page = (await loadPlaybookPage(resolvePlaybookPage("/host/run-clubs/")!))!;
    const withTool = {...page, sections: [...page.sections, {type: "custom" as const, id: "tool", ground: "white" as const, component: "noShowCalculator" as const}]};
    expect(pendingPlaybookBindings(withTool)).toEqual(["custom:noShowCalculator"]);
  });

  it("renders /pricing/ from its content: the fee band, the cap and what is included bound, noindex until approved", async () => {
    const ref = resolvePlaybookPage("/pricing/")!;
    expect(ref.match.contentKey).toBe("pricing");
    const page = (await loadPlaybookPage(ref))!;
    expect(page.sections.flatMap((section) => section.type === "custom" ? [section.component] : [])).toEqual(["pricingCalculator", "pricingExamples", "pricingCap", "pricingIncluded", "pricingOrganisations"]);
    expect(pendingPlaybookBindings(page)).toEqual([]);
    expect(page.meta.noindex).toBe(true);
  });

  it("renders the run-clubs sample: no pending bindings, brand resolved, noindex until approved", async () => {
    const ref = resolvePlaybookPage("/host/run-clubs")!;
    expect(ref.match.contentKey).toBe("host_run_clubs");
    const page = (await loadPlaybookPage(ref))!;
    expect(pendingPlaybookBindings(page)).toEqual([]);
    expect(JSON.stringify(page)).not.toMatch(/\{\{/u);
    expect(page.meta.noindex).toBe(true);
  });

  it("indexes only the pages the owner approved for search (18 Nov 2026); /pricing/ is not ready yet", async () => {
    expect((await approvedPlaybookPaths()).sort()).toEqual([
      "/host/brands/", "/host/colleges/", "/host/communities/", "/host/creators/", "/host/demo/", "/host/facilities/",
      "/host/nightlife/", "/host/outdoors/", "/host/quiz-nights/", "/host/racket-sports/", "/host/studios/",
      "/host/supper-clubs/", "/host/teams/", "/host/venues/", "/host/workshops/", "/how-it-works/",
      "/product/bookings/", "/product/door/", "/product/forms/", "/product/guests/", "/product/messages/",
      "/product/night/", "/product/reports/", "/product/your-page/", "/safety/",
    ]);
  });

  it.each(["/about/", "/host/start/", "/host/first-event/", "/host/switch/", "/programmes/"])("renders %s: every section bound, brand resolved, noindex until approved", async (path) => {
    const page = (await loadPlaybookPage(resolvePlaybookPage(path)!))!;
    expect(page, path).not.toBeNull();
    expect(JSON.stringify(page)).not.toMatch(/\{\{/u);
    expect(page.meta.noindex).toBe(true);
  });

  it("publishes no price on the host ways in, About and /programmes/ beyond the fee cap pricing.ts works out", () => {
    for (const {ref, raw} of loaded.filter(({ref}) => ["about", "host_start", "host_first_event", "host_switch", "programmes"].includes(ref.match.contentKey))) {
      const amounts = new Set(JSON.stringify(raw).match(/₹[\d,]+/gu) ?? []);
      for (const amount of amounts) expect(amount, ref.match.contentKey).toBe(hostPricingFacts.cap);
    }
  });

  it("binds the cards section to the market's cities, and holds back the sources with no adapter yet", async () => {
    const about = (await loadPlaybookPage(resolvePlaybookPage("/about/")!))!;
    expect(about.sections.some((section) => section.type === "cards" && section.source.kind === "cities")).toBe(true);
    const withSource = (source: {kind: "stories"} | {kind: "playbooks"} | {kind: "organisers"}) => ({...about, sections: about.sections.map((section) =>
      section.type === "cards" ? {...section, source} : section)});
    expect(pendingPlaybookBindings(withSource({kind: "stories"}))).toEqual(["cards:stories"]);
    expect(pendingPlaybookBindings(withSource({kind: "playbooks"}))).toEqual(["cards:playbooks"]);
    expect(pendingPlaybookBindings(withSource({kind: "organisers"}))).toEqual(["cards:organisers"]);
    const filtered = {...about, sections: about.sections.map((section) => section.type === "cards" ?
      {...section, filters: [{key: "open", label: citiesPageCopy.open}, {key: "soon", label: citiesPageCopy.soon}]} : section)};
    expect(pendingPlaybookBindings(filtered)).toEqual(["cardsFilters"]);
  });

  it("states the fee cap a month on every page, never per billing cycle (owner, 18 Nov 2026)", () => {
    for (const {ref, raw} of loaded) {
      expect(JSON.stringify(raw), ref.match.contentKey).not.toMatch(/billing cycle|\bcycle\b/iu);
    }
  });
});

describe("playbook route resolution", () => {
  it("404s a registered route whose content is not written, and an unknown family page", () => {
    expect(matchPlaybookRoute("/refer/")?.contentKey).toBe("refer");
    expect(resolvePlaybookPage("/refer/")).toBeNull();
    expect(resolvePlaybookPage("/stories/nobody/")).toBeNull();
    expect(resolvePlaybookPage("/mumbai/run-clubs/")).toBeNull();
    expect(resolvePlaybookPage("/new-to-mumbai/")).toBeNull();
    expect(resolvePlaybookPage("/organizers/moonmoth/")).toBeNull();
  });

  it("reserves every top-level segment against the market city slugs", () => {
    const citySlugs = websiteCities.flatMap((city) => [city.slug, ...city.legacySlugs]);
    for (const route of [...playbookFixedRoutes, ...playbookFamilyRoutes]) {
      const segment = playbookTopSegment(route);
      if (!segment) continue;
      expect(citySlugs, `${route.id}: /${segment}/ is a city`).not.toContain(segment);
      if (segment.endsWith("-")) expect(citySlugs.some((slug) => slug.startsWith(segment)), route.id).toBe(false);
    }
    for (const slug of citySlugs) expect(matchPlaybookRoute(`/${slug}/`), slug).toBeNull();
  });
});
