import {describe, expect, it} from "vitest";
import type {SalesImportBatch} from "../api/salesTypes";
import {
  salesCorrectionBlocker, salesImportGroups, salesImportName, salesImportRowProblem, salesImportSourceId, salesImportSummary,
} from "./salesImports";

const batch = (over: Partial<SalesImportBatch>): SalesImportBatch => ({importId: "a", sourceId: "october-list", rowCount: 25,
  counts: {created: 20, matched: 2, duplicate: 1, unresolved: 1, rejected: 1}, appliedAt: "2026-10-28T10:00:00.000Z",
  appliedBy: "owner", ...over});

describe("Sales import labels", () => {
  it("stores a name as an ID the server takes, and reads it back", () => {
    expect(salesImportSourceId("  November outreach: list! ")).toBe("november-outreach-list");
    expect(salesImportSourceId("!!!")).toBe("");
    expect(salesImportName("november-outreach-list")).toBe("November outreach list");
    expect(salesImportName(salesImportSourceId("a".repeat(120)))).toHaveLength(96);
  });

  it("gathers a file's batches, newest first, and totals them", () => {
    const groups = salesImportGroups([
      batch({importId: "b", appliedBy: "teammate", appliedAt: "2026-10-29T10:00:00.000Z"}),
      batch({importId: "c", sourceId: "bandra"}),
      batch({importId: "a"}),
    ]);
    expect(groups.map((group) => group.sourceId)).toEqual(["october-list", "bandra"]);
    expect(groups[0]).toMatchObject({name: "October list", added: 40, updated: 4, skipped: 6, appliedBy: "teammate"});
    expect(groups[0]?.batches.map((item) => item.importId)).toEqual(["b", "a"]);
  });

  it("says what a group did, who applied it and when", () => {
    const [group] = salesImportGroups([batch({})]);
    expect(salesImportSummary(group!, "owner")).toMatch(/^20 hosts added, 2 updated, 3 skipped · 1 batch · applied by you on /u);
    expect(salesImportSummary(group!, "other")).toContain("applied by a teammate");
  });

  it("explains known problems in words, and doesn't hide an unknown one", () => {
    expect(salesImportRowProblem("repeated_source_row")).toBe("the same row appears twice");
    expect(salesImportRowProblem("something_new")).toBe("something new");
    expect(salesCorrectionBlocker("sibling_import_membership")).toBe("Another import also touched this host");
    expect(salesCorrectionBlocker("something_new")).toBe("something new");
  });
});
