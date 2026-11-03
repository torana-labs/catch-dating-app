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

  it("gives a host its own fit, privacy and demo pages", () => {
    expect(resolveAdminRoute("/sales/hosts/host-1/fit")).toMatchObject({nav: "sales-hosts", salesHostPage: "fit", params: {salesOrganizerId: "host-1"}});
    expect(resolveAdminRoute("/sales/hosts/host-1/demo")).toMatchObject({nav: "sales-hosts", salesHostPage: "demo", params: {salesOrganizerId: "host-1"}});
    expect(resolveAdminRoute("/sales/hosts/host-1")).toMatchObject({salesHostPage: "main"});
    expect(resolveAdminRoute("/sales/hosts/host-1/privacy")).toMatchObject({nav: "sales-hosts", salesHostPage: "privacy", params: {salesOrganizerId: "host-1"}});
  });

  it("adding a host opens over Hosts", () => {
    expect(resolveAdminRoute("/sales/add-host")).toMatchObject({nav: "sales-hosts", salesHostPage: "add"});
    expect(resolveAdminRoute("/sales/fit-queue")).toMatchObject({nav: "sales-hosts", salesHostPage: "fit-queue"});
    expect(resolveAdminRoute("/sales/hosts/host-1").nav).toBe("sales-hosts");
    expect(resolveAdminRoute("/sales/settings").redirect).toBe("/settings/sales");
  });

  it("sends the retired Sales pages to what replaced them", () => {
    expect(resolveAdminRoute("/sales/hosts/host-1/tools").redirect).toBe("/sales/hosts");
    expect(resolveAdminRoute("/sales/pipeline").redirect).toBe("/sales/deals");
    expect(resolveAdminRoute("/sales/pilots").redirect).toBe("/sales/deals");
    expect(resolveAdminRoute("/sales/research").redirect).toBe("/sales/hosts");
  });
});
