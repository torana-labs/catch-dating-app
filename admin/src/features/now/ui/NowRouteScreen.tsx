import type {DataMode} from "../../../shared/types/adminTypes";
import {useNowController, type NowDestination} from "../controllers/useNowController";
import {NowScreen} from "./NowScreen";

export type {NowDestination} from "../controllers/useNowController";

const dateFormat = new Intl.DateTimeFormat("en-IN", {weekday: "long", day: "numeric", month: "long"});

export function NowRouteScreen({
  canOpen,
  isSessionReady,
  mode,
  onOpen,
}: {
  canOpen: (destination: NowDestination) => boolean;
  isSessionReady: boolean;
  mode: DataMode;
  onOpen: (destination: NowDestination, targetPath?: string | null) => void;
}) {
  const controller = useNowController({isSessionReady, mode});
  return (
    <NowScreen
      canOpen={canOpen}
      dateLabel={dateFormat.format(new Date())}
      error={controller.error}
      isLoading={controller.isLoading}
      model={controller.model}
      onOpenItem={(item) => onOpen(item.destination, item.targetPath)}
      onOpenKind={(destination) => onOpen(destination)}
      onRefresh={() => void controller.refresh()}
    />
  );
}
