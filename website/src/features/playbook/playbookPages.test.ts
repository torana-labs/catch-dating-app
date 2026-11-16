import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {websiteCities} from "@content/markets";
import {validatePlaybookPage, type PlaybookDestination, type PlaybookPageDocument} from "@content/playbook/playbookContract";
import {pendingPlaybookBindings} from "./playbookBindings";
import {playbookRouteAliases} from "./playbookHrefs";
import {
  alwaysNoindexPlaybookRoutes,
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

  it("renders the run-clubs sample: no pending bindings, brand resolved, noindex until approved", async () => {
    const ref = resolvePlaybookPage("/host/run-clubs")!;
    expect(ref.match.contentKey).toBe("host_run_clubs");
    const page = (await loadPlaybookPage(ref))!;
    expect(pendingPlaybookBindings(page)).toEqual([]);
    expect(JSON.stringify(page)).not.toMatch(/\{\{/u);
    expect(page.meta.noindex).toBe(true);
  });
});

describe("playbook route resolution", () => {
  it("404s a registered route whose content is not written, and an unknown family page", () => {
    expect(matchPlaybookRoute("/host/racket-sports/")?.contentKey).toBe("host_racket_sports");
    expect(resolvePlaybookPage("/host/racket-sports/")).toBeNull();
    expect(resolvePlaybookPage("/stories/nobody/")).toBeNull();
    expect(resolvePlaybookPage("/mumbai/run-clubs/")).toBeNull();
    expect(resolvePlaybookPage("/new-to-mumbai/")).toBeNull();
    expect(resolvePlaybookPage("/organizers/afterfly/")).toBeNull();
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
