import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import type {AdminEventDetails} from "../../../shared/types/adminTypes";
import {loadEventProfile, saveEventProfile} from "../api/eventPublishingRepository";
import {
  buildEventSavePayload,
  diffEventProfile,
  formFromEventProfile,
  hasBlockingEventIssues,
  validateEventPublishingForm,
  type EventDiffRow,
  type EventPublishingFormState,
  type EventValidationIssue,
} from "./eventPublishingHelpers";

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export interface EventPageEditorController {
  event: AdminEventDetails | null;
  form: EventPublishingFormState | null;
  update: <K extends keyof EventPublishingFormState>(key: K, value: EventPublishingFormState[K]) => void;
  diffRows: EventDiffRow[];
  issues: EventValidationIssue[];
  isSaving: boolean;
  canSave: boolean;
  save: () => Promise<boolean>;
  discard: () => void;
  /** The pilot review on Overview saves alone, with its own note. */
  savePilotReview: (realEvent: boolean, reviewNote: string) => Promise<boolean>;
}

/** Edits one Catch event's page. The event's times, places and price stay with its organizer. */
export function useEventPageEditorController(
  eventId: string,
  {enabled = true, onError, onNotice}: {
    enabled?: boolean;
    onError: (message: string | null) => void;
    onNotice: (message: string | null) => void;
  }
): EventPageEditorController {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const detail = useQuery({
    enabled,
    queryKey: adminQueryKeys.events.detail(eventId),
    queryFn: () => loadEventProfile({eventId}),
  });
  const saveMutation = useMutation({mutationFn: saveEventProfile});
  const event = detail.data?.event ?? null;
  const [form, setForm] = useState<EventPublishingFormState | null>(null);

  useEffect(() => {
    if (detail.data) setForm(formFromEventProfile(detail.data.event));
  }, [detail.data]);
  useEffect(() => {
    if (detail.error) onError(messageFromError(detail.error, "Unable to load this event."));
  }, [detail.error, onError]);

  const diffRows = useMemo(() => diffEventProfile(event, form), [event, form]);
  const issues = useMemo(
    () => validateEventPublishingForm(form, {requireReviewNote: diffRows.length > 0}),
    [diffRows.length, form]
  );

  const send = useCallback(async (next: EventPublishingFormState) => {
    if (!event) return false;
    const payload = buildEventSavePayload(event, next);
    if (Object.keys(payload.fields).length === 0) return true;
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const result = await saveMutation.mutateAsync(payload);
      await queryClient.invalidateQueries({queryKey: [...adminQueryKeys.all, "events"]});
      onError(null);
      onNotice(`Saved ${result.updatedFieldCount} change${result.updatedFieldCount === 1 ? "" : "s"}.`);
      return true;
    } catch (error) {
      onError(messageFromError(error, "Unable to save this event."));
      return false;
    } finally {
      endOperation(operation);
    }
  }, [beginOperation, endOperation, event, onError, onNotice, queryClient, saveMutation]);

  const save = useCallback(async () => {
    if (!form) return false;
    const blockers = validateEventPublishingForm(form, {requireReviewNote: true});
    if (hasBlockingEventIssues(blockers)) {
      onError(blockers.find((issue) => issue.severity === "blocker")?.detail ?? "Fix what's listed before saving.");
      return false;
    }
    return send(form);
  }, [form, onError, send]);

  const update = useCallback<EventPageEditorController["update"]>((key, value) => {
    setForm((current) => current ? {...current, [key]: value} : current);
  }, []);
  const discard = useCallback(() => {
    if (event) setForm(formFromEventProfile(event));
    onError(null);
  }, [event, onError]);
  const savePilotReview = useCallback(async (realEvent: boolean, reviewNote: string) => {
    if (!event) return false;
    return send({...formFromEventProfile(event), hostPilotRealEvent: realEvent, reviewNote});
  }, [event, send]);

  return {
    event,
    form,
    update,
    diffRows,
    issues,
    isSaving: saveMutation.isPending,
    canSave: Boolean(form) && diffRows.length > 0 && !hasBlockingEventIssues(issues) && !saveMutation.isPending,
    save,
    discard,
    savePilotReview,
  };
}
