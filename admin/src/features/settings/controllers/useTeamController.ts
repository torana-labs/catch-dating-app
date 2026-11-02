import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useMemo, useState} from "react";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {useAdminPendingOperationGuard} from
  "../../../shared/pendingOperation";
import type {
  AdminRoleAssignmentRow,
  AdminUserRoleRecord,
} from "../../../shared/types/adminTypes";
import {
  loadAdminRoleAssignments,
  loadAdminUserRoles,
  saveAdminUserRoles,
} from "../api/teamRepository";
import {jobOf, rolesForJob, type TeamJob} from "./teamJobs";

export interface TeamController {
  members: AdminRoleAssignmentRow[];
  selected: AdminUserRoleRecord | null;
  selectedUid: string | null;
  job: TeamJob;
  note: string;
  loadState: "loading" | "error" | "ready";
  isSaving: boolean;
  validationIssue: string | null;
  setJob: (job: TeamJob) => void;
  setNote: (note: string) => void;
  save: () => Promise<boolean>;
}

/**
 * Settings → Team and roles (board AdminSettingsTeam): the people with an
 * Admin job, one person open at a time, and their job changed with a review
 * note. Opening someone by user id also invites them.
 */
export function useTeamController({
  currentUserUid,
  onError,
  onNotice,
  selectedUid,
}: {
  currentUserUid: string | null;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  selectedUid: string | null;
}): TeamController {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const list = useQuery({
    queryKey: adminQueryKeys.adminRoles.assignments("active"),
    queryFn: () => loadAdminRoleAssignments({status: "active", limit: 200}),
  });
  const person = useQuery({
    queryKey: adminQueryKeys.adminRoles.user(selectedUid ?? ""),
    queryFn: () => loadAdminUserRoles({targetUid: selectedUid!}),
    enabled: selectedUid !== null,
  });
  const saveMutation = useMutation({mutationFn: saveAdminUserRoles});
  const selected = person.data?.user ?? null;
  const [draft, setDraft] = useState<{uid: string; job: TeamJob} | null>(
    null);
  const [note, setNote] = useState("");
  const job = draft && draft.uid === selected?.targetUid ? draft.job :
    selected ? jobOf(selected.roles) : "none";

  const validationIssue = useMemo(() => {
    if (!selected) return "Open someone before changing their job.";
    if (selected.targetUid === currentUserUid && job !== "owner") {
      return "You can't remove your own owner role.";
    }
    if (job === jobOf(selected.roles)) return "Choose a different job.";
    if (!note.trim()) return "Add a review note.";
    if (note.trim().length > 1000) {
      return "Keep the review note under 1,000 characters.";
    }
    return null;
  }, [currentUserUid, job, note, selected]);

  const save = useCallback(async () => {
    if (!selected || validationIssue) {
      onError(validationIssue);
      return false;
    }
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const response = await saveMutation.mutateAsync({
        targetUid: selected.targetUid,
        roles: rolesForJob(job),
        note: note.trim(),
      });
      queryClient.setQueryData(
        adminQueryKeys.adminRoles.user(response.user.targetUid), response);
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.adminRoles.assignments("active"),
      });
      setDraft(null);
      setNote("");
      onError(null);
      onNotice("Role change saved.");
      return true;
    } catch (error) {
      onError(error instanceof Error && error.message ? error.message :
        "Unable to save admin role changes.");
      return false;
    } finally {
      endOperation(operation);
    }
  }, [beginOperation, endOperation, job, note, onError, onNotice,
    queryClient, saveMutation, selected, validationIssue]);

  return {
    members: list.data?.rows ?? [],
    selected,
    selectedUid,
    job,
    note,
    loadState: list.isPending ? "loading" : list.isError ? "error" :
      "ready",
    isSaving: saveMutation.isPending,
    validationIssue,
    setJob: useCallback((next: TeamJob) => {
      if (selected) setDraft({uid: selected.targetUid, job: next});
    }, [selected]),
    setNote,
    save,
  };
}
