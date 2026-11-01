import {renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {
  loadAdminCallableValidators,
} from
  "../../../../generated/validators/adminCallableValidators";

import {createQueryHarness} from
  "../../../../shared/test/queryHarness";
import {sampleIntakeOperations} from
  "../../../../shared/operations/sampleIntakeOperations";
import {
  loadCompleteIntakeOperations,
  loadNextIntakeOperationsPage,
  useIntakeOperationsController,
} from
  "./useIntakeOperationsController";

const {validateAdminCallableRequest, validateAdminCallableResponse} =
  await loadAdminCallableValidators("adminListIntakeOperations");

describe("useIntakeOperationsController", () => {
  it("accepts bounded unavailable diagnostics through the real generated callable boundary", () => {
    const sample = sampleIntakeOperations();
    const cursor = "x".repeat(1500);
    const record = unavailable(cursor);
    const response = {...sample, workItems: sample.workItems.slice(0, -1),
      workItemPage: {scannedCount: sample.workItems.length,
        unavailableRecords: [record]}, nextWorkItemCursor: cursor};
    expect(() => validateAdminCallableRequest("adminListIntakeOperations",
      {workItemCursor: cursor})).not.toThrow();
    expect(() => validateAdminCallableResponse("adminListIntakeOperations",
      response)).not.toThrow();
    expect(() => validateAdminCallableResponse("adminListIntakeOperations", {
      ...response, workItemPage: {...response.workItemPage,
        unavailableRecords: [{...record, rawDocument: {privateValue: "hidden"}}]},
    })).toThrow();
    expect(() => validateAdminCallableRequest("adminListIntakeOperations",
      {workItemCursor: cursor + "x"})).toThrow();
    expect(() => validateAdminCallableRequest("adminListIntakeOperations",
      {runCursor: "x".repeat(1001)})).toThrow();
  });

  it("loads the persisted-stage projection with safe capabilities", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    const {result} = renderHook(() => useIntakeOperationsController({onError}), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.summary.stages).toEqual({
      incoming: 1,
      verify: 1,
      resolve: 1,
      ready: 1,
    });
    expect(result.current.data?.capabilities).toMatchObject({
      requestRuns: false,
      networkFetches: false,
      modelCalls: false,
      publicWrites: false,
    });
    expect(onError).toHaveBeenLastCalledWith(null);
  });

  it("tolerates a rolling-deploy response without organizer draft links", async () => {
    const sample = sampleIntakeOperations();
    const legacyResponse = structuredClone(sample) as
      Partial<typeof sample>;
    delete legacyResponse.organizerDraftLinks;
    const loader = vi.fn(async () => legacyResponse as typeof sample);

    const result = await loadCompleteIntakeOperations(loader);

    expect(result.organizerDraftLinks).toEqual([]);
  });

  it("drains the selected run so a later-page human exception is accessible", async () => {
    const sample = sampleIntakeOperations();
    const ordinary = sample.workItems.find((item) =>
      !item.taskFlags.includes("human_review_required"));
    const exception = sample.workItems.find((item) =>
      item.taskFlags.includes("human_review_required"));
    expect(ordinary).toBeTruthy();
    expect(exception).toBeTruthy();
    if (!ordinary || !exception) throw new Error("sample inventory is incomplete");
    const summary = {
      ...sample.summary,
      workItemCount: 2,
      humanReviewCount: 1,
    };
    const loader = vi.fn()
      .mockResolvedValueOnce({
        ...sample,
        summary,
        workItems: [ordinary],
        nextWorkItemCursor: "work-page-2",
      })
      .mockResolvedValueOnce({
        ...sample,
        summary,
        workItems: [exception],
        nextWorkItemCursor: null,
      });

    const result = await loadCompleteIntakeOperations(loader);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(loader.mock.calls[1]?.[0]).toMatchObject({
      runId: sample.runs[0].runId,
      runCursor: null,
      workItemCursor: "work-page-2",
      humanReviewRequired: true,
    });
    expect(result.workItems).toHaveLength(2);
    expect(result.workItems.some((item) =>
      item.workItemId === exception.workItemId)).toBe(true);
    expect(result.nextWorkItemCursor).toBeNull();
  });

  it("keeps a maximum ordinary run lazy after the first page", async () => {
    const sample = sampleIntakeOperations();
    const template = sample.workItems.find((item) =>
      !item.taskFlags.includes("human_review_required"));
    expect(template).toBeTruthy();
    if (!template) throw new Error("sample inventory is incomplete");
    const capacity = 10_000;
    const pageSize = 200;
    const firstPage = Array.from({length: pageSize}, (_, itemIndex) => ({
        ...template,
        workItemId: `capacity-0-${itemIndex}`,
        externalKey: `capacity-0-${itemIndex}`,
        taskFlags: [],
        blockerCodes: [],
        normalizedPayload: {
          ...template.normalizedPayload,
          owner: "system",
        },
      }));
    const summary = {
      ...sample.summary,
      workItemCount: capacity,
      humanReviewCount: 0,
      stages: {
        incoming: capacity,
        verify: 0,
        resolve: 0,
        ready: 0,
      },
    };
    const loader = vi.fn(async () => ({
      ...sample,
      summary,
      workItems: firstPage,
      nextWorkItemCursor: "capacity-page-1",
    }));

    const result = await loadCompleteIntakeOperations(loader);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(result.workItems).toHaveLength(pageSize);
    expect(result.nextWorkItemCursor).toBe("capacity-page-1");
  });

  it("hydrates every exception in a maximum shard before handoff", async () => {
    const sample = sampleIntakeOperations();
    const template = sample.workItems.find((item) =>
      item.taskFlags.includes("human_review_required"));
    expect(template).toBeTruthy();
    if (!template) throw new Error("sample exception is missing");
    const capacity = 10_000;
    const pageSize = 200;
    const summary = {
      ...sample.summary,
      workItemCount: capacity,
      humanReviewCount: capacity,
      stages: {
        incoming: 0,
        verify: 0,
        resolve: capacity,
        ready: 0,
      },
    };
    const loader = vi.fn(async (payload) => {
      const pageIndex = payload.workItemCursor ?
        Number(payload.workItemCursor.replace("exception-page-", "")) : 0;
      const workItems = Array.from({length: pageSize}, (_, itemIndex) => ({
        ...template,
        workItemId: `exception-${pageIndex}-${itemIndex}`,
        externalKey: `exception-${pageIndex}-${itemIndex}`,
      }));
      return {
        ...sample,
        summary,
        workItems,
        nextWorkItemCursor: pageIndex + 1 < capacity / pageSize ?
          `exception-page-${pageIndex + 1}` : null,
      };
    });

    const result = await loadCompleteIntakeOperations(loader);
    expect(loader).toHaveBeenCalledTimes(50);
    expect(loader.mock.calls.slice(1).every(([payload]) =>
      payload.humanReviewRequired === true &&
      payload.workItemLimit === 200)).toBe(true);
    expect(result.workItems).toHaveLength(capacity);
    expect(result.nextWorkItemCursor).toBeNull();
  });

  it("loads one ordinary page and merges already-hydrated exceptions", async () => {
    const sample = sampleIntakeOperations();
    const summary = {
      ...sample.summary,
      workItemCount: 5,
      stages: {...sample.summary.stages, incoming: 2},
    };
    const current = {
      ...sample,
      summary,
      nextWorkItemCursor: "ordinary-page-2",
    };
    const pageItem = {
      ...sample.workItems[0],
      workItemId: "ordinary-page-2-item",
      externalKey: "ordinary-page-2-item",
    };
    const loader = vi.fn(async () => ({
      ...sample,
      summary,
      workItems: [pageItem],
      nextWorkItemCursor: null,
    }));

    const result = await loadNextIntakeOperationsPage(current, loader);
    expect(loader).toHaveBeenCalledWith(expect.objectContaining({
      runId: sample.runs[0].runId,
      workItemCursor: "ordinary-page-2",
      humanReviewRequired: false,
    }));
    expect(result.workItems.some((item) =>
      item.workItemId === pageItem.workItemId)).toBe(true);
    expect(result.nextWorkItemCursor).toBeNull();
  });

  it("fails when the initial cursor ends before inventory cardinality", async () => {
    const sample = sampleIntakeOperations();
    const loader = vi.fn(async () => ({
      ...sample,
      summary: {
        ...sample.summary,
        workItemCount: sample.workItems.length + 1,
      },
      nextWorkItemCursor: null,
    }));
    await expect(loadCompleteIntakeOperations(loader)).rejects.toThrow(
      "ended before the persisted inventory was complete"
    );
  });

  it.each([
    {label: "ends early", cursor: null, duplicateOnly: false},
    {label: "repeats its cursor", cursor: "ordinary-page-2", duplicateOnly: false},
    {label: "returns only duplicates", cursor: "ordinary-page-3", duplicateOnly: true},
  ])("fails when ordinary pagination $label", async ({
    cursor,
    duplicateOnly,
  }) => {
    const sample = sampleIntakeOperations();
    const summary = {
      ...sample.summary,
      workItemCount: sample.workItems.length + 2,
    };
    const current = {
      ...sample,
      summary,
      nextWorkItemCursor: "ordinary-page-2",
    };
    const pageItem = duplicateOnly ? sample.workItems[0] : {
      ...sample.workItems[0],
      workItemId: "ordinary-new-item",
      externalKey: "ordinary-new-item",
    };
    const loader = vi.fn(async () => ({
      ...sample,
      summary,
      workItems: [pageItem],
      nextWorkItemCursor: cursor,
    }));
    await expect(
      loadNextIntakeOperationsPage(current, loader)
    ).rejects.toThrow("ended or stalled");
  });

  it("accounts for a malformed first-page exception without losing healthy rows", async () => {
    const sample = sampleIntakeOperations();
    const ordinary = sample.workItems.find((item) =>
      !item.taskFlags.includes("human_review_required"))!;
    const summary = {...sample.summary, workItemCount: 2, humanReviewCount: 1};
    const bad = unavailable("legacy-packet");
    const loader = vi.fn()
      .mockResolvedValueOnce({...sample, summary, workItems: [ordinary],
        workItemPage: {scannedCount: 2, unavailableRecords: [bad]},
        nextWorkItemCursor: null})
      .mockResolvedValueOnce({...sample, summary, workItems: [],
        workItemPage: {scannedCount: 1, unavailableRecords: [bad]},
        nextWorkItemCursor: null});

    const result = await loadCompleteIntakeOperations(loader);

    expect(result.workItems).toEqual([ordinary]);
    expect(result.summary).toEqual(summary);
    expect(result.readInventory).toEqual({unavailableRecords: [bad],
      humanReviewUnavailableDocumentIds: [bad.documentId]});
    expect(loader.mock.calls[1]?.[0]).toMatchObject({
      workItemCursor: null, humanReviewRequired: true,
    });
    expect(result.nextWorkItemCursor).toBeNull();
  });

  it("advances through all-invalid ordinary pages using raw page cursors", async () => {
    const sample = sampleIntakeOperations();
    const ordinary = sample.workItems.find((item) =>
      !item.taskFlags.includes("human_review_required"))!;
    const summary = {...sample.summary, workItemCount: 3, humanReviewCount: 0};
    const firstBad = unavailable("bad-1");
    const secondBad = unavailable("bad-2");
    const loader = vi.fn()
      .mockResolvedValueOnce({...sample, summary, workItems: [],
        workItemPage: {scannedCount: 1, unavailableRecords: [firstBad]},
        nextWorkItemCursor: " bad-1 "})
      .mockResolvedValueOnce({...sample, summary, workItems: [],
        workItemPage: {scannedCount: 1, unavailableRecords: [secondBad]},
        nextWorkItemCursor: "bad-2"})
      .mockResolvedValueOnce({...sample, summary, workItems: [ordinary],
        workItemPage: {scannedCount: 1, unavailableRecords: []},
        nextWorkItemCursor: null});

    const first = await loadCompleteIntakeOperations(loader);
    expect(first.nextWorkItemCursor).toBe(" bad-1 ");
    const second = await loadNextIntakeOperationsPage(first, loader);
    expect(second.workItems).toEqual([]);
    expect(second.nextWorkItemCursor).toBe("bad-2");
    const result = await loadNextIntakeOperationsPage(second, loader);
    expect(result.workItems).toEqual([ordinary]);
    expect(result.readInventory?.unavailableRecords).toEqual([firstBad, secondBad]);
    expect(result.summary).toEqual(summary);
    expect(result.nextWorkItemCursor).toBeNull();
    expect(loader.mock.calls[1]?.[0].workItemCursor).toBe(" bad-1 ");
  });

  it("hydrates all-invalid exception pages and deduplicates ordinary diagnostics", async () => {
    const sample = sampleIntakeOperations();
    const summary = {...sample.summary, workItemCount: 2, humanReviewCount: 2};
    const firstBad = unavailable("bad-1");
    const secondBad = unavailable("bad-2");
    const loader = vi.fn()
      .mockResolvedValueOnce({...sample, summary, workItems: [],
        workItemPage: {scannedCount: 1, unavailableRecords: [firstBad]},
        nextWorkItemCursor: "bad-1"})
      .mockResolvedValueOnce({...sample, summary, workItems: [],
        workItemPage: {scannedCount: 1, unavailableRecords: [firstBad]},
        nextWorkItemCursor: "bad-1"})
      .mockResolvedValueOnce({...sample, summary, workItems: [],
        workItemPage: {scannedCount: 1, unavailableRecords: [secondBad]},
        nextWorkItemCursor: null});

    const result = await loadCompleteIntakeOperations(loader);
    expect(result.workItems).toEqual([]);
    expect(result.readInventory?.unavailableRecords).toEqual([firstBad, secondBad]);
    expect(result.readInventory?.humanReviewUnavailableDocumentIds)
      .toEqual(["bad-1", "bad-2"]);
    expect(result.nextWorkItemCursor).toBeNull();
  });

  it("keeps ordinary unavailable records out of the exception count", async () => {
    const sample = sampleIntakeOperations();
    const exception = sample.workItems.find((item) =>
      item.taskFlags.includes("human_review_required"))!;
    const summary = {...sample.summary, workItemCount: 3, humanReviewCount: 1};
    const bad = unavailable("ordinary-invalid");
    const loader = vi.fn()
      .mockResolvedValueOnce({...sample, summary, workItems: [],
        workItemPage: {scannedCount: 1, unavailableRecords: [bad]},
        nextWorkItemCursor: "ordinary-invalid"})
      .mockResolvedValueOnce({...sample, summary, workItems: [exception],
        workItemPage: {scannedCount: 1, unavailableRecords: []},
        nextWorkItemCursor: null})
      .mockResolvedValueOnce({...sample, summary, workItems: [exception],
        workItemPage: {scannedCount: 1, unavailableRecords: []},
        nextWorkItemCursor: "exception-already-loaded"});

    const first = await loadCompleteIntakeOperations(loader);
    expect(first.readInventory?.humanReviewUnavailableDocumentIds).toEqual([]);
    expect(first.nextWorkItemCursor).toBe("ordinary-invalid");
    // The ordinary lane can scan a healthy exception already loaded by the
    // filtered lane; the raw cursor proves progress even without a new row.
    const next = await loadNextIntakeOperationsPage(first, loader);
    expect(next.workItems).toEqual([exception]);
    expect(next.nextWorkItemCursor).toBe("exception-already-loaded");
  });

  it("rejects unavailable inventory exceeding the persisted total", async () => {
    const sample = sampleIntakeOperations();
    const loader = vi.fn(async () => ({...sample, workItems: [],
      summary: {...sample.summary, workItemCount: 1, humanReviewCount: 0},
      workItemPage: {scannedCount: 2,
        unavailableRecords: [unavailable("bad-1"), unavailable("bad-2")]},
      nextWorkItemCursor: null}));
    await expect(loadCompleteIntakeOperations(loader))
      .rejects.toThrow("exceeds its persisted run summary");
  });

  it("rejects filtered unavailable exception counts exceeding the summary", async () => {
    const sample = sampleIntakeOperations();
    const summary = {...sample.summary, workItemCount: 3, humanReviewCount: 1};
    const loader = vi.fn()
      .mockResolvedValueOnce({...sample, summary, workItems: [],
        workItemPage: {scannedCount: 1, unavailableRecords: [unavailable("ordinary")]},
        nextWorkItemCursor: "ordinary"})
      .mockResolvedValueOnce({...sample, summary, workItems: [],
        workItemPage: {scannedCount: 2,
          unavailableRecords: [unavailable("bad-1"), unavailable("bad-2")]},
        nextWorkItemCursor: null});
    await expect(loadCompleteIntakeOperations(loader))
      .rejects.toThrow("exception inventory is incomplete");
  });

  it.each([
    {label: "scan mismatch", scannedCount: 2, records: [unavailable("bad")]},
    {label: "duplicate documents", scannedCount: 2,
      records: [unavailable("bad"), unavailable("bad")]},
    {label: "empty advancing page", scannedCount: 0, records: []},
  ])("rejects $label rather than fabricating scan progress", async ({scannedCount, records}) => {
    const sample = sampleIntakeOperations();
    const loader = vi.fn(async () => ({...sample, workItems: [],
      workItemPage: {scannedCount, unavailableRecords: records},
      nextWorkItemCursor: "cursor"}));
    await expect(loadCompleteIntakeOperations(loader)).rejects.toThrow();
  });

  it("retains run and summary drift fences when unavailable rows are present", async () => {
    const sample = sampleIntakeOperations();
    const summary = {...sample.summary, workItemCount: 2, humanReviewCount: 1};
    for (const change of [
      {runs: [{...sample.runs[0], runId: "other-run"}]},
      {summary: {...summary, workItemCount: 3}},
    ]) {
      const loader = vi.fn()
        .mockResolvedValueOnce({...sample, summary, workItems: [],
          workItemPage: {scannedCount: 1, unavailableRecords: [unavailable("bad")]},
          nextWorkItemCursor: "bad"})
        .mockResolvedValueOnce({...sample, summary, workItems: [],
          workItemPage: {scannedCount: 1, unavailableRecords: [unavailable("bad")]},
          nextWorkItemCursor: null, ...change});
      await expect(loadCompleteIntakeOperations(loader)).rejects.toThrow(/boundaries|summary changed/);
    }
  });

});


function unavailable(documentId: string) {
  return {documentId, reason: "invalid_record" as const,
    issues: [{path: "/normalizedPayload/intake/packet/publicPresence",
      code: "required"}], issuesTruncated: false};
}
