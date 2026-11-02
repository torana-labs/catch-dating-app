import {expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

it("sends old Agent activity and Data quality links to System", () => {
  for (const path of ["/operations", "/quality", "/quality/signals/source-1"]) {
    expect(resolveAdminRoute(path)).toMatchObject({nav: "system", redirect: "/system"});
  }
  expect(resolveAdminRoute("/system").redirect).toBeNull();
});
