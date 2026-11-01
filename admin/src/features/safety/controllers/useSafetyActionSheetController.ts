import {useCallback, useMemo, useState} from "react";
import type {AccountActionKind, TakeAccountAction} from
  "../api/accountSafetyRepository";
import {
  ACTION_STEPS,
  activeReasons,
  buildTakeAction,
  defaultActionMessage,
  type ActionDraft,
  type ActionDuration,
  type SafetyJob,
  type SafetyReason,
} from "./safetyActionSheet";

export interface SafetyActionTarget {
  uid: string;
  displayName: string | null;
  caseTargetPath: string | null;
  caseTitle: string | null;
  /** The reason the case was reported for, when it maps to a rule. */
  reasonCode: string | null;
}

export interface SafetyActionSheetController {
  target: SafetyActionTarget | null;
  draft: ActionDraft;
  reasons: SafetyReason[];
  error: string | null;
  open: (target: SafetyActionTarget) => void;
  close: () => void;
  setKind: (kind: AccountActionKind) => void;
  setDuration: (duration: ActionDuration) => void;
  setReason: (reasonCode: string) => void;
  setMessage: (message: string) => void;
  setNote: (note: string) => void;
  setNotifyReporter: (value: boolean) => void;
  setAppealable: (value: boolean) => void;
  submit: () => Promise<boolean>;
}

function freshDraft(reasonCode: string, reasons: SafetyReason[]):
  ActionDraft {
  const reason = reasons.find((item) => item.code === reasonCode);
  return {
    kind: "restrict", durationDays: 7, reasonCode,
    messageToUser: reason ? defaultActionMessage({kind: "restrict",
      durationDays: 7, reasonLabel: reason.label}) : "",
    notifyReporter: true, appealable: true, note: "",
  };
}

/**
 * The act-on-an-account sheet (board AdminSafetyAction): the chosen step,
 * how long, the rule, the message the person sees (rewritten as the step
 * changes until someone edits it) and the note for the team.
 */
export function useSafetyActionSheetController({
  job,
  reasons: allReasons,
  take,
}: {
  job: SafetyJob;
  reasons: SafetyReason[];
  take: (payload: TakeAccountAction) => Promise<boolean>;
}): SafetyActionSheetController {
  const reasons = useMemo(() => activeReasons(allReasons), [allReasons]);
  const [target, setTarget] = useState<SafetyActionTarget | null>(null);
  const [draft, setDraft] = useState<ActionDraft>(() =>
    freshDraft(reasons[0]?.code ?? "", reasons));
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rewrite = useCallback((next: ActionDraft): ActionDraft => {
    if (edited) return next;
    const reason = reasons.find((item) => item.code === next.reasonCode);
    return reason ? {...next, messageToUser: defaultActionMessage({
      kind: next.kind, durationDays: next.durationDays,
      reasonLabel: reason.label})} : next;
  }, [edited, reasons]);

  const open = useCallback((next: SafetyActionTarget) => {
    const code = next.reasonCode && reasons.some((item) =>
      item.code === next.reasonCode) ? next.reasonCode : reasons[0]?.code ??
      "";
    setTarget(next);
    setEdited(false);
    setError(null);
    setDraft(freshDraft(code, reasons));
  }, [reasons]);

  const submit = useCallback(async () => {
    if (!target) return false;
    const built = buildTakeAction({job, uid: target.uid,
      caseTargetPath: target.caseTargetPath, draft});
    if ("error" in built) {
      setError(built.error);
      return false;
    }
    setError(null);
    const done = await take(built.payload);
    if (done) setTarget(null);
    return done;
  }, [draft, job, take, target]);

  return {
    target,
    draft,
    reasons,
    error,
    open,
    close: useCallback(() => setTarget(null), []),
    setKind: useCallback((kind: AccountActionKind) => setDraft((current) => {
      if (current.kind === kind) return current;
      const step = ACTION_STEPS.find((item) => item.kind === kind);
      return rewrite({...current, kind,
        durationDays: step?.durations[0] ?? null});
    }), [rewrite]),
    setDuration: useCallback((durationDays: ActionDuration) =>
      setDraft((current) => rewrite({...current, durationDays})), [rewrite]),
    setReason: useCallback((reasonCode: string) =>
      setDraft((current) => rewrite({...current, reasonCode})), [rewrite]),
    setMessage: useCallback((messageToUser: string) => {
      setEdited(true);
      setDraft((current) => ({...current, messageToUser}));
    }, []),
    setNote: useCallback((note: string) =>
      setDraft((current) => ({...current, note})), []),
    setNotifyReporter: useCallback((notifyReporter: boolean) =>
      setDraft((current) => ({...current, notifyReporter})), []),
    setAppealable: useCallback((appealable: boolean) =>
      setDraft((current) => ({...current, appealable})), []),
    submit,
  };
}
