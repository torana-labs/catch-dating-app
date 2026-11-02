import {describe, expect, it, vi} from "vitest";
import {adminAreas} from "./adminAreas";
import {adminAreaList, adminPathForNav, adminRoutes, resolveAdminRoute} from "./adminRoutes";

// What every area has to satisfy. What one area's routes do is tested beside it in areas/.
describe("Admin route contract", () => {
  it.each(adminAreaList.map((area) => area.id))("resolves the %s navigation destination", (nav) => {
    expect(resolveAdminRoute(adminPathForNav(nav)).nav).toBe(nav);
  });

  it.each(adminAreaList.map((area) => area.id))("gives the %s area a screen", (nav) => {
    expect(adminAreas[nav].render).toBeTypeOf("function");
  });

  it("names every route once, so no area takes another's address", () => {
    const paths = adminRoutes.map((route) => route.path);
    expect(paths.length).toBe(new Set(paths).size);
  });

  it("names an unknown path no area", () => {
    expect(resolveAdminRoute("/not-a-section").nav).toBeNull();
  });

  it.each(["a/b", "a%2Fb", "a%25b", "a b", "a?b", "a#b"])("round-trips the opaque ID %s without decoding it twice", (id) => {
    expect(resolveAdminRoute(`/events/${encodeURIComponent(id)}`).params.eventId).toBe(id);
  });

  it("accepts malformed percent encoding without crashing the shell", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      expect(resolveAdminRoute("/events/record%invalid").params.eventId).toBe("record%invalid");
    } finally {
      warning.mockRestore();
    }
  });
});
