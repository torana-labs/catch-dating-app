import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

describe("Event routes", () => {
  it.each([
    ["/events/event-1", "eventId", "event-1"],
    ["/events/external/candidate-1", "externalEventId", "candidate-1"],
  ])("resolves %s", (path, key, value) => {
    const route = resolveAdminRoute(path);
    expect(route.nav).toBe("events");
    expect(route.params[key]).toBe(value);
  });

  it.each([
    ["/events/readiness/", "directory"],
    ["/events/external", "external"],
  ])("does not mistake the %s workspace for a record", (path, workspace) => {
    const route = resolveAdminRoute(path);
    expect(route.eventWorkspace).toBe(workspace);
    expect(route.params.eventId).toBeUndefined();
  });

  it("opens the directory for links to the retired readiness workspace", () => {
    expect(resolveAdminRoute("/events/readiness/source%2Faction")).toMatchObject({
      nav: "events", eventWorkspace: "directory",
    });
    expect(resolveAdminRoute("/events/readiness/source%2Faction").params.eventId).toBeUndefined();
  });

  it("keeps unknown nested paths in their workspace without borrowing a record", () => {
    expect(resolveAdminRoute("/events/unknown/extra")).toMatchObject({nav: "events", eventWorkspace: "directory"});
    expect(resolveAdminRoute("/events/unknown/extra").params.eventId).toBeUndefined();
    expect(resolveAdminRoute("/events/trivia/page")).toMatchObject({nav: "events", eventTab: "page",
      params: {eventId: "trivia"}});
  });

  it("retains the external inventory title", () => {
    expect(resolveAdminRoute("/events/external").title).toBe("External inventory");
  });
});
