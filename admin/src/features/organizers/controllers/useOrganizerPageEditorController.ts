import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import type {AdminOrganizerDetails} from "../../../shared/types/adminTypes";
import {
  loadOrganizerProfile,
  publishOrganizerProfile,
  saveOrganizerProfile,
} from "../api/organizerPublishingRepository";
import {
  buildOrganizerPublishPayload,
  buildOrganizerSavePayload,
  completePublishChecklist,
  diffOrganizerProfile,
  emptyPublishChecklist,
  formFromOrganizerProfile,
  hasBlockingIssues,
  validateOrganizerPublishingForm,
  type OrganizerDiffRow,
  type OrganizerPublishingFormState,
  type OrganizerValidationIssue,
  type PublishChecklistState,
} from "./organizerPublishingHelpers";

export interface OrganizerPageEditorController {
  organizer: AdminOrganizerDetails | null;
  form: OrganizerPublishingFormState | null;
  setForm: (form: OrganizerPublishingFormState) => void;
  diffRows: OrganizerDiffRow[];
  issues: OrganizerValidationIssue[];
  publishIssues: OrganizerValidationIssue[];
  checklist: PublishChecklistState;
  setChecklist: (checklist: PublishChecklistState) => void;
  isBusy: boolean;
  canSave: boolean;
  canPublish: boolean;
  save: () => Promise<boolean>;
  saveAndPublish: () => Promise<boolean>;
  discard: () => void;
}

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Edits one organizer's page. Publishing saves first, then asks for the four confirmations. */
export function useOrganizerPageEditorController(
  organizerId: string,
  {enabled = true, onError, onNotice}: {
    enabled?: boolean;
    onError: (message: string | null) => void;
    onNotice: (message: string | null) => void;
  }
): OrganizerPageEditorController {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const detail = useQuery({
    enabled,
    queryKey: adminQueryKeys.organizers.detail(organizerId),
    queryFn: () => loadOrganizerProfile({organizerId}),
  });
  const saveMutation = useMutation({mutationFn: saveOrganizerProfile});
  const publishMutation = useMutation({mutationFn: async ({changes, publish}: {
    changes: ReturnType<typeof buildOrganizerSavePayload> | null;
    publish: ReturnType<typeof buildOrganizerPublishPayload>;
  }) => {
    if (changes) await saveOrganizerProfile(changes);
    return publishOrganizerProfile(publish);
  }});
  const organizer = detail.data?.organizer ?? null;
  const [form, setForm] = useState<OrganizerPublishingFormState | null>(null);
  const [checklist, setChecklist] = useState<PublishChecklistState>(emptyPublishChecklist);

  useEffect(() => {
    if (detail.data) setForm(formFromOrganizerProfile(detail.data.organizer));
  }, [detail.data]);
  useEffect(() => {
    if (detail.error) onError(messageFromError(detail.error, "Unable to load this organizer."));
  }, [detail.error, onError]);

  const diffRows = useMemo(() => diffOrganizerProfile(organizer, form), [form, organizer]);
  const issues = useMemo(
    () => validateOrganizerPublishingForm(form, {requireReviewNote: diffRows.length > 0}),
    [diffRows.length, form]
  );
  const publishIssues = useMemo(
    () => validateOrganizerPublishingForm(form, {publishing: true, requireReviewNote: true}),
    [form]
  );
  const refresh = useCallback(
    () => queryClient.invalidateQueries({queryKey: [...adminQueryKeys.all, "organizers"]}),
    [queryClient]
  );

  const save = useCallback(async () => {
    if (!organizer || !form) return false;
    const payload = buildOrganizerSavePayload(organizer, form);
    if (Object.keys(payload.fields).length === 0) return true;
    const blockers = validateOrganizerPublishingForm(form, {requireReviewNote: true});
    if (hasBlockingIssues(blockers)) {
      onError(blockers.find((issue) => issue.severity === "blocker")?.detail ?? "Fix what's listed before saving.");
      return false;
    }
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const result = await saveMutation.mutateAsync(payload);
      await refresh();
      onError(null);
      onNotice(`Saved ${result.updatedFieldCount} change${result.updatedFieldCount === 1 ? "" : "s"}.`);
      return true;
    } catch (error) {
      onError(messageFromError(error, "Unable to save this organizer."));
      return false;
    } finally {
      endOperation(operation);
    }
  }, [beginOperation, endOperation, form, onError, onNotice, organizer, refresh, saveMutation]);

  const saveAndPublish = useCallback(async () => {
    if (!organizer || !form) return false;
    if (hasBlockingIssues(publishIssues)) {
      onError(publishIssues.find((issue) => issue.severity === "blocker")?.detail ?? "Fix what's listed before publishing.");
      return false;
    }
    if (!completePublishChecklist(checklist)) {
      onError("Confirm all four checks before publishing.");
      return false;
    }
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const changes = buildOrganizerSavePayload(organizer, form);
      const result = await publishMutation.mutateAsync({
        changes: Object.keys(changes.fields).length > 0 ? changes : null,
        publish: buildOrganizerPublishPayload(form, checklist),
      });
      setChecklist(emptyPublishChecklist);
      await refresh();
      onError(null);
      onNotice(`${organizer.name} is ${result.publishStatus} with ${result.robots}.`);
      return true;
    } catch (error) {
      onError(messageFromError(error, "Unable to publish this organizer."));
      return false;
    } finally {
      endOperation(operation);
    }
  }, [beginOperation, checklist, endOperation, form, onError, onNotice, organizer, publishIssues, publishMutation, refresh]);

  const discard = useCallback(() => {
    if (organizer) setForm(formFromOrganizerProfile(organizer));
    setChecklist(emptyPublishChecklist);
    onError(null);
  }, [onError, organizer]);

  const isBusy = saveMutation.isPending || publishMutation.isPending;
  return {
    organizer,
    form,
    setForm,
    diffRows,
    issues,
    publishIssues,
    checklist,
    setChecklist,
    isBusy,
    canSave: Boolean(form) && diffRows.length > 0 && !hasBlockingIssues(issues) && !isBusy,
    canPublish: Boolean(form) && !hasBlockingIssues(publishIssues) && !isBusy,
    save,
    saveAndPublish,
    discard,
  };
}
