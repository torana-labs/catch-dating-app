import Ajv2020 from "ajv/dist/2020.js";
import {describe, expect, it} from "vitest";
import {brand} from "../brand";
import runClubs from "./pages/host/run-clubs.json";
import schema from "./playbookPage.schema.json";
import {
  playbookPageJsonSchema,
  playbookSectionTypes,
  validatePlaybookPage,
  validatedPlaybookPage,
  type PlaybookValidationContext,
} from "./playbookContract";

const validateSchema = new Ajv2020({allErrors: true}).compile(schema);
const context: PlaybookValidationContext = {
  routeIds: new Set(["host", "host_run_clubs"]),
  captureSlots: new Set(["host-formats-pods", "guest-explore"]),
};

type Mutable = {[key: string]: unknown};
const fixture = (mutate: (page: Mutable & {sections: Mutable[]}) => void) => {
  const page = structuredClone(runClubs) as unknown as Mutable & {sections: Mutable[]};
  mutate(page);
  return page;
};
const section = (page: {sections: Mutable[]}, type: string) => page.sections.find((item) => item.type === type)!;

describe("playbook page contract", () => {
  it("commits the editor schema generated from the contract", () => {
    expect(schema).toEqual(playbookPageJsonSchema());
  });

  it("names the section types after the kit concepts", () => {
    expect([...playbookSectionTypes].sort()).toEqual([
      "article", "cards", "checklist", "cta", "faq", "flow", "hero", "pricing",
      "screen", "split", "story", "table", "tabs", "tiles", "timeline",
    ]);
  });

  it("accepts the run-clubs page in the schema and the runtime validator", () => {
    expect(validateSchema(runClubs), JSON.stringify(validateSchema.errors)).toBe(true);
    expect(validatePlaybookPage(runClubs, context)).toEqual([]);
    expect(validatedPlaybookPage(runClubs).id).toBe("host_run_clubs");
  });

  // Every structural and text fixture fails both validators, so the editor
  // schema and the runtime validator cannot drift apart.
  const parityFixtures: [string, ReturnType<typeof fixture>][] = [
    ["wrong $schema", fixture((page) => {page.$schema = "./other.json";})],
    ["unknown page key", fixture((page) => {page.extra = true;})],
    ["no sections", fixture((page) => {page.sections = [];})],
    ["no meta", fixture((page) => {delete page.meta;})],
    ["noindex left out", fixture((page) => {delete (page.meta as Mutable).noindex;})],
    ["noindex as a string", fixture((page) => {(page.meta as Mutable).noindex = "true";})],
    ["preview image outside /assets", fixture((page) => {(page.meta as Mutable).ogImage = "https://example.com/card.png";})],
    ["unknown section type", fixture((page) => {page.sections[0].type = "carousel";})],
    ["ground as hex", fixture((page) => {page.sections[0].ground = "#F07A55";})],
    ["kit tone instead of a ground", fixture((page) => {page.sections[0].ground = "m-coral";})],
    ["hex colour in copy", fixture((page) => {page.sections[0].lead = "Ink #3B1F14 on coral.";})],
    ["placeholder in copy", fixture((page) => {page.sections[0].title = "[N] run clubs run on us.";})],
    ["empty copy", fixture((page) => {page.sections[0].title = "  ";})],
    ["destination as a URL", fixture((page) => {
      (section(page, "hero").actions as Mutable[])[0].to = {href: "https://example.com"};
    })],
    ["whatsapp without a message", fixture((page) => {
      (section(page, "hero").actions as Mutable[])[1].to = {kind: "whatsapp"};
    })],
    ["media as an image path", fixture((page) => {
      section(page, "timeline").media = {kind: "phone", img: "/_blob/d1f6"};
    })],
    ["photo outside /assets", fixture((page) => {
      section(page, "timeline").media = {kind: "photo", asset: "/_blob/d1f6.jpg", alt: "Runners"};
    })],
    ["cards with items instead of a source", fixture((page) => {
      page.sections.push({type: "cards", id: "plans", ground: "white", title: "Plans", items: []});
    })],
    ["section id with spaces", fixture((page) => {page.sections[1].id = "sound familiar";})],
    ["unknown header variant", fixture((page) => {(page.header as Mutable).variant = "lp";})],
    ["too many hero actions", fixture((page) => {
      const actions = section(page, "hero").actions as Mutable[];
      section(page, "hero").actions = [...actions, ...actions];
    })],
  ];
  it.each(parityFixtures)("rejects %s in both validators", (_name, page) => {
    expect(validateSchema(page), "JSON schema accepted the fixture").toBe(false);
    expect(validatePlaybookPage(page), "runtime validator accepted the fixture").not.toEqual([]);
  });

  it("rejects the literal brand name and single-brace brand tokens at runtime", () => {
    expect(validatePlaybookPage(fixture((page) => {page.sections[0].title = `${brand.name} for run clubs.`;})).join("\n"))
      .toMatch(/names the brand literally/u);
    expect(validatePlaybookPage(fixture((page) => {page.sections[0].title = "{brand.name} for run clubs.";})).join("\n"))
      .toMatch(/single braces/u);
    expect(validatePlaybookPage(fixture((page) => {page.sections[0].title = "{{brand.nickname}} for run clubs.";})).join("\n"))
      .toMatch(/Unknown brand token/u);
  });

  it("checks route ids and capture slots against the site's registries", () => {
    const unknownRoute = fixture((page) => {
      (section(page, "hero").actions as Mutable[])[0].to = {route: "host_mixers"};
    });
    expect(validatePlaybookPage(unknownRoute)).toEqual([]);
    expect(validatePlaybookPage(unknownRoute, context).join("\n")).toMatch(/unknown route host_mixers/u);
    const unknownSlot = fixture((page) => {section(page, "timeline").media = {kind: "capture", slot: "host-run-morning"};});
    expect(validatePlaybookPage(unknownSlot, context).join("\n")).toMatch(/unknown capture slot host-run-morning/u);
  });

  it("keeps ad landing pages out of search whatever their meta says", () => {
    const lp = fixture((page) => {page.route = "lp_campaign"; (page.meta as Mutable).noindex = false;});
    const lpContext = {...context, routeIds: new Set([...context.routeIds, "lp_campaign"]), alwaysNoindexRoutes: new Set(["lp_campaign"])};
    expect(validatePlaybookPage(lp, lpContext).join("\n")).toMatch(/meta.noindex must stay true/u);
  });

  it("requires a source for numeric proof and a section for every anchor", () => {
    const unsourced = fixture((page) => {section(page, "hero").proof = [{text: "40 run clubs host here"}];});
    expect(validatePlaybookPage(unsourced).join("\n")).toMatch(/give it a footnote with its source/u);
    const sourced = fixture((page) => {
      section(page, "hero").proof = [{text: "40 run clubs host here", footnote: "clubs"}];
      page.footer = {variant: "host", footnotes: [{id: "clubs", text: "From booking records, November 2026."}]};
    });
    expect(validatePlaybookPage(sourced)).toEqual([]);
    const orphan = fixture((page) => {page.footer = {variant: "host", footnotes: [{id: "clubs", text: "Unused."}]};});
    expect(validatePlaybookPage(orphan).join("\n")).toMatch(/not cited/u);
    const anchor = fixture((page) => {(section(page, "hero").actions as Mutable[])[0].to = {anchor: "nowhere"};});
    expect(validatePlaybookPage(anchor).join("\n")).toMatch(/not a section on this page/u);
  });

  it("needs exactly one page title and unique section ids", () => {
    expect(validatePlaybookPage(fixture((page) => {page.sections = page.sections.slice(1);})).join("\n"))
      .toMatch(/exactly one page title/u);
    expect(validatePlaybookPage(fixture((page) => {page.sections[2].id = page.sections[1].id;})).join("\n"))
      .toMatch(/duplicate id/u);
  });
});
