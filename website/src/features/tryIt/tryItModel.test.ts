import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {websiteCities} from "@content/markets";
import {tryItCopy} from "@content/tryIt";
import {
  playbookTryItTool,
  tryItCities,
  tryItEventWhen,
  tryItFormFlagCodes,
  tryItFormFlagGroups,
  tryItKitLinks,
  tryItKitLinksProblem,
  tryItLink,
  tryItLocalDate,
  websiteReadyTryItCommands,
} from "./tryItModel";

/** A kit link as the command takes it. */
const kitLink = (name: string, kind: "channel" | "promoter", source?: string) => ({label: name, kind, ...(source ? {source} : {})});

describe("try-it model", () => {
  it("takes a full link, one without https://, or an Instagram handle for the page tool", () => {
    expect(tryItLink("https://driftwoodbayrunners.example/runs", "organizer")).toBe("https://driftwoodbayrunners.example/runs");
    expect(tryItLink("  instagram.com/driftwoodbayrunners ", "organizer")).toBe("https://instagram.com/driftwoodbayrunners");
    expect(tryItLink("@driftwoodbayrunners", "organizer")).toBe("https://www.instagram.com/driftwoodbayrunners/");
    expect(tryItLink("@driftwoodbayrunners", "event")).toBeNull();
    expect(tryItLink("tickets.example/sunday-supper", "event")).toBe("https://tickets.example/sunday-supper");
  });

  it("refuses what the commands refuse: no address, another scheme, credentials, a bare IP or a host with no dot", () => {
    for (const typed of ["", "   ", "not a link", "ftp://files.example/x", "https://user:pw@site.example/", "https://192.168.0.1/", "localhost/page", "javascript://x.example"]) {
      expect(tryItLink(typed, "organizer"), typed).toBeNull();
    }
  });

  it("splits where the visitor promotes into labelled links, naming known channels and marked people", () => {
    expect(tryItKitLinks("Instagram,  run club WhatsApp\nKabir, Brindle Café poster", new Set(["kabir"]))).toEqual([
      kitLink("Instagram", "channel", "instagram"), kitLink("run club WhatsApp", "channel", "whatsapp"),
      kitLink("Kabir", "promoter"), kitLink("Brindle Café poster", "channel", "print"),
    ]);
    expect(tryItKitLinks(`${"x".repeat(90)}`)[0].label).toHaveLength(80);
  });

  it("asks for at least one and at most eight different places or people", () => {
    expect(tryItKitLinksProblem([])).toBe("channelsRequired");
    expect(tryItKitLinksProblem(tryItKitLinks("a,b,c,d,e,f,g,h,i"))).toBe("channelsTooMany");
    expect(tryItKitLinksProblem(tryItKitLinks("Instagram, instagram"))).toBe("channelsDuplicate");
    expect(tryItKitLinksProblem(tryItKitLinks("a,b,c,d,e,f,g,h"))).toBeNull();
  });

  it("offers the cities where an organiser can be created (surfaces.hostCreatable), not those that are merely live", () => {
    const catalog = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../../contracts/catalogs/markets.json"), "utf8")) as
      {cities: {marketId: string; surfaces: {hostCreatable: boolean; websiteListed: boolean}}[]};
    const creatable = catalog.cities.filter((city) => city.surfaces.websiteListed && city.surfaces.hostCreatable).map((city) => city.marketId);
    expect(tryItCities().map((city) => city.id)).toEqual(creatable);
    expect(tryItCities().length).toBeGreaterThan(0);
    expect(tryItCities().length).toBeLessThan(websiteCities.length);
  });

  it("opens each product page's tool only while its command is website-ready", () => {
    expect(playbookTryItTool("product_your_page")).toBe("organizer");
    expect(playbookTryItTool("product_bookings")).toBe("event");
    expect(playbookTryItTool("product_messages")).toBe("kit");
    expect(playbookTryItTool("tools_event_page_from_link")).toBe("event");
    expect(playbookTryItTool("product_guests")).toBe("guests");
    expect(playbookTryItTool("product_reports")).toBe("report");
    expect(playbookTryItTool("constructor")).toBeNull();
  });

  it("keeps the Forms page's tool hidden while form.import-from-link is not website-ready, and opens it once it is", () => {
    expect(websiteReadyTryItCommands).not.toContain("form.import-from-link");
    expect(playbookTryItTool("product_forms")).toBeNull();
    // Switching it on is adding the command to websiteReadyTryItCommands.
    expect(playbookTryItTool("product_forms", [...websiteReadyTryItCommands, "form.import-from-link"])).toBe("form");
    expect(playbookTryItTool("product_bookings", [...websiteReadyTryItCommands, "form.import-from-link"])).toBe("event");
  });

  it("takes a Google Form link as typed, and no handle", () => {
    expect(tryItLink("docs.google.com/forms/d/e/FAKE-FORM-ID/viewform", "form")).toBe("https://docs.google.com/forms/d/e/FAKE-FORM-ID/viewform");
    expect(tryItLink("@driftwoodbayrunners", "form")).toBeNull();
  });

  it("groups the form import's flags by line, each source item once, and puts unknown codes on the generic line", () => {
    expect(tryItFormFlagGroups([
      {code: "grid_not_supported", item: "Rate the route"},
      {code: "text_trimmed", item: null},
      {code: "grid_not_supported", item: "Rate the playlist"},
      {code: "grid_not_supported", item: "Rate the route"},
      {code: "quiz_scoring_dropped", item: "Route quiz"},
      {code: "some_later_code", item: null},
    ])).toEqual([
      {code: "grid_not_supported", items: ["Rate the route", "Rate the playlist"]},
      {code: "text_trimmed", items: []},
      {code: "other", items: ["Route quiz"]},
    ]);
    expect(tryItFormFlagGroups([])).toEqual([]);
  });

  it("words every flag code the command's schema names today", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../../contracts/callable_responses/import_form_from_link_response.schema.json"), "utf8")) as
      {properties: {result: {properties: {flags: {items: {properties: {code: {enum: string[]}}}}}}}};
    const codes = schema.properties.result.properties.flags.items.properties.code.enum;
    expect([...tryItFormFlagCodes].sort()).toEqual([...codes].sort());
    for (const code of tryItFormFlagCodes) expect(tryItCopy.tools.form.flags.codes[code], code).toBeTruthy();
  });

  it("words dates in the market's timezone", () => {
    expect(tryItEventWhen("2026-11-23T01:00:00.000Z", "Asia/Kolkata")).toBe("Mon 23 Nov · 6:30 AM");
    expect(tryItEventWhen("soon")).toBe("soon");
    expect(tryItLocalDate("2026-11-23")).toBe("Mon 23 Nov");
  });
});
