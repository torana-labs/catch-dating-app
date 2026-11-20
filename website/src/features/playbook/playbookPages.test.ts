import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {citiesPageCopy} from "@content/citiesPage";
import {hostLandingCopy, hostNightFormats} from "@content/hostLanding";
import {guestAppLive, siteFooterCopy, siteHeaderCopy} from "@content/site";
import {shelvedResourcesPlaybookPages} from "@content/playbook/pages/resources/index";
import {publishedHostStories} from "@content/stories/hostStories";
import {fixtureHostStoryPage} from "../../stories/fixtures/hostStories";
import {websiteCities} from "@content/markets";
import {hostPricingFacts} from "@content/pricing";
import {referralSignInCopy} from "@content/referral";
import {
  forEachAction,
  livePlaybookPage,
  playbookIsLive,
  validatePlaybookPage,
  type PlaybookDestination,
  type PlaybookPageDocument,
} from "@content/playbook/playbookContract";
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
import {matchPlaybookRoute, playbookFamilyRoutes, playbookFixedRoutes, playbookPathForContentKey, playbookTopSegment, siteRouteHrefs} from "./playbookRoutes";
import {playbookTryItTool, playbookTryItTools, tryItToolCommands, websiteReadyTryItCommands} from "../tryIt/tryItModel";

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
  familyRouteIds: new Set<string>(playbookFamilyRoutes.map((route) => route.id)),
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

  it("links the site chrome and the host landing only to pages that render, and reaches every shipped page from them", () => {
    const hostMenu = siteHeaderCopy.host.nav.flatMap((entry) => "links" in entry ? entry.links : [entry]);
    const hostFooter = siteFooterCopy.host.columns.flatMap((column) => column.links);
    const landing = [...hostNightFormats.map((item) => ({href: item.page})), ...hostLandingCopy.ways.chips, ...hostLandingCopy.ways.organisations,
      ...hostLandingCopy.ways.stages.flatMap((stage) => "href" in stage.to ? [{href: stage.to.href}] : [])];
    // The guest app page (/app/) is a guest page: the guest header's action and the guest footer's Explore column link it.
    const guestChrome = [siteHeaderCopy.guest.action, ...siteFooterCopy.explore];
    const hrefs = [...hostMenu, ...hostFooter, ...landing, ...guestChrome].map((link) => link.href.split("#")[0]);
    const siteRoutes = new Set<string>([...Object.values(siteRouteHrefs), "/explore/"]);
    for (const href of hrefs) expect(siteRoutes.has(href) || resolvePlaybookPage(href) !== null, `${href} has no page`).toBe(true);
    // Every page that ships (the 15 organiser types, the product pages, About, Safety, the ways in, the tools and playbooks) is one press from a host page or the guest chrome.
    const linked = new Set(hrefs);
    for (const route of playbookFixedRoutes.filter((candidate) => fixedWithContent.has(candidate.id))) {
      expect(linked.has(route.path), `${route.path} is linked from no menu, host footer or /host/`).toBe(true);
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
    const withTool = {...page, sections: [...page.sections, {type: "custom" as const, id: "tool", ground: "white" as const, component: "eventPageFromLink" as const}]};
    expect(pendingPlaybookBindings(withTool)).toEqual(["custom:eventPageFromLink"]);
  });

  it("renders /pricing/ from its content: the fee band, the cap and what is included bound, indexed (owner, 19 Nov 2026)", async () => {
    const ref = resolvePlaybookPage("/pricing/")!;
    expect(ref.match.contentKey).toBe("pricing");
    const page = (await loadPlaybookPage(ref))!;
    expect(page.sections.flatMap((section) => section.type === "custom" ? [section.component] : [])).toEqual(["pricingCalculator", "pricingExamples", "pricingCap", "pricingIncluded", "pricingOrganisations"]);
    expect(pendingPlaybookBindings(page)).toEqual([]);
    expect(page.meta.noindex).toBe(false);
  });

  it("renders the run-clubs sample: no pending bindings, brand resolved, indexed (owner, 19 Nov 2026)", async () => {
    const ref = resolvePlaybookPage("/host/run-clubs")!;
    expect(ref.match.contentKey).toBe("host_run_clubs");
    const page = (await loadPlaybookPage(ref))!;
    expect(pendingPlaybookBindings(page)).toEqual([]);
    expect(JSON.stringify(page)).not.toMatch(/\{\{/u);
    expect(page.meta.noindex).toBe(false);
  });

  it("indexes only the pages the owner approved for search (18 and 19 Nov 2026); the walkthrough request form stays out", async () => {
    expect((await approvedPlaybookPaths()).sort()).toEqual([
      "/about/", "/app/", "/host/brands/", "/host/colleges/", "/host/communities/", "/host/creators/", "/host/demo/",
      "/host/facilities/", "/host/first-event/", "/host/nightlife/", "/host/outdoors/", "/host/quiz-nights/",
      "/host/racket-sports/", "/host/run-clubs/", "/host/start/", "/host/studios/", "/host/supper-clubs/", "/host/switch/",
      "/host/teams/", "/host/venues/", "/host/workshops/", "/how-it-works/",
      "/playbooks/", "/playbooks/quiz-night/", "/playbooks/racket-sports/", "/playbooks/run-club/", "/playbooks/supper-club/",
      "/pricing/", "/product/bookings-and-memberships/",
      "/product/forms/", "/product/guest-records/", "/product/messages-and-growth/", "/product/reports-and-payouts/",
      "/product/running-the-event/", "/product/the-room/", "/product/your-page/", "/programmes/", "/refer/", "/safety/",
      "/tools/event-page-from-link/", "/tools/no-show-calculator/",
    ]);
  });

  const productV2 = loaded.filter(({ref}) => ref.match.route.group === "product" && ref.match.contentKey !== "pricing");

  // The pages whose try-it band, buttons and closing tool form are live now.
  // A page joins when its command is in production and its sections flip to
  // built; its command must be website-ready (features/tryIt/tryItModel.ts).
  const liveTryItPages = ["product_your_page", "product_bookings", "product_messages", "product_guests"];

  it("hides every try-it band and button unless its command's website tool is ready, on every product page", () => {
    expect(productV2.map(({ref}) => ref.match.contentKey).sort()).toEqual([
      "how_it_works", "product_bookings", "product_event", "product_forms", "product_guests", "product_messages",
      "product_reports", "product_room", "product_your_page",
    ]);
    for (const {ref, raw} of productV2) {
      const key = ref.match.contentKey;
      const ready = playbookTryItTool(key) !== null;
      const tryBand = raw.sections.find((section) => section.id === "try");
      const toolForms = raw.sections.flatMap((section) => "leadForm" in section && section.leadForm?.requestKind === "tool" ? [{section, form: section.leadForm}] : []);
      for (const section of raw.sections) {
        if (!playbookIsLive(section)) expect(section.statusNote, `${key} ${section.id} says why it is hidden`).toBeTruthy();
        if (ready) continue;
        if (section.type === "cta" && section.leadForm?.input && section.leadForm.input !== "tel") expect(section.status, `${key} ${section.id}`).toBe("tryIt");
        forEachAction(section, (item, at) => {
          if ("anchor" in item.to && item.to.anchor === "try") expect(playbookIsLive(item), `${key} ${section.id}.${at}`).toBe(false);
        });
      }
      const live = livePlaybookPage(raw);
      if (!ready) {
        expect(tryBand?.status, `${key} #try`).toBe("tryIt");
        expect(JSON.stringify(live), key).not.toMatch(/"anchor":"try"|"requestKind":"tool"/u);
        continue;
      }
      // A ready page's try band holds its tool form, which the tool slot draws.
      expect(tryBand && "leadForm" in tryBand ? tryBand.leadForm?.requestKind : undefined, `${key} #try holds its tool form`).toBe("tool");
      // The guest list tool uploads a file; the others read a link.
      const input = playbookTryItTool(key) === "guests" ? "file" : "url";
      for (const {section, form} of toolForms) expect(form.input, `${key} ${section.id} reads a ${input}`).toBe(input);
      const liveTry = live.sections.some((section) => section.id === "try");
      expect(liveTry, `${key} #try is live only once listed in liveTryItPages`).toBe(liveTryItPages.includes(key));
    }
    for (const key of liveTryItPages) expect(playbookTryItTool(key), `${key} has a website-ready tool`).not.toBeNull();
  });

  // event.import-from-link returns a private draft (name, date, start time,
  // city) and promotion.create-kit tracked /invite/ links with a QR each
  // (contracts/callable_responses/): their bands promise nothing more.
  it("words the event and kit tools' bands only as what their commands return", () => {
    for (const key of ["product_bookings", "product_messages", "tools_event_page_from_link"]) {
      const {raw} = loaded.find(({ref}) => ref.match.contentKey === key)!;
      const bands = livePlaybookPage(raw).sections.filter((section) => section.id === "try" || section.id === "start");
      expect(bands.map((section) => section.id), key).toEqual(["try", "start"]);
      const text = JSON.stringify(bands);
      expect(text, key).not.toMatch(/checkout|member|access|balance|reminder|price|photo|suggest|bookable|day-of|Luma|Eventbrite|District|Google Form/iu);
    }
  });

  it("shows Reports' numbers-only report while its export upload stays hidden (owner, #2062 C7 option c)", () => {
    const {raw} = loaded.find(({ref}) => ref.match.contentKey === "product_reports")!;
    const live = livePlaybookPage(raw);
    const numbers = live.sections.find((section) => section.id === "numbers");
    expect(numbers?.type === "custom" ? numbers.component : undefined).toBe("lastEventReport");
    // The upload needs sales.import-past and the phone step: its band, closing band and buttons stay hidden.
    expect(live.sections.map((section) => section.id)).not.toContain("try");
    expect(live.sections.map((section) => section.id)).not.toContain("start-try");
    expect(JSON.stringify(numbers)).not.toMatch(/upload|export/iu);
    expect(JSON.stringify(live)).not.toMatch(/"anchor":"try"/u);
  });

  it("maps every website-ready command to a product page tool, and the tools to the commands they run", () => {
    const tools = Object.values(playbookTryItTools);
    for (const command of websiteReadyTryItCommands) {
      expect(tools.some((tool) => tryItToolCommands[tool] === command), `${command} has a page`).toBe(true);
    }
    for (const key of Object.keys(playbookTryItTools)) expect(resolvePlaybookPage(playbookPathForContentKey(key) ?? "/none/"), key).not.toBeNull();
    expect(playbookTryItTool("product_guests")).toBe("guests");
  });

  it("refuses a live link to a hidden try band", () => {
    const {raw} = loaded.find(({ref}) => ref.match.contentKey === "product_your_page")!;
    const hidden = {...raw, sections: raw.sections.map((section) => section.id === "try" ? {...section, status: "tryIt" as const, statusNote: "Hidden."} : section)};
    expect(validatePlaybookPage(hidden, context).join("\n")).toMatch(/try/u);
  });

  it("never links a live page to a hidden section of another page", () => {
    const liveAnchors = new Map(loaded.filter(({ref}) => "path" in ref.match.route)
      .map(({ref, raw}) => [ref.match.route.id, new Set(livePlaybookPage(raw).sections.map((section) => section.id))]));
    for (const {ref, raw} of loaded) {
      for (const to of destinations(livePlaybookPage(raw))) {
        if ("route" in to && to.anchor && liveAnchors.has(to.route)) {
          expect(liveAnchors.get(to.route)!.has(to.anchor), `${ref.match.contentKey} links ${to.route}#${to.anchor}`).toBe(true);
        }
      }
    }
  });

  it("uses no dating or matching wording on the product pages, and leaves out the mutual-only line (owner, 18 Nov 2026)", () => {
    for (const {ref, raw} of productV2) {
      const text = JSON.stringify(raw);
      expect(text, ref.match.contentKey).not.toMatch(/\b(dating|date night|matchmak\w*|matches|matching people|soulmates?|romance|romantic|singles|mutual\w*|chemistry|compatib\w*)\b/iu);
    }
  });

  it("states the fee cap with its month, from pricing.ts, wherever a product page names it", () => {
    for (const {ref, raw} of productV2) {
      const visit = (value: unknown) => {
        if (typeof value === "string" && value.includes("₹10,000")) {
          expect(hostPricingFacts.cap, value).toBe("₹10,000");
          expect(value, ref.match.contentKey).toMatch(/a month/u);
        } else if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") Object.values(value).forEach(visit);
      };
      visit(livePlaybookPage(raw).sections);
      expect(JSON.stringify(raw), ref.match.contentKey).not.toMatch(/\b(?!5%)\d+% of/u);
    }
  });

  it("renders /refer/ with the host referral reward from pricing.ts and its referral form (owner, 19 Nov 2026)", async () => {
    const ref = resolvePlaybookPage("/refer/")!;
    const raw = loaded.find(({ref: candidate}) => candidate.match.contentKey === "refer")!.raw;
    const page = (await loadPlaybookPage(ref))!;
    expect(pendingPlaybookBindings(page)).toEqual([]);
    expect(JSON.stringify(page)).not.toMatch(/\{\{/u);
    expect(page.meta.noindex).toBe(false);
    const text = JSON.stringify(raw);
    // Every trial length the page names is one pricing.ts states, and it names the referral, standard and founding trials.
    const trialDays = new Set<number>([hostPricingFacts.trialDays, hostPricingFacts.foundingTrialDays, hostPricingFacts.referralTrialDays]);
    for (const [, days] of text.matchAll(/\b(\d+) (?:free )?days\b/gu)) expect(trialDays.has(Number(days)), `${days} days`).toBe(true);
    expect(text).toContain(`${hostPricingFacts.referralTrialDays} days free from their first event instead of ${hostPricingFacts.trialDays}`);
    expect(text).toContain(`keep their ${hostPricingFacts.foundingTrialDays}`);
    // The old cash credit is gone: a month of fees, after the referred host's first paid bill.
    expect(text).not.toMatch(/\d+%|lapses|paid out\b/iu);
    expect(text).toMatch(/first \{\{brand\.name\}\} bill, your next month of \{\{brand\.name\}\} fees is free/u);
    const form = raw.sections.flatMap((section) => section.type === "cta" && section.leadForm ? [section.leadForm] : [])[0];
    expect(form).toMatchObject({requestKind: "referral", id: "referral_host"});
    expect(form.fields?.map((field) => field.name)).toEqual(["name", "hostName", "hostLink", "relationship"]);
    // Sign-in is on the page (features/referral), not a trip to Host billing; its words name no trial length of their own.
    expect(text).not.toMatch(/host\/billing|Host billing/u);
    expect(JSON.stringify(referralSignInCopy)).not.toMatch(/\d+ (?:free )?days?\b/u);
  });

  it("indexes The room and Running the event (owner approved, 19 Nov 2026)", async () => {
    for (const path of ["/product/the-room/", "/product/running-the-event/"]) {
      const page = (await loadPlaybookPage(resolvePlaybookPage(path)!))!;
      expect(page, path).not.toBeNull();
      expect(page.meta.noindex, path).toBe(false);
    }
  });

  it.each(["/about/", "/host/start/", "/host/first-event/", "/host/switch/", "/programmes/"])("renders %s: every section bound, brand resolved, indexed (owner, 19 Nov 2026)", async (path) => {
    const page = (await loadPlaybookPage(resolvePlaybookPage(path)!))!;
    expect(page, path).not.toBeNull();
    expect(JSON.stringify(page)).not.toMatch(/\{\{/u);
    expect(page.meta.noindex).toBe(false);
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
    expect(matchPlaybookRoute("/compare/")?.contentKey).toBe("compare");
    expect(resolvePlaybookPage("/compare/")).toBeNull();
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

describe("shelved pages", () => {
  const shelved = Object.entries(shelvedResourcesPlaybookPages);

  it.each(shelved)("%s passes the contract, but no route serves it, no sitemap lists it and nothing links it", async (key, entry) => {
    const raw = (await entry.load()).default as PlaybookPageDocument;
    expect(validatePlaybookPage(raw, context)).toEqual([]);
    expect(raw.id).toBe(key);
    expect(raw.meta.noindex, `${key} stays noindex while shelved`).toBe(true);
    const path = playbookFixedRoutes.find((route) => route.id === raw.route)!.path;
    expect(matchPlaybookRoute(path)?.contentKey).toBe(key);
    expect(resolvePlaybookPage(path), `${path} is shelved`).toBeNull();
    expect(Object.values(playbookPageIndexes).some((index) => key in index), `${key} is in a served index`).toBe(false);
    expect(await approvedPlaybookPaths()).not.toContain(path);
    const chrome = [...siteHeaderCopy.host.nav.flatMap((item) => "links" in item ? item.links : [item]), ...siteHeaderCopy.guest.nav.flatMap((item) => "links" in item ? item.links : [item]),
      ...siteFooterCopy.host.columns.flatMap((column) => column.links), ...siteFooterCopy.explore, ...siteFooterCopy.hosts];
    expect(chrome.map((link) => link.href)).not.toContain(path);
    for (const {raw: page} of loaded) expect(destinations(page).some((to) => "route" in to && to.route === raw.route), `${page.id} links ${raw.route}`).toBe(false);
  });

  it("holds /stories/ back while no host story is published: the page cannot render without real ones", async () => {
    expect(publishedHostStories).toEqual([]);
    const raw = (await shelvedResourcesPlaybookPages.stories.load()).default as PlaybookPageDocument;
    expect(pendingPlaybookBindings(livePlaybookPage(raw))).toEqual(["cards:stories"]);
    expect(resolvePlaybookPage("/stories/nobody/")).toBeNull();
  });

  it("keeps the fictional story page in fixtures: valid, family-routed, and registered nowhere", () => {
    const pageAnchors = new Map([...context.pageAnchors, [fixtureHostStoryPage.id, new Set(fixtureHostStoryPage.sections.map((section) => section.id))]]);
    expect(validatePlaybookPage(fixtureHostStoryPage, {...context, pageAnchors})).toEqual([]);
    expect(pendingPlaybookBindings(fixtureHostStoryPage)).toEqual([]);
    expect(resolvePlaybookPage("/stories/driftwood-bay-runners/")).toBeNull();
  });
});

describe("tool, guide and guest app pages", () => {
  it.each(["/tools/no-show-calculator/", "/tools/event-page-from-link/", "/playbooks/", "/playbooks/run-club/", "/playbooks/supper-club/", "/playbooks/quiz-night/", "/playbooks/racket-sports/", "/app/"])(
    "renders %s: every section bound, brand resolved, indexed (owner, 19 Nov 2026)", async (path) => {
      const page = (await loadPlaybookPage(resolvePlaybookPage(path)!))!;
      expect(page, path).not.toBeNull();
      expect(JSON.stringify(page)).not.toMatch(/\{\{/u);
      expect(page.meta.noindex).toBe(false);
    });

  it("serves the guides as playbook_guide family pages, linked from the hub", async () => {
    const hub = (await loadPlaybookPage(resolvePlaybookPage("/playbooks/")!))!;
    const linked = destinations(hub).flatMap((to) => "page" in to ? [to.page] : []);
    expect(linked).toEqual(["playbook_guide/run-club", "playbook_guide/supper-club", "playbook_guide/quiz-night", "playbook_guide/racket-sports"]);
    for (const key of linked) expect(refs.some((ref) => ref.match.contentKey === key && ref.match.route.id === "playbook_guide"), key).toBe(true);
  });

  it("types no fee figure in the guides: one pricing line links /pricing/", () => {
    for (const {ref, raw} of loaded.filter(({ref}) => ref.match.route.id === "playbook_guide" || ref.match.contentKey === "playbooks")) {
      const text = JSON.stringify(raw);
      expect(text, ref.match.contentKey).not.toMatch(/₹|\d+%/u);
      if (ref.match.route.id === "playbook_guide") expect(destinations(raw).some((to) => "route" in to && to.route === "pricing"), ref.match.contentKey).toBe(true);
    }
  });

  it("keeps the calculator's copy free of rates, benchmarks and typed fees: every figure is the host's", () => {
    const calculator = loaded.find(({ref}) => ref.match.contentKey === "tools_no_show_calculator")!.raw;
    const text = JSON.stringify(calculator);
    expect(text).not.toMatch(/₹|\d+\s?%|\b(average|typical|industry|benchmark)\b/iu);
    expect(calculator.sections.at(-1)!.type).toBe("cta");
    const closing = calculator.sections.at(-1)! as Extract<PlaybookPageDocument["sections"][number], {type: "cta"}>;
    expect(closing.actions?.map((item) => "route" in item.to ? item.to.route : null)).toEqual(["host_start", "host_walkthrough"]);
  });

  it("opens the event tool from /tools/event-page-from-link/'s try band, like Bookings' (event.import-from-link)", () => {
    const tryForm = (key: string) => {
      const band = livePlaybookPage(loaded.find(({ref}) => ref.match.contentKey === key)!.raw).sections.find((section) => section.id === "try");
      return band?.type === "split" ? band.leadForm : undefined;
    };
    expect(playbookTryItTool("tools_event_page_from_link")).toBe("event");
    expect(tryForm("tools_event_page_from_link")?.requestKind).toBe("tool");
    expect(tryForm("tools_event_page_from_link")).toEqual(tryForm("product_bookings"));
  });

  it("asks for the guest app launch notice only while the app is on no store, with no dating wording or release date", () => {
    const app = loaded.find(({ref}) => ref.match.contentKey === "app_notify")!.raw;
    // When the guest app reaches a store, /app/ becomes the download page: update app.json and this test together.
    expect(guestAppLive).toBe(false);
    const text = JSON.stringify(app);
    expect(text).not.toMatch(/\b(dating|date night|matchmak\w*|matches|singles|romance|romantic|soulmates?)\b/iu);
    expect(text).not.toMatch(/\b(20\d\d|january|february|march|april|may|june|july|august|september|october|november|december)\b/iu);
    expect(app.sections.some((section) => section.type === "custom" && section.component === "appLaunchNotice")).toBe(true);
  });
});
