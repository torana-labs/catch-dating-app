import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useMemo, useState} from "react";
import {getSalesAccount, listSalesTasks, recordSalesActivity, upsertSalesTask} from "../api/salesRepository";
import type {SalesTask} from "../api/salesTypes";
import {nextMonday, taskScope, todayKinds, type TodayKind, type TodayScope} from "./salesLabels";

const todayKey = ["sales", "today"] as const;

/**
 * A sales associate's day: their open tasks by when they are due, the task
 * they opened with its host, and the three things done from it: log what
 * happened (which completes the task), snooze to Monday, or mark done.
 * An owner sees the whole team's tasks.
 */
export function useSalesTodayController({ownerUid, onError, onNotice, selectedTaskId, onSelect}: {
  /** Only this person's tasks; null for the whole team. */
  ownerUid: string | null;
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
  selectedTaskId: string | null;
  onSelect: (taskId: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<TodayScope>("week");
  const [kind, setKind] = useState<TodayKind | null>(null);
  const tasks = useQuery({
    queryKey: [...todayKey, ownerUid, scope === "done" ? "completed" : "open"],
    queryFn: () => listSalesTasks({limit: 50, status: scope === "done" ? "completed" : "open",
      ...(ownerUid ? {ownerUid} : {})}),
  });
  const all = useMemo(() => tasks.data?.rows ?? [], [tasks.data]);
  const inScope = useMemo(() => all.filter((task) => scope === "done" || taskScope(task) === scope ||
    (scope === "week" && taskScope(task) === "due")), [all, scope]);
  const rows = useMemo(() => kind === null ? inScope : inScope.filter((task) =>
    (todayKinds.find((entry) => entry.value === kind)?.kinds as readonly string[]).includes(task.kind)), [inScope, kind]);
  const counts = useMemo(() => ({
    due: all.filter((task) => taskScope(task) === "due").length,
    week: all.filter((task) => ["due", "week"].includes(taskScope(task))).length,
    later: all.filter((task) => taskScope(task) === "later").length,
    kinds: Object.fromEntries(todayKinds.map((entry) => [entry.value,
      inScope.filter((task) => (entry.kinds as readonly string[]).includes(task.kind)).length])) as Record<TodayKind, number>,
  }), [all, inScope]);
  const selected = rows.find((task) => task.taskId === selectedTaskId) ?? all.find((task) => task.taskId === selectedTaskId) ?? null;
  const account = useQuery({
    queryKey: ["sales", "account", selected?.organizerId ?? null],
    queryFn: () => getSalesAccount(selected?.organizerId as string),
    enabled: selected !== null,
  });
  const index = rows.findIndex((task) => task.taskId === selectedTaskId);
  const nextTask = index >= 0 ? rows[index + 1] ?? null : null;
  const save = useMutation({mutationFn: upsertSalesTask});
  const log = useMutation({mutationFn: recordSalesActivity});

  const finish = useCallback(async (action: () => Promise<unknown>, notice: string) => {
    onError(null);
    try {
      await action();
      onNotice(notice);
      onSelect(nextTask?.taskId ?? null);
      await queryClient.invalidateQueries({queryKey: ["sales"]});
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [nextTask, onError, onNotice, onSelect, queryClient]);

  const updateTask = (task: SalesTask, patch: Partial<Pick<SalesTask, "dueAt" | "status">>) => save.mutateAsync({
    organizerId: task.organizerId, taskId: task.taskId, requestId: crypto.randomUUID(), expectedRevision: task.revision,
    task: {kind: task.kind, title: task.title, dueAt: task.dueAt, ownerUid: task.ownerUid, status: task.status, ...patch},
  });

  return {
    scope, setScope, kind, setKind, tasks, rows, counts, selected, account, nextTask,
    position: index >= 0 ? {index: index + 1, of: rows.length} : null,
    /** Records what happened on the host and completes the task. */
    logAndComplete: (task: SalesTask, note: string) => finish(async () => {
      await log.mutateAsync({organizerId: task.organizerId, requestId: crypto.randomUUID(),
        type: task.kind === "reply" ? "reply" : task.kind === "demo" ? "demo" : "note",
        occurredAt: new Date().toISOString(), note});
      await updateTask(task, {status: "completed"});
    }, "Logged and done."),
    snooze: (task: SalesTask) => finish(() => updateTask(task, {dueAt: nextMonday()}), "Snoozed to Monday."),
    complete: (task: SalesTask) => finish(() => updateTask(task, {status: "completed"}), "Done."),
    isSaving: save.isPending || log.isPending,
  };
}

export type SalesTodayController = ReturnType<typeof useSalesTodayController>;
