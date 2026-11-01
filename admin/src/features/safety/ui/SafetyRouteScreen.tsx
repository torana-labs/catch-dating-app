import {useEffect, useMemo, useState} from "react";
import {useAccessReviewController} from
  "../controllers/useAccessReviewController";
import {safetyJob} from "../controllers/safetyActionSheet";
import type {SafetyCaseKind} from "../controllers/safetyCases";
import {useAccountSafetyController} from
  "../controllers/useAccountSafetyController";
import {useSafetyActionSheetController} from
  "../controllers/useSafetyActionSheetController";
import {useSafetySettingsController} from
  "../controllers/useSafetySettingsController";
import {useSafetyTriageController} from
  "../controllers/useSafetyTriageController";
import {SafetyScreen, type SafetyView} from "./SafetyScreen";

const ACCESS_PREFIX = "accessApplications/";

/**
 * Wires the Safety board to the URL: /safety lists open cases and
 * /safety/:targetPath opens one (a report, flag, event report or launch
 * access application); /safety/actions and /safety/appeals list account
 * actions, with /safety/actions/:actionId open beside them.
 */
export function SafetyRouteScreen({
  adminRoles,
  onError,
  onNavigate,
  onNotice,
  selectedActionId,
  selectedTargetPath,
  view,
}: {
  adminRoles: string[];
  onError: (message: string | null) => void;
  onNavigate: (path: string) => void;
  onNotice: (message: string | null) => void;
  selectedActionId: string | null;
  selectedTargetPath: string | null;
  view: SafetyView;
}) {
  const job = safetyJob(adminRoles);
  const isAccess = selectedTargetPath?.startsWith(ACCESS_PREFIX) ?? false;
  const triage = useSafetyTriageController({
    onError, onNotice,
    selectedTargetPath: isAccess ? null : selectedTargetPath,
    onSelectedTargetPathChange: (targetPath) => onNavigate(targetPath ?
      `/safety/${encodeURIComponent(targetPath)}` : "/safety"),
  });
  const access = useAccessReviewController({
    onError, onNotice,
    selectedApplicationUid: isAccess ?
      selectedTargetPath!.slice(ACCESS_PREFIX.length) : null,
    onSelectedApplicationUidChange: (uid) => onNavigate(uid ?
      `/safety/${encodeURIComponent(`${ACCESS_PREFIX}${uid}`)}` :
      "/safety"),
  });
  const actions = useAccountSafetyController({onError, onNotice});
  const settings = useSafetySettingsController({
    canEdit: job === "owner", onError, onNotice});
  const reasons = useMemo(() => settings.snapshot?.settings.reasons ?? [],
    [settings.snapshot]);
  const sheet = useSafetyActionSheetController({job, reasons,
    take: actions.take});
  const [caseKind, setCaseKind] = useState<SafetyCaseKind | "all">("all");
  const {setView, select} = actions;

  useEffect(() => {
    if (view !== "open") setView(view === "appeals" ? "appeals" : "active");
  }, [setView, view]);
  useEffect(() => {
    select(selectedActionId);
  }, [select, selectedActionId]);

  const caseKey = selectedTargetPath ? isAccess ?
    `access:${selectedTargetPath}` : selectedTargetPath : null;
  return (
    <SafetyScreen
      access={access}
      actions={actions}
      caseKind={caseKind}
      job={job}
      nowMs={Date.now()}
      onCaseKind={setCaseKind}
      onSelectAction={(actionId) => onNavigate(
        `/safety/${view === "appeals" ? "appeals" : "actions"}/` +
        encodeURIComponent(actionId))}
      onSelectCase={(row) => onNavigate(
        `/safety/${encodeURIComponent(row.targetPath)}`)}
      onViewChanged={(next) => onNavigate(next === "open" ? "/safety" :
        `/safety/${next}`)}
      selectedCaseKey={caseKey}
      sheet={sheet}
      triage={triage}
      view={view}
    />
  );
}
