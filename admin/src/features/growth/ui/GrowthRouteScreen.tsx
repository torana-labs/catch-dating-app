import {useGrowthController, type GrowthView} from "../controllers/useGrowthController";
import {GrowthScreen} from "./GrowthScreen";

export type {GrowthView} from "../controllers/useGrowthController";

/** Growth as the shell routes it: the view and nominator come from the address. */
export function GrowthRouteScreen({
  view,
  selectedNominatorUid,
  onOpen,
}: {
  view: GrowthView;
  selectedNominatorUid: string | null;
  /** Moves to a view, and to one nominator when a uid is given. */
  onOpen: (view: GrowthView, nominatorUid: string | null) => void;
}) {
  const controller = useGrowthController({
    view,
    selectedNominatorUid,
    onSelectNominatorUid: (uid) => onOpen("nominators", uid),
  });
  return (
    <GrowthScreen
      controller={controller}
      detailOpen={selectedNominatorUid !== null}
      onCloseDetail={() => onOpen("nominators", null)}
      onSelectNominator={(uid) => onOpen("nominators", uid)}
      onViewChange={(next) => onOpen(next, null)}
    />
  );
}
