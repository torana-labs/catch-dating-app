import {safetyJob} from "../controllers/safetyActionSheet";
import {useSafetySettingsController} from
  "../controllers/useSafetySettingsController";
import {SafetySettingsWorkspace} from "./SafetySettingsWorkspace";

export function SafetySettingsRouteScreen({
  adminRoles,
  onError,
  onNotice,
}: {
  adminRoles: string[];
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  return (
    <SafetySettingsWorkspace settings={useSafetySettingsController({
      canEdit: safetyJob(adminRoles) === "owner", onError, onNotice})} />
  );
}
