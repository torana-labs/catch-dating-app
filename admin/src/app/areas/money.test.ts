import {describe, expect, it} from "vitest";
import {resolveAdminRoute} from "../adminRoutes";
import {moneyPath} from "./money";

describe("Money routes", () => {
  it.each([
    ["/money/issues/publicEvent%3Apay-1", "moneyIssueId", "publicEvent:pay-1"],
    ["/money/resolved/payments%3Apay-2", "moneyIssueId", "payments:pay-2"],
    ["/money/bills/org-1_2026-10", "billId", "org-1_2026-10"],
  ])("resolves %s", (path, key, value) => {
    const route = resolveAdminRoute(path);
    expect(route.nav).toBe("money");
    expect(route.params[key]).toBe(value);
  });

  it.each([
    ["/money", "issues", "moneyIssueId"],
    ["/money/resolved", "resolved", "moneyIssueId"],
    ["/money/bills", "bills", "billId"],
  ])("does not mistake the %s workspace for a record", (path, view, recordKey) => {
    const route = resolveAdminRoute(path);
    expect(route.moneyView).toBe(view);
    expect(route.params[recordKey]).toBeUndefined();
  });

  it("builds Money paths that resolve back to their view and record", () => {
    for (const [view, id] of [["issues", "payments:a/b"], ["resolved", "payments:c"], ["bills", "org_2026-10"]] as const) {
      const route = resolveAdminRoute(moneyPath(view, id));
      expect(route.moneyView).toBe(view);
      expect(route.params.billId ?? route.params.moneyIssueId).toBe(id);
      expect(resolveAdminRoute(moneyPath(view)).moneyView).toBe(view);
    }
  });

  it("sends old Finance issue links to Money", () => {
    expect(resolveAdminRoute("/finance/issues/x").redirect).toBe("/money");
  });
});
