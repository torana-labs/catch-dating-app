import {expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";

it("opens User analytics at its own address", () => {
  expect(resolveAdminRoute("/users").redirect).toBeNull();
});
