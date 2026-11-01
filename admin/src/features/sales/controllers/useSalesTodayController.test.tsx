import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useSalesTodayController} from "./useSalesTodayController";

const repository = vi.hoisted(() => ({
  listSalesTasks: vi.fn(), getSalesAccount: vi.fn(), upsertSalesTask: vi.fn(), recordSalesActivity: vi.fn(),
}));
vi.mock("../api/salesRepository", () => repository);

const day = 86_400_000;
const task = (taskId: string, dueInDays: number | null, kind = "follow_up") => ({taskId, organizerId: `org-${taskId}`, kind,
  title: `Task ${taskId}`, dueAt: dueInDays === null ? null : new Date(Date.now() + dueInDays * day).toISOString(),
  ownerUid: "riya", status: "open", revision: 3});

describe("useSalesTodayController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listSalesTasks.mockResolvedValue({rows: [task("late", -2, "reply"), task("soon", 3), task("later", 20), task("open", null)], nextCursor: null});
    repository.getSalesAccount.mockResolvedValue({account: {organizerId: "org-late", revision: 1, researchStatus: "qualified"},
      organizerSummary: {name: "Harbor"}, activities: [], opportunities: [], tasks: []});
    repository.upsertSalesTask.mockResolvedValue({task: task("late", -2), receipt: {requestId: "r", revision: 4}});
    repository.recordSalesActivity.mockResolvedValue({activity: {}, receipt: {requestId: "r", revision: 1}});
  });

  it("splits a person's tasks by when they are due and by kind", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useSalesTodayController({ownerUid: "riya", onError: vi.fn(), onNotice: vi.fn(),
      selectedTaskId: null, onSelect: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.rows.map((row) => row.taskId)).toEqual(["late", "soon"]));
    expect(repository.listSalesTasks).toHaveBeenCalledWith({limit: 50, status: "open", ownerUid: "riya"});
    expect(result.current.counts).toMatchObject({due: 1, week: 2, later: 2});
    act(() => result.current.setKind("reply"));
    expect(result.current.rows.map((row) => row.taskId)).toEqual(["late"]);
    act(() => result.current.setScope("later"));
    await waitFor(() => expect(result.current.rows.map((row) => row.taskId)).toEqual([]));
  });

  it("logs what happened, completes the task at its revision and opens the next one", async () => {
    const {wrapper} = createQueryHarness();
    const onSelect = vi.fn();
    const {result} = renderHook(() => useSalesTodayController({ownerUid: null, onError: vi.fn(), onNotice: vi.fn(),
      selectedTaskId: "late", onSelect}), {wrapper});
    await waitFor(() => expect(result.current.selected?.taskId).toBe("late"));
    await act(async () => { expect(await result.current.logAndComplete(result.current.selected!, "Called Kavya")).toBe(true); });
    expect(repository.recordSalesActivity.mock.calls[0]![0]).toMatchObject({organizerId: "org-late", type: "reply", note: "Called Kavya"});
    expect(repository.upsertSalesTask.mock.calls[0]![0]).toMatchObject({taskId: "late", expectedRevision: 3, task: {status: "completed"}});
    expect(onSelect).toHaveBeenCalledWith("soon");
  });

  it("snoozes to a Monday and reports a failed save", async () => {
    repository.upsertSalesTask.mockRejectedValueOnce(new Error("Someone updated this task. Reload before saving."));
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    const {result} = renderHook(() => useSalesTodayController({ownerUid: null, onError, onNotice: vi.fn(),
      selectedTaskId: "soon", onSelect: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.selected?.taskId).toBe("soon"));
    await act(async () => { expect(await result.current.snooze(result.current.selected!)).toBe(false); });
    expect(onError).toHaveBeenLastCalledWith("Someone updated this task. Reload before saving.");
    const dueAt = repository.upsertSalesTask.mock.calls[0]![0].task.dueAt as string;
    expect(new Date(dueAt).getDay()).toBe(1);
  });
});
