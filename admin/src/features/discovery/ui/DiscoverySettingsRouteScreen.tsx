import {useDiscoverySettingsController} from
  "../controllers/useDiscoverySettingsController";
import {DiscoverySettingsWorkspace} from "./DiscoverySettingsWorkspace";

export function DiscoverySettingsRouteScreen({
  adminRoles,
  currentUserUid,
  onError,
  onNotice,
}: {
  adminRoles: string[];
  currentUserUid: string | null;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  return (
    <DiscoverySettingsWorkspace
      currentUserUid={currentUserUid}
      settings={useDiscoverySettingsController({
        canEdit: adminRoles.includes("adminOwner"), onError, onNotice})}
    />
  );
}
