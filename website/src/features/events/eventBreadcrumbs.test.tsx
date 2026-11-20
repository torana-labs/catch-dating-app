import {describe, expect, it} from "vitest";
import type {MarketCity} from "@content/markets/types";
import {publicSiteCopy} from "@content/site";
import {eventBreadcrumbJsonLd, eventBreadcrumbs} from "./eventBreadcrumbs";

const city = (label: string, status: MarketCity["status"], aliases: string[] = []): MarketCity => {
  const slug = label.toLowerCase();
  return {id: `in-xx-${slug}`, slug, marketSlug: slug, label, aliases, legacySlugs: [],
    timezone: "Asia/Kolkata", status, hostCreatable: status === "live", countryIsoCode: "IN", latitude: 0, longitude: 0};
};
const cities = [city("Mumbai", "live"), city("Bengaluru", "live", ["Bangalore"]), city("Pune", "waitlist")];
const whatsOn = {href: publicSiteCopy.whatsOn.href, label: publicSiteCopy.whatsOn.label};

describe("event breadcrumbs", () => {
  it("leads with What's on, then the organiser's open city, then the event", () => {
    expect(eventBreadcrumbs({city: " mumbai ", title: "Sunday run"}, cities)).toEqual({
      links: [whatsOn, {href: "/mumbai/", label: "Mumbai"}],
      current: "Sunday run",
    });
  });

  it("reads a city's other spellings", () => {
    expect(eventBreadcrumbs({city: "Bangalore", title: "Quiz night"}, cities).links[1]).toEqual({href: "/bengaluru/", label: "Bengaluru"});
  });

  it("leaves out a city that is not open or not listed", () => {
    for (const name of ["Pune", "Goa", ""]) {
      expect(eventBreadcrumbs({city: name, title: "Supper club"}, cities).links).toEqual([whatsOn]);
    }
  });

  it("states the same trail as BreadcrumbList structured data with absolute URLs", () => {
    const trail = eventBreadcrumbs({city: "Mumbai", title: "Sunday run"}, cities);
    expect(eventBreadcrumbJsonLd(trail, {origin: "https://example.test", path: "/events/sunday-run/"})).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {"@type": "ListItem", position: 1, name: whatsOn.label, item: "https://example.test/explore/"},
        {"@type": "ListItem", position: 2, name: "Mumbai", item: "https://example.test/mumbai/"},
        {"@type": "ListItem", position: 3, name: "Sunday run", item: "https://example.test/events/sunday-run/"},
      ],
    });
  });
});
