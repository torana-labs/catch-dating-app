import Ajv2020 from "ajv/dist/2020.js";
import {describe, expect, it} from "vitest";
import {brand} from "../brand";
import runClubs from "./pages/host/run-clubs.json";
import schema from "./playbookPage.schema.json";
import {
  livePlaybookPage,
  playbookLabelRepeatsTitle,
  playbookIsLive,
  playbookPageJsonSchema,
  playbookSectionTypes,
  validatePlaybookPage,
  validatedPlaybookPage,
  type PlaybookPageDocument,
  type PlaybookValidationContext,
} from "./playbookContract";

const validateSchema = new Ajv2020({allErrors: true}).compile(schema);
const context: PlaybookValidationContext = {
  routeIds: new Set(["host", "host_run_clubs", "host_start", "host_walkthrough", "pricing"]),
  captureSlots: new Set(["host-formats-pods", "host-live-tablet-run-clubs", "host-create-run-clubs",
    "host-formats-pods-chatty", "host-formats-pods-needs-pod", "host-formats-pods-counts"]),
  captureFragments: new Map([["host-formats-pods-chatty", "host-formats-pods"], ["host-formats-pods-needs-pod", "host-formats-pods"],
    ["host-formats-pods-counts", "host-formats-pods"]]),
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
      "article", "cards", "checklist", "cta", "custom", "faq", "hero", "pricing",
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
    ["lead form without a request kind", fixture((page) => {
      delete (section(page, "cta").leadForm as Mutable).requestKind;
    })],
    ["unknown lead field", fixture((page) => {
      (section(page, "cta").leadForm as Mutable).fields = [{name: "email", label: "Email"}];
    })],
    ["custom section outside the registry", fixture((page) => {
      page.sections.push({type: "custom", id: "calculator", ground: "white", component: "roiCalculator"});
    })],
    ["pricing calculator outside the registry", fixture((page) => {section(page, "pricing").calculator = "roiCalculator";})],
    ["store badges as true", fixture((page) => {section(page, "cta").storeBadges = true;})],
    ["qr code of a URL", fixture((page) => {
      section(page, "timeline").media = {kind: "qr", url: "https://example.com", label: "Open on your phone"};
    })],
    ["table rows as bare lists", fixture((page) => {
      page.sections.push({type: "table", id: "compare", ground: "white", title: "Compare", columns: ["Us", "Them"], rows: [["Price", "Free", "Paid"]]});
    })],
    ["unknown header variant", fixture((page) => {(page.header as Mutable).variant = "lp";})],
    ["unknown feature status", fixture((page) => {page.sections[1].status = "soon";})],
    ["an action with an unknown status", fixture((page) => {(section(page, "hero").actions as Mutable[])[0].status = "later";})],
    ["a lead form input outside tel, url and text", fixture((page) => {(section(page, "cta").leadForm as Mutable).input = "email";})],
    ["a footer column without links", fixture((page) => {(page.footer as Mutable).columns = [{title: "Product", links: []}];})],
    ["a footer link to a URL", fixture((page) => {
      (page.footer as Mutable).columns = [{title: "Product", links: [{label: "Help", to: {href: "https://example.com"}}]}];
    })],
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

  it("floats only fragment captures of the hero's own screen, and has no drawn card", () => {
    expect(validatePlaybookPage(runClubs, context)).toEqual([]);
    const drawn = fixture((page) => {section(page, "hero").chip = {title: "Sunday run", rows: [{label: "Booked", value: "34"}]};});
    expect(validatePlaybookPage(drawn).join("\n")).toMatch(/chip/u);
    expect(validateSchema(drawn)).toBe(false);
    const other = fixture((page) => {section(page, "hero").media = {kind: "capture", slot: "host-create-run-clubs"};});
    expect(validatePlaybookPage(other, context).join("\n")).toMatch(/host-formats-pods-chatty is not a fragment cut from the hero's capture host-create-run-clubs/u);
    const notFragment = fixture((page) => {section(page, "hero").fragments = ["host-live-tablet-run-clubs"];});
    expect(validatePlaybookPage(notFragment, context).join("\n")).toMatch(/is not a fragment cut from/u);
    const noScreen = fixture((page) => {delete section(page, "hero").media;});
    expect(validatePlaybookPage(noScreen).join("\n")).toMatch(/fragments are cut from the hero's capture/u);
    const four = fixture((page) => {section(page, "hero").fragments = ["a", "b", "c", "d"];});
    expect(validateSchema(four)).toBe(false);
    expect(validatePlaybookPage(four).length).toBeGreaterThan(0);
  });

  it("keeps ad landing pages out of search whatever their meta says", () => {
    const lp = fixture((page) => {page.route = "lp_campaign"; (page.meta as Mutable).noindex = false;});
    const lpContext = {...context, routeIds: new Set([...context.routeIds, "lp_campaign"]), alwaysNoindexRoutes: new Set(["lp_campaign"])};
    expect(validatePlaybookPage(lp, lpContext).join("\n")).toMatch(/meta.noindex must stay true/u);
  });

  it("checks family page links and cross-page anchors against the registered pages", () => {
    const familyLink = fixture((page) => {
      (section(page, "hero").actions as Mutable[])[0].to = {page: "story_detail/carter-road", anchor: "quote"};
    });
    expect(validatePlaybookPage(familyLink, {...context, pageAnchors: new Map()}).join("\n")).toMatch(/not a registered page/u);
    expect(validatePlaybookPage(familyLink, {...context, pageAnchors: new Map([["story_detail/carter-road", new Set(["top"])]])}).join("\n"))
      .toMatch(/#quote, which is not a section of story_detail\/carter-road/u);
    const crossAnchor = fixture((page) => {
      (section(page, "hero").actions as Mutable[])[0].to = {route: "host_run_clubs", anchor: "nowhere"};
    });
    expect(validatePlaybookPage(crossAnchor, {...context, routeAnchors: new Map([["host_run_clubs", new Set(["top", "pricing"])]])}).join("\n"))
      .toMatch(/not a section of host_run_clubs/u);
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

  it("shows only built sections and actions, keeping the rest in the content (show-when-live)", () => {
    const page = fixture((draft) => {
      draft.sections[1].status = "partly";
      draft.sections[1].statusNote = "The core exists; the copy describes more.";
      (section(draft, "hero").actions as Mutable[])[1].status = "tryIt";
    });
    expect(validateSchema(page), JSON.stringify(validateSchema.errors)).toBe(true);
    expect(validatePlaybookPage(page)).toEqual([]);
    const live = livePlaybookPage(page as unknown as PlaybookPageDocument);
    expect(live.sections.map((item) => item.id)).toEqual(runClubs.sections.filter((_item, index) => index !== 1).map((item) => item.id));
    const hero = live.sections.find((item) => item.type === "hero");
    expect(hero?.type === "hero" ? hero.actions.map((item) => item.label) : []).toEqual([runClubs.sections[0].actions![0].label]);
    expect(live.sections.every(playbookIsLive)).toBe(true);
    expect(playbookIsLive({})).toBe(true);
    expect(playbookIsLive({status: "new"})).toBe(false);
  });

  it("refuses a live link to a hidden section, and counts the page title among live sections only", () => {
    const hiddenTarget = fixture((page) => {
      page.sections[1].status = "tryIt";
      (section(page, "hero").actions as Mutable[])[1].to = {anchor: page.sections[1].id as string};
    });
    expect(validatePlaybookPage(hiddenTarget).join("\n")).toMatch(/hidden until its feature is built/u);
    const hiddenLink = fixture((page) => {
      page.sections[1].status = "tryIt";
      const actions = section(page, "hero").actions as Mutable[];
      actions[1].to = {anchor: page.sections[1].id as string};
      actions[1].status = "tryIt";
    });
    expect(validatePlaybookPage(hiddenLink)).toEqual([]);
    expect(validatePlaybookPage(fixture((page) => {section(page, "hero").status = "new";})).join("\n")).toMatch(/exactly one page title/u);
  });

  it("asks for a link or text only on a tool form, and keeps soft tints to tiles", () => {
    const tool = (input: string | undefined, requestKind: string) => fixture((page) => {
      const form = section(page, "cta").leadForm as Mutable;
      form.requestKind = requestKind;
      if (input) form.input = input; else delete form.input;
      delete form.format;
    });
    expect(validatePlaybookPage(tool("url", "tool"))).toEqual([]);
    expect(validatePlaybookPage(tool(undefined, "tool")).join("\n")).toMatch(/only a tool form/u);
    expect(validatePlaybookPage(tool("url", "demo")).join("\n")).toMatch(/only a tool form/u);
    expect(validatePlaybookPage(fixture((page) => {page.sections[1].ground = "skySoft";})).join("\n")).toMatch(/soft tint, for a tile only/u);
    expect(validatePlaybookPage(fixture((page) => {page.sections[1].ground = "sky";}))).toEqual([]);
    const softTile = fixture((page) => {
      const tiles = page.sections.find((item) => item.type === "tiles")!;
      (tiles.items as Mutable[])[0].ground = "coralSoft";
    });
    expect(validatePlaybookPage(softTile)).toEqual([]);
  });

  it("refuses a link label that only repeats its tile's or group's title", () => {
    expect(playbookLabelRepeatsTitle("Your page", "Your page")).toBe(true);
    expect(playbookLabelRepeatsTitle("Forms", "Forms, in every step")).toBe(true);
    expect(playbookLabelRepeatsTitle("For supper clubs", "Supper clubs")).toBe(false);
    expect(playbookLabelRepeatsTitle("Build my page", "Paste your Instagram or Luma")).toBe(false);
    const tileRepeat = fixture((page) => {
      const tiles = section(page, "tiles");
      const item = (tiles.items as Mutable[])[0];
      item.link = {label: item.title, to: {route: "host"}};
    });
    expect(validatePlaybookPage(tileRepeat).join("\n")).toMatch(/repeats the tile's title/u);
    const groupRepeat = fixture((page) => {
      page.sections.push({type: "split", id: "groups", ground: "paper", status: "built", kicker: "Sample", title: "Sample groups",
        groups: [{title: "Your page", list: ["A line"], links: [{label: "Your page", to: {route: "host"}}]}]});
    });
    expect(validatePlaybookPage(groupRepeat).join("\n")).toMatch(/repeats the group's title/u);
    const groupArrow = fixture((page) => {
      page.sections.push({type: "split", id: "groups", ground: "paper", status: "built", kicker: "Sample", title: "Sample groups",
        groups: [{title: "Your page", list: ["A line"], links: [{to: {route: "host"}}]}]});
    });
    expect(validatePlaybookPage(groupArrow).join("\n")).not.toMatch(/repeats/u);
  });

  it("checks the footer's own columns like any other link", () => {
    const columns = fixture((page) => {
      (page.footer as Mutable).columns = [{title: "Product", links: [{label: "Pricing", to: {route: "pricing"}}]}, {title: "More", links: [{label: "Gone", to: {route: "host_mixers"}}]}];
    });
    expect(validateSchema(columns), JSON.stringify(validateSchema.errors)).toBe(true);
    expect(validatePlaybookPage(columns, context).join("\n")).toMatch(/footer\.columns\[1\]\.links\[0\] links unknown route host_mixers/u);
  });

  it("needs exactly one page title and unique section ids", () => {
    expect(validatePlaybookPage(fixture((page) => {page.sections = page.sections.slice(1);})).join("\n"))
      .toMatch(/exactly one page title/u);
    expect(validatePlaybookPage(fixture((page) => {page.sections[2].id = page.sections[1].id;})).join("\n"))
      .toMatch(/duplicate id/u);
  });
});
