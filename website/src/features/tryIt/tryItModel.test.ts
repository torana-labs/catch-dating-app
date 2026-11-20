import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {websiteCities} from "@content/markets";
import {playbookTryItTool, tryItCities, tryItEventWhen, tryItKitLinks, tryItKitLinksProblem, tryItLink, tryItLocalDate} from "./tryItModel";

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
    expect(playbookTryItTool("constructor")).toBeNull();
  });

  it("words dates in the market's timezone", () => {
    expect(tryItEventWhen("2026-11-23T01:00:00.000Z", "Asia/Kolkata")).toBe("Mon 23 Nov · 6:30 AM");
    expect(tryItEventWhen("soon")).toBe("soon");
    expect(tryItLocalDate("2026-11-23")).toBe("Mon 23 Nov");
  });
});
