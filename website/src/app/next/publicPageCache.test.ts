import {expect, it} from "vitest";
import {isCachedPublicPage, PUBLIC_PAGE_CACHE_CONTROL} from "./publicPageCache";

it("caches only viewer-independent organiser, event and city pages for a minute", () => {
  expect(PUBLIC_PAGE_CACHE_CONTROL).toBe("public, s-maxage=60");
  for (const page of ["home", "visitor_discovery", "organizers", "listing", "event_detail"] as const) expect(isCachedPublicPage(page)).toBe(true);
  for (const page of ["claim", "event_booking", "event_offer", "event_runtime", "event_invite", "household_rsvp", "public_form",
    "sales_demo", "host", "privacy", "terms", "help", "account_deletion", "not_found"] as const) expect(isCachedPublicPage(page)).toBe(false);
});
