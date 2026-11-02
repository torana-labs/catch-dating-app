import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

describe("Needs you routes", () => {
  it("sends the root and the old overview to Needs you", () => {
    expect(resolveAdminRoute("/")).toMatchObject({nav: "now", redirect: "/now"});
    expect(resolveAdminRoute("/overview")).toMatchObject({nav: "now", redirect: "/now"});
    expect(resolveAdminRoute("/cross-paths")).toMatchObject({nav: "now", redirect: "/now"});
    expect(resolveAdminRoute("/now").redirect).toBeNull();
  });
});
