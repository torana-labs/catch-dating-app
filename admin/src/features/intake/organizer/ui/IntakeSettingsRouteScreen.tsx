import {useAiFallbackTestController} from "../controllers/useAiFallbackTestController";
import {useListingProgramController} from "../controllers/useListingProgramController";
import {useSupplyIntakePolicyController} from "../controllers/useSupplyIntakePolicyController";
import {useSupplyNominatorController} from "../controllers/useSupplyNominatorController";
import {IntakeSettingsWorkspace} from "./IntakeSettingsWorkspace";

/** The live Settings → Intake page: its controllers and queries (the pause switch, policies, nominators, the AI fallback's sign-in test), drawn by IntakeSettingsWorkspace. */
export function IntakeSettingsRouteScreen({onError, onNotice}: {
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
}) {
  const policies = useSupplyIntakePolicyController({onError, onNotice});
  const nominators = useSupplyNominatorController({onError, onNotice});
  const program = useListingProgramController({onError, onNotice});
  const aiTest = useAiFallbackTestController({onError, onNotice});
  return (
    <IntakeSettingsWorkspace
      program={{...program, isLoading: program.page.isPending, loadFailed: program.page.isError}}
      nominators={{...nominators, isLoading: nominators.page.isPending, loadFailed: nominators.page.isError}}
      policies={{...policies, isLoading: policies.page.isPending, loadFailed: policies.page.isError}}
      aiTest={aiTest}
    />
  );
}
