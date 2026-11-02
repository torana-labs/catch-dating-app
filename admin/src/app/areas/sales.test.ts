import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

describe("Sales routes", () => {
  it("resolves a task", () => {
    const route = resolveAdminRoute("/sales/today/task-1");
    expect(route.nav).toBe("sales");
    expect(route.params.salesTaskId).toBe("task-1");
  });

  it("resolves a host and a nomination in their own areas", () => {
    expect(resolveAdminRoute("/sales/hosts/host-1")).toMatchObject({nav: "sales-hosts", params: {salesOrganizerId: "host-1"}});
    expect(resolveAdminRoute("/sales/nominations/supply-req-1")).toMatchObject({nav: "nominations", params: {nominationItemId: "supply-req-1"}});
  });

  it("gives a host its own privacy page", () => {
    expect(resolveAdminRoute("/sales/hosts/host-1")).toMatchObject({salesHostPage: "main"});
    expect(resolveAdminRoute("/sales/hosts/host-1/privacy")).toMatchObject({nav: "sales-hosts", salesHostPage: "privacy", params: {salesOrganizerId: "host-1"}});
  });

  it("keeps a host's full tools and adding a host reachable from the new Sales screens", () => {
    expect(resolveAdminRoute("/sales/hosts/host-1/tools")).toMatchObject({nav: "sales", salesArea: "hosts",
      params: {salesOrganizerId: "host-1"}});
    expect(resolveAdminRoute("/sales/add-host")).toMatchObject({nav: "sales", salesArea: "hosts"});
    expect(resolveAdminRoute("/sales/hosts/host-1").nav).toBe("sales-hosts");
  });

  it("keeps the older Sales pages reachable until their tools move", () => {
    for (const area of ["pipeline", "pilots", "research", "settings"] as const) {
      expect(resolveAdminRoute(`/sales/${area}`)).toMatchObject({nav: "sales", salesArea: area});
    }
  });
});
