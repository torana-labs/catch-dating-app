import {useSupplyIntakePolicyController} from "../controllers/useSupplyIntakePolicyController";
import {useSupplyNominatorController} from "../controllers/useSupplyNominatorController";
import {IntakeSettingsWorkspace} from "./IntakeSettingsWorkspace";

/** The live Settings → Intake page: its controllers and queries, drawn by IntakeSettingsWorkspace. */
export function IntakeSettingsRouteScreen({onError, onNotice}: {
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
}) {
  const policies = useSupplyIntakePolicyController({onError, onNotice});
  const nominators = useSupplyNominatorController({onError, onNotice});
  return (
    <IntakeSettingsWorkspace
      nominators={{...nominators, isLoading: nominators.page.isPending, loadFailed: nominators.page.isError}}
      policies={{...policies, isLoading: policies.page.isPending, loadFailed: policies.page.isError}}
    />
  );
}
